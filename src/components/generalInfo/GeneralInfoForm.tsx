"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, Save, Edit2, Loader2, Building2, FileText, Phone, MapPin, BadgePercent, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { updateGeneralInfoSchema } from "@/lib/validators";
import { apiFetch, getGeneralInfo } from "@/app/lib/api";
import type { GeneralInfo, ApiError } from "@/app/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FormData = z.infer<typeof updateGeneralInfoSchema>;

// Helper component for read-only fields
const ReadOnlyRow = ({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ElementType;
}) => (
  <div className="flex items-start gap-3 py-2">
    {Icon && (
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
    )}
    <div className="space-y-0.5 w-full">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="text-sm font-medium text-gray-900 break-words">
        {value || <span className="text-muted-foreground italic text-xs">Not configured</span>}
      </div>
    </div>
  </div>
);

export default function GeneralInfoForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo | null>(null);
  const [activeDialog, setActiveDialog] = useState<"identity" | "tax" | "contact" | "terms" | null>(null);

  // Form for editing
  const { control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(updateGeneralInfoSchema),
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const fetchData = async () => {
    try {
      const data = await getGeneralInfo();
      setGeneralInfo(data as GeneralInfo);
      // Ensure we set the preview immediately if a URL exists
      if ((data as GeneralInfo).logoUrl) {
        setPreview((data as GeneralInfo).logoUrl || null);
      }
    } catch {
      toast.error("Failed to fetch general info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditDialog = (section: "identity" | "tax" | "contact" | "terms") => {
    if (!generalInfo) return;

    // Reset form with current values so validation passes
    reset({
      siteName: generalInfo.siteName || "",
      gstNumber: generalInfo.gstNumber || "",
      gstPercent: generalInfo.gstPercent ?? 0,
      termsAndConditions: generalInfo.termsAndConditions ?? [],
      mobileNumber1: generalInfo.mobileNumber1 || "",
      mobileNumber2: generalInfo.mobileNumber2 || "",
      address: generalInfo.address || "",
    });

    // Maintain logo preview state but clear file input
    setLogoFile(null);
    if (generalInfo.logoUrl) {
      setPreview(generalInfo.logoUrl);
    } else {
      setPreview(null);
    }

    setActiveDialog(section);
  };

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

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      formData.append("siteName", data.siteName || "");
      formData.append("gstNumber", data.gstNumber || "");
      formData.append("gstPercent", (data.gstPercent || 0).toString());
      formData.append("termsAndConditions", JSON.stringify(data.termsAndConditions?.map(t => t.trim()).filter((term) => term) || []));
      formData.append("mobileNumber1", data.mobileNumber1 || "");
      if (data.mobileNumber2) {
        formData.append("mobileNumber2", data.mobileNumber2);
      }
      formData.append("address", data.address || "");

      await apiFetch<GeneralInfo>("/general-info", {
        method: "PUT",
        body: formData,
      });

      toast.success("Updated successfully!");
      setActiveDialog(null);
      fetchData(); // Refresh display data
      router.refresh();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to update");
      if (apiError.details) {
        apiError.details.forEach((err: { message: string }) => toast.error(err.message));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!generalInfo) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Settings className="h-10 w-10 mb-2 opacity-20" />
      <p>Failed to load business information</p>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" /> Business Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your company details, branding, and billing preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Identity Section */}
        <Card className="border-0 shadow-md sm:border sm:border-gray-100 bg-white overflow-hidden flex flex-col h-full">
          <CardHeader className="bg-gray-50/40 pb-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Identity & Branding
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => openEditDialog("identity")} className="h-8 text-xs text-primary hover:bg-primary/5">
              <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="p-6 border-b border-gray-100 flex flex-col items-center justify-center gap-3 bg-white">
              <div className="relative h-24 w-24 overflow-hidden rounded-xl border bg-gray-50 flex items-center justify-center shadow-sm">
                {generalInfo.logoUrl ? (
                  <Image
                    src={generalInfo.logoUrl}
                    alt="Logo"
                    fill
                    className="object-contain p-2"
                    unoptimized={true} // Fixed: Added unoptimized to ensure external/local images load
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-300">
                    <ImageIcon className="h-8 w-8 mb-1" />
                    <span className="text-[10px]">No Logo</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Business Logo</p>
              </div>
            </div>

            <div className="p-4">
              <ReadOnlyRow
                label="Registered Business Name"
                value={generalInfo.siteName}
                icon={Building2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax & Legal */}
        <Card className="border-0 shadow-md sm:border sm:border-gray-100 bg-white overflow-hidden flex flex-col h-full">
          <CardHeader className="bg-gray-50/40 pb-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-primary" /> Tax & Legal
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => openEditDialog("tax")} className="h-8 text-xs text-primary hover:bg-primary/5">
              <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <ReadOnlyRow
              label="GST Number"
              value={generalInfo.gstNumber}
              icon={FileText}
            />
            <ReadOnlyRow
              label="GST Percentage"
              value={generalInfo.gstPercent ? `${generalInfo.gstPercent}%` : null}
              icon={BadgePercent}
            />
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="border-0 shadow-md sm:border sm:border-gray-100 bg-white overflow-hidden md:col-span-2">
          <CardHeader className="bg-gray-50/40 pb-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" /> Contact Details
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => openEditDialog("contact")} className="h-8 text-xs text-primary hover:bg-primary/5">
              <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <ReadOnlyRow
                  label="Primary Mobile"
                  value={generalInfo.mobileNumber1}
                  icon={Phone}
                />
                <ReadOnlyRow
                  label="Secondary Mobile"
                  value={generalInfo.mobileNumber2}
                  icon={Phone}
                />
              </div>
              <div>
                <ReadOnlyRow
                  label="Registered Address"
                  value={generalInfo.address}
                  icon={MapPin}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        <Card className="border-0 shadow-md sm:border sm:border-gray-100 bg-white overflow-hidden md:col-span-2">
          <CardHeader className="bg-gray-50/40 pb-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Terms & Conditions
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => openEditDialog("terms")} className="h-8 text-xs text-primary hover:bg-primary/5">
              <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gray-50/80 p-5 rounded-xl border border-dashed border-gray-200 min-h-[120px] max-h-[300px] overflow-y-auto">
              {generalInfo.termsAndConditions && generalInfo.termsAndConditions.length > 0 ? (
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                  {generalInfo.termsAndConditions.map((term, index) => (
                    <li key={index} className="pl-1 leading-relaxed">{term}</li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-4 text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm italic">No terms and conditions configured.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unified Edit Dialog */}
      <Dialog open={!!activeDialog} onOpenChange={(open) => !open && setActiveDialog(null)}>
        {/* max-h-[85vh] prevents dialog from being taller than screen. flex col ensures footer stays at bottom */}
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden flex flex-col max-h-[85vh] gap-0">

          <DialogHeader className="px-6 py-4 bg-gray-50/50 border-b shrink-0">
            <DialogTitle className="text-lg flex items-center gap-2">
              {activeDialog === "identity" && <><Building2 className="h-4 w-4 text-primary" /> Identity & Branding</>}
              {activeDialog === "tax" && <><BadgePercent className="h-4 w-4 text-primary" /> Tax Information</>}
              {activeDialog === "contact" && <><Phone className="h-4 w-4 text-primary" /> Contact Details</>}
              {activeDialog === "terms" && <><FileText className="h-4 w-4 text-primary" /> Terms & Conditions</>}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Make changes to your settings below.
            </DialogDescription>
          </DialogHeader>

          {/* Wrapper for scrollable form content */}
          <div className="flex-1 overflow-y-auto">
            <form id="general-info-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

              {activeDialog === "identity" && (
                <>
                  <div className="space-y-4">
                    <Label htmlFor="logo" className="text-xs font-semibold text-muted-foreground uppercase">Upload Logo</Label>
                    <div className="flex flex-col gap-4 items-center border-2 border-dashed rounded-lg p-6 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      {preview ? (
                        <div className="relative h-32 w-32 border rounded-lg bg-white p-2 shadow-sm">
                          <Image
                            src={preview}
                            alt="Preview"
                            fill
                            className="object-contain"
                            unoptimized={true} // Fixed here as well
                          />
                        </div>
                      ) : (
                        <div className="h-24 w-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                          <Upload className="h-8 w-8" />
                        </div>
                      )}
                      <Input
                        type="file"
                        id="logo"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="text-xs w-full max-w-xs file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteName" className="text-xs font-semibold text-muted-foreground uppercase">Business Name</Label>
                    <Controller
                      control={control}
                      name="siteName"
                      render={({ field }) => <Input {...field} placeholder="Enter business name" className="h-9" />}
                    />
                    {errors.siteName && <p className="text-[11px] text-red-500 font-medium">{errors.siteName.message}</p>}
                  </div>
                </>
              )}

              {activeDialog === "tax" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber" className="text-xs font-semibold text-muted-foreground uppercase">GST Number</Label>
                    <Controller
                      control={control}
                      name="gstNumber"
                      render={({ field }) => (
                        <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || "")} placeholder="e.g. 22AAAAA0000A1Z5" className="h-9 uppercase" />
                      )}
                    />
                    {errors.gstNumber && <p className="text-[11px] text-red-500 font-medium">{errors.gstNumber.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstPercent" className="text-xs font-semibold text-muted-foreground uppercase">GST Percentage (%)</Label>
                    <Controller
                      control={control}
                      name="gstPercent"
                      render={({ field }) => (
                        <Input type="number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(Number(e.target.value))} placeholder="18" className="h-9" />
                      )}
                    />
                    {errors.gstPercent && <p className="text-[11px] text-red-500 font-medium">{errors.gstPercent.message}</p>}
                  </div>
                </>
              )}

              {activeDialog === "contact" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber1" className="text-xs font-semibold text-muted-foreground uppercase">Primary Mobile</Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Controller
                        control={control}
                        name="mobileNumber1"
                        render={({ field }) => <Input {...field} placeholder="Phone number" className="h-9 pl-9" />}
                      />
                    </div>
                    {errors.mobileNumber1 && <p className="text-[11px] text-red-500 font-medium">{errors.mobileNumber1.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber2" className="text-xs font-semibold text-muted-foreground uppercase">Secondary Mobile <span className="text-gray-400 font-normal normal-case">(Optional)</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Controller
                        control={control}
                        name="mobileNumber2"
                        render={({ field }) => (
                          <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || "")} placeholder="Backup phone" className="h-9 pl-9" />
                        )}
                      />
                    </div>
                    {errors.mobileNumber2 && <p className="text-[11px] text-red-500 font-medium">{errors.mobileNumber2.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs font-semibold text-muted-foreground uppercase">Business Address</Label>
                    <Controller
                      control={control}
                      name="address"
                      render={({ field }) => <Textarea {...field} rows={4} placeholder="Enter full registered address" className="resize-none text-sm" />}
                    />
                    {errors.address && <p className="text-[11px] text-red-500 font-medium">{errors.address.message}</p>}
                  </div>
                </>
              )}

              {activeDialog === "terms" && (
                <div className="space-y-2">
                  <Label htmlFor="termsAndConditions" className="text-xs font-semibold text-muted-foreground uppercase">Terms & Conditions</Label>
                  <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3 text-xs text-yellow-800 mb-2">
                    Tip: Each new line will be treated as a separate bullet point in your documents.
                  </div>
                  <Controller
                    control={control}
                    name="termsAndConditions"
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        value={field.value?.join("\n") ?? ""}
                        onChange={(e) => field.onChange(e.target.value.split("\n"))}
                        rows={12}
                        placeholder="1. Payment required in advance..."
                        className="font-sans text-xs resize-y min-h-[250px]"
                      />
                    )}
                  />
                  {errors.termsAndConditions && <p className="text-[11px] text-red-500 font-medium">{errors.termsAndConditions.message}</p>}
                </div>
              )}
            </form>
          </div>

          <DialogFooter className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)} className="h-9 text-xs">Cancel</Button>
            {/* Remote form submission via form ID */}
            <Button form="general-info-form" type="submit" size="sm" disabled={isSubmitting} className="h-9 text-xs bg-primary hover:bg-primary/90">
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}