"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, Loader2, X, Settings, FileText, Eye } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

type BlogPostForm = z.infer<typeof blogPostSchema>;

export default function EditBlogPost({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);

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
            seo: {
                metaTitle: "",
                metaDescription: "",
                keywords: [],
            },
        },
    });

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;
    const coverImage = watch("coverImage");
    const isPublished = watch("isPublished");

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const res = await axios.get(`/api/blog/${id}`);
                const post = res.data;
                reset({
                    title: post.title,
                    slug: post.slug,
                    excerpt: post.excerpt,
                    content: post.content,
                    coverImage: post.coverImage,
                    isPublished: post.isPublished,
                    tags: post.tags,
                    category: post.category || "General",
                    seo: post.seo || {},
                });
            } catch {
                toast.error("Failed to load post");
                router.push("/dashboard/blog");
            } finally {
                setFetching(false);
            }
        };
        if (id) fetchPost();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, reset, router]);

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
        } catch {
            toast.error("Failed to upload image");
        } finally {
            setUploadingImage(false);
        }
    };

    const onSubmit = async (data: BlogPostForm) => {
        setLoading(true);
        try {
            await axios.patch(`/api/blog/${id}`, data);
            toast.success("Blog post updated successfully");
            router.push("/dashboard/blog");
        } catch {
            toast.error("Failed to update post");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground animate-pulse">Loading post data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <form onSubmit={handleSubmit(onSubmit)}>
                {/* Sticky Header Bar */}
                <div className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b">
                    <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard/blog">
                                <Button variant="ghost" size="sm" className="text-muted-foreground">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                            </Link>
                            <Separator orientation="vertical" className="h-6" />
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 leading-none">Editor</span>
                                <span className="text-sm font-medium truncate max-w-[200px]">{watch("title") || "Untitled"}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center gap-2 mr-4 text-xs font-medium text-muted-foreground">
                                <span className={`h-2 w-2 rounded-full ${isPublished ? 'bg-green-500' : 'bg-amber-500'}`} />
                                {isPublished ? "Live" : "Draft"}
                            </div>
                            <Button type="submit" disabled={loading} size="sm" className="px-6">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto p-6 mt-4">
                    <Tabs defaultValue="content" className="space-y-6">
                        <div className="flex justify-center">
                            <TabsList className="bg-slate-100 p-1">
                                <TabsTrigger value="content" className="flex items-center gap-2 px-6">
                                    <FileText className="w-4 h-4" /> Content
                                </TabsTrigger>
                                <TabsTrigger value="settings" className="flex items-center gap-2 px-6">
                                    <Settings className="w-4 h-4" /> Meta & Settings
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* CONTENT TAB */}
                        <TabsContent value="content" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-6 bg-white border rounded-xl p-8 shadow-sm">
                                <div className="space-y-4">
                                    <Input
                                        {...register("title")}
                                        placeholder="Article Title..."
                                        className="text-4xl md:text-5xl font-black border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-slate-200 h-auto py-2 tracking-tight"
                                    />
                                    {errors.title && <p className="text-destructive text-sm font-medium">{errors.title.message}</p>}

                                    <div className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-lg w-fit border border-slate-100">
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Slug</span>
                                        <input
                                            {...register("slug")}
                                            className="text-xs font-mono bg-transparent outline-none border-none text-slate-600 min-w-[200px]"
                                        />
                                    </div>
                                    {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
                                </div>

                                <Separator className="my-6" />

                                <div className="min-h-[500px]">
                                    <BlogEditor
                                        content={watch("content")}
                                        onChange={(html) => setValue("content", html, { shouldValidate: true })}
                                    />
                                </div>
                                {errors.content && <p className="text-destructive text-sm">{errors.content.message}</p>}
                            </div>
                        </TabsContent>

                        {/* SETTINGS TAB */}
                        <TabsContent value="settings" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <Card className="shadow-sm overflow-hidden">
                                        <CardHeader className="bg-slate-50/50 border-b">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <Eye className="w-4 h-4" /> Display Settings
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-6">
                                            <div className="space-y-3">
                                                <Label className="text-sm font-bold">Cover Image</Label>
                                                <div className="relative group aspect-video rounded-xl border-2 border-dashed border-slate-200 overflow-hidden bg-slate-50 transition-all hover:border-primary/50">
                                                    {coverImage ? (
                                                        <>
                                                            <Image src={coverImage} alt="Cover" fill className="object-cover" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => setValue("coverImage", "")}
                                                                >
                                                                    <X className="w-4 h-4 mr-2" /> Remove Image
                                                                </Button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-8">
                                                            <div className="p-4 rounded-full bg-white shadow-sm mb-3">
                                                                <Upload className="w-6 h-6 text-primary" />
                                                            </div>
                                                            <span className="text-sm font-semibold text-slate-600">
                                                                {uploadingImage ? "Uploading to Cloudinary..." : "Upload Cover Image"}
                                                            </span>
                                                            <span className="text-xs text-slate-400 mt-1 text-center">Recommended size: 1200x630px</span>
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-sm font-bold">Excerpt / Summary</Label>
                                                <Textarea
                                                    {...register("excerpt")}
                                                    placeholder="Write a brief, engaging summary..."
                                                    className="h-28 resize-none text-sm leading-relaxed"
                                                />
                                                <p className="text-[10px] text-slate-400">Appears in blog listings and search results.</p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-sm overflow-hidden">
                                        <CardHeader className="bg-slate-50/50 border-b">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">SEO Optimization</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-4">
                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-slate-500 uppercase font-bold">Meta Title</Label>
                                                    <Input {...register("seo.metaTitle")} placeholder="Default: Post Title" className="bg-slate-50 border-slate-200" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-slate-500 uppercase font-bold">Meta Description</Label>
                                                    <Textarea {...register("seo.metaDescription")} placeholder="Default: Excerpt" className="h-20 bg-slate-50 border-slate-200" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-6">
                                    <Card className="shadow-sm border-primary/20 bg-primary/5">
                                        <CardContent className="p-6 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="text-sm font-bold">Publish Post</Label>
                                                    <p className="text-xs text-slate-500">Make this live on the site</p>
                                                </div>
                                                <Switch
                                                    checked={!!isPublished}
                                                    onCheckedChange={(checked) => setValue("isPublished", checked)}
                                                />
                                            </div>
                                            <Separator className="bg-primary/10" />
                                            <Button type="submit" disabled={loading} className="w-full shadow-lg shadow-primary/20">
                                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Publish Changes"}
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-sm">
                                        <CardHeader className="py-4 px-6 border-b">
                                            <CardTitle className="text-sm font-bold">Categorization</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-slate-500 uppercase font-bold">Category</Label>
                                                <Select
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    onValueChange={(value) => setValue("category", value as any)}
                                                    value={watch("category") || "General"}
                                                >
                                                    <SelectTrigger className="w-full bg-slate-50">
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {["General", "Painting", "POP", "Carpentry", "Tiling"].map((cat) => (
                                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs text-slate-500 uppercase font-bold">Tags</Label>
                                                <Input
                                                    placeholder="design, painting, tips..."
                                                    defaultValue={watch("tags")?.join(", ")}
                                                    onBlur={(e) => {
                                                        const tags = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
                                                        setValue("tags", tags);
                                                    }}
                                                    className="bg-slate-50"
                                                />
                                                <p className="text-[10px] text-slate-400 italic">Separate tags with commas</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </form>
        </div>
    );
}