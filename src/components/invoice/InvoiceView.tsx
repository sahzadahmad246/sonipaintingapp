"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, User, MapPin, Phone, Calendar, Download, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { apiFetch } from "@/app/lib/api";
import type { Invoice } from "@/app/types";
import { generateInvoicePDF } from "@/app/lib/pdf-generator";
import { PDFViewer } from "../Quotation/pdf-viewer";

interface InvoiceViewProps {
  invoiceId: string;
  token?: string;
}

export default function InvoiceView({ invoiceId, token }: InvoiceViewProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    try {
      const url = `/invoices/${invoiceId}${token ? `?token=${token}` : ""}`;
      console.log("Fetching invoice:", url);
      const data = await apiFetch<Invoice>(url);
      console.log("Invoice data received:", data);
      setInvoice(data);
    } catch (error: unknown) {
      console.error("Fetch invoice error:", error);
      const errorMessage = error instanceof Error ? error.message : `Failed to fetch invoice: ${error || "Unknown error"}`;
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

  const handleGeneratePDF = async () => {
    if (!invoice) return;
    try {
      setIsGenerating(true);
      const pdfUrl = await generateInvoicePDF(invoice);
      setPdfUrl(pdfUrl);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!invoice) return;
    handleGeneratePDF().then(() => {
      setTimeout(() => {
        const iframe = document.getElementById("pdf-iframe") as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
      }, 1000);
    });
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
            <p className="text-gray-500 mb-6 text-center">The invoice doesn&apos;t exist or you lack access.</p>
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
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <Button variant="outline" size="sm" asChild className="mr-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Invoice #{invoice.invoiceId}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button size="sm" onClick={handleGeneratePDF} disabled={isGenerating}>
            <Download className="h-4 w-4 mr-1" /> {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-xl">Client Information</CardTitle>
            <CardDescription className="text-indigo-100">Details of the client for this invoice</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Client Name</p>
                    <p className="font-medium">{invoice.clientName}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="whitespace-pre-line">{invoice.clientAddress}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium">{invoice.clientNumber}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Invoice Date</p>
                    <p className="font-medium">{new Date(invoice.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-xl">Invoice Items</CardTitle>
            <CardDescription className="text-indigo-100">Services and products included</CardDescription>
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
        </Card>

        {invoice.extraWork.length > 0 && (
          <Card className="mb-6 overflow-hidden border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardTitle className="text-xl">Extra Work</CardTitle>
              <CardDescription className="text-indigo-100">Additional work performed</CardDescription>
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

        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-xl">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium">₹{invoice.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Payments:</span>
                <span className="font-medium">
                  ₹{(invoice.totalPayments || invoice.paymentHistory.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-lg font-semibold">Grand Total:</span>
                <span className="text-lg font-bold text-indigo-600">₹{invoice.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Amount Due:</span>
                <span className="text-lg font-bold text-red-600">₹{invoice.amountDue.toFixed(2)}</span>
              </div>
            </div>
            {invoice.paymentHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Payment History</h3>
                <div className="overflow-x-auto bg-gray-50 rounded-lg">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium text-gray-600">Date</th>
                        <th className="text-right py-2 px-4 font-medium text-gray-600">Amount (₹)</th>
                        <th className="text-left py-2 px-4 font-medium text-gray-600">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.paymentHistory.map((payment, index) => (
                        <tr
                          key={index}
                          className={`border-b last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                        >
                          <td className="py-2 px-4">{new Date(payment.date).toLocaleString()}</td>
                          <td className="text-right py-2 px-4 font-medium">₹{payment.amount.toFixed(2)}</td>
                          <td className="py-2 px-4">{payment.note || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-xl">Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {invoice.terms && invoice.terms.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {invoice.terms.map((term, index) => (
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

        {invoice.note && (
          <Card className="mb-6 overflow-hidden border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardTitle className="text-xl">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-700 whitespace-pre-line">{invoice.note}</p>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-xl">Invoice Status</CardTitle>
            <CardDescription className="text-indigo-100">
              Created: {new Date(invoice.createdAt).toLocaleString()}
              {invoice.lastUpdated && ` • Last Updated: ${new Date(invoice.lastUpdated).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
      {pdfUrl && (
        <PDFViewer pdfUrl={pdfUrl} onClose={() => setPdfUrl(null)} documentTitle={`Invoice #${invoice.invoiceId}`} />
      )}
    </div>
  );
}