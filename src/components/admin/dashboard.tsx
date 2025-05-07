"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, PlusCircle, Users, Calendar, Settings, Loader2, Briefcase, Camera, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuotationForm from "../Quotation/QuotationForm";
import QuotationList from "../Quotation/QuotationList";
import ProjectForm from "../project/ProjectForm";
import ProjectList from "../project/ProjectList";
import InvoiceList from "../invoice/InvoiceList";
import PortfolioForm from "../portfolio/PortfolioForm";
import PortfolioList from "../portfolio/PortfolioList";
import GeneralInfoForm from "../generalInfo/GeneralInfoForm";
import AuditLogList from "../AuditLogList";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { apiFetch } from "@/app/lib/api";
import type { Quotation, Project, Invoice, ApiError } from "@/app/types";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("quotations");
  const [stats, setStats] = useState({
    totalQuotations: 0,
    pendingQuotations: 0,
    acceptedQuotations: 0,
    rejectedQuotations: 0,
    totalProjects: 0,
    totalInvoices: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user.role === "admin") {
      const fetchStats = async () => {
        try {
          const [quotations, projects, invoices] = await Promise.all([
            apiFetch<{ quotations: Quotation[] }>("/quotations"),
            apiFetch<{ projects: Project[] }>("/projects"),
            apiFetch<{ invoices: Invoice[] }>("/invoices"),
          ]);
          setStats({
            totalQuotations: quotations.quotations.length,
            pendingQuotations: quotations.quotations.filter((q) => q.isAccepted === "pending").length,
            acceptedQuotations: quotations.quotations.filter((q) => q.isAccepted === "accepted").length,
            rejectedQuotations: quotations.quotations.filter((q) => q.isAccepted === "rejected").length,
            totalProjects: projects.projects.length,
            totalInvoices: invoices.invoices.length,
          });
        } catch (error: unknown) {
          const apiError = error as ApiError;
          console.error("Failed to fetch stats:", apiError.error || "Unknown error");
        } finally {
          setIsLoading(false);
        }
      };
      fetchStats();
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

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500">Manage your painting contractor business</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setActiveTab("settings")}><Settings className="h-4 w-4 mr-1" /> Settings</Button>
          <Button size="sm" onClick={() => setActiveTab("make-quotation")}><PlusCircle className="h-4 w-4 mr-1" /> New Quotation</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><CardDescription><div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div></CardDescription></CardHeader>
              <CardContent><div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2"><CardDescription>Total Quotations</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-primary mr-2" />
                <span className="text-2xl font-bold">{stats.totalQuotations}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Pending Quotations</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-2xl font-bold">{stats.pendingQuotations}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Accepted Quotations</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-2xl font-bold">{stats.acceptedQuotations}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Total Projects</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Briefcase className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-2xl font-bold">{stats.totalProjects}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Button onClick={() => setActiveTab("make-quotation")} variant={activeTab === "make-quotation" ? "default" : "outline"} className="flex items-center justify-center h-16">
          <FileText className="h-5 w-5 mr-2" /> Create Quotation
        </Button>
        
        <Button onClick={() => setActiveTab("make-portfolio")} variant={activeTab === "make-portfolio" ? "default" : "outline"} className="flex items-center justify-center h-16">
          <Camera className="h-5 w-5 mr-2" /> Add Portfolio
        </Button>
        <Button onClick={() => setActiveTab("audit-logs")} variant={activeTab === "audit-logs" ? "default" : "outline"} className="flex items-center justify-center h-16">
          <Shield className="h-5 w-5 mr-2" /> Audit Logs
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="quotations" className="text-base py-3">Quotations</TabsTrigger>
          <TabsTrigger value="make-quotation" className="text-base py-3">Create Quotation</TabsTrigger>
          <TabsTrigger value="projects" className="text-base py-3">Projects</TabsTrigger>
          <TabsTrigger value="invoices" className="text-base py-3">Invoices</TabsTrigger>
          <TabsTrigger value="portfolio" className="text-base py-3">Portfolio</TabsTrigger>
          <TabsTrigger value="settings" className="text-base py-3">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="quotations" className="space-y-4"><QuotationList /></TabsContent>
        <TabsContent value="make-quotation" className="space-y-4"><QuotationForm /></TabsContent>
        <TabsContent value="projects" className="space-y-4"><ProjectList /></TabsContent>
        <TabsContent value="make-project" className="space-y-4"><ProjectForm /></TabsContent>
        <TabsContent value="invoices" className="space-y-4"><InvoiceList /></TabsContent>
        <TabsContent value="portfolio" className="space-y-4"><PortfolioList /></TabsContent>
        <TabsContent value="make-portfolio" className="space-y-4"><PortfolioForm /></TabsContent>
        <TabsContent value="settings" className="space-y-4"><GeneralInfoForm /></TabsContent>
        <TabsContent value="audit-logs" className="space-y-4"><AuditLogList /></TabsContent>
      </Tabs>
    </div>
  );
}