"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ArrowLeft,
  FileText,
  User,
  MapPin,
  Phone,
  Calendar,
  Download,
  Clock,
  CheckCircle,
  DollarSign,
  AlertCircle,
  Briefcase,
  LinkIcon,
  Info,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { apiFetch } from "@/app/lib/api"
import type { Invoice } from "@/app/types"
import { generateInvoicePDF } from "@/app/lib/generate-pdf"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface InvoiceViewProps {
  invoiceId: string
  token?: string
}

export default function InvoiceView({ invoiceId, token }: InvoiceViewProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchInvoice = useCallback(async () => {
    try {
      const url = `/invoices/${invoiceId}${token ? `?token=${token}` : ""}`
      const data = await apiFetch<Invoice>(url)
      setInvoice(data)
    } catch (error: unknown) {
      console.error("Fetch invoice error:", error)
      const errorMessage =
        error instanceof Error ? error.message : `Failed to fetch invoice: ${error || "Unknown error"}`
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [invoiceId, token])

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice()
    }
  }, [invoiceId, token, fetchInvoice])

  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success("Link copied to clipboard!")
  }

  const handleDownloadPDF = async () => {
    if (!invoice) return
    setIsGenerating(true)
    try {
      toast.info("Generating PDF...")
      await generateInvoicePDF(invoice)
      toast.success("PDF downloaded successfully!")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const getPaymentStatus = () => {
    if (!invoice) return null
    const amountDue = invoice.amountDue
    const grandTotal = invoice.grandTotal

    if (amountDue <= 0) {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5 px-3 py-1 text-sm font-medium">
          <CheckCircle className="h-4 w-4" /> Paid
        </Badge>
      )
    } else if (amountDue < grandTotal) {
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 gap-1.5 px-3 py-1 text-sm font-medium">
          <Clock className="h-4 w-4" /> Partially Paid
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 gap-1.5 px-3 py-1 text-sm font-medium">
          <AlertCircle className="h-4 w-4" /> Unpaid
        </Badge>
      )
    }
  }

  if (loading) {
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
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-background rounded-2xl border-2 border-dashed border-border/70 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-5">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Invoice Not Found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              The invoice you are looking for does not exist or you lack access.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/dashboard/invoices">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Invoices
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
                <Link href="/dashboard/invoices">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Invoice #{invoice.invoiceId}
                  </h1>
                  {getPaymentStatus()}
                </div>
                <p className="text-sm text-muted-foreground">Issued on {new Date(invoice.date).toLocaleDateString()}</p>
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
                      disabled={isGenerating}
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
              </div>
            </TooltipProvider>
          </div>

          {/* Payment Summary - Show amount due prominently */}
          {invoice.amountDue > 0 && (
            <div className="bg-background rounded-xl border border-border/50 p-4 sm:p-5 print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Payment Due</h3>
                    <p className="text-sm text-muted-foreground">
                      ₹{Number(invoice.amountDue).toFixed(2)} remaining to be paid
                    </p>
                  </div>
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
                    <p className="font-medium text-foreground">{invoice.clientName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Phone Number</p>
                    <p className="font-medium text-foreground">{invoice.clientNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Invoice Date</p>
                    <p className="font-medium text-foreground">{new Date(invoice.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                  <p className="font-medium text-foreground whitespace-pre-line">{invoice.clientAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          {invoice.note && (
            <div className="bg-background rounded-xl border border-border/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="font-semibold text-foreground">Additional Notes</h2>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm whitespace-pre-line">{invoice.note}</p>
              </div>
            </div>
          )}

          {/* Invoice Items */}
          <div className="bg-background rounded-xl border border-border/50 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Invoice Items</h2>
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
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-5">
                        <p className="font-medium text-foreground">{item.description}</p>
                        {item.note && <p className="text-sm text-muted-foreground mt-1">{item.note}</p>}
                      </td>
                      <td className="text-right py-4 px-5 font-mono text-sm">{item.area ?? "-"}</td>
                      <td className="text-right py-4 px-5 font-mono text-sm">₹{Number(item.rate).toFixed(2)}</td>
                      <td className="text-right py-4 px-5 font-mono font-medium">
                        ₹
                        {(Number(item.total) || (item.area && item.rate ? item.area * item.rate : item.rate)).toFixed(
                          2,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-border/50">
              {invoice.items.map((item, index) => (
                <div key={index} className="p-4 space-y-3">
                  <div>
                    <p className="font-medium text-foreground">{item.description}</p>
                    {item.note && <p className="text-sm text-muted-foreground mt-1">{item.note}</p>}
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Area: {item.area ?? "-"} sq.ft</p>
                      <p className="text-muted-foreground">Rate: ₹{Number(item.rate).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-bold text-foreground">
                        ₹
                        {(Number(item.total) || (item.area && item.rate ? item.area * item.rate : item.rate)).toFixed(
                          2,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-muted/30 border-t border-border/50 p-5 sm:p-6">
              <div className="max-w-xs ml-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">₹{Number(invoice.subtotal).toFixed(2)}</span>
                </div>
                {typeof invoice.discount === "number" && invoice.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-mono text-emerald-600">-₹{Number(invoice.discount).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold text-foreground">Grand Total</span>
                  <span className="text-xl font-bold text-primary">₹{Number(invoice.grandTotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-muted-foreground">Amount Due</span>
                  <span className="text-lg font-bold text-destructive">₹{Number(invoice.amountDue).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Extra Work */}
          {invoice.extraWork && invoice.extraWork.length > 0 && (
            <div className="bg-background rounded-xl border border-border/50 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="font-semibold text-foreground">Extra Work</h2>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-3 px-5 font-medium text-muted-foreground text-sm">Description</th>
                      <th className="text-right py-3 px-5 font-medium text-muted-foreground text-sm">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.extraWork.map((ew, index) => (
                      <tr key={index} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-5">
                          <p className="font-medium text-foreground">{ew.description}</p>
                          {ew.note && <p className="text-sm text-muted-foreground mt-1">{ew.note}</p>}
                        </td>
                        <td className="text-right py-4 px-5 font-mono font-medium">₹{Number(ew.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-border/50">
                {invoice.extraWork.map((ew, index) => (
                  <div key={index} className="p-4 space-y-2">
                    <p className="font-medium text-foreground">{ew.description}</p>
                    {ew.note && <p className="text-sm text-muted-foreground">{ew.note}</p>}
                    <div className="flex justify-end">
                      <p className="font-bold text-foreground">₹{Number(ew.total).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment History */}
          {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
            <div className="bg-background rounded-xl border border-border/50 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h2 className="font-semibold text-foreground">Payment History</h2>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-3 px-5 font-medium text-muted-foreground text-sm">Date</th>
                      <th className="text-left py-3 px-5 font-medium text-muted-foreground text-sm">Note</th>
                      <th className="text-right py-3 px-5 font-medium text-muted-foreground text-sm">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.paymentHistory.map((payment, index) => (
                      <tr key={index} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-5 font-mono text-sm">{new Date(payment.date).toLocaleDateString()}</td>
                        <td className="py-4 px-5 text-sm text-muted-foreground">{payment.note || "-"}</td>
                        <td className="text-right py-4 px-5 font-mono font-medium text-emerald-600">
                          +₹{Number(payment.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-border/50">
                {invoice.paymentHistory.map((payment, index) => (
                  <div key={index} className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">{new Date(payment.date).toLocaleDateString()}</p>
                      <p className="font-bold text-emerald-600">+₹{Number(payment.amount).toFixed(2)}</p>
                    </div>
                    {payment.note && <p className="text-sm text-muted-foreground">{payment.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {invoice.terms && invoice.terms.length > 0 && (
            <div className="bg-background rounded-xl border border-border/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Tag className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Terms & Conditions</h2>
              </div>
              <ul className="space-y-2">
                {invoice.terms.map((term, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary font-medium">{index + 1}.</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* History/Timestamps */}
          <div className="bg-background rounded-xl border border-border/50 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">History</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                  <p className="font-medium text-foreground text-sm">{new Date(invoice.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {invoice.lastUpdated && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Last Updated</p>
                    <p className="font-medium text-foreground text-sm">
                      {new Date(invoice.lastUpdated).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
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
