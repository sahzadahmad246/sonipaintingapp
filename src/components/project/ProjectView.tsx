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
  Tag,
  Edit,
  DollarSign,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "@/app/lib/api";
import type { Project } from "@/app/types";

interface ProjectViewProps {
  projectId: string;
}

interface PaymentFormData {
  amount: number;
  date: string;
  note?: string;
}

interface ValidationError {
  message: string;
}

export default function ProjectView({ projectId }: ProjectViewProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset: resetForm,
  } = useForm<PaymentFormData>({
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().slice(0, 16),
      note: "",
    },
  });

  const fetchProject = useCallback(async () => {
    try {
      const data = await apiFetch<Project>(`/projects/${projectId}`);
      console.log("Project data:", data);
      setProject(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch project";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      toast.error("Invalid project ID");
      setLoading(false);
      return;
    }
    fetchProject();
  }, [projectId, fetchProject]);

  const onPaymentSubmit = async (data: PaymentFormData) => {
    if (!project) {
      toast.error("Project data not loaded");
      return;
    }

    const formData = new FormData();
    formData.append("projectId", project.projectId);
    formData.append("quotationNumber", project.quotationNumber);
    formData.append("clientName", project.clientName);
    formData.append("clientAddress", project.clientAddress);
    formData.append("clientNumber", project.clientNumber);
    formData.append("date", new Date(project.date).toISOString());
    formData.append("items", JSON.stringify(project.items));
    formData.append("extraWork", JSON.stringify(project.extraWork));
    formData.append("discount", String(project.discount || 0));
    formData.append("note", project.note || "");
    formData.append("subtotal", String(project.subtotal || 0));
    formData.append("grandTotal", String(project.grandTotal || 0));
    formData.append("existingImages", JSON.stringify(project.siteImages || []));
    (project.terms || []).forEach((term, index) => {
      formData.append(`terms[${index}]`, term);
    });

    const newPayment = {
      amount: Number(data.amount),
      date: data.date || new Date().toISOString(),
      note: data.note || undefined,
    };
    formData.append("newPayment", JSON.stringify(newPayment));

    console.log("Payment FormData:", Object.fromEntries(formData));

    try {
      await apiFetch<Project>(`/projects/${projectId}`, {
        method: "PUT",
        body: formData,
        headers: {},
      });
      toast.success("Payment added successfully!");
      setIsPaymentDialogOpen(false);
      resetForm();
      fetchProject();
    } catch (error: unknown) {
      console.error("Add payment error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add payment";
      toast.error(errorMessage);
      if (error instanceof Error && "details" in error) {
        (error.details as ValidationError[]).forEach((err) =>
          toast.error(`Validation error: ${err.message}`)
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
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

  if (!project) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              Project Not Found
            </h3>
            <p className="text-gray-500 mb-6 text-center">
              The project does not exist or has been deleted.
            </p>
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

  const totalPayments = Array.isArray(project.paymentHistory)
    ? project.paymentHistory.reduce(
        (sum, payment) => sum + (Number(payment.amount) || 0),
        0
      )
    : 0;
  const grandTotal = Number(project.grandTotal) || 0;
  const amountDue = grandTotal - totalPayments;
  const paymentPercentage = grandTotal > 0 ? (totalPayments / grandTotal) * 100 : 0;

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <Button variant="outline" size="sm" asChild className="mr-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Project #{project.projectId}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaymentDialogOpen(true)}
          >
            <DollarSign className="h-4 w-4 mr-1" /> Add Payment
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/projects/edit/${projectId}`}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Link>
          </Button>
        </div>
      </div>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onPaymentSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount", {
                  required: "Amount is required",
                  min: { value: 0.01, message: "Amount must be positive" },
                  validate: (value) =>
                    value <= amountDue || "Payment exceeds remaining amount due",
                })}
              />
              {errors.amount && (
                <p className="text-red-500 text-sm">{errors.amount.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="datetime-local"
                {...register("date", { required: "Date is required" })}
              />
              {errors.date && (
                <p className="text-red-500 text-sm">{errors.date.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                {...register("note")}
                placeholder="Enter any payment notes"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Add Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-xl">Client Information</CardTitle>
            <CardDescription className="text-indigo-100">
              Details of the client for this project
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Client Name</p>
                    <p className="font-medium">{project.clientName}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="whitespace-pre-line">{project.clientAddress}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium">{project.clientNumber}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Project Date</p>
                    <p className="font-medium">
                      {new Date(project.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-xl">Project Items</CardTitle>
            <CardDescription className="text-indigo-100">
              Services and products included
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Description
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Area (sq.ft)
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Rate (₹)
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Total (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(project.items) && project.items.length > 0 ? (
                    project.items.map((item, index) => (
                      <tr
                        key={index}
                        className={`border-b last:border-b-0 ${
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
                          {item.area ?? "-"}
                        </td>
                        <td className="text-right py-3 px-4">
                          ₹{(Number(item.rate) || 0).toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-4 font-medium">
                          ₹{(Number(item.total ?? item.rate) || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-3 px-4 text-center text-gray-500"
                      >
                        No items available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {Array.isArray(project.extraWork) && project.extraWork.length > 0 && (
          <Card className="mb-6 overflow-hidden border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardTitle className="text-xl">Extra Work</CardTitle>
              <CardDescription className="text-indigo-100">
                Additional work performed
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Description
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">
                        Total (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.extraWork.map((ew, index) => (
                      <tr
                        key={index}
                        className={`border-b last:border-b-0 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{ew.description}</p>
                            {ew.note && (
                              <p className="text-sm text-gray-500 mt-1">
                                {ew.note}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-medium">
                          ₹{(Number(ew.total) || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {Array.isArray(project.siteImages) && project.siteImages.length > 0 && (
          <Card className="mb-6 overflow-hidden border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardTitle className="text-xl">Site Images</CardTitle>
              <CardDescription className="text-indigo-100">
                Images from the project site
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {project.siteImages.map((img, index) => (
                  <Image
                    key={index}
                    src={img.url}
                    alt={`Site image ${index + 1}`}
                    width={200}
                    height={128}
                    className="w-full h-32 object-cover rounded-md"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-xl">Project Summary</CardTitle>
            <CardDescription className="text-indigo-100">
              Financial overview and status of the project
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${project.status === "completed" ? "text-green-600" : "text-blue-600"}`}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Progress:</span>
                <span className="font-medium">{paymentPercentage.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${paymentPercentage === 100 ? "bg-green-600" : "bg-blue-600"}`}
                  style={{ width: `${paymentPercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  ₹{(Number(project.subtotal) || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium">
                  ₹{(Number(project.discount) || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Payments:</span>
                <span className="font-medium">
                  ₹{(totalPayments || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-lg font-semibold">Grand Total:</span>
                <span className="text-lg font-bold text-indigo-600">
                  ₹{(grandTotal || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Amount Due:</span>
                <span className="text-lg font-bold text-red-600">
                  ₹{(amountDue || 0).toFixed(2)}
                </span>
              </div>
            </div>
            {Array.isArray(project.paymentHistory) &&
              project.paymentHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Payment History
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">
                            Date
                          </th>
                          <th className="text-right py-3 px-4 font-medium text-gray-600">
                            Amount (₹)
                          </th>
                          <th className="text-left py Até 3:32 PM 3/18/2026
                            font-medium text-gray-600">
                            Note
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.paymentHistory.map((payment, index) => (
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
                              ₹{(Number(payment.amount) || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              {payment.note || "-"}
                            </td>
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
            <CardTitle className="flex items-center text-lg">
              <Tag className="h-5 w-5 mr-2" /> Terms & Conditions
            </CardTitle>
            <CardDescription className="text-indigo-100">
              Terms applicable to this project
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {Array.isArray(project.terms) && project.terms.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {project.terms.map((term, index) => (
                  <li key={index} className="text-gray-700">
                    {term}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No terms available</p>
            )}
          </CardContent>
        </Card>

        {project.note && (
          <Card className="mb-6 overflow-hidden border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardTitle className="text-lg">Additional Notes</CardTitle>
              <CardDescription className="text-indigo-100">
                Extra information about the project
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-700 whitespace-pre-line">
                {project.note}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="text-lg">Project Status</CardTitle>
            <CardDescription className="text-indigo-100">
              Created:{" "}
              {project.createdAt
                ? new Date(project.createdAt).toLocaleString()
                : "N/A"}
              {project.lastUpdated &&
                ` • Last Updated: ${new Date(project.lastUpdated).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6"></CardContent>
        </Card>

        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="flex items-center text-lg">
              <History className="h-5 w-5 mr-2" /> Update History
            </CardTitle>
            <CardDescription className="text-indigo-100">
              Record of all updates made to this project
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {project.updateHistory?.length ? (
              <ul className="space-y-4">
                {project.updateHistory.map((update, index) => (
                  <li
                    key={index}
                    className="border-b pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-500">
                          Updated on{" "}
                          {new Date(update.updatedAt).toLocaleString()}
                        </p>
                        <p className="font-medium">
                          By User ID: {update.updatedBy}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Changes: {update.changes.join(", ")}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">
                No updates recorded for this project.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}