"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CheckCheck,
  XCircle,
  Clock,
  ArrowLeft,
  Download,
  FileText,
  User,
  FileCheck,
  MapPin,
  Phone,
  Calendar,
  Tag,
  Edit,
  ImageIcon,
  Clipboard,
  Share2,
  Info,
  AlertCircle,
  Printer,
  ExternalLink,
  Building,
  DollarSign,
  Percent,
  ShieldCheck,
  BarChart4,
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
import Image from "next/image";
import { apiFetch, getGeneralInfo } from "@/app/lib/api";
import type { Quotation, ApiError, GeneralInfo } from "@/app/types";
import { generateQuotationPDF } from "@/app/lib/generate-pdf";
import { useSession } from "next-auth/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface QuotationViewProps {
  quotationNumber: string;
}

export default function QuotationView({ quotationNumber }: QuotationViewProps) {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [failedImages, setFailedImages] = useState<number[]>([]);

  // Get session data from NextAuth
  const { data: session, status } = useSession();

  const fetchQuotation = useCallback(async () => {
    try {
      const data = await apiFetch<Quotation>(`/quotations/${quotationNumber}`);
      setQuotation(data);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to fetch quotation");
    }
  }, [quotationNumber]);

  const fetchGeneralInfo = useCallback(async () => {
    try {
      const data = await getGeneralInfo();
      // Validate and transform data to match GeneralInfo
      const validatedData: GeneralInfo = {
        siteName: data.siteName || "SoniPainting",
        mobileNumber1: data.mobileNumber1 || "+91 98765 43210",
        mobileNumber2: data.mobileNumber2,
        address: data.address || "123 Main Street, New Delhi, India 110001",
        logoUrl: data.logoUrl || "/logo.png",
      };
      setGeneralInfo(validatedData);
    } catch {
      toast.error("Failed to load business information");
      // Set fallback data if API fails
      setGeneralInfo({
        siteName: "SoniPainting",
        mobileNumber1: "+91 98765 43210",
        mobileNumber2: undefined,
        address: "123 Main Street, New Delhi, India 110001",
        logoUrl: "/logo.png",
      });
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return; // Wait for session to load
    if (!quotationNumber) {
      toast.error("Invalid quotation number");
      setLoading(false);
      return;
    }
    Promise.all([fetchQuotation(), fetchGeneralInfo()]).finally(() =>
      setLoading(false)
    );
  }, [quotationNumber, fetchQuotation, fetchGeneralInfo, status]);

  const handleAccept = async () => {
    if (!quotation) return;
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append("isAccepted", "accepted");

      const data = await apiFetch<Quotation>(`/quotations/${quotationNumber}`, {
        method: "PUT",
        body: formData,
      });
      setQuotation((prev) => (prev ? { ...prev, ...data } : data));
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
      const formData = new FormData();
      formData.append("isAccepted", "rejected");

      const data = await apiFetch<Quotation>(`/quotations/${quotationNumber}`, {
        method: "PUT",
        body: formData,
      });
      setQuotation((prev) => (prev ? { ...prev, ...data } : data));
      toast.success("Quotation rejected!");
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to reject quotation");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    const badgeStatus = status || "pending";
    switch (badgeStatus) {
      case "accepted":
        return <CheckCheck className="h-8 w-8 text-green-500" />;
      case "rejected":
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Clock className="h-8 w-8 text-yellow-500" />;
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleShare = async () => {
    if (!quotation) return;

    const itemsList =
      quotation.items
        ?.map(
          (item, index) =>
            `${index + 1}. ${item.description}: ₹${(
              item.total ?? item.rate
            ).toFixed(2)}`
        )
        .join("\n") || "No items listed.";

    const shareText = `
Quotation #${quotation.quotationNumber}
Client: ${quotation.clientName}
Address: ${quotation.clientAddress}
Contact: ${quotation.clientNumber}
Date: ${new Date(quotation.date).toLocaleDateString()}
Status: ${quotation.isAccepted || "Pending"}

Items:
${itemsList}

Subtotal: ₹${quotation.subtotal?.toFixed(2) || "0.00"}
${
  quotation.discount && quotation.discount > 0
    ? `Discount: ₹${quotation.discount.toFixed(2)}`
    : ""
}
Grand Total: ₹${quotation.grandTotal?.toFixed(2) || "0.00"}

View full details: ${window.location.href}
    `.trim();

    const shareData = {
      title: `Quotation #${quotationNumber}`,
      text: shareText,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Quotation shared successfully!");
      } else {
        toast.error("Sharing is not supported on this device.");
      }
    } catch (error) {
      console.error("Error sharing quotation:", error);
      toast.error("Failed to share quotation.");
    }
  };

  const handleDownloadPDF = async () => {
    if (!quotation || !generalInfo) return;

    setIsUpdating(true);
    try {
      toast.info("Generating PDF...");
      generateQuotationPDF(quotation);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || status === "loading") {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!quotation || !generalInfo) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card className="border-none shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-red-50 p-6 rounded-full mb-6">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">
              Quotation Not Found
            </h3>
            <p className="text-gray-500 mb-8 text-center max-w-md">
              The quotation you are looking for does not exist or has been
              deleted.
            </p>
            <Button asChild size="lg">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-5 w-5" /> Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen print:bg-white print:from-white">
      <div className="container mx-auto py-6 px-4 print:py-2 print:px-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 print:hidden">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="/dashboard"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="/dashboard/quotations"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Quotations
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink className="font-medium">
                    #{quotation.quotationNumber}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Main Content Container */}
          <div className="space-y-6">
            {/* Status and Actions Section */}
            <Card className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <div className="flex items-center">
                  <div className="bg-white p-2 rounded-lg shadow-sm mr-4">
                    <FileCheck className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                      Quotation #{quotation.quotationNumber}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                      Created on{" "}
                      {new Date(quotation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyLink}
                          className="h-9 w-9 bg-white"
                        >
                          <Clipboard className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy Link</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleShare}
                          className="h-9 w-9 bg-white"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share Quotation</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handlePrint}
                          className="h-9 w-9 bg-white"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Print Quotation</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {session?.user?.role === "admin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="bg-white"
                    >
                      <Link
                        href={`/dashboard/quotations/edit/${quotationNumber}`}
                      >
                        <Edit className="h-4 w-4 mr-1.5" /> Edit
                      </Link>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    disabled={isUpdating}
                    onClick={handleDownloadPDF}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Download className="h-4 w-4 mr-1.5" />{" "}
                    {isUpdating ? "Generating..." : "Download PDF"}
                  </Button>
                </div>
              </div>

              {/* Status Card */}
              <div className="p-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex items-center mb-4 sm:mb-0">
                      <div className="mr-4">
                        {getStatusIcon(quotation.isAccepted)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {quotation.isAccepted === "accepted"
                            ? "Accepted"
                            : quotation.isAccepted === "rejected"
                            ? "Rejected"
                            : "Pending"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {quotation.isAccepted === "accepted"
                            ? "This quotation has been accepted"
                            : quotation.isAccepted === "rejected"
                            ? "This quotation has been rejected"
                            : "Awaiting client response"}
                        </p>
                      </div>
                    </div>
                    {quotation.isAccepted === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAccept}
                          disabled={isUpdating}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button
                          onClick={handleReject}
                          variant="destructive"
                          disabled={isUpdating}
                          size="sm"
                          className="bg-red-600"
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Client Information */}
            <Card className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-6 py-4 border-b border-gray-200">
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <User className="h-5 w-5 text-blue-600 mr-2" /> Client
                  Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-start mb-4">
                      <Avatar className="h-12 w-12 mr-4 mt-1">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {quotation.clientName
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {quotation.clientName}
                        </h4>
                        <p className="text-sm text-gray-500">Client</p>
                      </div>
                    </div>

                    <div className="space-y-4 mt-4">
                      <div className="flex items-start">
                        <div className="bg-blue-50 p-2 rounded-full mr-3">
                          <MapPin className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Address</p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            {quotation.clientAddress}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="bg-blue-50 p-2 rounded-full mr-3">
                          <Phone className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Contact Number
                          </p>
                          <p className="text-sm font-medium">
                            {quotation.clientNumber}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="bg-blue-50 p-2 rounded-full mr-3">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Quotation Date
                          </p>
                          <p className="text-sm font-medium">
                            {new Date(quotation.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-green-50 to-green-100/50 px-4 py-3 border-b border-gray-200">
                        <h3 className="font-medium text-gray-800 flex items-center">
                          <BarChart4 className="h-4 w-4 text-green-600 mr-2" />{" "}
                          Financial Summary
                        </h3>
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-center mb-6">
                          <div className="text-center px-3 py-2 bg-green-50 rounded-lg">
                            <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
                            <p className="text-xs text-gray-500">Subtotal</p>
                            <p className="text-sm font-semibold">
                              ₹{quotation.subtotal?.toFixed(2) || "0.00"}
                            </p>
                          </div>

                          {quotation.discount && quotation.discount > 0 && (
                            <div className="text-center px-3 py-2 bg-green-50 rounded-lg">
                              <Percent className="h-5 w-5 text-green-600 mx-auto mb-1" />
                              <p className="text-xs text-gray-500">Discount</p>
                              <p className="text-sm font-semibold">
                                ₹{quotation.discount.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                              Grand Total:
                            </span>
                            <span className="text-xl font-bold text-green-600">
                              ₹{quotation.grandTotal?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-xs text-gray-500">
                              Secure payment options available
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            {quotation.note && (
              <Card className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-6 py-4 border-b border-gray-200">
                  <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                    <Info className="h-5 w-5 text-blue-600 mr-2" /> Additional
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <p className="text-blue-700 text-sm whitespace-pre-line pl-3">
                      {quotation.note}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quotation Items */}
            <Card className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-gray-200">
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <FileText className="h-5 w-5 text-primary mr-2" /> Quotation
                  Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-600 border-b">
                          Description
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600 border-b">
                          Area (sq.ft)
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600 border-b">
                          Rate (₹)
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600 border-b">
                          Total (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.items?.map((item, index) => (
                        <tr
                          key={index}
                          className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{item.description}</p>
                              {item.note && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {item.note}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">
                            {item.area || "-"}
                          </td>
                          <td className="text-right py-3 px-4">
                            ₹{item.rate?.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4 font-medium">
                            ₹{(item.total ?? item.rate).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 border-t p-4">
                <div className="ml-auto w-full max-w-xs">
                  {quotation.subtotal && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">
                        ₹{quotation.subtotal?.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {quotation.discount && quotation.discount > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium">
                        ₹{quotation.discount?.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {quotation.grandTotal && (
                    <div className="flex justify-between py-1 border-t mt-2 pt-2">
                      <span className="font-semibold">Grand Total:</span>
                      <span className="font-bold text-primary">
                        ₹{quotation.grandTotal?.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </CardFooter>
            </Card>

            {/* Site Images */}
            {quotation.siteImages && quotation.siteImages.length > 0 && (
              <Card className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-gray-200">
                  <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                    <ImageIcon className="h-5 w-5 text-primary mr-2" /> Site
                    Images
                  </CardTitle>
                  <CardDescription>
                    Images related to the quotation site
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quotation.siteImages.map((image, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border rounded-lg overflow-hidden bg-white shadow-sm group relative"
                      >
                        <div className="relative aspect-video">
                          <Image
                            src={
                              failedImages.includes(index)
                                ? "/placeholder-image.jpg"
                                : image.url
                            }
                            alt={`Site image ${index + 1}`}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            onError={() => {
                              setFailedImages((prev) => [...prev, index]);
                              toast.error(`Failed to load image ${index + 1}`);
                            }}
                            unoptimized={true}
                          />
                        </div>
                        <div className="p-4 bg-white">
                          {image.description ? (
                            <p className="text-sm text-gray-700">
                              {image.description}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 italic">
                              No description provided
                            </p>
                          )}
                        </div>
                        <a
                          href={image.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-700" />
                        </a>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Terms & Conditions */}
            {quotation.terms && quotation.terms.length > 0 && (
              <Card className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-gray-200">
                  <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                    <Tag className="h-5 w-5 text-primary mr-2" /> Terms &
                    Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ScrollArea className="h-auto max-h-[400px]">
                    <ul className="list-disc pl-5 space-y-3">
                      {quotation.terms.map((term, index) => (
                        <li key={index} className="text-gray-700">
                          {term}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Company Information */}
            <Card className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-gray-200">
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <Building className="h-5 w-5 text-primary mr-2" /> Company
                  Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center mb-6">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {generalInfo.siteName}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Professional Painting Solutions
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-gray-100 p-2 rounded-full mr-3">
                      <MapPin className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Address</p>
                      <p className="text-sm whitespace-pre-line">
                        {generalInfo.address}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-gray-100 p-2 rounded-full mr-3">
                      <Phone className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Contact Number
                      </p>
                      <p className="text-sm font-medium">
                        {generalInfo.mobileNumber1}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Print view */}
          <div className="hidden print:block mt-6">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  Quotation #{quotation.quotationNumber}
                </h1>
                <p className="text-gray-500">
                  Date: {new Date(quotation.date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold mb-1">
                  {generalInfo.siteName}
                </h2>
                <p className="text-sm">{generalInfo.address}</p>
                <p className="text-sm">
                  {generalInfo.mobileNumber1} | contact@
                  {generalInfo.siteName.toLowerCase()}.com
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold mb-2 border-b pb-1">
                  Client Information
                </h3>
                <p className="font-medium">{quotation.clientName}</p>
                <p className="whitespace-pre-line">{quotation.clientAddress}</p>
                <p>{quotation.clientNumber}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 border-b pb-1">
                  Quotation Summary
                </h3>
                <div className="flex justify-between mb-1">
                  <span>Status:</span>
                  <span className="font-medium capitalize">
                    {quotation.isAccepted || "Pending"}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Created On:</span>
                  <span>
                    {new Date(quotation.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Grand Total:</span>
                  <span className="font-bold">
                    ₹{quotation.grandTotal?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            </div>

            {quotation.note && (
              <div className="mb-8 border-l-4 border-blue-500 bg-blue-50 p-4">
                <h3 className="font-medium text-blue-800 mb-1">
                  Additional Notes
                </h3>
                <p className="text-blue-700 whitespace-pre-line">
                  {quotation.note}
                </p>
              </div>
            )}

            <h2 className="text-xl font-bold mb-4">Quotation Items</h2>
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-600 border">
                    Description
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 border">
                    Area (sq.ft)
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 border">
                    Rate (₹)
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 border">
                    Total (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotation.items?.map((item, index) => (
                  <tr
                    key={index}
                    className={`border ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="py-2 px-3 border">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {item.note && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-2 px-3 border">
                      {item.area || "-"}
                    </td>
                    <td className="text-right py-2 px-3 border">
                      ₹{item.rate?.toFixed(2)}
                    </td>
                    <td className="text-right py-2 px-3 font-medium border">
                      ₹{(item.total ?? item.rate).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border">
                  <td colSpan={3} className="text-right py-2 px-3 font-medium">
                    Subtotal:
                  </td>
                  <td className="text-right py-2 px-3 font-medium">
                    ₹{quotation.subtotal?.toFixed(2) || "0.00"}
                  </td>
                </tr>
                {quotation.discount && quotation.discount > 0 && (
                  <tr className="border">
                    <td
                      colSpan={3}
                      className="text-right py-2 px-3 font-medium"
                    >
                      Discount:
                    </td>
                    <td className="text-right py-2 px-3 font-medium">
                      ₹{quotation.discount?.toFixed(2) || "0.00"}
                    </td>
                  </tr>
                )}
                <tr className="border bg-gray-50">
                  <td colSpan={3} className="text-right py-2 px-3 font-bold">
                    Grand Total:
                  </td>
                  <td className="text-right py-2 px-3 font-bold">
                    ₹{quotation.grandTotal?.toFixed(2) || "0.00"}
                  </td>
                </tr>
              </tfoot>
            </table>

            {quotation.terms?.length ? (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Terms & Conditions</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {quotation.terms.map((term, index) => (
                    <li key={index} className="text-gray-700">
                      {term}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Print Footer */}
            <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
              <p>
                This is a computer-generated document. No signature is required.
              </p>
              <p className="mt-1">
                For any queries, please contact us at{" "}
                {generalInfo.mobileNumber1} or contact@
                {generalInfo.siteName.toLowerCase()}.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
