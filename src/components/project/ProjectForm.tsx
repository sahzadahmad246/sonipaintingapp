"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Save,
  FileText,
  ImageIcon,
  User,
  ArrowLeft,
  Loader2,
  Upload,
  FileEdit,
  Package,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { apiFetch } from "@/app/lib/api";
import type { Project, Quotation } from "@/app/types";

interface ProjectFormProps {
  projectId?: string;
}

interface FormData {
  quotationNumber: string;
  clientName: string;
  clientAddress: string;
  clientNumber: string;
  date: string;
  items: {
    description: string;
    area?: number | null;
    rate: number;
    total?: number | null;
    note?: string;
  }[];
  extraWork: {
    description: string;
    total: number;
    note?: string;
  }[];
  siteImages: {
    file?: File;
    url?: string;
    publicId?: string;
  }[];
  existingImages: { url: string; publicId: string }[];
  terms: string[];
  discount: number;
  note?: string;
  subtotal: number;
  grandTotal: number;
}

interface ApiError {
  error?: string;
  details?: { message: string }[];
}

export default function ProjectForm({ projectId }: ProjectFormProps) {
  const router = useRouter();
  const params = useParams();
  const effectiveProjectId =
    projectId || (typeof params.projectId === "string" ? params.projectId : "");

  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
    getValues,
  } = useForm<FormData>({
    defaultValues: {
      quotationNumber: "",
      clientName: "",
      clientAddress: "",
      clientNumber: "",
      date: new Date().toISOString().split("T")[0],
      items: [{ description: "", area: null, rate: 0, total: null, note: "" }],
      extraWork: [],
      siteImages: [],
      existingImages: [],
      terms: [],
      discount: 0,
      note: "",
      subtotal: 0,
      grandTotal: 0,
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: "items",
  });

  const {
    fields: extraWorkFields,
    append: appendExtraWork,
    remove: removeExtraWork,
  } = useFieldArray({
    control,
    name: "extraWork",
  });

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray({
    control,
    name: "siteImages",
  });

  // Watch form fields
  const items = watch("items");
  const extraWork = watch("extraWork");
  const discount = watch("discount");
  const watchedImages = watch("siteImages");

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const currentItems = getValues("items");
    const currentExtraWork = getValues("extraWork");
    const currentDiscount = getValues("discount") || 0;

    const itemSubtotal = currentItems.reduce((sum, item) => {
      if (item.total != null) {
        return sum + item.total;
      } else if (
        item.area != null &&
        item.area > 0 &&
        item.rate > 0
      ) {
        return sum + item.area * item.rate;
      }
      return sum;
    }, 0);

    const extraWorkSubtotal = currentExtraWork.reduce(
      (sum, ew) => sum + (ew.total || 0),
      0
    );

    const subtotal = itemSubtotal + extraWorkSubtotal;
    const grandTotal = Math.max(0, subtotal - currentDiscount);

    setValue("subtotal", subtotal, { shouldValidate: true });
    setValue("grandTotal", grandTotal, { shouldValidate: true });

    return { subtotal, grandTotal };
  }, [getValues, setValue]);

  // Update item total
  const updateItemTotal = useCallback(
    (index: number) => {
      const currentItems = getValues("items");
      const item = currentItems[index];

      if (
        item &&
        item.area != null &&
        item.area > 0 &&
        item.rate > 0
      ) {
        const total = item.area * item.rate;
        setValue(`items.${index}.total`, total, { shouldValidate: true });
      } else if ((item.area == null || item.area === 0) && item.rate > 0) {
        setValue(`items.${index}.total`, item.rate, { shouldValidate: true });
      }

      calculateTotals();
    },
    [getValues, setValue, calculateTotals]
  );

  // Auto-calculate totals
  useEffect(() => {
    // We don't blindly recalculate item totals here to avoid overwriting manual edits if logic is complex,
    // but consistent with QuotationForm logic:
    items.forEach((item, index) => {
      if (item.area != null && item.area > 0 && item.rate > 0) {
        const total = item.area * item.rate;
        // Only update if different to avoid loops? react-hook-form handles value checks usually.
        if (item.total !== total) {
          setValue(`items.${index}.total`, total, { shouldValidate: true });
        }
      } else if ((item.area == null || item.area === 0) && item.rate > 0) {
        if (item.total !== item.rate) {
          setValue(`items.${index}.total`, item.rate, { shouldValidate: true });
        }
      }
    });

    calculateTotals();
  }, [items, extraWork, discount, setValue, calculateTotals]);

  // Fetch Data
  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const { quotations } = await apiFetch<{ quotations: Quotation[] }>(
          "/quotations"
        );
        setQuotations(quotations);
      } catch {
        toast.error("Failed to fetch quotations");
      }
    };

    const fetchProject = async () => {
      try {
        const data = await apiFetch<Project>(`/projects/${effectiveProjectId}`);
        reset({
          quotationNumber: data.quotationNumber,
          clientName: data.clientName,
          clientAddress: data.clientAddress,
          clientNumber: data.clientNumber,
          date: new Date(data.date).toISOString().split("T")[0],
          items: data.items.map((item) => ({
            description: item.description,
            area: item.area ?? null,
            rate: item.rate,
            total: item.total ?? null,
            note: item.note ?? "",
          })),
          extraWork: data.extraWork || [],
          siteImages: data.siteImages?.map(img => ({ url: img.url, publicId: img.publicId })) || [],
          existingImages: data.siteImages || [],
          terms: data.terms || [],
          discount: data.discount,
          note: data.note ?? "",
          subtotal: data.subtotal ?? 0,
          grandTotal: data.grandTotal ?? 0,
        });

        // Force calculation
        setTimeout(() => calculateTotals(), 100);
      } catch (error) {
        const apiError = error as ApiError;
        toast.error(apiError.error || "Failed to fetch project");
      } finally {
        setLoading(false);
      }
    };

    fetchQuotations();
    if (effectiveProjectId) {
      fetchProject();
    } else {
      setLoading(false);
    }
  }, [effectiveProjectId, reset, calculateTotals]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      newFiles.forEach(file => {
        appendImage({ file, url: URL.createObjectURL(file) });
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmittingForm(true);
      const { subtotal, grandTotal } = calculateTotals();
      data.subtotal = subtotal;
      data.grandTotal = grandTotal;

      const formData = new FormData();
      formData.append("projectId", effectiveProjectId);
      formData.append("quotationNumber", data.quotationNumber);
      formData.append("clientName", data.clientName);
      formData.append("clientAddress", data.clientAddress);
      formData.append("clientNumber", data.clientNumber);
      formData.append("date", new Date(data.date).toISOString());
      formData.append("items", JSON.stringify(data.items));
      formData.append("extraWork", JSON.stringify(data.extraWork));
      formData.append("discount", String(data.discount));
      formData.append("note", data.note || "");
      formData.append("subtotal", String(data.subtotal));
      formData.append("grandTotal", String(data.grandTotal));

      const existingImages = data.siteImages
        .filter(img => img.url && img.publicId)
        .map(img => ({ url: img.url, publicId: img.publicId }));

      formData.append("existingImages", JSON.stringify(existingImages));

      data.terms.forEach((term, index) => {
        formData.append(`terms[${index}]`, term);
      });

      // Handle new image uploads
      data.siteImages.forEach((img, index) => {
        if (img.file) {
          // We can't easily map arrays of files with inconsistent indices in FormData if we mix existing and new
          // But the backend loop handles `siteImages[` prefix.
          // Let's just append all new files.
          formData.append(`siteImages[${index}]`, img.file);
        }
      });

      await apiFetch<Project>(`/projects/${effectiveProjectId}`, {
        method: "PUT",
        body: formData,
      });

      toast.success("Project updated successfully!");
      router.push(`/dashboard/projects/${effectiveProjectId}`);
    } catch (error) {
      console.error("Update project error:", error);
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to update project");
      if (apiError.details) {
        apiError.details.forEach((err) =>
          toast.error(`Validation error: ${err.message}`)
        );
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  if (!effectiveProjectId) {
    return <div>Error: Project ID is required for editing.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading project data...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="h-10 w-10 shrink-0 rounded-xl border border-border bg-card shadow-sm transition-all hover:scale-105 hover:shadow-md"
              >
                <Link href={`/dashboard/projects/${effectiveProjectId}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Edit Project
                  </h1>
                  <Badge variant="secondary" className="font-mono text-xs">
                    #{effectiveProjectId}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update project details and manage work status
                </p>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmittingForm}
                className="gap-2 rounded-full px-6 shadow-md hover:shadow-lg transition-all"
              >
                {isSubmittingForm ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSubmittingForm ? "Saving..." : "Save Project"}
              </Button>
            </motion.div>
          </div>
        </motion.header>

        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <TabsList className="inline-flex h-12 w-full gap-1 rounded-2xl bg-muted/50 p-1.5 sm:w-auto">
              <TabsTrigger value="details" className="flex-1 gap-2 rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:flex-initial">
                <FileEdit className="h-4 w-4" /> <span>Details</span>
              </TabsTrigger>
              <TabsTrigger value="items" className="flex-1 gap-2 rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:flex-initial">
                <Package className="h-4 w-4" />
                <span>Items</span>
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs text-primary bg-primary/10">
                  {itemFields.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="extraWork" className="flex-1 gap-2 rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:flex-initial">
                <Briefcase className="h-4 w-4" />
                <span>Extra Work</span>
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs text-primary bg-primary/10">
                  {extraWorkFields.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="images" className="flex-1 gap-2 rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:flex-initial">
                <ImageIcon className="h-4 w-4" />
                <span>Images</span>
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs text-primary bg-primary/10">
                  {imageFields.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-0 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
              <Card className="overflow-hidden border-0 bg-card shadow-sm">
                <div className="border-b bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Client Information
                  </h3>
                </div>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Client Name</Label>
                      <Controller
                        control={control}
                        name="clientName"
                        rules={{ required: "Client name is required" }}
                        render={({ field }) => (
                          <Input {...field} placeholder="Client name" className="h-10 rounded-xl bg-muted/30" />
                        )}
                      />
                      {errors.clientName && <p className="text-xs text-destructive">{errors.clientName.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Client Number</Label>
                      <Controller
                        control={control}
                        name="clientNumber"
                        rules={{ required: "Client number is required" }}
                        render={({ field }) => (
                          <Input {...field} placeholder="Client number" className="h-10 rounded-xl bg-muted/30" />
                        )}
                      />
                      {errors.clientNumber && <p className="text-xs text-destructive">{errors.clientNumber.message}</p>}
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Address</Label>
                      <Controller
                        control={control}
                        name="clientAddress"
                        rules={{ required: "Client address is required" }}
                        render={({ field }) => (
                          <Textarea {...field} placeholder="Client address" className="min-h-[80px] rounded-xl bg-muted/30 resize-none" />
                        )}
                      />
                      {errors.clientAddress && <p className="text-xs text-destructive">{errors.clientAddress.message}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-0 bg-card shadow-sm">
                <div className="border-b bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Project Details
                  </h3>
                </div>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quotation Reference</Label>
                      <Controller
                        control={control}
                        name="quotationNumber"
                        rules={{ required: "Quotation number is required" }}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-10 rounded-xl bg-muted/30">
                              <SelectValue placeholder="Select Quotation" />
                            </SelectTrigger>
                            <SelectContent>
                              {quotations.map(q => (
                                <SelectItem key={q.quotationNumber} value={q.quotationNumber}>
                                  {q.quotationNumber} - {q.clientName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.quotationNumber && <p className="text-xs text-destructive">{errors.quotationNumber.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</Label>
                      <Controller
                        control={control}
                        name="date"
                        rules={{ required: "Date is required" }}
                        render={({ field }) => (
                          <Input type="date" {...field} className="h-10 rounded-xl bg-muted/30" />
                        )}
                      />
                      {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Private Note</Label>
                      <Controller
                        control={control}
                        name="note"
                        render={({ field }) => (
                          <Textarea {...field} placeholder="Internal notes" className="min-h-[80px] rounded-xl bg-muted/30 resize-none" />
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="mt-0 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="overflow-hidden border-0 bg-card shadow-sm">
                <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Work Items
                  </h3>
                </div>
                <CardContent className="p-0">
                  <div className="space-y-0 divide-y">
                    {itemFields.map((field, index) => (
                      <div key={field.id} className="p-4 sm:p-6 transition-colors hover:bg-muted/5">
                        <div className="flex items-start justify-between mb-4">
                          <Badge variant="outline" className="rounded-md bg-background font-mono text-xs">
                            Item {index + 1}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-12">
                          <div className="sm:col-span-12 lg:col-span-5 space-y-2">
                            <Label className="text-xs font-medium">Description</Label>
                            <Controller
                              control={control}
                              name={`items.${index}.description`}
                              rules={{ required: "Required" }}
                              render={({ field }) => (
                                <Input {...field} placeholder="Description" className="h-10 rounded-xl bg-muted/30" />
                              )}
                            />
                          </div>
                          <div className="sm:col-span-4 lg:col-span-2 space-y-2">
                            <Label className="text-xs font-medium">Area (sq.ft)</Label>
                            <Controller
                              control={control}
                              name={`items.${index}.area`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={e => {
                                    field.onChange(e.target.value ? Number(e.target.value) : null);
                                    setTimeout(() => updateItemTotal(index), 0);
                                  }}
                                  placeholder="0"
                                  className="h-10 rounded-xl bg-muted/30"
                                />
                              )}
                            />
                          </div>
                          <div className="sm:col-span-4 lg:col-span-2 space-y-2">
                            <Label className="text-xs font-medium">Rate (₹)</Label>
                            <Controller
                              control={control}
                              name={`items.${index}.rate`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={e => {
                                    field.onChange(Number(e.target.value));
                                    setTimeout(() => updateItemTotal(index), 0);
                                  }}
                                  placeholder="0"
                                  className="h-10 rounded-xl bg-muted/30"
                                />
                              )}
                            />
                          </div>
                          <div className="sm:col-span-4 lg:col-span-3 space-y-2">
                            <Label className="text-xs font-medium">Total (₹)</Label>
                            <Controller
                              control={control}
                              name={`items.${index}.total`}
                              render={({ field }) => (
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    {...field}
                                    value={field.value ?? ""}
                                    readOnly={
                                      (items[index].area || 0) > 0 && (items[index].rate || 0) > 0
                                    }
                                    onChange={e => {
                                      field.onChange(e.target.value ? Number(e.target.value) : null);
                                      setTimeout(() => calculateTotals(), 0);
                                    }}
                                    className={`h-10 rounded-xl pl-9 ${(items[index].area || 0) > 0 && (items[index].rate || 0) > 0
                                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                                      : "bg-muted/30"
                                      }`}
                                  />
                                </div>
                              )}
                            />
                          </div>
                          <div className="sm:col-span-12 space-y-2">
                            <Label className="text-xs font-medium">Item Note</Label>
                            <Controller
                              control={control}
                              name={`items.${index}.note`}
                              render={({ field }) => (
                                <Input {...field} placeholder="Additional details..." className="h-10 rounded-xl bg-muted/30" />
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {itemFields.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">No items added</h3>
                        <p className="mb-4 text-sm text-muted-foreground max-w-sm">
                          Start extending the scope of this project by adding work items.
                        </p>
                        <Button onClick={() => appendItem({ description: "", area: null, rate: 0, total: null, note: "" })} variant="outline">
                          Add First Item
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <div className="mt-6">
                <Card className="overflow-hidden border-0 bg-card shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Items Subtotal</p>
                        <div className="text-2xl font-bold tracking-tight">
                          ₹{items.reduce((acc, item) => acc + (item.total || 0), 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          {/* Extra Work Tab */}
          <TabsContent value="extraWork" className="mt-0 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="overflow-hidden border-0 bg-card shadow-sm">
                <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Extra Work
                  </h3>
                </div>
                <CardContent className="p-0">
                  <div className="space-y-0 divide-y">
                    {extraWorkFields.map((field, index) => (
                      <div key={field.id} className="p-4 sm:p-6 transition-colors hover:bg-muted/5">
                        <div className="flex items-start justify-between mb-4">
                          <Badge variant="outline" className="rounded-md bg-background font-mono text-xs">
                            Extra {index + 1}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExtraWork(index)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-12">
                          <div className="sm:col-span-8 space-y-2">
                            <Label className="text-xs font-medium">Description</Label>
                            <Controller
                              control={control}
                              name={`extraWork.${index}.description`}
                              rules={{ required: "Required" }}
                              render={({ field }) => (
                                <Input {...field} placeholder="Description of extra work" className="h-10 rounded-xl bg-muted/30" />
                              )}
                            />
                          </div>
                          <div className="sm:col-span-4 space-y-2">
                            <Label className="text-xs font-medium">Amount (₹)</Label>
                            <Controller
                              control={control}
                              name={`extraWork.${index}.total`}
                              rules={{ required: "Required" }}
                              render={({ field }) => (
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={e => {
                                      field.onChange(Number(e.target.value));
                                      setTimeout(() => calculateTotals(), 0);
                                    }}
                                    className="h-10 rounded-xl pl-9 bg-muted/30"
                                  />
                                </div>
                              )}
                            />
                          </div>
                          <div className="sm:col-span-12 space-y-2">
                            <Label className="text-xs font-medium">Note</Label>
                            <Controller
                              control={control}
                              name={`extraWork.${index}.note`}
                              render={({ field }) => (
                                <Input {...field} placeholder="Additional notes" className="h-10 rounded-xl bg-muted/30" />
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {extraWorkFields.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Briefcase className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">No extra work</h3>
                        <p className="mb-4 text-sm text-muted-foreground max-w-sm">
                          If any out-of-scope work needs to be tracked, add it here.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="border-t bg-muted/30 p-4 sm:p-6 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendExtraWork({ description: "", total: 0, note: "" })}
                      className="w-full sm:w-auto gap-2 border-dashed"
                    >
                      <Plus className="h-4 w-4" /> Add Extra Work
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="mt-0 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="overflow-hidden border-0 bg-card shadow-sm">
                <div className="border-b bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <ImageIcon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Site Images
                  </h3>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Upload Button */}
                    <div className="relative aspect-video cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/10 hover:bg-muted/20 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">Click to upload</p>
                      </div>
                    </div>

                    {/* Images List */}
                    {watchedImages.map((img, index) => (
                      <div key={index} className="group relative aspect-video overflow-hidden rounded-xl bg-muted">
                        <Image
                          src={img.url || "/placeholder.svg"}
                          alt={`Project Image ${index + 1}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8 translate-y-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100"
                          onClick={() => removeImage(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Footer Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card className="overflow-hidden border-0 bg-card shadow-lg ring-1 ring-border/50">
            <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 lg:w-1/2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Discount</Label>
                  <div className="relative max-w-[200px]">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Controller
                      control={control}
                      name="discount"
                      render={({ field }) => (
                        <Input
                          type="number"
                          {...field}
                          onChange={e => {
                            field.onChange(Number(e.target.value));
                            setTimeout(() => calculateTotals(), 0);
                          }}
                          className="h-10 rounded-xl pl-9 bg-muted/30"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl bg-muted/30 p-4 lg:w-1/3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{getValues("subtotal").toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">-₹{getValues("discount").toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold text-primary">
                  <span>Grand Total</span>
                  <span>₹{getValues("grandTotal").toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
