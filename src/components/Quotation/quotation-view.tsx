"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  CheckCircle,
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
  Clipboard,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import Image from "next/image"
import { apiFetch } from "@/app/lib/api"
import type { Quotation, ApiError } from "@/app/types"
import { generateQuotationPDF } from "@/app/lib/pdf-generator"
import { PDFViewer } from "./pdf-viewer"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface QuotationViewProps {
  quotationNumber: string
}

export default function QuotationView({ quotationNumber }: QuotationViewProps) {
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [failedImages, setFailedImages] = useState<number[]>([])

  const fetchQuotation = useCallback(async () => {
    try {
      const data = await apiFetch<Quotation>(`/quotations/${quotationNumber}`)
      setQuotation(data)
    } catch (error: unknown) {
      const apiError = error as ApiError
      toast.error(apiError.error || "Failed to fetch quotation")
    } finally {
      setLoading(false)
    }
  }, [quotationNumber])

  useEffect(() => {
    if (!quotationNumber) {
      toast.error("Invalid quotation number")
      setLoading(false)
      return
    }
    fetchQuotation()
  }, [quotationNumber, fetchQuotation])

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
      setQuotation(data)
      toast.success("Quotation accepted!")
    } catch (error: unknown) {
      const apiError = error as ApiError
      toast.error(apiError.error || "Failed to accept quotation")
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
      setQuotation(data)
      toast.success("Quotation rejected!")
    } catch (error: unknown) {
      const apiError = error as ApiError
      toast.error(apiError.error || "Failed to reject quotation")
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string | undefined) => {
    const badgeStatus = status || "pending"
    switch (badgeStatus) {
      case "accepted":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Accepted
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        )
    }
  }

  const handleGeneratePDF = async () => {
    if (!quotation) return
    try {
      setIsUpdating(true)
      const pdfUrl = await generateQuotationPDF(quotation)
      setPdfUrl(pdfUrl)
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success("Link copied to clipboard!")
  }

  const handlePrint = () => {
    if (!quotation) return
    handleGeneratePDF().then(() => {
      setTimeout(() => {
        const iframe = document.getElementById("pdf-iframe") as HTMLIFrameElement
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.focus()
          iframe.contentWindow.print()
        }
      }, 1000)
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center mb-6">
          <Skeleton className="h-10 w-24 mr-4" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">Quotation Not Found</h3>
            <p className="text-gray-500 mb-6 text-center">The quotation does not exist or has been deleted.</p>
            <Button asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/quotations">Quotations</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>#{quotation.quotationNumber}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Quotation #{quotation.quotationNumber}</h1>
          <div className="ml-4">{getStatusBadge(quotation.isAccepted)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Clipboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy Link</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyLink}>Copy Link</DropdownMenuItem>
              <DropdownMenuItem onClick={handleGeneratePDF}>Download PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}>Print</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/quotations/edit/${quotationNumber}`}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Link>
          </Button>
          <Button size="sm" onClick={handleGeneratePDF} disabled={isUpdating}>
            <Download className="h-4 w-4 mr-1" /> {isUpdating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="bg-white border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                    <FileText className="h-5 w-5 text-primary" /> Quotation Details
                  </CardTitle>
                  <CardDescription>Created on {new Date(quotation.createdAt).toLocaleDateString()}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Quotation Date</p>
                  <p className="font-medium">{new Date(quotation.date).toLocaleDateString()}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-600 border-b">Description</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600 border-b">Area (sq.ft)</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600 border-b">Rate (₹)</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600 border-b">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items?.map((item, index) => (
                      <tr
                        key={index}
                        className={`border-b last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{item.description}</p>
                            {item.note && <p className="text-sm text-gray-500 mt-1">{item.note}</p>}
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">{item.area || "-"}</td>
                        <td className="text-right py-3 px-4">₹{item.rate?.toFixed(2)}</td>
                        <td className="text-right py-3 px-4 font-medium">₹{(item.total ?? item.rate).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t p-4">
              <div className="ml-auto w-full max-w-xs">
                {quotation.subtotal && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{quotation.subtotal?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium">₹{quotation.discount?.toFixed(2)}</span>
                </div>
                {quotation.grandTotal && (
                  <div className="flex justify-between py-1 border-t mt-2 pt-2">
                    <span className="font-semibold">Grand Total:</span>
                    <span className="font-bold text-primary">₹{quotation.grandTotal?.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </CardFooter>
          </Card>

          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center text-lg text-gray-800">
                <ImageIcon className="h-5 w-5 mr-2 text-primary" /> Site Images
              </CardTitle>
              <CardDescription>Images related to the quotation site</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {quotation.siteImages?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {quotation.siteImages.map((image, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="border rounded-lg overflow-hidden bg-white shadow-sm group relative"
                    >
                      <div className="relative aspect-video">
                        <Image
                          src={failedImages.includes(index) ? "/placeholder-image.jpg" : image.url}
                          alt={`Site image ${index + 1}`}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          onError={() => {
                            setFailedImages((prev) => [...prev, index])
                            toast.error(`Failed to load image ${index + 1}`)
                          }}
                          unoptimized={true}
                        />
                      </div>
                      <div className="p-3">
                        {image.description ? (
                          <p className="text-sm text-gray-700">{image.description}</p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No description provided</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ImageIcon className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">No site images available for this quotation.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="bg-white border-b">
              <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                <User className="h-5 w-5 text-primary" /> Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Client Name</p>
                    <p className="font-medium">{quotation.clientName}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="whitespace-pre-line">{quotation.clientAddress}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium">{quotation.clientNumber}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Quotation Date</p>
                    <p className="font-medium">{new Date(quotation.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {quotation.isAccepted === "pending" && (
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="bg-white border-b">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                  <FileText className="h-5 w-5 text-primary" /> Quotation Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Button
                    onClick={handleAccept}
                    disabled={isUpdating}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Accept Quotation
                  </Button>
                  <Button onClick={handleReject} variant="destructive" disabled={isUpdating} className="w-full">
                    <XCircle className="mr-2 h-4 w-4" /> Reject Quotation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center text-lg text-gray-800">
                <Tag className="h-5 w-5 mr-2 text-primary" /> Terms & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {quotation.terms?.length ? (
                <ul className="list-disc pl-5 space-y-2">
                  {quotation.terms.map((term, index) => (
                    <li key={index} className="text-gray-700">
                      {term}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No terms specified.</p>
              )}
            </CardContent>
          </Card>

          {quotation.note && (
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="bg-white border-b">
                <CardTitle className="text-lg text-gray-800">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-700 whitespace-pre-line">{quotation.note}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      {pdfUrl && (
        <PDFViewer
          pdfUrl={pdfUrl}
          onClose={() => setPdfUrl(null)}
          documentTitle={`Quotation #${quotation.quotationNumber}`}
        />
      )}
    </div>
  )
}
