"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Edit,
  Eye,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

import { getQuotations, apiFetch } from "@/app/lib/api";
import { generateQuotationPDF } from "@/app/lib/generate-pdf";
import type { Quotation, ApiError } from "@/app/types";

export default function QuotationList() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const limit = 10;

  const fetchQuotations = useCallback(async () => {
    try {
      const { quotations, pages } = await getQuotations(page, limit);
      setQuotations(quotations);
      setTotalPages(pages);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to fetch quotations");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const filterQuotations = useCallback(() => {
    let filtered = [...quotations];
    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.clientAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.clientNumber.includes(searchTerm),
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((q) => q.isAccepted === statusFilter);
    }
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    setFilteredQuotations(filtered);
  }, [quotations, searchTerm, statusFilter, sortOrder]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  useEffect(() => {
    filterQuotations();
  }, [filterQuotations]);

  const handleDelete = async (quotationNumber: string) => {
    try {
      await apiFetch(`/quotations/${quotationNumber}`, { method: "DELETE" });
      setQuotations((prev) => prev.filter((q) => q.quotationNumber !== quotationNumber));
      toast.success("Quotation deleted successfully!");
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to delete quotation");
    } finally {
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
    }
  };

  const confirmDelete = (quotationNumber: string) => {
    setQuotationToDelete(quotationNumber);
    setDeleteDialogOpen(true);
  };

  const handleDownloadPDF = async (quotation: Quotation) => {
    try {
      setIsGenerating(quotation.quotationNumber);
      toast.info("Generating PDF...");
      await generateQuotationPDF(quotation);
      toast.success("Quotation PDF downloaded successfully!");
    } catch (error: unknown) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" /> Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (quotations.length === 0 && page === 1) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Quotations Found</h3>
          <p className="text-gray-500 mb-6 text-center">Create your first quotation to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6 text-gray-600" /> Quotation List
          </CardTitle>
          <CardDescription>Manage all your quotations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by client name or quotation number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />{" "}
                    {statusFilter === "all"
                      ? "All Status"
                      : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("pending")}>Pending</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("accepted")}>Accepted</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("rejected")}>Rejected</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}>
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {sortOrder === "newest" ? "Newest First" : "Oldest First"}
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {filteredQuotations.length === 0 ? (
              < motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No matching quotations found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {filteredQuotations.map((quotation, index) => (
                  <motion.div
                    key={quotation.quotationNumber}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Card>
                      <div className="border-l-4 border-gray-600">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-bold flex items-center">
                                Quotation #{quotation.quotationNumber}
                                <span className="ml-3">{getStatusBadge(quotation.isAccepted)}</span>
                              </h3>
                              <p className="text-sm text-gray-500">
                                Created: {new Date(quotation.createdAt).toLocaleDateString()}
                                {quotation.lastUpdated &&
                                  ` • Updated: ${new Date(quotation.lastUpdated).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div className="mt-4 md:mt-0">
                              <p className="text-lg font-bold text-gray-700">
                                ₹{quotation.grandTotal?.toFixed(2) || "0.00"}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Client</p>
                              <p className="font-medium">{quotation.clientName}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Contact</p>
                              <p>{quotation.clientNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Date</p>
                              <p>{new Date(quotation.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-4">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/dashboard/quotations/${quotation.quotationNumber}`}>
                                      <Eye className="h-4 w-4 mr-1" /> View
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View quotation details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/dashboard/quotations/edit/${quotation.quotationNumber}`}>
                                      <Edit className="h-4 w-4 mr-1" /> Edit
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit quotation</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadPDF(quotation)}
                                    disabled={isGenerating === quotation.quotationNumber}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    {isGenerating === quotation.quotationNumber ? "Generating..." : "Download"}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download as PDF</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => confirmDelete(quotation.quotationNumber)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete this quotation</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-center mt-6">
            <Button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
            <p>
              Page {page} of {totalPages}
            </p>
            <Button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
              Next <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quotation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => quotationToDelete && handleDelete(quotationToDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}