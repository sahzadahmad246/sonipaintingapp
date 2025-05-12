// InvoiceView.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
  Receipt,
  Clipboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { apiFetch } from "@/app/lib/api";
import type { Invoice } from "@/app/types";
import { generateInvoicePDF } from "@/app/lib/generate-pdf";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InvoiceViewProps {
  invoiceId: string;
  token?: string;
}

export default function InvoiceView({ invoiceId, token }: InvoiceViewProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      const url = `/invoices/${invoiceId}${token ? `?token=${token}` : ""}`;
      console.log("Fetching invoice:", url);
      const data = await apiFetch<Invoice>(url);
      console.log("Invoice data received:", data);
      setInvoice(data);
    } catch (error: unknown) {
      console.error("Fetch invoice error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to fetch invoice: ${error || "Unknown error"}`;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, token]);

  useEffect(() => {
    console.log("InvoiceView props:", { invoiceId, token });
    if (!invoiceId) {
      console.error("Invalid invoice ID:", invoiceId);
      toast.error("Invalid invoice ID");
      setLoading(false);
      return;
    }
    fetchInvoice();
  }, [invoiceId, token, fetchInvoice]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    setIsGenerating(true);
    try {
      toast.info("Generating PDF...");
      generateInvoicePDF(invoice);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getPaymentStatus = () => {
    if (!invoice) return null;

    const amountDue = invoice.amountDue;
    const grandTotal = invoice.grandTotal;

    if (amountDue <= 0) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Paid
        </Badge>
      );
    } else if (amountDue < grandTotal) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Partially Paid
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Unpaid
        </Badge>
      );
    }
  };

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
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">Invoice Not Found</h3>
            <p className="text-gray-500 mb-6 text-center">The invoice does not exist or you lack access.</p>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
              <BreadcrumbLink href="/dashboard/invoices">Invoices</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>#{invoice.invoiceId}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Invoice #{invoice.invoiceId}</h1>
          <div className="ml-4">{getPaymentStatus()}</div>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyLink}>Copy Link</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>Share invoice</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  disabled={isGenerating}
                  onClick={handleDownloadPDF}
                >
                  <Download className="h-4 w-4 mr-1" /> {isGenerating ? "Generating..." : "Download PDF"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download PDF</TooltipContent>
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
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="bg-white border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                    <Receipt className="h-5 w-5 text-primary" /> Invoice Details
                  </CardTitle>
                  <CardDescription>Created on {new Date(invoice.createdAt).toLocaleDateString()}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Invoice Date</p>
                  <p className="font-medium">{new Date(invoice.date).toLocaleDateString()}</p>
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
                    {invoice.items.map((item, index) => (
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
                        <td className="text-right py-3 px-4">{item.area ?? "-"}</td>
                        <td className="text-right py-3 px-4">₹{item.rate.toFixed(2)}</td>
                        <td className="text-right py-3 px-4 font-medium">
                          ₹{(item.total ?? (item.area && item.rate ? item.area * item.rate : item.rate)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t p-4">
              <div className="ml-auto w-full max-w-xs">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium">₹{invoice.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-t mt-2 pt-2">
                  <span className="font-semibold">Grand Total:</span>
                  <span className="font-bold text-primary">₹{invoice.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-semibold">Amount Due:</span>
                  <span className="font-bold text-red-600">₹{invoice.amountDue.toFixed(2)}</span>
                </div>
              </div>
            </CardFooter>
          </Card>

          {invoice.extraWork.length > 0 && (
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="bg-white border-b">
                <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                  <DollarSign className="h-5 w-5 text-primary" /> Extra Work
                </CardTitle>
                <CardDescription>Additional work performed</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-600 border-b">Description</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600 border-b">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.extraWork.map((ew, index) => (
                        <tr
                          key={index}
                          className={`border-b last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{ew.description}</p>
                              {ew.note && <p className="text-sm text-gray-500 mt-1">{ew.note}</p>}
                            </div>
                          </td>
                          <td className="text-right py-3 px-4 font-medium">₹{ew.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {invoice.paymentHistory.length > 0 && (
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="bg-white border-b">
                <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                  <DollarSign className="h-5 w-5 text-primary" /> Payment History
                </CardTitle>
                <CardDescription>Record of all payments received</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-600 border-b">Date</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600 border-b">Amount (₹)</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 border-b">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                        {invoice.paymentHistory.map((payment, index) => (
                        <tr
                          key={index}
                          className={`border-b last:border-b-0 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="py-3 px-4">
                            {new Date(payment.date).toLocaleString()}
                          </td>
                          <td className="text-right py-3 px-4 font-medium">
                            ₹{payment.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">{payment.note || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
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
                    <p className="font-medium">{invoice.clientName}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="whitespace-pre-line">{invoice.clientAddress}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium">{invoice.clientNumber}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Invoice Date</p>
                    <p className="font-medium">{new Date(invoice.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="bg-white border-b">
              <CardTitle className="text-xl flex items-center gap-2 text-gray-800">Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {invoice.terms && invoice.terms.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2">
                  {invoice.terms.map((term, index) => (
                    <li key={index} className="text-gray-700">{term}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No terms specified.</p>
              )}
            </CardContent>
          </Card>

          {invoice.note && (
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="bg-white border-b">
                <CardTitle className="text-xl flex items-center gap-2 text-gray-800">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-700 whitespace-pre-line">{invoice.note}</p>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="bg-white border-b">
              <CardTitle className="text-xl flex items-center gap-2 text-gray-800">Invoice Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(invoice.createdAt).toLocaleString()}</span>
                </div>
                {invoice.lastUpdated && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span>{new Date(invoice.lastUpdated).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}