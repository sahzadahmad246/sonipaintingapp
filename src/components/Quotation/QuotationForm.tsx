"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Plus,
  Trash2,
  Save,
  FileText,
  ImageIcon,
  User,
  Phone,
  MapPin,
  Calendar,
  Tag,
  DollarSign,
  Info,
  ArrowLeft,
  Calculator,
  X,
  HelpCircle,
  Loader2,
  CheckCircle,
} from "lucide-react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { apiFetch } from "@/app/lib/api"
import type { Quotation, ApiError } from "@/app/types"

interface QuotationFormProps {
  quotationNumber?: string
}

interface FormData {
  clientName: string
  clientAddress: string
  clientNumber: string
  date: string
  items: {
    description: string
    area?: number
    rate: number
    total?: number
    note?: string
  }[]
  discount: number
  note?: string
  terms: string[]
  subtotal: number
  grandTotal: number
  siteImages?: {
    file?: File
    url?: string
    publicId?: string
    description?: string
  }[]
}

// Local storage key for draft
const DRAFT_STORAGE_KEY = "quotation_form_draft"

// Default terms
const DEFAULT_TERMS = [
  "50% advance payment required to start work, 30% due at 70% project completion, and 20% within 7 days of completion.",
  "Quotations are valid for 30 days from issuance.",
  "Additional work requested by the customer that is not included in the original scope of work will be priced separately and agreed upon in writing before proceeding.",
  "Painting work covers surface finishing only, issues like dampness, leakage, or plaster damage are not included.",
  "The Sony Painting will be responsible for thoroughly cleaning the work area after completion, leaving no debris behind.",
  "We will provide regular updates on progress and will communicate any delays or changes to the timeline in a timely manner.",
  "Accepting the quotation and paying the deposit confirms agreement to these terms.",
]

