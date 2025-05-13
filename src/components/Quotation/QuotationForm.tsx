"use client";

import type React from "react";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, Trash2, Save, FileText, ImageIcon } from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { apiFetch } from "@/app/lib/api";
import type { Quotation, ApiError } from "@/app/types";

interface QuotationFormProps {
  quotationNumber?: string;
}

interface FormData {
  clientName: string;
  clientAddress: string;
  clientNumber: string;
  date: string;
  items: {
    description: string;
    area?: number;
    rate: number;
    total?: number;
    note?: string;
  }[];
  discount: number;
  note?: string;
  terms: string[];
  subtotal: number;
  grandTotal: number;
  siteImages?: {
    file?: File;
    url?: string;
    publicId?: string;
    description?: string;
  }[];
}

export default function QuotationForm({ quotationNumber }: QuotationFormProps) {
  const router = useRouter();
  const isEditMode = !!quotationNumber;
  const effectiveQuotationNumber = quotationNumber;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
    watch,
    getValues,
  } = useForm<FormData>({
    defaultValues: {
      clientName: "",
      clientAddress: "",
      clientNumber: "",
      date: new Date().toISOString().split("T")[0],
      items: [
        {
          description: "",
          area: undefined,
          rate: 0,
          total: undefined,
          note: "",
        },
      ],
      discount: 0,
      note: "",
      terms: [],
      subtotal: 0,
      grandTotal: 0,
      siteImages: [],
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
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray({
    control,
    name: "siteImages",
  });

  const [loading, setLoading] = useState(isEditMode);
  const [failedImages, setFailedImages] = useState<number[]>([]);

  // Watch form fields for real-time updates
  const items = watch("items");
  const discount = watch("discount");
  const siteImages = watch("siteImages");

  // Calculate totals function that can be called directly
  const calculateTotals = useCallback(() => {
    const currentItems = getValues("items");
    const currentDiscount = getValues("discount") || 0;

    // Calculate subtotal from all items
    const subtotal = currentItems.reduce((sum, item) => {
      if (item.total !== undefined) {
        return sum + item.total;
      } else if (
        item.area !== undefined &&
        item.rate !== undefined &&
        item.area > 0 &&
        item.rate > 0
      ) {
        return sum + item.area * item.rate;
      }
      return sum;
    }, 0);

    // Calculate grand total
    const grandTotal = Math.max(0, subtotal - currentDiscount);

    // Update form values
    setValue("subtotal", subtotal, { shouldValidate: true });
    setValue("grandTotal", grandTotal, { shouldValidate: true });

    return { subtotal, grandTotal };
  }, [getValues, setValue]);

  // Update item total when area or rate changes
  const updateItemTotal = useCallback(
    (index: number) => {
      const currentItems = getValues("items");
      const item = currentItems[index];

      if (
        item &&
        item.area !== undefined &&
        item.rate !== undefined &&
        item.area > 0 &&
        item.rate > 0
      ) {
        const total = item.area * item.rate;
        setValue(`items.${index}.total`, total, { shouldValidate: true });
      }

      // Recalculate subtotal and grand total
      calculateTotals();
    },
    [getValues, setValue, calculateTotals]
  );

  // Calculate totals whenever items or discount change
  useEffect(() => {
    // Calculate individual item totals
    items.forEach((item, index) => {
      if (
        item.area !== undefined &&
        item.rate !== undefined &&
        item.area > 0 &&
        item.rate > 0
      ) {
        const total = item.area * item.rate;
        setValue(`items.${index}.total`, total, { shouldValidate: true });
      }
    });

    // Calculate totals
    calculateTotals();
  }, [items, discount, setValue, calculateTotals]);

  // Fetch quotation data in edit mode
  useEffect(() => {
    if (isEditMode && effectiveQuotationNumber) {
      const fetchQuotation = async () => {
        try {
          const data = await apiFetch<Quotation>(
            `/quotations/${effectiveQuotationNumber}`
          );
          reset({
            clientName: data.clientName,
            clientAddress: data.clientAddress,
            clientNumber: data.clientNumber,
            date: new Date(data.date).toISOString().split("T")[0],
            items: data.items.map((item) => ({
              description: item.description,
              area: item.area ?? undefined,
              rate: item.rate,
              total: item.total ?? undefined,
              note: item.note ?? "",
            })),
            discount: data.discount ?? 0,
            note: data.note ?? "",
            terms: data.terms ?? [],
            subtotal: data.subtotal ?? 0,
            grandTotal: data.grandTotal ?? 0,
            siteImages:
              data.siteImages?.map((img) => ({
                url: img.url,
                publicId: img.publicId,
                description: img.description ?? "",
              })) ?? [],
          });

          // Force calculation after data is loaded
          setTimeout(() => {
            calculateTotals();
          }, 0);
        } catch (error: unknown) {
          const apiError = error as ApiError;
          toast.error(apiError.error || "Failed to fetch quotation");
        } finally {
          setLoading(false);
        }
      };
      fetchQuotation();
    } else {
      setLoading(false);
    }
  }, [isEditMode, effectiveQuotationNumber, reset, calculateTotals]);

  const onSubmit = async (data: FormData) => {
    try {
      // Recalculate totals before submission to ensure accuracy
      const { subtotal, grandTotal } = calculateTotals();
      data.subtotal = subtotal;
      data.grandTotal = grandTotal;

      const formData = new FormData();
      formData.append("clientName", data.clientName);
      formData.append("clientAddress", data.clientAddress);
      formData.append("clientNumber", data.clientNumber);
      formData.append("date", data.date);
      formData.append("items", JSON.stringify(data.items));
      formData.append("discount", data.discount.toString());
      formData.append("note", data.note || "");
      data.terms?.forEach((term, index) => {
        if (term.trim()) formData.append(`terms[${index}]`, term);
      });
      formData.append("subtotal", data.subtotal.toString());
      formData.append("grandTotal", data.grandTotal.toString());

      // Append images and their descriptions
      (data.siteImages || []).forEach((img, index) => {
        if (img.file) {
          formData.append(`siteImages[${index}]`, img.file);
          if (img.description) {
            formData.append(
              `siteImages[${index}].description`,
              img.description
            );
          }
        }
      });

      // Append existing images
      const existingImages = (data.siteImages || [])
        .filter((img) => img.url && img.publicId)
        .map((img) => ({
          url: img.url!,
          publicId: img.publicId!,
          description: img.description,
        }));
      formData.append("existingImages", JSON.stringify(existingImages));

      const url = isEditMode
        ? `/quotations/${effectiveQuotationNumber}`
        : "/quotations";
      const method = isEditMode ? "PUT" : "POST";
      await apiFetch<Quotation>(url, {
        method,
        body: formData,
      });
      toast.success(
        isEditMode
          ? "Quotation updated successfully!"
          : "Quotation created successfully!"
      );
      router.push(
        isEditMode
          ? `/dashboard/quotations/${effectiveQuotationNumber}`
          : "/dashboard/quotations"
      );
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(
        apiError.error ||
          (isEditMode
            ? "Failed to update quotation"
            : "Failed to create quotation")
      );
      if (apiError.details) {
        apiError.details.forEach((err: { message: string }) =>
          toast.error(err.message)
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3 text-lg">Loading quotation data...</span>
      </div>
    );
  }

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="bg-gray-50 border-b">
        <CardTitle className="flex items-center text-primary">
          <FileText className="mr-2 h-6 w-6" />
          {isEditMode
            ? `Edit Quotation #${effectiveQuotationNumber}`
            : "Create New Quotation"}
        </CardTitle>
        <CardDescription>
          {isEditMode
            ? "Update the quotation details."
            : "Fill in the details to create a new quotation."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-base">
                  Client Name
                </Label>
                <Controller
                  control={control}
                  name="clientName"
                  rules={{ required: "Client name is required" }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="clientName"
                      placeholder="Enter client name"
                      className="h-10"
                    />
                  )}
                />
                {errors.clientName && (
                  <p className="text-red-500 text-sm">
                    {errors.clientName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientAddress" className="text-base">
                  Client Address
                </Label>
                <Controller
                  control={control}
                  name="clientAddress"
                  rules={{ required: "Client address is required" }}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="clientAddress"
                      placeholder="Enter client address"
                      rows={3}
                      className="resize-none"
                    />
                  )}
                />
                {errors.clientAddress && (
                  <p className="text-red-500 text-sm">
                    {errors.clientAddress.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clientNumber" className="text-base">
                  Client Number
                </Label>
                <Controller
                  control={control}
                  name="clientNumber"
                  rules={{ required: "Client number is required" }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="clientNumber"
                      placeholder="Enter client phone number"
                      className="h-10"
                    />
                  )}
                />
                {errors.clientNumber && (
                  <p className="text-red-500 text-sm">
                    {errors.clientNumber.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-base">
                  Date
                </Label>
                <Controller
                  control={control}
                  name="date"
                  rules={{
                    required: "Date is required",
                    pattern: {
                      value: /^\d{4}-\d{2}-\d{2}$/,
                      message: "Date must be in YYYY-MM-DD format",
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="date"
                      type="date"
                      placeholder="YYYY-MM-DD"
                      className="h-10"
                    />
                  )}
                />
                {errors.date && (
                  <p className="text-red-500 text-sm">{errors.date.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-gray-800">Items</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => {
                        appendItem({
                          description: "",
                          area: undefined,
                          rate: 0,
                          total: undefined,
                          note: "",
                        });
                        // Force recalculation after adding item
                        setTimeout(() => calculateTotals(), 0);
                      }}
                      className="bg-primary/90 hover:bg-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Item
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add a new item</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-6">
              {itemFields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="p-5 border rounded-lg bg-gray-50 shadow-sm"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-800">
                      Item {index + 1}
                    </h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              removeItem(index);
                              // Force recalculation after removing item
                              setTimeout(() => calculateTotals(), 0);
                            }}
                            disabled={itemFields.length === 1}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove this item</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2">
                      <Label
                        htmlFor={`items.${index}.description`}
                        className="text-sm font-medium"
                      >
                        Description
                      </Label>
                      <Controller
                        control={control}
                        name={`items.${index}.description`}
                        rules={{ required: "Description is required" }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Item description"
                            className="mt-1"
                          />
                        )}
                      />
                      {errors.items?.[index]?.description && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.items[index]?.description?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label
                        htmlFor={`items.${index}.area`}
                        className="text-sm font-medium"
                      >
                        Area (sq.ft)
                      </Label>
                      <Controller
                        control={control}
                        name={`items.${index}.area`}
                        render={({ field }) => (
                          <Input
                            type="number"
                            placeholder="Area"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value
                                ? Number(e.target.value)
                                : undefined;
                              field.onChange(value);

                              // Update item total and recalculate totals
                              setTimeout(() => updateItemTotal(index), 0);
                            }}
                            className="mt-1"
                          />
                        )}
                      />
                      {errors.items?.[index]?.area && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.items[index]?.area?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label
                        htmlFor={`items.${index}.rate`}
                        className="text-sm font-medium"
                      >
                        Rate (₹)
                      </Label>
                      <Controller
                        control={control}
                        name={`items.${index}.rate`}
                        rules={{
                          required: "Rate is required",
                          min: {
                            value: 0,
                            message: "Rate must be non-negative",
                          },
                        }}
                        render={({ field }) => (
                          <Input
                            type="number"
                            placeholder="Rate"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              field.onChange(value);

                              // Update item total and recalculate totals
                              setTimeout(() => updateItemTotal(index), 0);
                            }}
                            className="mt-1"
                          />
                        )}
                      />
                      {errors.items?.[index]?.rate && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.items[index]?.rate?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label
                        htmlFor={`items.${index}.total`}
                        className="text-sm font-medium"
                      >
                        Total (₹)
                      </Label>
                      <Controller
                        control={control}
                        name={`items.${index}.total`}
                        rules={{
                          validate: (value) =>
                            items[index].area == null ||
                            items[index].rate == null ||
                            items[index].area === 0 ||
                            items[index].rate === 0 ||
                            value != null ||
                            "Total is required if area or rate is missing or zero",
                        }}
                        render={({ field }) => (
                          <Input
                            type="number"
                            placeholder="Auto-calculated or enter total"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value
                                ? Number(e.target.value)
                                : undefined;
                              field.onChange(value);

                              // Recalculate totals when manually entering total
                              setTimeout(() => calculateTotals(), 0);
                            }}
                            disabled={
                              items[index].area != null &&
                              items[index].rate != null &&
                              items[index].area > 0 &&
                              items[index].rate > 0
                            }
                            className={`mt-1 ${
                              items[index].area != null &&
                              items[index].rate != null &&
                              items[index].area > 0 &&
                              items[index].rate > 0
                                ? "bg-gray-100"
                                : ""
                            }`}
                          />
                        )}
                      />
                      {errors.items?.[index]?.total && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.items[index]?.total?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label
                      htmlFor={`items.${index}.note`}
                      className="text-sm font-medium"
                    >
                      Note (Optional)
                    </Label>
                    <Controller
                      control={control}
                      name={`items.${index}.note`}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="Additional notes"
                          value={field.value ?? ""}
                          className="mt-1"
                        />
                      )}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            {errors.items && (
              <p className="text-red-500 text-sm">{errors.items.message}</p>
            )}
          </div>

          <div className="mt-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-gray-800">Site Images</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => appendImage({ description: "" })}
                      className="bg-primary/90 hover:bg-primary"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" /> Add Image
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add a new site image</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-6">
              {imageFields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="p-5 border rounded-lg bg-gray-50 shadow-sm"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-800">
                      Image {index + 1}
                    </h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeImage(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove this image</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label
                        htmlFor={`siteImages.${index}.file`}
                        className="text-sm font-medium"
                      >
                        Upload Image
                      </Label>
                      <Controller
                        control={control}
                        name={`siteImages.${index}.file`}
                        render={({ field: { onChange, ref, ...field } }) => (
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) => {
                              const file = e.target.files?.[0];
                              onChange(file);
                            }}
                            ref={ref}
                            {...field}
                            value={undefined}
                            className="mt-1"
                          />
                        )}
                      />
                      {siteImages &&
                        siteImages[index] &&
                        (siteImages[index].url || siteImages[index].file) && (
                          <div className="mt-3 relative">
                            <Image
                              src={
                                failedImages.includes(index)
                                  ? "/placeholder.svg?height=200&width=300"
                                  : siteImages[index].url ||
                                    (siteImages[index].file
                                      ? URL.createObjectURL(
                                          siteImages[index].file
                                        )
                                      : "/placeholder.svg?height=200&width=300")
                              }
                              alt="Site preview"
                              width={200}
                              height={128}
                              className="h-32 w-auto object-cover rounded-md border shadow-sm"
                              onError={() => {
                                setFailedImages((prev) => [...prev, index]);
                                toast.error(
                                  `Failed to load image ${index + 1}`
                                );
                              }}
                              unoptimized={true}
                            />
                          </div>
                        )}
                    </div>
                    <div>
                      <Label
                        htmlFor={`siteImages.${index}.description`}
                        className="text-sm font-medium"
                      >
                        Description (Optional)
                      </Label>
                      <Controller
                        control={control}
                        name={`siteImages.${index}.description`}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            id={`siteImages.${index}.description`}
                            placeholder="Enter image description"
                            rows={4}
                            value={field.value ?? ""}
                            className="mt-1 resize-none"
                          />
                        )}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div>
              <div className="mb-6">
                <Label htmlFor="note" className="text-base">
                  Additional Notes
                </Label>
                <Controller
                  control={control}
                  name="note"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="note"
                      placeholder="Any additional notes"
                      rows={4}
                      value={field.value ?? ""}
                      className="mt-1 resize-none"
                    />
                  )}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="terms" className="text-base">
                    Terms & Conditions
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const defaultTerms = [
                        "50% advance payment required to start work, 30% due at 70% project completion, and 20% within 7 days of completion.",
                        "Quotations are valid for 30 days from issuance.",
                        "Additional work requires a separate quotation and written approval.",
                        "1-year warranty on workmanship; material warranties per manufacturer terms.",
                        "Accepting the quotation and paying the deposit confirms agreement to these terms.",
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
                      onChange={(e) =>
                        field.onChange(e.target.value.split("\n"))
                      }
                      className="mt-1 resize-none"
                    />
                  )}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter each term on a new line.{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    View full terms and conditions
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div>
              <Card className="bg-gray-50 border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-primary">
                    Quotation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Subtotal:</span>
                    <Controller
                      control={control}
                      name="subtotal"
                      render={({ field }) => (
                        <span className="font-medium text-lg">
                          ₹{(field.value ?? 0).toFixed(2)}
                        </span>
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <Label
                        htmlFor="discount"
                        className="text-gray-600 font-medium"
                      >
                        Discount:
                      </Label>
                      <div className="w-1/3">
                        <Controller
                          control={control}
                          name="discount"
                          rules={{
                            min: {
                              value: 0,
                              message: "Discount cannot be negative",
                            },
                          }}
                          render={({ field }) => (
                            <Input
                              id="discount"
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                field.onChange(value);

                                // Recalculate totals when discount changes
                                setTimeout(() => calculateTotals(), 0);
                              }}
                              className="text-right h-9"
                            />
                          )}
                        />
                        {errors.discount && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.discount.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-lg font-semibold">Grand Total:</span>
                    <Controller
                      control={control}
                      name="grandTotal"
                      render={({ field }) => (
                        <span className="text-xl font-bold text-primary">
                          ₹{(field.value ?? 0).toFixed(2)}
                        </span>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end bg-gray-50 border-t p-6">
        <Button
          type="submit"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="bg-primary/90 hover:bg-primary"
          size="lg"
        >
          <Save className="mr-2 h-5 w-5" />
          {isSubmitting
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
            ? "Update Quotation"
            : "Create Quotation"}
        </Button>
      </CardFooter>
    </Card>
  );
}
