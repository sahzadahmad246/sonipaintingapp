"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { updateGeneralInfoSchema } from "@/lib/validators";
import { apiFetch, getGeneralInfo } from "@/app/lib/api";
import type { GeneralInfo, ApiError } from "@/app/types";

type FormData = z.infer<typeof updateGeneralInfoSchema>;

export default function GeneralInfoForm() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(updateGeneralInfoSchema),
    defaultValues: {
      siteName: "",
      gstNumber: "",
      gstPercent: 0,
      termsAndConditions: [],
      mobileNumber1: "",
      mobileNumber2: "",
      address: "",
    },
  });

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchGeneralInfo = async () => {
      try {
        const data = await getGeneralInfo();
        console.log("getGeneralInfo response:", data); // Debug API response
        // Type assertion to bypass TypeScript errors temporarily
        const generalInfo = data as GeneralInfo;
        reset({
          siteName: generalInfo.siteName || "",
          gstNumber: generalInfo.gstNumber || "",
          gstPercent: generalInfo.gstPercent ?? 0,
          termsAndConditions: generalInfo.termsAndConditions ?? [],
          mobileNumber1: generalInfo.mobileNumber1 || "",
          mobileNumber2: generalInfo.mobileNumber2 || "",
          address: generalInfo.address || "",
        });
        setPreview(generalInfo.logoUrl || null);
      } catch (error: unknown) {
        const apiError = error as ApiError;
        toast.error(apiError.error || "Failed to fetch general info");
      } finally {
        setLoading(false);
      }
    };
    fetchGeneralInfo();
  }, [reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const formData = new FormData();
      if (logoFile){
        formData.append("logo", logoFile);
      }
      formData.append("siteName", data.siteName || "");
      formData.append("gstNumber", data.gstNumber || "");
      formData.append("gstPercent", (data.gstPercent || 0).toString());
      formData.append("termsAndConditions", JSON.stringify(data.termsAndConditions?.filter((term) => term.trim()) || []));
      formData.append("mobileNumber1", data.mobileNumber1 || "");
      if (data.mobileNumber2) {
        formData.append("mobileNumber2", data.mobileNumber2);
      }
      formData.append("address", data.address || "");

      await apiFetch<GeneralInfo>("/general-info", {
        method: "PUT",
        body: formData,
      });
      toast.success("General info updated successfully!");
      router.refresh();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to update general info");
      if (apiError.details) {
        apiError.details.forEach((err: { message: string }) => toast.error(err.message));
      }
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-6 w-6 text-primary" />
          Business Settings
        </CardTitle>
        <CardDescription>Update your business information and terms.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo">Logo</Label>
                <Input
                  type="file"
                  id="logo"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {preview && (
                  <Image
                    src={preview}
                    alt="Logo Preview"
                    width={80}
                    height={80}
                    className="mt-2 object-contain"
                  />
                )}
              </div>
              <div>
                <Label htmlFor="siteName">Business Name</Label>
                <Controller
                  control={control}
                  name="siteName"
                  render={({ field }) => (
                    <Input {...field} id="siteName" placeholder="Enter business name" />
                  )}
                />
                {errors.siteName && <p className="text-red-500 text-sm mt-1">{errors.siteName.message}</p>}
              </div>
              <div>
                <Label htmlFor="gstNumber">GST Number</Label>
                <Controller
                  control={control}
                  name="gstNumber"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="gstNumber"
                      placeholder="Enter GST number"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || "")}
                    />
                  )}
                />
                {errors.gstNumber && <p className="text-red-500 text-sm mt-1">{errors.gstNumber.message}</p>}
              </div>
              <div>
                <Label htmlFor="gstPercent">GST Percent</Label>
                <Controller
                  control={control}
                  name="gstPercent"
                  render={({ field }) => (
                    <Input
                      type="number"
                      id="gstPercent"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      placeholder="Enter GST percent"
                    />
                  )}
                />
                {errors.gstPercent && <p className="text-red-500 text-sm mt-1">{errors.gstPercent.message}</p>}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="mobileNumber1">Primary Mobile Number</Label>
                <Controller
                  control={control}
                  name="mobileNumber1"
                  render={({ field }) => (
                    <Input {...field} id="mobileNumber1" placeholder="Enter primary mobile number" />
                  )}
                />
                {errors.mobileNumber1 && <p className="text-red-500 text-sm mt-1">{errors.mobileNumber1.message}</p>}
              </div>
              <div>
                <Label htmlFor="mobileNumber2">Secondary Mobile Number (Optional)</Label>
                <Controller
                  control={control}
                  name="mobileNumber2"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="mobileNumber2"
                      placeholder="Enter secondary mobile number"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || "")}
                    />
                  )}
                />
                {errors.mobileNumber2 && <p className="text-red-500 text-sm mt-1">{errors.mobileNumber2.message}</p>}
              </div>
              <div>
                <Label htmlFor="address">Business Address</Label>
                <Controller
                  control={control}
                  name="address"
                  render={({ field }) => (
                    <Textarea {...field} id="address" placeholder="Enter business address" rows={4} />
                  )}
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="termsAndConditions">Default Terms & Conditions</Label>
            <Controller
              control={control}
              name="termsAndConditions"
              render={({ field }) => (
                <Textarea
                  id="termsAndConditions"
                  placeholder="Enter terms, one per line"
                  rows={6}
                  value={field.value?.join("\n") ?? ""}
                  onChange={(e) => field.onChange(e.target.value.split("\n").filter((term) => term.trim()))}
                />
              )}
            />
            <p className="text-sm text-gray-500 mt-1">Enter each term on a new line</p>
            {errors.termsAndConditions && <p className="text-red-500 text-sm mt-1">{errors.termsAndConditions.message}</p>}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}