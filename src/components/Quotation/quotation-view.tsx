"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  CheckCheck,
  XCircle,
  Clock,
  ArrowLeft,
  Download,
  FileText,
  User,
  MapPin,
  Phone,
  Calendar,
  Tag,
  Edit,
  ImageIcon,
  LinkIcon,
  Info,
  AlertCircle,
  ExternalLink,
  Building,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import Image from "next/image"
import { apiFetch, getGeneralInfo } from "@/app/lib/api"
import type { Quotation, ApiError, GeneralInfo } from "@/app/types"
import { generateQuotationPDF } from "@/app/lib/generate-pdf"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface QuotationViewProps {
  quotationNumber: string
}

export default function QuotationView({ quotationNumber }: QuotationViewProps) {
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [failedImages, setFailedImages] = useState<number[]>([])

  const { data: session, status } = useSession()

  const fetchQuotation = useCallback(async () => {
    try {
      const data = await apiFetch<Quotation>(`/quotations/${quotationNumber}`)
      setQuotation(data)
    } catch (error: unknown) {
      const apiError = error as ApiError
      toast.error(apiError.error || "Failed to fetch quotation")
    }
  }, [quotationNumber])

  const fetchGeneralInfo = useCallback(async () => {
    try {
      const data = await getGeneralInfo()
      const validatedData: GeneralInfo = {
        siteName: data.siteName || "SoniPainting",
        mobileNumber1: data.mobileNumber1 || "+91 98765 43210",
        mobileNumber2: data.mobileNumber2,
        address: data.address || "123 Main Street, New Delhi, India 110001",
        logoUrl: data.logoUrl || "/logo.png",
      }
      setGeneralInfo(validatedData)
    } catch {
      toast.error("Failed to load business information")
      setGeneralInfo({
        siteName: "SoniPainting",
        mobileNumber1: "+91 98765 43210",
        mobileNumber2: undefined,
        address: "123 Main Street, New Delhi, India 110001",
        logoUrl: "/logo.png",
      })
    }
  }, [])

  useEffect(() => {
    if (status === "loading") return
    if (!quotationNumber) {
      toast.error("Invalid quotation number")
      setLoading(false)
      return
    }
    Promise.all([fetchQuotation(), fetchGeneralInfo()]).finally(() => setLoading(false))
  }, [quotationNumber, fetchQuotation, fetchGeneralInfo, status])

  const getErrorMessage = (error: unknown): string => {
    if (!error) return "An unexpected error occurred"
    const errorObj = error as { error?: unknown; message?: string }
    const errorValue = errorObj.error
    if (typeof errorValue === "string") {
      return errorValue
    }
    if (Array.isArray(errorValue)) {
      return errorValue.map((e: { message?: string }) => e.message || String(e)).join(", ")
    }
    if (typeof errorValue === "object" && errorValue !== null) {
      return (errorValue as { message?: string }).message || JSON.stringify(errorValue)
    }
    if (errorObj.message) {
      return errorObj.message
    }
    return "An unexpected error occurred"
  }

  const handleAccept = async () => {
    if (!quotation) return
    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append("isAccepted", "accepted")
      const data = await apiFetch<Quotation>(`/quotations/${quotationNumber}`, {
        method: "PUT",
        body: formData,
      })
      setQuotation((prev) => (prev ? { ...prev, ...data } : data))
      toast.success("Quotation accepted!")
    } catch (error: unknown) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReject = async () => {
    if (!quotation) return
    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append("isAccepted", "rejected")
      const data = await apiFetch<Quotation>(`/quotations/${quotationNumber}`, {
        method: "PUT",
        body: formData,
      })
      setQuotation((prev) => (prev ? { ...prev, ...data } : data))
      toast.success("Quotation rejected!")
    } catch (error: unknown) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string | undefined) => {
    const badgeStatus = status || "pending"
    switch (badgeStatus) {
      case "accepted":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5 px-3 py-1 text-sm font-medium">
            <CheckCheck className="h-4 w-4" /> Accepted
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 gap-1.5 px-3 py-1 text-sm font-medium">
            <XCircle className="h-4 w-4" /> Rejected
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 gap-1.5 px-3 py-1 text-sm font-medium">
            <Clock className="h-4 w-4" /> Pending
          </Badge>
        )
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied to clipboard!")
  }

  const handleDownloadPDF = async () => {
    if (!quotation || !generalInfo) return
    setIsUpdating(true)
    try {
      toast.info("Generating PDF...")
      generateQuotationPDF(quotation)
      toast.success("PDF downloaded successfully!")
    } catch {
      toast.error("Failed to generate PDF. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-muted/30 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!quotation || !generalInfo) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-background rounded-2xl border-2 border-dashed border-border/70 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-5">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Quotation Not Found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              The quotation you are looking for does not exist or has been deleted.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/dashboard/quotations">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quotations
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      <div className="p-4 sm:p-6 lg:p-8 print:p-0">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                asChild
                className="rounded-full h-10 w-10 bg-background border-border/50"
              >
                <Link href="/dashboard/quotations">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Quotation #{quotation.quotationNumber}
                  </h1>
                  {getStatusBadge(quotation.isAccepted)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Created on {new Date(quotation.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <TooltipProvider>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                      className="h-9 w-9 rounded-lg bg-transparent"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy Link</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isUpdating}
                      onClick={handleDownloadPDF}
                      className="h-9 w-9 rounded-lg bg-transparent"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download PDF</p>
                  </TooltipContent>
                </Tooltip>

                {session?.user?.role === "admin" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" asChild className="h-9 w-9 rounded-lg bg-transparent">
                        <Link href={`/dashboard/quotations/edit/${quotationNumber}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit Quotation</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          </div>

          {/* Status Actions - Only show if pending */}
          {quotation.isAccepted === "pending" && (
            <div className="bg-background rounded-xl border border-border/50 p-4 sm:p-5 print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Awaiting Response</h3>
                    <p className="text-sm text-muted-foreground">This quotation is pending client approval</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAccept}
                    disabled={isUpdating}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCheck className="mr-1.5 h-4 w-4" />
                    )}
                    Accept
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    disabled={isUpdating}
                    size="sm"
                    className="rounded-lg"
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-1.5 h-4 w-4" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Client Information */}
          <div className="bg-background rounded-xl border border-border/50 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">Client Information</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Client Name</p>
                    <p className="font-medium text-foreground">{quotation.clientName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Phone Number</p>
                    <p className="font-medium text-foreground">{quotation.clientNumber}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Quotation Date</p>
                    <p className="font-medium text-foreground">{new Date(quotation.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                  <p className="font-medium text-foreground whitespace-pre-line">{quotation.clientAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          {quotation.note && (
            <div className="bg-background rounded-xl border border-border/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="font-semibold text-foreground">Additional Notes</h2>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm whitespace-pre-line">{quotation.note}</p>
              </div>
            </div>
          )}

          {/* Quotation Items */}
          <div className="bg-background rounded-xl border border-border/50 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Quotation Items</h2>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground text-sm">Description</th>
                    <th className="text-right py-3 px-5 font-medium text-muted-foreground text-sm">Area (sq.ft)</th>
                    <th className="text-right py-3 px-5 font-medium text-muted-foreground text-sm">Rate (₹)</th>
                    <th className="text-right py-3 px-5 font-medium text-muted-foreground text-sm">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items?.map((item, index) => (
                    <tr key={index} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-5">
                        <p className="font-medium text-foreground">{item.description}</p>
                        {item.note && <p className="text-sm text-muted-foreground mt-1">{item.note}</p>}
                      </td>
                      <td className="text-right py-4 px-5 font-mono text-sm">{item.area || "-"}</td>
                      <td className="text-right py-4 px-5 font-mono text-sm">₹{item.rate?.toFixed(2)}</td>
                      <td className="text-right py-4 px-5 font-mono font-medium">
                        ₹{(item.total ?? item.rate).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-border/50">
              {quotation.items?.map((item, index) => (
                <div key={index} className="p-4 space-y-3">
                  <div>
                    <p className="font-medium text-foreground">{item.description}</p>
                    {item.note && <p className="text-sm text-muted-foreground mt-1">{item.note}</p>}
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Area: {item.area || "-"} sq.ft</p>
                      <p className="text-muted-foreground">Rate: ₹{item.rate?.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-bold text-foreground">₹{(item.total ?? item.rate).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-muted/30 border-t border-border/50 p-5 sm:p-6">
              <div className="max-w-xs ml-auto space-y-2">
                {quotation.subtotal && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">₹{quotation.subtotal?.toFixed(2)}</span>
                  </div>
                )}
                {typeof quotation.discount === "number" && quotation.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-mono text-emerald-600">-₹{quotation.discount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold text-foreground">Grand Total</span>
                  <span className="text-xl font-bold text-primary">₹{quotation.grandTotal?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Site Images */}
          {quotation.siteImages && quotation.siteImages.length > 0 && (
            <div className="bg-background rounded-xl border border-border/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Site Images</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {quotation.siteImages.map((image, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted"
                  >
                    <Image
                      src={failedImages.includes(index) ? "/placeholder.svg?height=200&width=200" : image.url}
                      alt={`Site image ${index + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      onError={() => setFailedImages((prev) => [...prev, index])}
                      unoptimized
                    />
                    {image.description && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2">
                        <p className="text-white text-xs truncate">{image.description}</p>
                      </div>
                    )}
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="h-3 w-3 text-foreground" />
                    </a>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {quotation.terms && quotation.terms.length > 0 && (
            <div className="bg-background rounded-xl border border-border/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Tag className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Terms & Conditions</h2>
              </div>
              <ul className="space-y-2">
                {quotation.terms.map((term, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary font-medium">{index + 1}.</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Company Information */}
          <div className="bg-background rounded-xl border border-border/50 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">Company Information</h2>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{generalInfo.siteName}</h3>
                <p className="text-sm text-muted-foreground">Professional Painting Solutions</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                  <p className="text-sm text-foreground whitespace-pre-line">{generalInfo.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Contact Number</p>
                  <p className="text-sm font-medium text-foreground">{generalInfo.mobileNumber1}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  )
}
