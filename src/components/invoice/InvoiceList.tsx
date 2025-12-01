"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trash2,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  ArrowUpDown,
  Plus,
  Calendar,
  Phone,
  MapPin,
  Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getInvoices, apiFetch } from "@/app/lib/api"
import { generateInvoicePDF } from "@/app/lib/generate-pdf"
import type { Invoice } from "@/app/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function InvoiceList() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "partially-paid" | "unpaid">("all")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const limit = 10

  const fetchInvoices = useCallback(async () => {
    try {
      const { invoices, pages } = await getInvoices(page, limit)
      setInvoices(invoices || [])
      setTotalPages(pages || 1)
    } catch (error: unknown) {
      console.error("Fetch invoices error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch invoices"
      toast.error(errorMessage)
      setInvoices([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  const getInvoiceStatus = (invoice: Invoice) => {
    const amountDue = invoice.amountDue
    const grandTotal = invoice.grandTotal

    if (amountDue <= 0) return "paid"
    if (amountDue < grandTotal) return "partially-paid"
    return "unpaid"
  }

  const filterInvoices = useCallback(() => {
    let filtered = [...invoices]
    if (searchTerm) {
      filtered = filtered.filter(
        (i) =>
          i.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.clientAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.clientNumber.includes(searchTerm),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((i) => getInvoiceStatus(i) === statusFilter)
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date).getTime()
      const dateB = new Date(b.createdAt || b.date).getTime()
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB
    })

    setFilteredInvoices(filtered)
  }, [invoices, searchTerm, statusFilter, sortOrder])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    filterInvoices()
  }, [filterInvoices])

  const handleDelete = async (invoiceId: string) => {
    try {
      setIsDeleting(invoiceId)
      await apiFetch(`/invoices/${invoiceId}`, { method: "DELETE" })
      setInvoices((prev) => prev.filter((i) => i.invoiceId !== invoiceId))
      toast.success("Invoice deleted successfully!")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete invoice"
      toast.error(errorMessage)
    } finally {
      setIsDeleting(null)
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
    }
  }

  const confirmDelete = (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setInvoiceToDelete(invoiceId)
    setDeleteDialogOpen(true)
  }

  const handleDownloadPDF = async (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setIsGenerating(invoice.invoiceId)
      toast.info("Generating PDF...")
      await generateInvoicePDF(invoice)
      toast.success("Invoice downloaded successfully!")
    } catch (error: unknown) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    } finally {
      setIsGenerating(null)
    }
  }

  const handleCardClick = (invoiceId: string) => {
    router.push(`/dashboard/invoices/${invoiceId}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 text-xs font-medium">
            <CheckCircle className="h-3 w-3" /> Paid
          </Badge>
        )
      case "partially-paid":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 gap-1 text-xs font-medium">
            <Clock className="h-3 w-3" /> Partial
          </Badge>
        )
      default:
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 gap-1 text-xs font-medium">
            <XCircle className="h-3 w-3" /> Unpaid
          </Badge>
        )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "border-l-emerald-500"
      case "partially-paid":
        return "border-l-amber-500"
      default:
        return "border-l-red-500"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-background rounded-xl p-5 border border-border/50">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (invoices.length === 0 && page === 1) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-background rounded-2xl border-2 border-dashed border-border/70 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-5">
              <Receipt className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Invoices Yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              Create your first invoice to start billing your clients.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/dashboard/invoices/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage and track your billing</p>
          </div>
          <Button asChild className="rounded-full px-6">
            <Link href="/dashboard/invoices/create">
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Link>
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="bg-background rounded-xl border border-border/50 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search client, ID, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-lg bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 rounded-lg border-border/50 bg-muted/50">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">
                      {statusFilter === "all"
                        ? "All Status"
                        : statusFilter.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("paid")}>Paid</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("partially-paid")}>Partially Paid</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("unpaid")}>Unpaid</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-lg border-border/50 bg-muted/50"
                onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
              >
                <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{sortOrder === "newest" ? "Newest" : "Oldest"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <AnimatePresence mode="wait">
          {filteredInvoices.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="bg-background rounded-2xl border-2 border-dashed border-border/70 p-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground">No matching invoices</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredInvoices.map((invoice, index) => {
                const status = getInvoiceStatus(invoice)
                return (
                  <motion.div
                    key={invoice.invoiceId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <div
                      onClick={() => handleCardClick(invoice.invoiceId)}
                      className={`group bg-background rounded-xl border border-border/50 p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 border-l-4 ${getStatusColor(status)}`}
                    >
                      {/* Mobile Layout */}
                      <div className="sm:hidden space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                #{invoice.invoiceId}
                              </span>
                              {getStatusBadge(status)}
                            </div>
                            <h3 className="font-semibold text-foreground">{invoice.clientName}</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">
                              ₹{invoice.grandTotal.toFixed(0)}
                            </p>
                            {invoice.amountDue > 0 && (
                              <p className="text-xs text-destructive font-medium">
                                Due: ₹{invoice.amountDue.toFixed(0)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                            <Calendar className="h-3 w-3" />
                            {new Date(invoice.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                            <Phone className="h-3 w-3" />
                            {invoice.clientNumber}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/50">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/invoices/${invoice.invoiceId}`)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={(e) => handleDownloadPDF(invoice, e)}
                            disabled={isGenerating === invoice.invoiceId}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => confirmDelete(invoice.invoiceId, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex sm:items-center sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-xs text-muted-foreground">#{invoice.invoiceId}</span>
                            {getStatusBadge(status)}
                          </div>
                          <h3 className="font-semibold text-foreground truncate mb-2">{invoice.clientName}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(invoice.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" />
                              {invoice.clientNumber}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[150px]">{invoice.clientAddress}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-center px-4 border-l border-border/50 min-w-[120px]">
                          <p className="text-xs text-muted-foreground">Total Amount</p>
                          <p className="text-lg font-bold text-foreground">
                            ₹{invoice.grandTotal.toFixed(2)}
                          </p>
                          {invoice.amountDue > 0 && (
                            <p className="text-xs text-destructive font-medium mt-1">
                              Due: ₹{invoice.amountDue.toFixed(2)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 pl-2 border-l border-border/50">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/dashboard/invoices/${invoice.invoiceId}`)
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  onClick={(e) => handleDownloadPDF(invoice, e)}
                                  disabled={isGenerating === invoice.invoiceId}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download PDF</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => confirmDelete(invoice.invoiceId, e)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Invoice</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="h-9 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="text-sm text-muted-foreground px-3">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="h-9 rounded-lg"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete this invoice? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => invoiceToDelete && handleDelete(invoiceToDelete)}
              className="rounded-lg"
              disabled={isDeleting !== null}
            >
              {isDeleting ? "Deleting..." : "Delete Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}