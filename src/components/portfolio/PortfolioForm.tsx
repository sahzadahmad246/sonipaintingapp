"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Camera, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image"; // Import Next.js Image
import { apiFetch } from "@/app/lib/api";
import type { Portfolio } from "@/app/types";

// Define the form data type directly
interface FormData {
  title?: string;
  description?: string;
  image?: File;
}

// Define validation error type
interface ValidationError {
  message: string;
}

export default function PortfolioForm() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      title: "",
      description: "",
      image: undefined,
    },
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: File | undefined) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      onChange(undefined);
      setImagePreview(null);
    }
  };

  const onSubmit = async (data: FormData) => {
    // Basic manual validation
    if (!data.image) {
      toast.error("Image is required");
      return;
    }

    const formData = new FormData();
    formData.append("image", data.image);
    if (data.title) formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);

    try {
      await apiFetch<Portfolio>("/portfolio", {
        method: "POST",
        body: formData,
      });
      toast.success("Portfolio item created successfully!");
      router.push("/dashboard/portfolio");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create portfolio item";
      toast.error(errorMessage);
      if (error instanceof Error && "details" in error) {
        (error.details as ValidationError[]).forEach((err) => toast.error(err.message));
      }
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Camera className="mr-2 h-6 w-6 text-primary" />
          Add Portfolio Item
        </CardTitle>
        <CardDescription>Upload an image to showcase your work.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title (Optional)</Label>
              <Controller
                control={control}
                name="title"
                render={({ field }) => (
                  <Input {...field} id="title" placeholder="Enter portfolio title" value={field.value ?? ""} />
                )}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="description"
                    placeholder="Enter portfolio description"
                    rows={4}
                    value={field.value ?? ""}
                  />
                )}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>
            <div>
              <Label htmlFor="image">Image</Label>
              <Controller
                control={control}
                name="image"
                rules={{ required: "Image is required" }}
                render={({ field: { onChange } }) => (
                  <Input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, onChange)}
                  />
                )}
              />
              {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image.message}</p>}
              {imagePreview && (
                <div className="mt-4">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={448}
                    height={256}
                    className="w-full max-w-md h-64 object-cover rounded-md"
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Portfolio Item"}
        </Button>
      </CardFooter>
    </Card>
  );
}