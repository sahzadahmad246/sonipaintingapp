"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Plus,
  Receipt,
} from "lucide-react";

import { apiFetch } from "@/app/lib/api";
import type { ApiError, Invoice, Project, Quotation } from "@/app/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardStats = {
  totalQuotations: number;
  pendingQuotations: number;
  acceptedQuotations: number;
  rejectedQuotations: number;
  totalProjects: number;
  totalInvoices: number;
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
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
    if (status !== "authenticated" || session?.user.role !== "admin") {
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, quotationsRes, projectsRes, invoicesRes] = await Promise.all([
          apiFetch<{
            quotations: { total: number; pending: number; accepted: number; rejected: number };
            projects: { total: number };
            invoices: { total: number };
          }>("/dashboard/stats"),
          apiFetch<{ quotations: Quotation[] }>("/quotations?limit=3"),
          apiFetch<{ projects: Project[] }>("/projects?limit=3"),
          apiFetch<{ invoices: Invoice[] }>("/invoices?limit=3"),
        ]);

        setStats({
          totalQuotations: statsRes.quotations.total,
          pendingQuotations: statsRes.quotations.pending,
          acceptedQuotations: statsRes.quotations.accepted,
          rejectedQuotations: statsRes.quotations.rejected,
          totalProjects: statsRes.projects.total,
          totalInvoices: statsRes.invoices.total,
        });
        setRecentQuotations(quotationsRes.quotations || []);
        setRecentProjects(projectsRes.projects || []);
        setRecentInvoices(invoicesRes.invoices || []);
      } catch (error: unknown) {
        const apiError = error as ApiError;
        console.error("Failed to fetch dashboard data:", apiError.error || "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center text-slate-600">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    router.push("/");
    return null;
  }

  const summaryCards = [
    {
      title: "Total Quotations",
      value: stats.totalQuotations,
      icon: FileText,
      tone: "text-slate-900",
      bg: "bg-slate-50",
    },
    {
      title: "Pending Quotations",
      value: stats.pendingQuotations,
      icon: Clock,
      tone: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      title: "Accepted Quotations",
      value: stats.acceptedQuotations,
      icon: CheckCircle,
      tone: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      title: "Total Projects",
      value: stats.totalProjects,
      icon: Briefcase,
      tone: "text-blue-700",
      bg: "bg-blue-50",
    },
  ];

  const getQuotationBadge = (statusValue: string | undefined) => {
    const badgeStatus = statusValue || "pending";
    if (badgeStatus === "accepted") {
      return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Accepted</Badge>;
    }
    if (badgeStatus === "rejected") {
      return <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">Rejected</Badge>;
    }
    return <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">Pending</Badge>;
  };

  const getInvoiceBadge = (invoice: Invoice) => {
    if (invoice.amountDue <= 0) {
      return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Paid</Badge>;
    }
    if (invoice.amountDue < invoice.grandTotal) {
      return <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">Partial</Badge>;
    }
    return <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">Unpaid</Badge>;
  };

  const formatProjectStatus = (statusValue: string | undefined) => {
    if (!statusValue || statusValue === "ongoing") return "In Progress";
    return statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
  };

  const SectionCard = ({
    title,
    icon: Icon,
    actionHref,
    actionColor,
    children,
  }: {
    title: string;
    icon: typeof FileText;
    actionHref: string;
    actionColor: string;
    children: React.ReactNode;
  }) => (
    <Card className="gap-3 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm">
      <div className="flex items-center justify-between bg-black px-4 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        </div>
        <Link href={actionHref} className={`inline-flex items-center gap-1 text-xs font-medium ${actionColor}`}>
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <CardContent className="px-4 pb-4 pt-1">{children}</CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-6">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="flex flex-row items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto flex w-full max-w-4xl flex-row items-center justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <Button
              size="icon"
              className="h-8 w-8 rounded-full bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => router.push("/dashboard/quotations/create")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-4 px-3 pt-4 sm:px-4">

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-4 h-8 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {summaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${item.bg}`}>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">{item.title}</p>
                    <Icon className={`h-4 w-4 ${item.tone}`} />
                  </div>
                  <p className={`text-2xl font-bold ${item.tone}`}>{item.value}</p>
                </div>
              );
            })}
          </motion.div>
        )}

        <div className="space-y-4">
          <SectionCard title="Recent Quotations" icon={FileText} actionHref="/dashboard/quotations" actionColor="text-slate-200 hover:text-white">
            {isLoading ? (
              <div className="space-y-3 pt-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="rounded-xl border border-slate-200 p-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : recentQuotations.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentQuotations.map((quotation) => (
                  <Link
                    key={quotation.quotationNumber}
                    href={`/dashboard/quotations/${quotation.quotationNumber}`}
                    className="flex items-center justify-between gap-3 px-1 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{quotation.clientName}</p>
                      <p className="text-xs text-slate-500">
                        #{quotation.quotationNumber} · {new Date(quotation.date).toLocaleDateString()}
                      </p>
                    </div>
                    {getQuotationBadge(quotation.isAccepted)}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">No quotations available.</p>
            )}
          </SectionCard>

          <SectionCard title="Active Projects" icon={Briefcase} actionHref="/dashboard/projects" actionColor="text-slate-200 hover:text-white">
            {isLoading ? (
              <div className="space-y-3 pt-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="rounded-xl border border-slate-200 p-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : recentProjects.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentProjects.map((project) => {
                  const totalPayments = Array.isArray(project.paymentHistory)
                    ? project.paymentHistory.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
                    : 0;
                  const grandTotal = Number(project.grandTotal) || 0;
                  const paymentPercentage = grandTotal > 0 ? (totalPayments / grandTotal) * 100 : 0;

                  return (
                    <Link
                      key={project.projectId}
                      href={`/dashboard/projects/${project.projectId}`}
                      className="flex items-center justify-between gap-3 px-1 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{project.clientName}</p>
                        <p className="text-xs text-slate-500">
                          #{project.projectId} · {formatProjectStatus(project.status)}
                        </p>
                      </div>
                      <div className="min-w-[72px] text-right">
                        <p className="text-xs font-semibold text-blue-700">{paymentPercentage.toFixed(0)}%</p>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-blue-600" style={{ width: `${paymentPercentage}%` }} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">No projects available.</p>
            )}
          </SectionCard>

          <SectionCard title="Recent Invoices" icon={Receipt} actionHref="/dashboard/invoices" actionColor="text-slate-200 hover:text-white">
            {isLoading ? (
              <div className="space-y-3 pt-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="rounded-xl border border-slate-200 p-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : recentInvoices.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.invoiceId}
                    href={`/dashboard/invoices/${invoice.invoiceId}`}
                    className="flex items-center justify-between gap-3 px-1 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{invoice.clientName}</p>
                      <p className="text-xs text-slate-500">
                        #{invoice.invoiceId} · {new Date(invoice.date).toLocaleDateString()}
                      </p>
                    </div>
                    {getInvoiceBadge(invoice)}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">No invoices available.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
