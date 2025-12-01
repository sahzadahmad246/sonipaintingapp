"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
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
  Plus,
  AlertCircle,
  ImageIcon,
  CreditCard,
  LinkIcon,
  ExternalLink,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import Image from "next/image"
import { apiFetch } from "@/app/lib/api"
import type { Project, Payment } from "@/app/types"
import { generateProjectPDF } from "@/app/lib/generate-pdf"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ProjectViewProps {
  projectId: string
}

export default function ProjectView({ projectId }: ProjectViewProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [failedImages, setFailedImages] = useState<number[]>([])
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    method: "Cash",
    note: "",
  })
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  const fetchProject = useCallback(async () => {
    try {
      const data = await apiFetch<Project>(`/projects/${projectId}`)
      setProject(data)
    } catch (error: unknown) {
      console.error("Fetch project error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch project"
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId, fetchProject])

  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success("Link copied to clipboard!")
  }

  const handleDownloadPDF = async () => {
    if (!project) return

    setIsGenerating(true)
    try {
      toast.info("Generating PDF...")
      await generateProjectPDF(project)
      toast.success("PDF downloaded successfully!")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddPayment = async () => {
    if (!project || !newPayment.amount || !newPayment.date) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmittingPayment(true)
    try {
      const updatedProject = await apiFetch<Project>(`/projects/${projectId}/payments`, {
        method: "POST",
        body: JSON.stringify(newPayment),
      })
      setProject(updatedProject)
      setPaymentDialogOpen(false)
      setNewPayment({
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        method: "Cash",
        note: "",
      })
      toast.success("Payment added successfully")
    } catch (error: unknown) {
      console.error("Add payment error:", error)
      toast.error("Failed to add payment")
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const getStatusBadge = () => {
    if (!project) return null

    switch (project.status) {
      case "completed":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5 px-3 py-1 text-sm font-medium">
            <CheckCircle className="h-4 w-4" /> Completed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 gap-1.5 px-3 py-1 text-sm font-medium">
            <AlertCircle className="h-4 w-4" /> Cancelled
          </Badge>
        )
      default:
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 gap-1.5 px-3 py-1 text-sm font-medium">
            <Clock className="h-4 w-4" /> In Progress
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
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-background rounded-2xl border-2 border-dashed border-border/70 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-5">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Project Not Found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              The project you are looking for does not exist or has been removed.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/dashboard/projects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const totalPayments = project.paymentHistory.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const grandTotal = Number(project.grandTotal) || 0
  const remainingBalance = grandTotal - totalPayments
  const progressPercentage = grandTotal > 0 ? (totalPayments / grandTotal) * 100 : 0

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
                <Link href="/dashboard/projects">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Project #{project.projectId}
                  </h1>
                  {getStatusBadge()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Created on {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "N/A"}
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

          {/* Payment Summary Banner */}
          <div className="bg-background rounded-xl border border-border/50 p-4 sm:p-5 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-foreground">Payment Progress</h3>
                    <span className="text-sm text-muted-foreground">{progressPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Paid</p>
                  <p className="font-semibold text-emerald-600">₹{totalPayments.toFixed(2)}</p>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="text-center">
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-semibold text-destructive">₹{remainingBalance.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

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
                    <p className="font-medium text-foreground">{project.clientName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Phone Number</p>
                    <p className="font-medium text-foreground">{project.clientNumber}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Project Date</p>
                    <p className="font-medium text-foreground">
                      {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                  <p className="font-medium text-foreground whitespace-pre-line">{project.clientAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          {project.note && (
            <div className="bg-background rounded-xl border border-border/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="font-semibold text-foreground">Additional Notes</h2>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm whitespace-pre-line">{project.note}</p>
              </div>
            </div>
          )}

          {/* Project Items */}
          <div className="bg-background rounded-xl border border-border/50 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Project Items</h2>
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
                  {project.items.map((item, index) => (
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
              {project.items.map((item, index) => (
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
                  <span className="font-mono">₹{Number(project.subtotal).toFixed(2)}</span>
                </div>
                {typeof project.discount === "number" && project.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-mono text-emerald-600">-₹{Number(project.discount).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold text-foreground">Grand Total</span>
                  <span className="text-xl font-bold text-primary">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-background rounded-xl border border-border/50 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Payment History</h2>
              </div>

              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-lg">
                    <Plus className="h-4 w-4 mr-1" /> Add Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-xl sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>Add a new payment record for this project.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newPayment.date as string}
                        onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="method">Payment Method</Label>
                      <Input
                        id="method"
                        value={newPayment.method}
                        onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                        placeholder="e.g. Cash, UPI, Bank Transfer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="note">Note (Optional)</Label>
                      <Textarea
                        id="note"
                        value={newPayment.note}
                        onChange={(e) => setNewPayment({ ...newPayment, note: e.target.value })}
                        placeholder="Additional details..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="rounded-lg">
                      Cancel
                    </Button>
                    <Button onClick={handleAddPayment} disabled={isSubmittingPayment} className="rounded-lg">
                      {isSubmittingPayment ? "Adding..." : "Add Payment"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {project.paymentHistory.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-3 px-5 font-medium text-muted-foreground text-sm">Date</th>
                        <th className="text-left py-3 px-5 font-medium text-muted-foreground text-sm">Method</th>
                        <th className="text-left py-3 px-5 font-medium text-muted-foreground text-sm">Note</th>
                        <th className="text-right py-3 px-5 font-medium text-muted-foreground text-sm">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.paymentHistory.map((payment, index) => (
                        <tr key={index} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-5 text-sm">{new Date(payment.date).toLocaleDateString()}</td>
                          <td className="py-4 px-5 text-sm">{payment.method}</td>
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
                  {project.paymentHistory.map((payment, index) => (
                    <div key={index} className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-foreground">{payment.method}</p>
                          <p className="text-sm text-muted-foreground">{new Date(payment.date).toLocaleDateString()}</p>
                        </div>
                        <p className="font-bold text-emerald-600">+₹{Number(payment.amount).toFixed(2)}</p>
                      </div>
                      {payment.note && <p className="text-sm text-muted-foreground">{payment.note}</p>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-muted-foreground">No payments recorded yet.</div>
            )}
          </div>

          {/* Site Images */}
          {project.siteImages && project.siteImages.length > 0 && (
            <div className="bg-background rounded-xl border border-border/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Site Images</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {project.siteImages.map((image, index) => (
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
