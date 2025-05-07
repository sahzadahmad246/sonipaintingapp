"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Printer,
  Download,
  FileText,
  User,
  MapPin,
  Phone,
  Calendar,
  Tag,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { apiFetch } from "@/app/lib/api";
import type { Quotation, ApiError } from "@/app/types";
import { generateQuotationPDF } from "@/app/lib/pdf-generator";
import { PDFViewer } from "./pdf-viewer";

interface QuotationViewProps {
  quotationNumber: string;
}

export default function QuotationView({ quotationNumber }: QuotationViewProps) {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const fetchQuotation = useCallback(async () => {
    try {
      const data = await apiFetch<Quotation>(`/quotations/${quotationNumber}`);
      setQuotation(data);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to fetch quotation");
    } finally {
      setLoading(false);
    }
  }, [quotationNumber]);

  useEffect(() => {
    if (!quotationNumber) {
      toast.error("Invalid quotation number");
      setLoading(false);
      return;
    }
    fetchQuotation();
  }, [quotationNumber, fetchQuotation]);

  const handleAccept = async () => {
    if (!quotation) return;
    setIsUpdating(true);
    try {
      const data = await apiFetch<Quotation>(`/quotations/${quotationNumber}`, {
        method: "PUT",
        body: JSON.stringify({ isAccepted: "accepted" }),
      });
      setQuotation(data);
      toast.success("Quotation accepted!");
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to accept quotation");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!quotation) return;
    setIsUpdating(true);
    try {
      const data = await apiFetch<Quotation>(`/quotations/${quotationNumber}`, {
        method: "PUT",
        body: JSON.stringify({ isAccepted: "rejected" }),
      });
      setQuotation(data);
      toast.success("Quotation rejected!");
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to reject quotation");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    const badgeStatus = status || "pending"; // Fallback to "pending" if undefined
    switch (badgeStatus) {
      case "accepted":
        return (
          <Badge className="bg-green-50 text-green-600 border-green-200 flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" /> Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-50 text-red-600 border-red-200 flex items-center">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-50 text-yellow-600 border-yellow-200 flex items-center">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  const handleGeneratePDF = async () => {
    if (!quotation) return;
    try {
      setIsUpdating(true);
      const pdfUrl = await generateQuotationPDF(quotation);
      setPdfUrl(pdfUrl);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsUpdating(false);
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
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <Button variant="outline" size="sm" asChild className="mr-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Quotation #{quotation.quotationNumber}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/quotations/edit/${quotationNumber}`}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button size="sm" onClick={handleGeneratePDF} disabled={isUpdating}>
            <Download className="h-4 w-4 mr-1" /> {isUpdating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <CardTitle className="text-xl">Client Information</CardTitle>
                <CardDescription className="text-indigo-100">Details of the client for this quotation</CardDescription>
              </div>
              <div className="mt-2 sm:mt-0">{getStatusBadge(quotation.isAccepted)}</div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Client Name</p>
                    <p className="font-medium">{quotation.clientName}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="whitespace-pre-line">{quotation.clientAddress}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium">{quotation.clientNumber}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Quotation Date</p>
                    <p className="font-medium">{new Date(quotation.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-xl">Quotation Items</CardTitle>
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
                <tfoot className="bg-gray-50">
                  {quotation.subtotal && (
                    <tr className="border-t">
                      <td colSpan={3} className="text-right py-3 px-4 font-medium">
                        Subtotal
                      </td>
                      <td className="text-right py-3 px-4 font-medium">₹{quotation.subtotal?.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="text-right py-3 px-4 font-medium">
                      Discount
                    </td>
                    <td className="text-right py-3 px-4 font-medium">₹{quotation.discount?.toFixed(2)}</td>
                    </tr>
                  {quotation.grandTotal && (
                    <tr>
                      <td colSpan={3} className="text-right py-3 px-4 font-bold text-lg">
                        Grand Total
                      </td>
                      <td className="text-right py-3 px-4 font-bold text-lg text-indigo-600">
                        ₹{quotation.grandTotal?.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="overflow-hidden border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardTitle className="flex items-center text-lg">
                <Tag className="h-5 w-5 mr-2" /> Terms & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="list-disc pl-5 space-y-2">
                {quotation.terms?.map((term, index) => (
                  <li key={index} className="text-gray-700">
                    {term}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {quotation.note && (
            <Card className="overflow-hidden border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <CardTitle className="text-lg">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-700 whitespace-pre-line">{quotation.note}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-lg">Quotation Status</CardTitle>
            <CardDescription className="text-indigo-100">
              Created: {new Date(quotation.createdAt).toLocaleString()}
              {quotation.lastUpdated && ` • Last Updated: ${new Date(quotation.lastUpdated).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <p className="mr-2">Current Status:</p>
              {getStatusBadge(quotation.isAccepted)}
            </div>
            {quotation.isAccepted === "pending" && (
              <div className="flex flex-wrap gap-3 mt-4">
                <Button onClick={handleAccept} disabled={isUpdating} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="mr-2 h-4 w-4" /> Accept Quotation
                </Button>
                <Button onClick={handleReject} variant="destructive" disabled={isUpdating}>
                  <XCircle className="mr-2 h-4 w-4" /> Reject Quotation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      {pdfUrl && (
        <PDFViewer
          pdfUrl={pdfUrl}
          onClose={() => setPdfUrl(null)}
          documentTitle={`Quotation #${quotation.quotationNumber}`}
        />
      )}
    </div>
  );

  function handlePrint() {
    if (!quotation) return;
    handleGeneratePDF().then(() => {
      setTimeout(() => {
        const iframe = document.getElementById("pdf-iframe") as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
      }, 1000);
    });
  }
}