export default function QuotationForm({ quotationNumber }: QuotationFormProps) {
  const router = useRouter()
  const isEditMode = !!quotationNumber
  const effectiveQuotationNumber = quotationNumber

  const [activeTab, setActiveTab] = useState("details")
  const [hasDraft, setHasDraft] = useState(false)
  const [loading, setLoading] = useState(isEditMode)
  const [failedImages, setFailedImages] = useState<number[]>([])
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    reset,
    watch,
    getValues,
    trigger,
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
      terms: DEFAULT_TERMS,
      subtotal: 0,
      grandTotal: 0,
      siteImages: [],
    },
    mode: "onChange",
  })

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: "items",
  })

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray({
    control,
    name: "siteImages",
  })

  // Watch form fields for real-time updates
  const items = watch("items")
  const discount = watch("discount")
  const siteImages = watch("siteImages")
  const formValues = watch()
  const clientName = watch("clientName")
  const clientAddress = watch("clientAddress")
  const clientNumber = watch("clientNumber")

  // Check if required fields are filled for the current tab
  const detailsTabValid = !!clientName && !!clientAddress && !!clientNumber
  const itemsTabValid = items.some((item) => !!item.description && item.rate > 0)


  // Calculate totals function that can be called directly
  const calculateTotals = useCallback(() => {
    const currentItems = getValues("items")
    const currentDiscount = getValues("discount") || 0

    // Calculate subtotal from all items
    const subtotal = currentItems.reduce((sum, item) => {
      if (item.total !== undefined) {
        return sum + item.total
      } else if (item.area !== undefined && item.rate !== undefined && item.area > 0 && item.rate > 0) {
        return sum + item.area * item.rate
      }
      return sum
    }, 0)

    // Calculate grand total
    const grandTotal = Math.max(0, subtotal - currentDiscount)

    // Update form values
    setValue("subtotal", subtotal, { shouldValidate: true })
    setValue("grandTotal", grandTotal, { shouldValidate: true })

    return { subtotal, grandTotal }
  }, [getValues, setValue])

  // Update item total when area or rate changes
  const updateItemTotal = useCallback(
    (index: number) => {
      const currentItems = getValues("items")
      const item = currentItems[index]

      if (item && item.area !== undefined && item.rate !== undefined && item.area > 0 && item.rate > 0) {
        const total = item.area * item.rate
        setValue(`items.${index}.total`, total, { shouldValidate: true })
      }

      // Recalculate subtotal and grand total
      calculateTotals()
    },
    [getValues, setValue, calculateTotals],
  )

  // Calculate totals whenever items or discount change
  useEffect(() => {
    // Calculate individual item totals
    items.forEach((item, index) => {
      if (item.area !== undefined && item.rate !== undefined && item.area > 0 && item.rate > 0) {
        const total = item.area * item.rate
        setValue(`items.${index}.total`, total, { shouldValidate: true })
      }
    })

    // Calculate totals
    calculateTotals()
  }, [items, discount, setValue, calculateTotals])

  // Save form data to local storage as draft
  const saveDraft = useCallback(() => {
    if (isEditMode) return // Don't save drafts in edit mode

    try {
      setSavingDraft(true)
      const formData = getValues()

      // Create a serializable version of the form data
      const draftData = {
        ...formData,
        siteImages: formData.siteImages?.map((img) => ({
          url: img.url,
          publicId: img.publicId,
          description: img.description,
          // Omit file since it can't be stored in localStorage
        })),
      }

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData))
      setDraftSaved(true)

      // Reset the "saved" indicator after 2 seconds
      setTimeout(() => {
        setDraftSaved(false)
      }, 2000)
    } catch (error) {
      console.error("Error saving draft:", error)
      toast.error("Failed to save draft")
    } finally {
      setSavingDraft(false)
    }
  }, [getValues, isEditMode])

  // Auto-save draft when form changes
  useEffect(() => {
    if (isDirty && !isEditMode) {
      const debounceTimer = setTimeout(() => {
        saveDraft()
      }, 2000)

      return () => clearTimeout(debounceTimer)
    }
  }, [formValues, isDirty, isEditMode, saveDraft])

  // Load draft from local storage
  const loadDraft = useCallback(() => {
    try {
      const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!draftJson) return false

      const draft = JSON.parse(draftJson) as Partial<FormData>

      // Reset form with draft data
      reset({
        clientName: draft.clientName || "",
        clientAddress: draft.clientAddress || "",
        clientNumber: draft.clientNumber || "",
        date: draft.date || new Date().toISOString().split("T")[0],
        items: draft.items || [{ description: "", area: undefined, rate: 0, total: undefined, note: "" }],
        discount: draft.discount || 0,
        note: draft.note || "",
        terms: draft.terms || DEFAULT_TERMS,
        subtotal: draft.subtotal || 0,
        grandTotal: draft.grandTotal || 0,
        siteImages: draft.siteImages || [],
      })

      // Force calculation after data is loaded
      setTimeout(() => {
        calculateTotals()
      }, 0)

      toast.success("Draft restored successfully")
      return true
    } catch (error) {
      console.error("Error loading draft:", error)
      toast.error("Failed to load draft")
      return false
    }
  }, [reset, calculateTotals])

  // Clear draft from local storage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setHasDraft(false)
      toast.success("Draft cleared successfully")
    } catch (error) {
      console.error("Error clearing draft:", error)
      toast.error("Failed to clear draft")
    }
  }, [])

  // Check for existing draft on component mount
  useEffect(() => {
    if (!isEditMode) {
      const draftExists = !!localStorage.getItem(DRAFT_STORAGE_KEY)
      setHasDraft(draftExists)
    }
  }, [isEditMode])

  // Fetch quotation data in edit mode
  useEffect(() => {
    if (isEditMode && effectiveQuotationNumber) {
      const fetchQuotation = async () => {
        try {
          const data = await apiFetch<Quotation>(`/quotations/${effectiveQuotationNumber}`)
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
            terms: data.terms ?? DEFAULT_TERMS,
            subtotal: data.subtotal ?? 0,
            grandTotal: data.grandTotal ?? 0,
            siteImages:
              data.siteImages?.map((img) => ({
                url: img.url,
                publicId: img.publicId,
                description: img.description ?? "",
              })) ?? [],
          })

          // Force calculation after data is loaded
          setTimeout(() => {
            calculateTotals()
          }, 0)
        } catch (error: unknown) {
          const apiError = error as ApiError
          toast.error(apiError.error || "Failed to fetch quotation")
        } finally {
          setLoading(false)
        }
      }
      fetchQuotation()
    } else {
      setLoading(false)
    }
  }, [isEditMode, effectiveQuotationNumber, reset, calculateTotals])

  const onSubmit = async (data: FormData) => {
    try {
      // Recalculate totals before submission to ensure accuracy
      const { subtotal, grandTotal } = calculateTotals()
      data.subtotal = subtotal
      data.grandTotal = grandTotal

      const formData = new FormData()
      formData.append("clientName", data.clientName)
      formData.append("clientAddress", data.clientAddress)
      formData.append("clientNumber", data.clientNumber)
      formData.append("date", data.date)
      formData.append("items", JSON.stringify(data.items))
      formData.append("discount", data.discount.toString())
      formData.append("note", data.note || "")
      data.terms?.forEach((term, index) => {
        if (term.trim()) formData.append(`terms[${index}]`, term)
      })
      formData.append("subtotal", data.subtotal.toString())
      formData.append("grandTotal", data.grandTotal.toString())

      // Append images and their descriptions
      ;(data.siteImages || []).forEach(
        (img: { file?: File; url?: string; publicId?: string; description?: string }, index: number) => {
          if (img.file) {
            formData.append(`siteImages[${index}]`, img.file)
            if (img.description) {
              formData.append(`siteImages[${index}].description`, img.description)
            }
          }
        },
      )

      // Append existing images
      const existingImages = (data.siteImages || [])
        .filter((img) => img.url && img.publicId)
        .map((img) => ({
          url: img.url!,
          publicId: img.publicId!,
          description: img.description,
        }))
      formData.append("existingImages", JSON.stringify(existingImages))

      const url = isEditMode ? `/quotations/${effectiveQuotationNumber}` : "/quotations"
      const method = isEditMode ? "PUT" : "POST"
      await apiFetch<Quotation>(url, {
        method,
        body: formData,
      })

      toast.success(isEditMode ? "Quotation updated successfully!" : "Quotation created successfully!")

      // Clear draft after successful submission
      if (!isEditMode) {
        clearDraft()
      }

      router.push(isEditMode ? `/dashboard/quotations/${effectiveQuotationNumber}` : "/dashboard/quotations")
    } catch (error: unknown) {
      const apiError = error as ApiError
      toast.error(apiError.error || (isEditMode ? "Failed to update quotation" : "Failed to create quotation"))
      if (apiError.details) {
        apiError.details.forEach((err: { message: string }) => toast.error(err.message))
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-lg text-gray-700">Loading quotation data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Draft notification */}
      {hasDraft && !isEditMode && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-5 w-5 text-blue-500" />
          <AlertTitle className="text-blue-700">Draft Available</AlertTitle>
          <AlertDescription className="text-blue-600">
            You have an unsaved quotation draft. Would you like to restore it?
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={loadDraft}>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Restore Draft
              </Button>
              <Button size="sm" variant="outline" className="border-red-200 text-red-600" onClick={clearDraft}>
                <X className="h-3.5 w-3.5 mr-1.5" /> Discard Draft
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full shadow-md border-gray-200">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center text-gray-800">
                <FileText className="mr-2 h-6 w-6 text-primary" />
                {isEditMode ? `Edit Quotation #${effectiveQuotationNumber}` : "Create New Quotation"}
              </CardTitle>
              <CardDescription>
                {isEditMode ? "Update the quotation details." : "Fill in the details to create a new quotation."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button variant="outline" size="sm" asChild>
                <Link href={isEditMode ? `/dashboard/quotations/${effectiveQuotationNumber}` : "/dashboard/quotations"}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> {isEditMode ? "Cancel" : "Back"}
                </Link>
              </Button>
              {!isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveDraft}
                  disabled={savingDraft || draftSaved}
                  className={draftSaved ? "bg-green-50 text-green-600 border-green-200" : ""}
                >
                  {savingDraft ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
                    </>
                  ) : draftSaved ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1.5" /> Save Draft
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-6">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger
                value="details"
                className="flex items-center gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <User className="h-4 w-4" /> Details
              </TabsTrigger>
              <TabsTrigger
                value="items"
                className="flex items-center gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <FileText className="h-4 w-4" /> Items
                <Badge variant="outline" className="ml-1 h-5 px-1.5">
                  {itemFields.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="p-6">
              <TabsContent value="details" className="mt-0 space-y-6">
                {/* Client Information */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center mb-4">
                    <User className="h-5 w-5 mr-2 text-primary" /> Client Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientName" className="text-base flex items-center">
                          Client Name <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Controller
                          control={control}
                          name="clientName"
                          rules={{ required: "Client name is required" }}
                          render={({ field }) => (
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                {...field}
                                id="clientName"
                                placeholder="Enter client name"
                                className="h-10 pl-10"
                              />
                            </div>
                          )}
                        />
                        {errors.clientName && <p className="text-red-500 text-sm">{errors.clientName.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientAddress" className="text-base flex items-center">
                          Client Address <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Controller
                          control={control}
                          name="clientAddress"
                          rules={{ required: "Client address is required" }}
                          render={({ field }) => (
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Textarea
                                {...field}
                                id="clientAddress"
                                placeholder="Enter client address"
                                rows={3}
                                className="resize-none pl-10"
                              />
                            </div>
                          )}
                        />
                        {errors.clientAddress && <p className="text-red-500 text-sm">{errors.clientAddress.message}</p>}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientNumber" className="text-base flex items-center">
                          Client Number <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Controller
                          control={control}
                          name="clientNumber"
                          rules={{ required: "Client number is required" }}
                          render={({ field }) => (
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                {...field}
                                id="clientNumber"
                                placeholder="Enter client phone number"
                                className="h-10 pl-10"
                              />
                            </div>
                          )}
                        />
                        {errors.clientNumber && <p className="text-red-500 text-sm">{errors.clientNumber.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date" className="text-base flex items-center">
                          Date <span className="text-red-500 ml-1">*</span>
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
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input {...field} id="date" type="date" placeholder="YYYY-MM-DD" className="h-10 pl-10" />
                            </div>
                          )}
                        />
                        {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="note" className="text-base">
                          Additional Notes
                        </Label>
                        <Controller
                          control={control}
                          name="note"
                          render={({ field }) => (
                            <div className="relative">
                              <Info className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Textarea
                                {...field}
                                id="note"
                                placeholder="Any additional notes about this quotation"
                                rows={3}
                                value={field.value ?? ""}
                                className="resize-none pl-10"
                              />
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Site Images */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-800 flex items-center">
                      <ImageIcon className="h-5 w-5 mr-2 text-primary" /> Site Images
                    </h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            onClick={() => appendImage({ description: "" })}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <ImageIcon className="h-4 w-4 mr-2" /> Add Image
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add a new site image</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {imageFields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <div className="bg-gray-100 p-6 rounded-full mb-4">
                        <ImageIcon className="h-12 w-12 text-gray-400" />
                      </div>
                      <p className="text-gray-500 mb-4">No site images added yet</p>
                      <Button
                        type="button"
                        onClick={() => appendImage({ description: "" })}
                        variant="outline"
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" /> Add First Image
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {imageFields.map((field, index) => (
                        <motion.div
                          key={field.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="p-4 border rounded-lg bg-gray-50 shadow-sm"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium text-gray-800 flex items-center">
                              <span className="bg-primary text-white rounded-full h-6 w-6 flex items-center justify-center text-sm mr-2">
                                {index + 1}
                              </span>
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

                          <div className="space-y-3">
                            <div>
                              <Label htmlFor={`siteImages.${index}.file`} className="text-sm font-medium">
                                Upload Image
                              </Label>
                              <Controller
                                control={control}
                                name={`siteImages.${index}.file`}
                                render={({ field: { onChange, ref, ...field } }) => (
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                      const file = e.target.files?.[0]
                                      onChange(file)
                                    }}
                                    ref={ref}
                                    {...field}
                                    value={undefined}
                                    className="mt-1"
                                  />
                                )}
                              />
                              {siteImages && siteImages[index] && (siteImages[index].url || siteImages[index].file) && (
                                <div className="mt-3 relative">
                                  <Image
                                    src={
                                      failedImages.includes(index)
                                        ? "/placeholder.svg?height=200&width=300"
                                        : siteImages[index].url ||
                                          (siteImages[index].file
                                            ? URL.createObjectURL(siteImages[index].file)
                                            : "/placeholder.svg?height=200&width=300")
                                    }
                                    alt="Site preview"
                                    width={200}
                                    height={128}
                                    className="h-32 w-auto object-cover rounded-md border shadow-sm"
                                    onError={() => {
                                      setFailedImages((prev) => [...prev, index])
                                      toast.error(`Failed to load image ${index + 1}`)
                                    }}
                                    unoptimized={true}
                                  />
                                  {(siteImages[index].url || siteImages[index].file) && (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                      onClick={() => {
                                        const updatedImages = [...siteImages]
                                        if (updatedImages[index].url) {
                                          updatedImages[index] = {
                                            ...updatedImages[index],
                                            url: undefined,
                                            publicId: undefined,
                                          }
                                        } else {
                                          updatedImages[index] = {
                                            ...updatedImages[index],
                                            file: undefined,
                                          }
                                        }
                                        setValue("siteImages", updatedImages)
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <Label htmlFor={`siteImages.${index}.description`} className="text-sm font-medium">
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
                                    rows={3}
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
                  )}
                </div>

                {/* Terms & Conditions */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center mb-4">
                    <Tag className="h-5 w-5 mr-2 text-primary" /> Terms & Conditions
                  </h3>
                  <Controller
                    control={control}
                    name="terms"
                    render={({ field }) => (
                      <Textarea
                        id="terms"
                        placeholder="Enter terms, one per line"
                        rows={8}
                        value={field.value?.join("\n") ?? ""}
                        onChange={(e) => field.onChange(e.target.value.split("\n"))}
                        className="resize-none"
                      />
                    )}
                  />
                  <p className="text-sm text-gray-500 mt-2 flex items-center">
                    <HelpCircle className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                    Enter each term on a new line.{" "}
                    <Link href="/terms" className="text-primary hover:underline ml-1">
                      View full terms and conditions
                    </Link>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="items" className="mt-0">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-medium text-gray-800 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-primary" /> Quotation Items
                    </h3>
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
                              })
                              // Force recalculation after adding item
                              setTimeout(() => calculateTotals(), 0)
                            }}
                            className="bg-primary hover:bg-primary/90"
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
                          <h4 className="font-medium text-gray-800 flex items-center">
                            <span className="bg-primary text-white rounded-full h-6 w-6 flex items-center justify-center text-sm mr-2">
                              {index + 1}
                            </span>
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
                                    removeItem(index)
                                    // Force recalculation after removing item
                                    setTimeout(() => calculateTotals(), 0)
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
                              className="text-sm font-medium flex items-center"
                            >
                              Description <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <Controller
                              control={control}
                              name={`items.${index}.description`}
                              rules={{ required: "Description is required" }}
                              render={({ field }) => (
                                <Input {...field} placeholder="Item description" className="mt-1" />
                              )}
                            />
                            {errors.items?.[index]?.description && (
                              <p className="text-red-500 text-sm mt-1">{errors.items[index]?.description?.message}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`items.${index}.area`} className="text-sm font-medium">
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
                                    const value = e.target.value ? Number(e.target.value) : undefined
                                    field.onChange(value)
                                    // Update item total and recalculate totals
                                    setTimeout(() => updateItemTotal(index), 0)
                                  }}
                                  className="mt-1"
                                />
                              )}
                            />
                            {errors.items?.[index]?.area && (
                              <p className="text-red-500 text-sm mt-1">{errors.items[index]?.area?.message}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`items.${index}.rate`} className="text-sm font-medium flex items-center">
                              Rate (₹) <span className="text-red-500 ml-1">*</span>
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
                                    const value = Number(e.target.value)
                                    field.onChange(value)
                                    // Update item total and recalculate totals
                                    setTimeout(() => updateItemTotal(index), 0)
                                  }}
                                  className="mt-1"
                                />
                              )}
                            />
                            {errors.items?.[index]?.rate && (
                              <p className="text-red-500 text-sm mt-1">{errors.items[index]?.rate?.message}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`items.${index}.total`} className="text-sm font-medium">
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
                                <div className="relative">
                                  <Input
                                    type="number"
                                    placeholder="Auto-calculated or enter total"
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      const value = e.target.value ? Number(e.target.value) : undefined
                                      field.onChange(value)
                                      // Recalculate totals when manually entering total
                                      setTimeout(() => calculateTotals(), 0)
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
                                  {items[index].area != null &&
                                    items[index].rate != null &&
                                    items[index].area > 0 &&
                                    items[index].rate > 0 && (
                                      <Calculator className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    )}
                                </div>
                              )}
                            />
                            {errors.items?.[index]?.total && (
                              <p className="text-red-500 text-sm mt-1">{errors.items[index]?.total?.message}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4">
                          <Label htmlFor={`items.${index}.note`} className="text-sm font-medium">
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
                  {errors.items && <p className="text-red-500 text-sm">{errors.items.message}</p>}
                </div>

                <Card className="bg-gray-50 border shadow-sm mt-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-primary flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" /> Quotation Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Subtotal:</span>
                      <Controller
                        control={control}
                        name="subtotal"
                        render={({ field }) => (
                          <span className="font-medium text-lg">₹{(field.value ?? 0).toFixed(2)}</span>
                        )}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <Label htmlFor="discount" className="text-gray-600 font-medium">
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
                                  const value = Number(e.target.value)
                                  field.onChange(value)
                                  // Recalculate totals when discount changes
                                  setTimeout(() => calculateTotals(), 0)
                                }}
                                className="text-right h-9"
                              />
                            )}
                          />
                          {errors.discount && <p className="text-red-500 text-sm mt-1">{errors.discount.message}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="text-lg font-semibold">Grand Total:</span>
                      <Controller
                        control={control}
                        name="grandTotal"
                        render={({ field }) => (
                          <span className="text-xl font-bold text-primary">₹{(field.value ?? 0).toFixed(2)}</span>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </CardContent>

            <CardFooter className="flex justify-between bg-gray-50 border-t p-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  if (activeTab === "details") {
                    router.push(
                      isEditMode ? `/dashboard/quotations/${effectiveQuotationNumber}` : "/dashboard/quotations",
                    )
                  } else if (activeTab === "items") {
                    setActiveTab("details")
                  }
                }}
              >
                {activeTab === "details" ? "Cancel" : "Previous"}
              </Button>
              <div className="flex gap-2">
                {activeTab === "details" ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (detailsTabValid) {
                        setActiveTab("items")
                      } else {
                        toast.error("Please fill in all required client information fields")
                        trigger(["clientName", "clientAddress", "clientNumber"])
                      }
                    }}
                    className="bg-primary/90 hover:bg-primary"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting || !itemsTabValid}
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
                )}
              </div>
            </CardFooter>
          </form>
        </Tabs>
      </Card>
    </div>
  )
}
