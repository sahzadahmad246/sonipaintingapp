"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Eye,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getInvoices, apiFetch } from "@/app/lib/api";
import { generateInvoicePDF } from "@/app/lib/generate-pdf";
import type { Invoice } from "@/app/types";

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const limit = 10;

  const fetchInvoices = useCallback(async () => {
    try {
      const { invoices, pages } = await getInvoices(page, limit);
      setInvoices(invoices);
      setTotalPages(pages);
    } catch (error: unknown) {
      console.error("Fetch invoices error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch invoices";
      toast.error(errorMessage);
      setInvoices([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const filterInvoices = useCallback(() => {
    let filtered = [...invoices];
    if (searchTerm) {
      filtered = filtered.filter(
        (i) =>
          i.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.clientAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.clientNumber.includes(searchTerm),
      );
    }
    setFilteredInvoices(filtered);
  }, [invoices, searchTerm]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    filterInvoices();
  }, [filterInvoices]);

  const handleDelete = async (invoiceId: string) => {
    try {
      await apiFetch(`/invoices/${invoiceId}`, { method: "DELETE" });
      setInvoices((prev) => prev.filter((i) => i.invoiceId !== invoiceId));
      toast.success("Invoice deleted successfully!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete invoice";
      toast.error(errorMessage);
    } finally {
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const confirmDelete = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId);
    setDeleteDialogOpen(true);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      setIsGenerating(invoice.invoiceId);
      toast.info("Generating PDF...");
      await generateInvoicePDF(invoice);
      toast.success("Invoice downloaded successfully!");
    } catch (error: unknown) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(null);
    }
  };

  const getPaymentStatus = (invoice: Invoice) => {
    const amountDue = invoice.amountDue;
    const grandTotal = invoice.grandTotal;

    if (amountDue <= 0) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center">
          <CheckCircle className="h-3 w-3 mr-1" /> Paid
        </Badge>
      );
    } else if (amountDue < grandTotal) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center">
          <Clock className="h-3 w-3 mr-1" /> Partially Paid
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center">
          <XCircle className="h-3 w-3 mr-1" /> Unpaid
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

  if (invoices.length === 0 && page === 1) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Invoices Found</h3>
          <p className="text-gray-500 mb-6 text-center">Create your first invoice to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-6 w-6 text-primary" /> Invoice List
          </CardTitle>
          <CardDescription>Manage all your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by client name or invoice ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <AnimatePresence>
            {filteredInvoices.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No matching invoices found</h3>
                <p className="text-gray-500">Try adjusting your search criteria</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice, index) => (
                  <motion.div
                    key={invoice.invoiceId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden border shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                              Invoice #{invoice.invoiceId}
                              <span>{getPaymentStatus(invoice)}</span>
                            </h3>
                            <p className="text-sm text-gray-500">
                              Created: {new Date(invoice.createdAt).toLocaleDateString()}
                              {invoice.lastUpdated &&
                                ` • Updated: ${new Date(invoice.lastUpdated).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="mt-4 md:mt-0 text-right">
                            <p className="text-lg font-bold text-primary">₹{invoice.grandTotal.toFixed(2)}</p>
                            <p className="text-sm text-red-600">Due: ₹{invoice.amountDue.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Client</p>
                            <p className="font-medium">{invoice.clientName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Contact</p>
                            <p>{invoice.clientNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Date</p>
                            <p>{new Date(invoice.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/invoice/${invoice.invoiceId}`}>
                                    <Eye className="h-4 w-4 mr-1" /> View
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View invoice details</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadPDF(invoice)}
                                  disabled={isGenerating === invoice.invoiceId}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  {isGenerating === invoice.invoiceId ? "Generating..." : "Download"}
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
                                  onClick={() => confirmDelete(invoice.invoiceId)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete this invoice</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </CardContent>
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
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => invoiceToDelete && handleDelete(invoiceToDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}