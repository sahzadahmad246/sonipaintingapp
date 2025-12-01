"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trash2,
  Edit,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Phone,
  Plus,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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

import { getQuotations, apiFetch } from "@/app/lib/api"
import { generateQuotationPDF } from "@/app/lib/generate-pdf"
import type { Quotation, ApiError } from "@/app/types"

export default function QuotationList() {
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quotationToDelete, setQuotationToDelete] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const limit = 10

  const fetchQuotations = useCallback(async () => {
    try {
      const { quotations, pages } = await getQuotations(page, limit)
      setQuotations(quotations)
      setTotalPages(pages)
    } catch (error: unknown) {
      const apiError = error as ApiError
      toast.error(apiError.error || "Failed to fetch quotations")
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  const filterQuotations = useCallback(() => {
    let filtered = [...quotations]
    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.clientAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.clientNumber.includes(searchTerm),
      )
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((q) => q.isAccepted === statusFilter)
    }
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB
    })
    setFilteredQuotations(filtered)
  }, [quotations, searchTerm, statusFilter, sortOrder])

  useEffect(() => {
    fetchQuotations()
  }, [fetchQuotations])

  useEffect(() => {
    filterQuotations()
  }, [filterQuotations])

  const handleDelete = async (quotationNumber: string) => {
    try {
      await apiFetch(`/quotations/${quotationNumber}`, { method: "DELETE" })
      setQuotations((prev) => prev.filter((q) => q.quotationNumber !== quotationNumber))
      toast.success("Quotation deleted successfully!")
    } catch (error: unknown) {
      const apiError = error as ApiError
      toast.error(apiError.error || "Failed to delete quotation")
    } finally {
      setDeleteDialogOpen(false)
      setQuotationToDelete(null)
    }
  }

  const confirmDelete = (quotationNumber: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setQuotationToDelete(quotationNumber)
    setDeleteDialogOpen(true)
  }

  const handleDownloadPDF = async (quotation: Quotation, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setIsGenerating(quotation.quotationNumber)
      toast.info("Generating PDF...")
      await generateQuotationPDF(quotation)
      toast.success("Quotation PDF downloaded successfully!")
    } catch (error: unknown) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    } finally {
      setIsGenerating(null)
    }
  }

  const handleCardClick = (quotationNumber: string) => {
    router.push(`/dashboard/quotations/${quotationNumber}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 text-xs font-medium">
            <CheckCircle className="h-3 w-3" /> Accepted
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 gap-1 text-xs font-medium">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 gap-1 text-xs font-medium">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "border-l-emerald-500"
      case "rejected":
        return "border-l-red-500"
      default:
        return "border-l-amber-500"
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

  if (quotations.length === 0 && page === 1) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-background rounded-2xl border-2 border-dashed border-border/70 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-5">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Quotations Yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              Create your first quotation to start tracking your estimates and business deals.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/dashboard/quotations/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Quotation
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
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Quotations</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage and track your estimates</p>
          </div>
          <Button asChild className="rounded-full px-6">
            <Link href="/dashboard/quotations/create">
              <Plus className="h-4 w-4 mr-2" />
              New Quotation
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
                        : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("pending")}>Pending</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("accepted")}>Accepted</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("rejected")}>Rejected</DropdownMenuItem>
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

        {/* Quotations List */}
        <AnimatePresence mode="wait">
          {filteredQuotations.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="bg-background rounded-2xl border-2 border-dashed border-border/70 p-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground">No matching quotations</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredQuotations.map((quotation, index) => (
                <motion.div
                  key={quotation.quotationNumber}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <div
                    onClick={() => handleCardClick(quotation.quotationNumber)}
                    className={`group bg-background rounded-xl border border-border/50 p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 border-l-4 ${getStatusColor(quotation.isAccepted)}`}
                  >
                    {/* Mobile Layout */}
                    <div className="sm:hidden space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              #{quotation.quotationNumber}
                            </span>
                            {getStatusBadge(quotation.isAccepted)}
                          </div>
                          <h3 className="font-semibold text-foreground">{quotation.clientName}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">
                            ₹{quotation.grandTotal?.toFixed(0) || "0"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                          <Calendar className="h-3 w-3" />
                          {new Date(quotation.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                          <Phone className="h-3 w-3" />
                          {quotation.clientNumber}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/quotations/edit/${quotation.quotationNumber}`)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => handleDownloadPDF(quotation, e)}
                          disabled={isGenerating === quotation.quotationNumber}
                        >
                          {isGenerating === quotation.quotationNumber ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => confirmDelete(quotation.quotationNumber, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex sm:items-center sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-xs text-muted-foreground">#{quotation.quotationNumber}</span>
                          {getStatusBadge(quotation.isAccepted)}
                        </div>
                        <h3 className="font-semibold text-foreground truncate mb-2">{quotation.clientName}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(quotation.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {quotation.clientNumber}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[150px]">{quotation.clientAddress}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-center px-4 border-l border-border/50 min-w-[100px]">
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-lg font-bold text-foreground">
                          ₹{quotation.grandTotal?.toFixed(2) || "0.00"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 pl-2 border-l border-border/50">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/quotations/edit/${quotation.quotationNumber}`)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={(e) => handleDownloadPDF(quotation, e)}
                          disabled={isGenerating === quotation.quotationNumber}
                        >
                          {isGenerating === quotation.quotationNumber ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => confirmDelete(quotation.quotationNumber, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
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
              Are you sure you want to delete this quotation? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => quotationToDelete && handleDelete(quotationToDelete)}
              className="rounded-lg"
            >
              Delete Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
