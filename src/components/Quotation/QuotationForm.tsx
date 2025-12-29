"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Plus,
  Trash2,
  Save,
  FileText,
  ImageIcon,
  User,
  Calendar,
  Info,
  ArrowLeft,
  Loader2,
  CheckCircle,
  ChevronRight,
  Upload,
  FileEdit,
  Package,
} from "lucide-react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { apiFetch, getGeneralInfo } from "@/app/lib/api"
import type { Quotation, ApiError, GeneralInfo } from "@/app/types"
import { quotationFormSchema } from "@/lib/validators"
import { zodResolver } from "@hookform/resolvers/zod"

// Country codes for phone numbers
const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+98", country: "Iran", flag: "🇮🇷" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+975", country: "Bhutan", flag: "🇧🇹" },
  { code: "+93", country: "Afghanistan", flag: "🇦🇫" },
  { code: "+998", country: "Uzbekistan", flag: "🇺🇿" },
  { code: "+996", country: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "+992", country: "Tajikistan", flag: "🇹🇯" },
  { code: "+993", country: "Turkmenistan", flag: "🇹🇲" },
  { code: "+374", country: "Armenia", flag: "🇦🇲" },
  { code: "+995", country: "Georgia", flag: "🇬🇪" },
  { code: "+994", country: "Azerbaijan", flag: "🇦🇿" },
]

const numberInputClass =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

interface QuotationFormProps {
  quotationNumber?: string
}

