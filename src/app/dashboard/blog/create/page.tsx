"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { blogPostSchema } from "@/lib/validators";
import { z } from "zod";
import BlogEditor from "@/components/blog/BlogEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, Loader2, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import Image from "next/image";

type BlogPostForm = z.infer<typeof blogPostSchema>;

export default function CreateBlogPost() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isSlugEdited, setIsSlugEdited] = useState(false);

    const form = useForm<BlogPostForm>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(blogPostSchema) as any,
        defaultValues: {
            title: "",
            slug: "",
            excerpt: "",
            content: "",
            coverImage: "",
            isPublished: false,
            tags: [],
            category: "General",
            seo: {
                metaTitle: "",
                metaDescription: "",
                keywords: [],
            },
        },
    });

    const { register, handleSubmit, setValue, watch, formState: { errors } } = form;


    const coverImage = watch("coverImage");

    // Auto-generate slug from title
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setValue("title", val);

        // Simple logic: If slug is empty OR it looks like an auto-generated version of the PREVIOUS title, update it.
        // For now, simpler approach: If the user hasn't explicitly "touched" the slug field (we can't easily track "touched" without state),
        // we can just check if the current slug matches the slugified version of the OLD title (too complex).
        // Let's just update slug if it's empty or matches standard slug pattern of title

        const generatedSlug = val
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric chars with hyphens
            .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

        // Only update if slug is empty logic for now, or maybe if we assume user wants auto-slug until they lock it.
        // Better UX: Just update it always if it's not "dirty" - but RHF doesn't expose dirty per field easily in this context without `formState`.
        // Let's just do: Update slug if it's empty OR if the current slug matches the slugified version of the input (minus the last char).
        // User requested: "slug genration is not workng it should make a unique slug based on tile we entered"
        // The issue was `if (!watch("slug"))`. Once a letter is typed, slug is not empty, so it stops updating.

        // If slug is effectively empty or matches the start of what we are typing (rough heuristic)
        // A standard approach is to generic slug unless user manually edits the slug input.
        // We can just set it. If user wants to override, they can edit the slug input directly.
        // But if they edit the title again, it will overwrite their custom slug.
        // Let's add a state `isSlugEdited`.

        if (!isSlugEdited) {
            setValue("slug", generatedSlug);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "sonipainting");

        try {
            const res = await axios.post(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                formData
            );
            setValue("coverImage", res.data.secure_url);
            toast.success("Cover image uploaded");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload image");
        } finally {
            setUploadingImage(false);
        }
    };

    const onSubmit = async (data: BlogPostForm) => {
        setLoading(true);
        try {
            await axios.post("/api/blog", data);
            toast.success("Blog post created successfully");
            router.push("/dashboard/blog");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Creation error:", error);
            // safe access
            const msg = error?.response?.data?.error || error?.message || "Failed to create post";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/blog">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Write New Article</h1>
                    <p className="text-muted-foreground">Share your knowledge with the world.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Tabs defaultValue="content" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="content">Article Content</TabsTrigger>
                        <TabsTrigger value="settings">Settings & Publish</TabsTrigger>
                    </TabsList>

                    <TabsContent value="content" className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    {...register("title")}
                                    onChange={(e) => {
                                        register("title").onChange(e);
                                        handleTitleChange(e);
                                    }}
                                    placeholder="Article Title"
                                    className="text-4xl font-bold border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-gray-300 h-auto py-2"
                                />
                                {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="shrink-0">slug:</span>
                                <Input
                                    {...register("slug")}
                                    onChange={(e) => {
                                        register("slug").onChange(e);
                                        setIsSlugEdited(true);
                                    }}
                                    className="h-8 font-mono text-xs bg-gray-50 border-gray-200"
                                />
                                {errors.slug && <p className="text-red-500 text-sm ml-2">{errors.slug.message}</p>}
                            </div>

                            <BlogEditor
                                content={watch("content")}
                                onChange={(html) => setValue("content", html, { shouldValidate: true })}
                            />
                            {errors.content && <p className="text-red-500 text-sm">{errors.content.message}</p>}
                        </div>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="space-y-2">
                                            <Label>Cover Image</Label>
                                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors relative group">
                                                {coverImage ? (
                                                    <div className="relative w-full aspect-video rounded-md overflow-hidden">
                                                        <Image src={coverImage} alt="Cover" fill className="object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setValue("coverImage", "");
                                                            }}
                                                            className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-red-500 hover:bg-white transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="cursor-pointer block w-full h-full p-4">
                                                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                                        <span className="text-sm text-gray-500">
                                                            {uploadingImage ? "Uploading..." : "Click to upload cover image"}
                                                        </span>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={handleImageUpload}
                                                            disabled={uploadingImage}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                            {errors.coverImage && <p className="text-red-500 text-sm">{errors.coverImage.message}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Excerpt</Label>
                                            <Textarea
                                                {...register("excerpt")}
                                                placeholder="Short summary for search engines and previews..."
                                                className="h-24 resize-none"
                                            />
                                            {errors.excerpt && <p className="text-red-500 text-sm">{errors.excerpt.message}</p>}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6 space-y-4">
                                        <h3 className="font-medium">SEO Settings</h3>
                                        <div className="space-y-2">
                                            <Label>Meta Title</Label>
                                            <Input {...register("seo.metaTitle")} placeholder="Default: Post Title" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Meta Description</Label>
                                            <Textarea {...register("seo.metaDescription")} placeholder="Default: Excerpt" className="h-20" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="publish-switch" className="flex flex-col">
                                                <span className="font-medium">Publish</span>
                                                <span className="text-xs text-muted-foreground">Make visible to everyone</span>
                                            </Label>
                                            <Switch
                                                checked={!!watch("isPublished")}
                                                onCheckedChange={(checked) => setValue("isPublished", checked)}
                                                id="publish-switch"
                                            />
                                        </div>

                                        <Button type="submit" disabled={loading} className="w-full">
                                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            {watch("isPublished") ? "Publish Now" : "Save Draft"}
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="space-y-2">
                                            <Label>Category</Label>
                                            <Select
                                                onValueChange={(value) => setValue("category", value as BlogPostForm["category"])}
                                                defaultValue={watch("category") || "General"}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="General">General</SelectItem>
                                                    <SelectItem value="Painting">Painting</SelectItem>
                                                    <SelectItem value="POP">Plaster of Paris (POP)</SelectItem>
                                                    <SelectItem value="Carpentry">Carpentry</SelectItem>
                                                    <SelectItem value="Tiling">Tiling</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.category && <p className="text-red-500 text-sm">{errors.category.message}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Tags (comma separated)</Label>
                                            <Input
                                                placeholder="design, painting, tips"
                                                onBlur={(e) => {
                                                    const tags = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
                                                    setValue("tags", tags);
                                                }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </form>
        </div>
    );
}
