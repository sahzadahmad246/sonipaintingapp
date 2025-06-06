"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileText,
  PlusCircle,
  Users,
  Calendar,
  Loader2,
  Briefcase,
  Bell,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch } from "@/app/lib/api";
import type { Quotation, Project, Invoice, ApiError } from "@/app/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalQuotations: 0,
    pendingQuotations: 0,
    acceptedQuotations: 0,
    rejectedQuotations: 0,
    totalProjects: 0,
    totalInvoices: 0,
  });
  const [recentQuotations, setRecentQuotations] = useState<Quotation[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user.role === "admin") {
      const fetchData = async () => {
        try {
          const [quotationsRes, projectsRes, invoicesRes] = await Promise.all([
            apiFetch<{ quotations: Quotation[] }>("/quotations"),
            apiFetch<{ projects: Project[] }>("/projects"),
            apiFetch<{ invoices: Invoice[] }>("/invoices"),
          ]);

          const quotations = quotationsRes.quotations || [];
          const projects = projectsRes.projects || [];
          const invoices = invoicesRes.invoices || [];

          setStats({
            totalQuotations: quotations.length,
            pendingQuotations: quotations.filter(
              (q) => q.isAccepted === "pending"
            ).length,
            acceptedQuotations: quotations.filter(
              (q) => q.isAccepted === "accepted"
            ).length,
            rejectedQuotations: quotations.filter(
              (q) => q.isAccepted === "rejected"
            ).length,
            totalProjects: projects.length,
            totalInvoices: invoices.length,
          });

          // Get recent quotations, projects, and invoices
          setRecentQuotations(
            quotations
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .slice(0, 3)
          );

          setRecentProjects(
            projects
              .sort(
                (a, b) =>
                  new Date(b.createdAt || 0).getTime() -
                  new Date(a.createdAt || 0).getTime()
              )
              .slice(0, 3)
          );

          setRecentInvoices(
            invoices
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .slice(0, 3)
          );
        } catch (error: unknown) {
          const apiError = error as ApiError;
          console.error(
            "Failed to fetch data:",
            apiError.error || "Unknown error"
          );
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    router.push("/");
    return null;
  }

  const getStatusBadge = (status: string | undefined) => {
    const badgeStatus = status || "pending";
    switch (badgeStatus) {
      case "accepted":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  const getPaymentStatus = (invoice: Invoice) => {
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
          <XCircle className="h-3 w-3" /> Unpaid
        </Badge>
      );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-full">
              <Bell className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full md:hidden"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image || ""} />
                    <AvatarFallback>
                      {session.user.name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <Avatar className="h-4 w-4 mr-2">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback>
                        {session.user.name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50 pb-20 md:pb-6">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">
                Welcome back, {session.user.name || "Admin"}
              </h2>
              <p className="text-gray-500">
                Here is what is happening with your business today.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/quotations/create">
                <PlusCircle className="h-4 w-4 mr-2" /> New Quotation
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription>
                      <div className="rii h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <Card className="shadow-sm border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardDescription>Total Quotations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">
                      {stats.totalQuotations}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-l-4 border-l-yellow-500">
                <CardHeader className="pb-2">
                  <CardDescription>Pending Quotations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="text-2xl font-bold">
                      {stats.pendingQuotations}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardDescription>Accepted Quotations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-2xl font-bold">
                      {stats.acceptedQuotations}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardDescription>Total Projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Briefcase className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="text-2xl font-bold">
                      {stats.totalProjects}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Recent Quotations</span>
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <Link href="/dashboard/quotations">
                    View all <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : recentQuotations.length > 0 ? (
                <div className="space-y-2">
                  {recentQuotations.map((quotation) => (
                    <Link
                      key={quotation.quotationNumber}
                      href={`/dashboard/quotations/${quotation.quotationNumber}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div>
                          <p className="font-medium">{quotation.clientName}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(quotation.date).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(quotation.isAccepted)}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No quotations available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Active Projects</span>
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <Link href="/dashboard/projects">
                    View all <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : recentProjects.length > 0 ? (
                <div className="space-y-2">
                  {recentProjects.map((project) => {
                    const totalPayments = Array.isArray(project.paymentHistory)
                      ? project.paymentHistory.reduce(
                          (sum, payment) => sum + (Number(payment.amount) || 0),
                          0
                        )
                      : 0;
                    const grandTotal = Number(project.grandTotal) || 0;
                    const paymentPercentage =
                      grandTotal > 0 ? (totalPayments / grandTotal) * 100 : 0;

                    return (
                      <Link
                        key={project.projectId}
                        href={`/dashboard/projects/${project.projectId}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div>
                            <p className="font-medium">{project.clientName}</p>
                            <p className="text-sm text-gray-500">
                              {project.status?.charAt(0).toUpperCase() +
                                project.status?.slice(1) || "In Progress"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${paymentPercentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 mt-1">
                              {paymentPercentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No projects available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Recent Invoices</span>
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <Link href="/dashboard/invoices">
                    View all <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : recentInvoices.length > 0 ? (
                <div className="space-y-2">
                  {recentInvoices.map((invoice) => (
                    <Link
                      key={invoice.invoiceId}
                      href={`/invoice/${invoice.invoiceId}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div>
                          <p className="font-medium">{invoice.clientName}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(invoice.date).toLocaleDateString()}
                          </p>
                        </div>
                        {getPaymentStatus(invoice)}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No invoices available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