interface FormData {
  clientName: string
  clientAddress: string
  clientNumber: string
  countryCode: string
  date: string | Date
  items: {
    description: string
    area?: number | null
    rate: number
    total?: number | null
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

// Default terms (fallback)
const DEFAULT_TERMS = [
  "50% advance payment required to start work, 30% due at 70% project completion, and 20% within 7 days of completion.",
  "The advance payment is non-refundable under any circumstances.",
]

export default function QuotationForm({ quotationNumber }: QuotationFormProps) {
  const router = useRouter()
  const isEditMode = !!quotationNumber
  const effectiveQuotationNumber = quotationNumber
  const [activeTab, setActiveTab] = useState("details")
  const [hasDraft, setHasDraft] = useState(false)
  const [showDraftBanner, setShowDraftBanner] = useState(true)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(quotationFormSchema) as any,
    defaultValues: {
      clientName: "",
      clientAddress: "",
      clientNumber: "",
      countryCode: "+91",
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

  // Check if required fields are filled for the current tab
  const itemsTabValid = items.some((item) => !!item.description && item.rate > 0)

  // Calculate totals function
  const calculateTotals = useCallback(() => {
    const currentItems = getValues("items")
    const currentDiscount = getValues("discount") || 0

    const subtotal = currentItems.reduce((sum, item) => {
      if (item.total != null) {
        return sum + item.total
      }
      if (item.area != null && item.rate != null) {
        if (item.area > 0 && item.rate > 0) {
          return sum + item.area * item.rate
        }
      }
      return sum
    }, 0)

    const grandTotal = Math.max(0, subtotal - currentDiscount)

    setValue("subtotal", subtotal, { shouldValidate: true })
    setValue("grandTotal", grandTotal, { shouldValidate: true })

    return { subtotal, grandTotal }
  }, [getValues, setValue])

  // Update item total
  const updateItemTotal = useCallback(
    (index: number) => {
      const currentItems = getValues("items")
      const item = currentItems[index]

      // If area is NOT provided but rate is, set total = rate
      if (item) {
        if (item.area != null && item.area > 0 && item.rate != null && item.rate > 0) {
          const total = item.area * item.rate
          setValue(`items.${index}.total`, total, { shouldValidate: true })
        } else if ((item.area == null || item.area === 0) && item.rate != null && item.rate > 0) {
          // No area provided, set total = rate
          setValue(`items.${index}.total`, item.rate, { shouldValidate: true })
        }
      }
      calculateTotals()
    },
    [getValues, setValue, calculateTotals],
  )

  // Calculate totals effect
  useEffect(() => {
    items.forEach((item, index) => {
      if (item.area != null && item.area > 0 && item.rate != null && item.rate > 0) {
        const total = item.area * item.rate
        setValue(`items.${index}.total`, total, { shouldValidate: true })
      } else if ((item.area == null || item.area === 0) && item.rate != null && item.rate > 0) {
        setValue(`items.${index}.total`, item.rate, { shouldValidate: true })
      }
    })
    calculateTotals()
  }, [items, discount, setValue, calculateTotals])

  // Save Draft
  const saveDraft = useCallback(() => {
    if (isEditMode) return

    try {
      setSavingDraft(true)
      const formData = getValues()
      const draftData = {
        ...formData,
        siteImages: formData.siteImages?.map((img) => ({
          url: img.url,
          publicId: img.publicId,
          description: img.description,
        })),
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData))
      setDraftSaved(true)
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

  // Auto-save
  useEffect(() => {
    if (isDirty && !isEditMode) {
      const debounceTimer = setTimeout(() => {
        saveDraft()
      }, 2000)
      return () => clearTimeout(debounceTimer)
    }
  }, [formValues, isDirty, isEditMode, saveDraft])

  // Load Draft
  const loadDraft = useCallback(() => {
    try {
      const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!draftJson) return false

      const draft = JSON.parse(draftJson) as Partial<FormData>

      reset({
        clientName: draft.clientName || "",
        clientAddress: draft.clientAddress || "",
        clientNumber: draft.clientNumber || "",
        countryCode: draft.countryCode || "+91",
        date: draft.date || new Date().toISOString().split("T")[0],
        items: draft.items || [{ description: "", area: undefined, rate: 0, total: undefined, note: "" }],
        discount: draft.discount || 0,
        note: draft.note || "",
        terms: draft.terms || DEFAULT_TERMS,
        subtotal: draft.subtotal || 0,
        grandTotal: draft.grandTotal || 0,
        siteImages: draft.siteImages || [],
      })

      setTimeout(() => {
        calculateTotals()
      }, 0)

      setShowDraftBanner(false)
      toast.success("Draft restored successfully")
      return true
    } catch (error) {
      console.error("Error loading draft:", error)
      toast.error("Failed to load draft")
      return false
    }
  }, [reset, calculateTotals])

  // Clear Draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setHasDraft(false)
      setShowDraftBanner(false)
      toast.success("Draft cleared successfully")
    } catch (error) {
      console.error("Error clearing draft:", error)
      toast.error("Failed to clear draft")
    }
  }, [])

  // Check Draft
  useEffect(() => {
    if (!isEditMode) {
      const draftExists = !!localStorage.getItem(DRAFT_STORAGE_KEY)
      setHasDraft(draftExists)
    }
  }, [isEditMode])

  // Fetch Data
  useEffect(() => {
    const initializeForm = async () => {
      try {
        if (isEditMode && effectiveQuotationNumber) {
          const data = await apiFetch<Quotation>(`/quotations/${effectiveQuotationNumber}`)

          let countryCode = "+91";
          let number = "";

          if (data.clientMobile && data.clientMobile.countryCode && data.clientMobile.number) {
            countryCode = data.clientMobile.countryCode;
            number = data.clientMobile.number;
          } else if (data.clientNumber) {
            // Legacy fallback if clientMobile is not set
            const matchedCode = COUNTRY_CODES.find(c => data.clientNumber.startsWith(c.code));
            if (matchedCode) {
              countryCode = matchedCode.code;
              number = data.clientNumber.slice(matchedCode.code.length);
            } else {
              // Best guess or just put everything in number?
              // The user said "auto prefilled key country code and number gets filled in the number filed".
              // This implies the previous logic wasn't splitting correctly.
              // Let's rely on string matching.
              const match = data.clientNumber.match(/^(\+\d+)(\d+)$/);
              if (match) {
                // Try to match against known codes
                const potentialCode = match[1];
                const known = COUNTRY_CODES.find(c => c.code === potentialCode);
                if (known) {
                  countryCode = known.code;
                  number = data.clientNumber.replace(known.code, "");
                } else {
                  // Fallback: If starts with +, assume it tries to be a code
                  countryCode = "+91";
                  number = data.clientNumber.replace(/^\+91/, "");
                }
              } else {
                // No plus?
                number = data.clientNumber;
              }
            }
          }

          reset({
            clientName: data.clientName,
            clientAddress: data.clientAddress,
            clientNumber: number,
            countryCode: countryCode,
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
        } else {
          const generalInfoData = await getGeneralInfo()
          const generalInfo = generalInfoData as GeneralInfo
          setValue(
            "terms",
            generalInfo.termsAndConditions && generalInfo.termsAndConditions.length > 0
              ? generalInfo.termsAndConditions
              : DEFAULT_TERMS,
          )
        }
      } catch (error: unknown) {
        console.error("Error initializing form:", error)
        const apiError = error as ApiError
        toast.error(apiError.error || "Failed to load data")
        if (!isEditMode && !hasDraft) {
          setValue("terms", DEFAULT_TERMS)
        }
      } finally {
        setLoading(false)
        setTimeout(() => calculateTotals(), 100)
      }
    }

    initializeForm()
  }, [isEditMode, effectiveQuotationNumber, reset, calculateTotals, setValue, hasDraft])

  const onSubmit = async (data: FormData) => {
    try {
      const { subtotal, grandTotal } = calculateTotals()
      data.subtotal = subtotal
      data.grandTotal = grandTotal

      const formData = new FormData()

      formData.append("clientName", data.clientName)
      formData.append("clientAddress", data.clientAddress)
      // Send both legacy string and new object structure
      const fullNumber = `${data.countryCode}${data.clientNumber}`;
      formData.append("clientNumber", fullNumber)
      formData.append("clientMobile[countryCode]", data.countryCode)
      formData.append("clientMobile[number]", data.clientNumber)
      formData.append("date", data.date instanceof Date ? data.date.toISOString() : data.date)
      formData.append("items", JSON.stringify(data.items))
      formData.append("discount", data.discount.toString())
      formData.append("note", data.note || "")

      data.terms?.forEach((term, index) => {
        if (term.trim()) formData.append(`terms[${index}]`, term)
      })

      formData.append("subtotal", data.subtotal.toString())
      formData.append("grandTotal", data.grandTotal.toString())
        ; (data.siteImages || []).forEach(
          (img: { file?: File; url?: string; publicId?: string; description?: string }, index: number) => {
            if (img.file) {
              formData.append(`siteImages[${index}]`, img.file)
              if (img.description) {
                formData.append(`siteImages[${index}].description`, img.description)
              }
            }
          },
        )

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

      if (!isEditMode) {
        clearDraft()
      }

      router.push(isEditMode ? `/dashboard/quotations/${effectiveQuotationNumber}` : "/dashboard/quotations")
    } catch (error: unknown) {
      const apiError = error as ApiError
      toast.error(apiError.error || (isEditMode ? "Failed to update quotation" : "Failed to create quotation"))
      if (apiError.details && Array.isArray(apiError.details)) {
        apiError.details.forEach((err: { message?: string } | string) => {
          if (typeof err === "object" && err.message) {
            toast.error(err.message)
          } else if (typeof err === "string") {
            toast.error(err)
          }
        })
      }
    }
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
          <p className="text-sm text-muted-foreground">Loading quotation...</p>
        </motion.div>
      </div>
    )
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
                <Link href={isEditMode ? `/dashboard/quotations/${effectiveQuotationNumber}` : "/dashboard/quotations"}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {isEditMode ? "Edit Quotation" : "New Quotation"}
                  </h1>
                  {isEditMode && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      #{effectiveQuotationNumber}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isEditMode ? "Update the quotation details below" : "Create a professional estimate for your client"}
                </p>
              </div>
            </div>

            {!isEditMode && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveDraft}
                  disabled={savingDraft || draftSaved}
                  className="gap-2 rounded-full px-4 bg-transparent"
                >
                  {savingDraft ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : draftSaved ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingDraft ? "Saving..." : draftSaved ? "Saved!" : "Save Draft"}
                </Button>
              </motion.div>
            )}
          </div>
        </motion.header>

        {/* Draft Notification */}
        <AnimatePresence>
          {hasDraft && !isEditMode && showDraftBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <Alert className="border-amber-200/50 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-800 dark:text-amber-200">Unsaved draft found</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-amber-700 dark:text-amber-300">
                    Would you like to continue where you left off?
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearDraft}
                      className="text-amber-700 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    >
                      Discard
                    </Button>
                    <Button size="sm" onClick={loadDraft} className="bg-amber-600 text-white hover:bg-amber-700">
                      Resume Draft
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Tabs Navigation */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <TabsList className="inline-flex h-12 w-full gap-1 rounded-2xl bg-muted/50 p-1.5 sm:w-auto">
                <TabsTrigger
                  value="details"
                  className="flex-1 gap-2 rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:flex-initial"
                >
                  <FileEdit className="h-4 w-4" />
                  <span>Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="items"
                  className="flex-1 gap-2 rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:flex-initial"
                >
                  <Package className="h-4 w-4" />
                  <span>Items</span>
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs">
                    {itemFields.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </motion.div>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-0 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <Card className="overflow-hidden border-0 bg-card shadow-sm">
                  <div className="border-b bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10">
                        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      Client Information
                    </h3>
                  </div>
                  <CardContent className="space-y-4 p-4 sm:space-y-5 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                      {/* Client Name */}
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Client Name *
                        </Label>
                        <Controller
                          control={control}
                          name="clientName"
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Enter client name"
                              className={`h-10 sm:h-11 rounded-xl bg-muted/30 transition-all focus:bg-background ${errors.clientName ? "border-destructive focus-visible:ring-destructive" : ""
                                }`}
                            />
                          )}
                        />
                        {errors.clientName && <p className="text-xs text-destructive">{errors.clientName.message}</p>}
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Phone Number *
                        </Label>
                        <div className="flex gap-2">
                          <Controller
                            control={control}
                            name="countryCode"
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="h-10 sm:h-11 w-[90px] sm:w-[100px] shrink-0 rounded-xl bg-muted/30">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {COUNTRY_CODES.map((c) => (
                                    <SelectItem key={`${c.code}-${c.country}`} value={c.code}>
                                      <span className="flex items-center gap-2">
                                        <span>{c.flag}</span>
                                        <span>{c.code}</span>
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <Controller
                            control={control}
                            name="clientNumber"
                            render={({ field }) => (
                              <Input
                                {...field}
                                placeholder="Phone number"
                                className={`h-10 sm:h-11 flex-1 rounded-xl bg-muted/30 transition-all focus:bg-background ${errors.clientNumber ? "border-destructive focus-visible:ring-destructive" : ""
                                  }`}
                              />
                            )}
                          />
                        </div>
                        {errors.clientNumber && (
                          <p className="text-xs text-destructive">{errors.clientNumber.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Billing Address *
                      </Label>
                      <Controller
                        control={control}
                        name="clientAddress"
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="Enter complete billing address"
                            className={`min-h-[80px] sm:min-h-[100px] resize-none rounded-xl bg-muted/30 transition-all focus:bg-background ${errors.clientAddress ? "border-destructive focus-visible:ring-destructive" : ""
                              }`}
                          />
                        )}
                      />
                      {errors.clientAddress && (
                        <p className="text-xs text-destructive">{errors.clientAddress.message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 bg-card shadow-sm">
                  <div className="border-b bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      Quotation Details
                    </h3>
                  </div>
                  <CardContent className="space-y-4 p-4 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Date
                        </Label>
                        <Controller
                          control={control}
                          name="date"
                          render={({ field }) => (
                            <Input
                              type="date"
                              {...field}
                              value={
                                field.value instanceof Date ? field.value.toISOString().split("T")[0] : field.value
                              }
                              className="h-10 sm:h-11 rounded-xl bg-muted/30"
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Private Notes
                        </Label>
                        <Controller
                          control={control}
                          name="note"
                          render={({ field }) => (
                            <Textarea
                              {...field}
                              className="min-h-[80px] resize-none rounded-xl bg-muted/30"
                              placeholder="Internal notes (not visible to client)"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Site Images Card */}
                <Card className="overflow-hidden border-0 bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10">
                        <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      Site Images
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => appendImage({ description: "" })}
                      className="gap-1.5 rounded-full h-8 px-3 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                  <CardContent className="p-4 sm:p-6">
                    {imageFields.length === 0 ? (
                      <div
                        onClick={() => appendImage({ description: "" })}
                        className="cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 p-8 sm:p-12 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
                      >
                        <div className="mx-auto mb-3 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted">
                          <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-sm sm:text-base">Upload Site Photos</p>
                        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Tap to add images</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                        {imageFields.map((field, index) => {
                          const image = siteImages?.[index]
                          const imageUrl = image?.url
                          const imageFile = image?.file

                          return (
                            <motion.div
                              key={field.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="group relative aspect-square overflow-hidden rounded-xl border bg-muted/30"
                            >
                              <Controller
                                control={control}
                                name={`siteImages.${index}.file`}
                                render={({ field: { onChange, ref, ...fieldProps } }) => (
                                  <div className="absolute inset-0 z-10">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      className="h-full w-full cursor-pointer opacity-0"
                                      onChange={(e) => onChange(e.target.files?.[0])}
                                      ref={ref}
                                      {...fieldProps}
                                      value={undefined}
                                    />
                                  </div>
                                )}
                              />

                              {imageUrl || imageFile ? (
                                <Image
                                  src={
                                    failedImages.includes(index)
                                      ? "/placeholder.svg?height=200&width=200"
                                      : imageUrl || (imageFile ? URL.createObjectURL(imageFile) : "")
                                  }
                                  alt="Preview"
                                  fill
                                  className="object-cover transition-transform group-hover:scale-105"
                                  onError={() => setFailedImages((prev) => [...prev, index])}
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/30" />
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeImage(index)
                                }}
                                className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 z-20 rounded-full bg-background/90 p-1 sm:p-1.5 shadow-sm backdrop-blur-sm transition-all hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              </button>

                              <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full bg-background/95 p-1.5 sm:p-2 backdrop-blur-sm transition-transform group-hover:translate-y-0">
                                <Controller
                                  control={control}
                                  name={`siteImages.${index}.description`}
                                  render={({ field }) => (
                                    <Input
                                      {...field}
                                      placeholder="Add caption..."
                                      className="h-6 sm:h-7 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )}
                                />
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Terms Card */}
                <Card className="overflow-hidden border-0 bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      Terms & Conditions
                    </h3>
                    <Link href="/terms" className="text-xs font-medium text-primary hover:underline">
                      Manage
                    </Link>
                  </div>
                  <CardContent className="p-4 sm:p-6">
                    <Controller
                      control={control}
                      name="terms"
                      render={({ field }) => (
                        <Textarea
                          value={field.value?.join("\n") ?? ""}
                          onChange={(e) => field.onChange(e.target.value.split("\n"))}
                          className="min-h-[120px] sm:min-h-[150px] resize-none rounded-xl border-0 bg-muted/30 p-3 sm:p-4 text-sm leading-relaxed"
                          placeholder="Enter terms and conditions..."
                        />
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between pt-4">
                  <Button type="button" variant="ghost" onClick={() => router.back()} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      const valid = await trigger(["clientName", "clientNumber", "clientAddress"])
                      if (valid) setActiveTab("items")
                      else toast.error("Please fill in all required client details")
                    }}
                    className="gap-2 rounded-full px-6"
                  >
                    Continue to Items
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="mt-0">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="overflow-hidden border-0 bg-card shadow-sm">
                  <div className="border-b bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      Line Items
                    </h3>
                  </div>

                  {/* Desktop Header */}
                  <div className="hidden border-b bg-muted/20 px-6 py-3 md:grid md:grid-cols-12 md:gap-4">
                    <div className="col-span-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      #
                    </div>
                    <div className="col-span-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Description
                    </div>
                    <div className="col-span-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Area (sq ft)
                    </div>
                    <div className="col-span-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Rate
                    </div>
                    <div className="col-span-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Total
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="divide-y">
                    <AnimatePresence mode="popLayout">
                      {itemFields.map((field, index) => (
                        <motion.div
                          key={field.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="group"
                        >
                          {/* Desktop View */}
                          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 items-start">
                            <div className="col-span-1 flex items-center justify-center pt-2.5">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive/70 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => {
                                  removeItem(index)
                                  setTimeout(() => calculateTotals(), 0)
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="col-span-5 space-y-2">
                              <Controller
                                control={control}
                                name={`items.${index}.description`}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    placeholder="Item description"
                                    className={`h-10 rounded-lg border-transparent bg-transparent font-medium transition-all hover:border-input hover:bg-muted/30 focus:border-input focus:bg-background ${errors.items?.[index]?.description ? "border-destructive" : ""
                                      }`}
                                  />
                                )}
                              />
                              <Controller
                                control={control}
                                name={`items.${index}.note`}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    placeholder="Additional notes (optional)"
                                    className="h-8 rounded-lg border-transparent bg-transparent text-xs text-muted-foreground transition-all hover:border-input hover:bg-muted/30 focus:border-input focus:bg-background"
                                  />
                                )}
                              />
                              {errors.items?.[index]?.description && (
                                <p className="text-xs text-destructive">{errors.items[index]?.description?.message}</p>
                              )}
                            </div>

                            <div className="col-span-2">
                              <Controller
                                control={control}
                                name={`items.${index}.area`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="—"
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value ? Math.max(0, Number(e.target.value)) : undefined
                                      field.onChange(val)
                                      setTimeout(() => updateItemTotal(index), 0)
                                    }}
                                    className={`h-10 rounded-lg border-transparent bg-transparent text-right font-mono transition-all hover:border-input hover:bg-muted/30 focus:border-input focus:bg-background ${numberInputClass}`}
                                  />
                                )}
                              />
                            </div>

                            <div className="col-span-2">
                              <Controller
                                control={control}
                                name={`items.${index}.rate`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      const val = Math.max(0, Number(e.target.value))
                                      field.onChange(val)
                                      setTimeout(() => updateItemTotal(index), 0)
                                    }}
                                    className={`h-10 rounded-lg border-transparent bg-transparent text-right font-mono transition-all hover:border-input hover:bg-muted/30 focus:border-input focus:bg-background ${numberInputClass}`}
                                  />
                                )}
                              />
                            </div>

                            <div className="col-span-2">
                              <Controller
                                control={control}
                                name={`items.${index}.total`}
                                render={({ field }) => {
                                  const areaValue = items[index]?.area
                                  const hasArea = areaValue != null && areaValue > 0

                                  if (hasArea) {
                                    // Display-only when area is provided (auto-calculated)
                                    return (
                                      <div className="flex h-10 items-center justify-end rounded-lg bg-muted/30 px-3 font-mono font-semibold">
                                        {(field.value ?? 0).toLocaleString("en-IN")}
                                      </div>
                                    )
                                  }

                                  // Editable when no area
                                  return (
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const val = Math.max(0, Number(e.target.value))
                                        field.onChange(val)
                                        setTimeout(() => calculateTotals(), 0)
                                      }}
                                      className={`h-10 rounded-lg border-transparent bg-transparent text-right font-mono font-semibold transition-all hover:border-input hover:bg-muted/30 focus:border-input focus:bg-background ${numberInputClass}`}
                                    />
                                  )
                                }}
                              />
                            </div>
                          </div>

                          {/* Mobile View - Simplified, flatter structure */}
                          <div className="p-4 md:hidden">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  removeItem(index)
                                  setTimeout(() => calculateTotals(), 0)
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <Controller
                              control={control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  placeholder="Item description"
                                  className={`h-10 rounded-xl bg-muted/30 mb-2 ${errors.items?.[index]?.description ? "border-destructive" : ""
                                    }`}
                                />
                              )}
                            />
                            <Controller
                              control={control}
                              name={`items.${index}.note`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  placeholder="Notes (optional)"
                                  className="h-9 rounded-xl bg-muted/30 text-sm mb-3"
                                />
                              )}
                            />

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground mb-1 block">Area</Label>
                                <Controller
                                  control={control}
                                  name={`items.${index}.area`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="—"
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value ? Math.max(0, Number(e.target.value)) : undefined
                                        field.onChange(val)
                                        setTimeout(() => updateItemTotal(index), 0)
                                      }}
                                      className={`h-9 rounded-lg bg-muted/30 text-center font-mono text-sm ${numberInputClass}`}
                                    />
                                  )}
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground mb-1 block">Rate</Label>
                                <Controller
                                  control={control}
                                  name={`items.${index}.rate`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const val = Math.max(0, Number(e.target.value))
                                        field.onChange(val)
                                        setTimeout(() => updateItemTotal(index), 0)
                                      }}
                                      className={`h-9 rounded-lg bg-muted/30 text-center font-mono text-sm ${numberInputClass}`}
                                    />
                                  )}
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground mb-1 block">Total</Label>
                                <Controller
                                  control={control}
                                  name={`items.${index}.total`}
                                  render={({ field }) => {
                                    const areaValue = items[index]?.area
                                    const hasArea = areaValue != null && areaValue > 0

                                    if (hasArea) {
                                      return (
                                        <div className="flex h-9 items-center justify-center rounded-lg bg-primary/10 font-mono font-semibold text-sm text-primary">
                                          {(field.value ?? 0).toLocaleString("en-IN")}
                                        </div>
                                      )
                                    }

                                    return (
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={field.value ?? ""}
                                        onChange={(e) => {
                                          const val = Math.max(0, Number(e.target.value))
                                          field.onChange(val)
                                          setTimeout(() => calculateTotals(), 0)
                                        }}
                                        className={`h-9 rounded-lg bg-muted/30 text-center font-mono font-semibold text-sm ${numberInputClass}`}
                                      />
                                    )
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {itemFields.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                        <div className="mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted">
                          <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-sm sm:text-base">No items added yet</p>
                        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Add your first item below</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed px-4 py-4 sm:px-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        appendItem({ description: "", rate: 0, note: "" })
                        setTimeout(() => calculateTotals(), 0)
                      }}
                      className="w-full gap-2 rounded-xl border-dashed h-11"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </div>

                  {/* Totals Section */}
                  <div className="border-t bg-muted/20 p-4 sm:p-6">
                    <div className="mx-auto max-w-sm space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-mono font-medium">
                          {(watch("subtotal") ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <Controller
                          control={control}
                          name="discount"
                          render={({ field }) => (
                            <div className="relative w-24 sm:w-28">
                              <Input
                                type="number"
                                min="0"
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value))
                                  field.onChange(val)
                                  setTimeout(() => calculateTotals(), 0)
                                }}
                                className={`${numberInputClass} h-8 sm:h-9 rounded-lg text-right font-mono pr-2`}
                              />
                            </div>
                          )}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-base sm:text-lg font-semibold">Grand Total</span>
                        <span className="text-xl sm:text-2xl font-bold tracking-tight">
                          {(watch("grandTotal") ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="flex items-center justify-between pt-6">
                  <Button type="button" variant="ghost" onClick={() => setActiveTab("details")} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !itemsTabValid} className="gap-2 rounded-full px-6">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isEditMode ? "Update Quotation" : "Create Quotation"}
                  </Button>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </div>
  )
}
