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
  Share2,
  Clock,
  CheckCircle,
  DollarSign,
  Clipboard,
  Plus,
  AlertCircle,
  Briefcase,
  Image as ImageIcon,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProjectViewProps {
  projectId: string
}

export default function ProjectView({ projectId }: ProjectViewProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
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
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch project"
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
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1 px-3 py-1">
            <CheckCircle className="h-3.5 w-3.5" /> Completed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1 px-3 py-1">
            <AlertCircle className="h-3.5 w-3.5" /> Cancelled
          </Badge>
        )
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1 px-3 py-1">
            <Clock className="h-3.5 w-3.5" /> In Progress
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-5xl">
        <div className="flex items-center mb-8">
          <Skeleton className="h-10 w-10 rounded-full mr-4" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
          <Briefcase className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-semibold text-foreground mb-2">Project Not Found</h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The project you are looking for does not exist or has been removed.
        </p>
        <Button asChild size="lg">
          <Link href="/dashboard/projects">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Link>
        </Button>
      </div>
    )
  }

  const totalPayments = project.paymentHistory.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const grandTotal = Number(project.grandTotal) || 0
  const remainingBalance = grandTotal - totalPayments
  const progressPercentage = grandTotal > 0 ? (totalPayments / grandTotal) * 100 : 0

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/projects">Projects</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="font-medium text-foreground">#{project.projectId}</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl hidden sm:block">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  Project #{project.projectId}
                </h1>
                {getStatusBadge()}
              </div>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5" />
                Created on {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleCopyLink} className="rounded-lg">
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy Link</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-lg">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCopyLink}>Copy Link</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent>Share Project</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    className="rounded-lg shadow-sm"
                    disabled={isGenerating}
                    onClick={handleDownloadPDF}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isGenerating ? "Generating..." : "Download PDF"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download Project Report</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Details Card */}
            <Card className="overflow-hidden border border-border/50 shadow-sm rounded-xl">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> Project Details
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/20 border-b border-border/50">
                        <th className="text-left py-3 px-6 font-medium text-muted-foreground text-sm">Description</th>
                        <th className="text-right py-3 px-6 font-medium text-muted-foreground text-sm w-32">Area (sq.ft)</th>
                        <th className="text-right py-3 px-6 font-medium text-muted-foreground text-sm w-32">Rate (₹)</th>
                        <th className="text-right py-3 px-6 font-medium text-muted-foreground text-sm w-32">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {project.items.map((item, index) => (
                        <tr key={index} className="hover:bg-muted/10 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-medium text-foreground">{item.description}</p>
                            {item.note && <p className="text-sm text-muted-foreground mt-1">{item.note}</p>}
                          </td>
                          <td className="text-right py-4 px-6 text-sm">{item.area ?? "-"}</td>
                          <td className="text-right py-4 px-6 text-sm">₹{Number(item.rate).toFixed(2)}</td>
                          <td className="text-right py-4 px-6 font-medium">
                            ₹{(Number(item.total) || (item.area && item.rate ? item.area * item.rate : item.rate)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border/50 p-6">
                <div className="ml-auto w-full max-w-sm space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹{Number(project.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-emerald-600">-₹{Number(project.discount).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border/50 pt-3 flex justify-between items-center">
                    <span className="font-semibold text-lg">Grand Total</span>
                    <span className="font-bold text-xl text-primary">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardFooter>
            </Card>

            {/* Payment History */}
            <Card className="overflow-hidden border border-border/50 shadow-sm rounded-xl">
              <CardHeader className="bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Payment History
                </CardTitle>
                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-lg">
                      <Plus className="h-4 w-4 mr-1" /> Add Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-xl sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Record Payment</DialogTitle>
                      <DialogDescription>
                        Add a new payment record for this project.
                      </DialogDescription>
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
              </CardHeader>
              <CardContent className="p-0">
                {project.paymentHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/20 border-b border-border/50">
                          <th className="text-left py-3 px-6 font-medium text-muted-foreground text-sm">Date</th>
                          <th className="text-left py-3 px-6 font-medium text-muted-foreground text-sm">Method</th>
                          <th className="text-left py-3 px-6 font-medium text-muted-foreground text-sm">Note</th>
                          <th className="text-right py-3 px-6 font-medium text-muted-foreground text-sm">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {project.paymentHistory.map((payment, index) => (
                          <tr key={index} className="hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-6 text-sm">{new Date(payment.date).toLocaleDateString()}</td>
                            <td className="py-3 px-6 text-sm">{payment.method}</td>
                            <td className="py-3 px-6 text-sm text-muted-foreground">{payment.note || "-"}</td>
                            <td className="text-right py-3 px-6 font-medium text-emerald-600">
                              +₹{Number(payment.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No payments recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card className="overflow-hidden border border-border/50 shadow-sm rounded-xl">
              <CardHeader className="bg-muted/30 border-b border-border/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" /> Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Paid</span>
                    <span className="font-medium text-emerald-600">₹{totalPayments.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progressPercentage.toFixed(0)}% Paid</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-muted-foreground">Remaining Balance</span>
                    <span className="text-xl font-bold text-destructive">₹{remainingBalance.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card className="overflow-hidden border border-border/50 shadow-sm rounded-xl">
              <CardHeader className="bg-muted/30 border-b border-border/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Name</p>
                    <p className="font-medium text-foreground">{project.clientName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Contact</p>
                    <p className="font-medium text-foreground">{project.clientNumber}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Address</p>
                    <p className="font-medium text-foreground whitespace-pre-line">{project.clientAddress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Site Images */}
            {project.siteImages && project.siteImages.length > 0 && (
              <Card className="overflow-hidden border border-border/50 shadow-sm rounded-xl">
                <CardHeader className="bg-muted/30 border-b border-border/50">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" /> Site Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-2">
                    {project.siteImages.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={`Site image ${index + 1}`}
                          className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {project.note && (
              <Card className="overflow-hidden border border-border/50 shadow-sm rounded-xl">
                <CardHeader className="bg-muted/30 border-b border-border/50">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">
                    {project.note}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}