"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, FileText } from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  siteImages: File[];
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
  const effectiveProjectId = projectId || (typeof params.projectId === "string" ? params.projectId : "");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
    watch,
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

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "items",
  });

  const { fields: extraWorkFields, append: appendExtraWork, remove: removeExtraWork } = useFieldArray({
    control,
    name: "extraWork",
  });

  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Watch form fields for real-time updates
  const items = watch("items");
  const extraWork = watch("extraWork");
  const discount = watch("discount");

  // Auto-calculate totals
  useEffect(() => {
    items.forEach((item, index) => {
      const area = item.area ?? null;
      const rate = item.rate ?? 0;
      if (area !== null && rate !== null && area > 0 && rate > 0) {
        const total = area * rate;
        setValue(`items.${index}.total`, total, { shouldValidate: true });
      } else {
        setValue(`items.${index}.total`, item.total ?? null, { shouldValidate: true });
      }
    });

    const itemSubtotal = items.reduce((sum: number, item) => {
      const total =
        item.total ?? (item.area && item.rate && item.area > 0 && item.rate > 0 ? item.area * item.rate : 0);
      return sum + (total || 0);
    }, 0);

    const extraWorkSubtotal = extraWork.reduce((sum: number, ew) => sum + (ew.total || 0), 0);

    const subtotal = itemSubtotal + extraWorkSubtotal;
    const grandTotal = subtotal - (discount || 0);

    setValue("subtotal", subtotal, { shouldValidate: true });
    setValue("grandTotal", grandTotal, { shouldValidate: true });
  }, [items, extraWork, discount, setValue]);

  // Fetch quotations and project data
  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const { quotations } = await apiFetch<{ quotations: Quotation[] }>("/quotations");
        setQuotations(quotations);
      } catch (error: unknown) {
        const apiError = error as ApiError;
        toast.error(apiError.error || "Failed to fetch quotations");
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
          siteImages: [],
          existingImages: data.siteImages || [],
          terms: data.terms || [],
          discount: data.discount,
          note: data.note ?? "",
          subtotal: data.subtotal ?? 0,
          grandTotal: data.grandTotal ?? 0,
        });
        setImagePreviews(data.siteImages?.map((img) => img.url) || []);
      } catch (error: unknown) {
        const apiError = error as ApiError;
        toast.error(apiError.error || "Failed to fetch project");
      } finally {
        setLoading(false);
      }
    };

    if (effectiveProjectId) {
      fetchQuotations();
      fetchProject();
    }
  }, [effectiveProjectId, reset]);

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: File[] | null) => void,
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    onChange(files);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const onSubmit = async (data: FormData) => {
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
    formData.append("existingImages", JSON.stringify(data.existingImages));
    data.terms.forEach((term, index) => {
      formData.append(`terms[${index}]`, term);
    });

    if (data.siteImages?.length) {
      data.siteImages.forEach((file, index) => {
        formData.append(`siteImages[${index}]`, file);
      });
    }

    // Log FormData contents for debugging
    console.log("FormData contents:");
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    try {
      await apiFetch<Project>(`/projects/${effectiveProjectId}`, {
        method: "PUT",
        body: formData,
        headers: {}, // Remove Content-Type
      });
      toast.success("Project updated successfully!");
      router.push(`/dashboard/projects/${effectiveProjectId}`);
    } catch (error: unknown) {
      console.error("Update project error:", error);
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to update project");
      if (apiError.details) {
        apiError.details.forEach((err) => toast.error(`Validation error: ${err.message}`));
      }
    }
  };

  if (!effectiveProjectId) {
    return <div>Error: Project ID is required for editing.</div>;
  }

  if (loading) {
    return <div>Loading project data...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-6 w-6 text-primary" />
          Edit Project #{effectiveProjectId}
        </CardTitle>
        <CardDescription>Update the project details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="quotationNumber">Quotation Number</Label>
                <Controller
                  control={control}
                  name="quotationNumber"
                  rules={{ required: "Quotation number is required" }}
                  render={({ field }) => (
                    <select
                      {...field}
                      id="quotationNumber"
                      className="w-full border rounded-md p-2"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="">Select Quotation</option>
                      {quotations.map((q) => (
                        <option key={q.quotationNumber} value={q.quotationNumber}>
                          {q.quotationNumber} - {q.clientName}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.quotationNumber && (
                  <p className="text-red-500 text-sm">{errors.quotationNumber.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Controller
                  control={control}
                  name="clientName"
                  rules={{ required: "Client name is required" }}
                  render={({ field }) => (
                    <Input {...field} id="clientName" placeholder="Enter client name" />
                  )}
                />
                {errors.clientName && <p className="text-red-500 text-sm">{errors.clientName.message}</p>}
              </div>
              <div>
                <Label htmlFor="clientAddress">Client Address</Label>
                <Controller
                  control={control}
                  name="clientAddress"
                  rules={{ required: "Client address is required" }}
                  render={({ field }) => (
                    <Textarea {...field} id="clientAddress" placeholder="Enter client address" rows={3} />
                  )}
                />
                {errors.clientAddress && <p className="text-red-500 text-sm">{errors.clientAddress.message}</p>}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientNumber">Client Number</Label>
                <Controller
                  control={control}
                  name="clientNumber"
                  rules={{ required: "Client number is required" }}
                  render={({ field }) => (
                    <Input {...field} id="clientNumber" placeholder="Enter client phone number" />
                  )}
                />
                {errors.clientNumber && <p className="text-red-500 text-sm">{errors.clientNumber.message}</p>}
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Controller
                  control={control}
                  name="date"
                  rules={{
                    required: "Date is required",
                    validate: (value) => !isNaN(Date.parse(value)) || "Invalid date format",
                  }}
                  render={({ field }) => <Input {...field} id="date" type="date" />}
                />
                {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Items</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() =>
                        appendItem({ description: "", area: null, rate: 0, total: null, note: "" })
                      }
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Item
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add a new item</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-4">
              {itemFields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 border rounded-md bg-gray-50"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={itemFields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove this item</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="lg:col-span-2">
                      <Label htmlFor={`items.${index}.description`}>Description</Label>
                      <Controller
                        control={control}
                        name={`items.${index}.description`}
                        rules={{ required: "Description is required" }}
                        render={({ field }) => <Input {...field} placeholder="Item description" />}
                      />
                      {errors.items?.[index]?.description && (
                        <p className="text-red-500 text-sm">{errors.items[index]?.description?.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.area`}>Area (sq.ft)</Label>
                      <Controller
                        control={control}
                        name={`items.${index}.area`}
                        render={({ field }) => (
                          <Input
                            type="number"
                            placeholder="Area"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : null)
                            }
                          />
                        )}
                      />
                      {errors.items?.[index]?.area && (
                        <p className="text-red-500 text-sm">{errors.items[index]?.area?.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.rate`}>Rate (₹)</Label>
                      <Controller
                        control={control}
                        name={`items.${index}.rate`}
                        rules={{
                          required: "Rate is required",
                          min: { value: 0, message: "Rate must be non-negative" },
                        }}
                        render={({ field }) => (
                          <Input
                            type="number"
                            placeholder="Rate"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        )}
                      />
                      {errors.items?.[index]?.rate && (
                        <p className="text-red-500 text-sm">{errors.items[index]?.rate?.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.total`}>Total (₹)</Label>
                      <Controller
                        control={control}
                        name={`items.${index}.total`}
                        rules={{
                          validate: (value) =>
                            (items[index].area == null ||
                              items[index].rate == null ||
                              items[index].area === 0 ||
                              items[index].rate === 0 ||
                              value != null) ||
                            "Total is required if area or rate is missing or zero",
                        }}
                        render={({ field }) => (
                          <Input
                            type="number"
                            placeholder="Auto-calculated or enter total"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : null)
                            }
                            disabled={
                              items[index].area != null &&
                              items[index].rate != null &&
                              items[index].area > 0 &&
                              items[index].rate > 0
                            }
                          />
                        )}
                      />
                      {errors.items?.[index]?.total && (
                        <p className="text-red-500 text-sm">{errors.items[index]?.total?.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label htmlFor={`items.${index}.note`}>Note (Optional)</Label>
                    <Controller
                      control={control}
                      name={`items.${index}.note`}
                      render={({ field }) => (
                        <Input {...field} placeholder="Additional notes" value={field.value ?? ""} />
                      )}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            {errors.items && <p className="text-red-500 text-sm">{errors.items.message}</p>}
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Extra Work</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => appendExtraWork({ description: "", total: 0, note: "" })}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Extra Work
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add extra work</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-4">
              {extraWorkFields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 border rounded-md bg-gray-50"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Extra Work {index + 1}</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeExtraWork(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove this extra work</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`extraWork.${index}.description`}>Description</Label>
                      <Controller
                        control={control}
                        name={`extraWork.${index}.description`}
                        rules={{ required: "Description is required" }}
                        render={({ field }) => <Input {...field} placeholder="Extra work description" />}
                      />
                      {errors.extraWork?.[index]?.description && (
                        <p className="text-red-500 text-sm">{errors.extraWork[index]?.description?.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`extraWork.${index}.total`}>Total (₹)</Label>
                      <Controller
                        control={control}
                        name={`extraWork.${index}.total`}
                        rules={{
                          required: "Total is required",
                          min: { value: 0, message: "Total must be non-negative" },
                        }}
                        render={({ field }) => (
                          <Input
                            type="number"
                            placeholder="Total"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        )}
                      />
                      {errors.extraWork?.[index]?.total && (
                        <p className="text-red-500 text-sm">{errors.extraWork[index]?.total?.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label htmlFor={`extraWork.${index}.note`}>Note (Optional)</Label>
                    <Controller
                      control={control}
                      name={`extraWork.${index}.note`}
                      render={({ field }) => (
                        <Input {...field} placeholder="Additional notes" value={field.value ?? ""} />
                      )}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <Label htmlFor="siteImages">Site Images</Label>
            <Controller
              control={control}
              name="siteImages"
              render={({ field: { onChange } }) => (
                <Input
                  type="file"
                  id="siteImages"
                  multiple
                  accept="image/*"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageChange(e, onChange)}
                />
              )}
            />
            {errors.siteImages && <p className="text-red-500 text-sm">{errors.siteImages.message}</p>}
            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <Image
                    key={index}
                    src={preview}
                    alt={`Site image preview ${index + 1}`}
                    width={128}
                    height={128}
                    className="w-full h-32 object-cover rounded-md"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <div className="mb-4">
                <Label htmlFor="note">Additional Notes</Label>
                <Controller
                  control={control}
                  name="note"
                  render={({ field }) => (
                    <Textarea {...field} id="note" placeholder="Any additional notes" rows={4} value={field.value ?? ""} />
                  )}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const defaultTerms = [
                        "50% advance payment required before starting the work.",
                        "Balance payment to be made within 7 days of completion.",
                        "Prices are valid for 30 days from the date of quotation.",
                        "Any additional work will be charged separately.",
                        "Warranty of 1 year on workmanship.",
                      ];
                      setValue("terms", defaultTerms);
                    }}
                  >
                    Load Default Terms
                  </Button>
                </div>
                <Controller
                  control={control}
                  name="terms"
                  render={({ field }) => (
                    <Textarea
                      id="terms"
                      placeholder="Enter terms, one per line"
                      rows={6}
                      value={field.value?.join("\n") ?? ""}
                      onChange={(e) => field.onChange(e.target.value.split("\n").filter((term) => term.trim()))}
                    />
                  )}
                />
                <p className="text-sm text-gray-500 mt-1">Enter each term on a new line</p>
              </div>
            </div>

            <div>
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Project Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal:</span>
                    <Controller
                      control={control}
                      name="subtotal"
                      render={({ field }) => (
                        <span className="font-medium">₹{(field.value ?? 0).toFixed(2)}</span>
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <Label htmlFor="discount">Discount:</Label>
                      <div className="w-1/3">
                        <Controller
                          control={control}
                          name="discount"
                          rules={{ min: { value: 0, message: "Discount cannot be negative" } }}
                          render={({ field }) => (
                            <Input
                              id="discount"
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              className="text-right"
                            />
                          )}
                        />
                        {errors.discount && <p className="text-red-500 text-sm">{errors.discount.message}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-lg font-semibold">Grand Total:</span>
                    <Controller
                      control={control}
                      name="grandTotal"
                      render={({ field }) => (
                        <span className="text-lg font-bold text-primary">₹{(field.value ?? 0).toFixed(2)}</span>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="submit" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Updating..." : "Update Project"}
        </Button>
      </CardFooter>
    </Card>
  );
}