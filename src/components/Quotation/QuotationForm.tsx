"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, FileText, Image as ImageIcon } from "lucide-react";
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
import Image from "next/image"; // Added import
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

  // Fix: Use deep dependency for items to trigger useEffect on any change
  const itemsDeps = useMemo(() => JSON.stringify(items), [items]);

  // Auto-calculate totals whenever items or discount change
  useEffect(() => {
    items.forEach((item, index) => {
      const area = item.area;
      const rate = item.rate;
      if (area != null && rate != null && area > 0 && rate > 0) {
        const total = area * rate;
        setValue(`items.${index}.total`, total, { shouldValidate: true });
      } else {
        setValue(`items.${index}.total`, item.total, { shouldValidate: true });
      }
    });

    const subtotal = items.reduce((sum: number, item) => {
      const total =
        item.total ??
        (item.area && item.rate && item.area > 0 && item.rate > 0
          ? item.area * item.rate
          : 0);
      return sum + (total || 0);
    }, 0);

    const grandTotal = subtotal - (discount || 0);

    setValue("subtotal", subtotal, { shouldValidate: true });
    setValue("grandTotal", grandTotal, { shouldValidate: true });
  }, [itemsDeps, discount, setValue, items]);

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
        } catch (error: unknown) {
          const apiError = error as ApiError;
          toast.error(apiError.error || "Failed to fetch quotation");
        } finally {
          setLoading(false);
        }
      };
      fetchQuotation();
    }
  }, [isEditMode, effectiveQuotationNumber, reset]);

  const onSubmit = async (data: FormData) => {
    try {
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
            formData.append(`siteImages[${index}].description`, img.description);
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
    return <div>Loading quotation data...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-6 w-6 text-primary" />
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
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Controller
                  control={control}
                  name="clientName"
                  rules={{ required: "Client name is required" }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="clientName"
                      placeholder="Enter client name"
                    />
                  )}
                />
                {errors.clientName && (
                  <p className="text-red-500 text-sm">
                    {errors.clientName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="clientAddress">Client Address</Label>
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
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientNumber">Client Number</Label>
                <Controller
                  control={control}
                  name="clientNumber"
                  rules={{ required: "Client number is required" }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="clientNumber"
                      placeholder="Enter client phone number"
                    />
                  )}
                />
                {errors.clientNumber && (
                  <p className="text-red-500 text-sm">
                    {errors.clientNumber.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
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
                    />
                  )}
                />
                {errors.date && (
                  <p className="text-red-500 text-sm">{errors.date.message}</p>
                )}
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
                        appendItem({
                          description: "",
                          area: undefined,
                          rate: 0,
                          total: undefined,
                          note: "",
                        })
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
                      <Label htmlFor={`items.${index}.description`}>
                        Description
                      </Label>
                      <Controller
                        control={control}
                        name={`items.${index}.description`}
                        rules={{ required: "Description is required" }}
                        render={({ field }) => (
                          <Input {...field} placeholder="Item description" />
                        )}
                      />
                      {errors.items?.[index]?.description && (
                        <p className="text-red-500 text-sm">
                          {errors.items[index]?.description?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.area`}>
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
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        )}
                      />
                      {errors.items?.[index]?.area && (
                        <p className="text-red-500 text-sm">
                          {errors.items[index]?.area?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.rate`}>Rate (₹)</Label>
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
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        )}
                      />
                      {errors.items?.[index]?.rate && (
                        <p className="text-red-500 text-sm">
                          {errors.items[index]?.rate?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.total`}>Total (₹)</Label>
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
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
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
                        <p className="text-red-500 text-sm">
                          {errors.items[index]?.total?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label htmlFor={`items.${index}.note`}>
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

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Site Images</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => appendImage({ description: "" })}
                      size="sm"
                    >
                      <ImageIcon className="h-4 w-4 mr-1" /> Add Image
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add a new site image</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-4">
              {imageFields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 border rounded-md bg-gray-50"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Image {index + 1}</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeImage(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove this image</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`siteImages.${index}.file`}>
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
                          />
                        )}
                      />
                      {siteImages &&
                        siteImages[index] &&
                        (siteImages[index].url || siteImages[index].file) && (
                          <Image
                            src={
                              failedImages.includes(index)
                                ? "/placeholder-image.jpg"
                                : siteImages[index].url ||
                                  (siteImages[index].file
                                    ? URL.createObjectURL(siteImages[index].file)
                                    : "/placeholder-image.jpg")
                            }
                            alt="Site preview"
                            width={200}
                            height={128}
                            className="mt-2 h-32 w-auto object-cover rounded"
                            onError={() => {
                              setFailedImages((prev) => [...prev, index]);
                              toast.error(`Failed to load image ${index + 1}`);
                            }}
                            unoptimized={true}
                          />
                        )}
                    </div>
                    <div>
                      <Label htmlFor={`siteImages.${index}.description`}>
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
                          />
                        )}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <div className="mb-4">
                <Label htmlFor="note">Additional Notes</Label>
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
                    />
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
                      onChange={(e) =>
                        field.onChange(e.target.value.split("\n"))
                      }
                    />
                  )}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter each term on a new line
                </p>
              </div>
            </div>

            <div>
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Quotation Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal:</span>
                    <Controller
                      control={control}
                      name="subtotal"
                      render={({ field }) => (
                        <span className="font-medium">
                          ₹{(field.value ?? 0).toFixed(2)}
                        </span>
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
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                              className="text-right"
                            />
                          )}
                        />
                        {errors.discount && (
                          <p className="text-red-500 text-sm">
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
                        <span className="text-lg font-bold text-primary">
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
      <CardFooter className="flex justify-end">
        <Button
          type="submit"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <Save className="mr-2 h-4 w-4" />
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