"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CalendarDays, Download, LockKeyhole, Wallet, Banknote, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type PublicReportPreview = {
  id: string;
  workerName: string;
  workerCode: string;
  startDate: string;
  endDate: string;
  totalUnits: number;
  grossWage: number;
  totalAdvance: number;
  netPayable: number;
};

type ReportAttendance = {
  _id: string;
  date: string;
  units: number;
  note?: string;
  project?: {
    clientName: string;
    clientAddress: string;
    projectId: string;
  } | null;
};

type ReportAdvance = {
  _id: string;
  date: string;
  amount: number;
  note?: string;
};

type FullReport = {
  id: string;
  worker: {
    name: string;
    workerCode: string;
    dailyWage: number;
  };
  startDate: string;
  endDate: string;
  paidAt?: string;
  totalUnits: number;
  attendanceDays: number;
  grossWage: number;
  totalAdvance: number;
  netPayable: number;
  attendance: ReportAttendance[];
  advances: ReportAdvance[];
};

function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Date(value).toLocaleDateString("en-IN", options || { day: "numeric", month: "short", year: "numeric" });
}

function dayKey(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMoney(value: number) {
  return `Rs.${Math.round(value || 0).toLocaleString("en-IN")}`;
}

export default function WorkerReportPage() {
  const params = useParams<{ id: string }>();
  const reportId = params?.id || "";
  const [preview, setPreview] = useState<PublicReportPreview | null>(null);
  const [report, setReport] = useState<FullReport | null>(null);
  const [last4, setLast4] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/worker-reports/${reportId}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load report");
        setPreview(data.report);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reportId]);

  const dateRows = useMemo(() => {
    if (!report) return [];
    const rows = new Map<string, { date: string; units: number; advance: number; projects: string[]; notes: string[] }>();

    for (const entry of report.attendance) {
      const key = dayKey(entry.date);
      const current = rows.get(key) || { date: key, units: 0, advance: 0, projects: [], notes: [] };
      current.units += Number(entry.units || 0);
      if (entry.project?.clientName) current.projects.push(entry.project.clientName);
      if (entry.note) current.notes.push(entry.note);
      rows.set(key, current);
    }

    for (const entry of report.advances) {
      const key = dayKey(entry.date);
      const current = rows.get(key) || { date: key, units: 0, advance: 0, projects: [], notes: [] };
      current.advance += Number(entry.amount || 0);
      if (entry.note) current.notes.push(entry.note);
      rows.set(key, current);
    }

    return Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [report]);

  const calendarMonths = useMemo(() => {
    if (!report) return [];
    const start = new Date(report.startDate);
    const end = new Date(report.endDate);
    const monthMap = new Map<string, { label: string; days: Date[] }>();

    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      const current = monthMap.get(key) || {
        label: cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
        days: [],
      };
      current.days.push(new Date(cursor));
      monthMap.set(key, current);
    }

    return Array.from(monthMap.values());
  }, [report]);

  const rowByDate = useMemo(() => {
    const map = new Map<string, (typeof dateRows)[number]>();
    for (const row of dateRows) map.set(row.date, row);
    return map;
  }, [dateRows]);

  const verifyReport = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setVerifying(true);
      const response = await fetch(`/api/worker-reports/${reportId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ last4 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to verify report");
      setReport(data.report);
      toast.success("Report unlocked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to verify report");
    } finally {
      setVerifying(false);
    }
  };

  const downloadPdf = () => {
    if (!report) return;
    const doc = new jsPDF();
    const period = `${formatDate(report.startDate)} - ${formatDate(report.endDate)}`;
    doc.setFontSize(16);
    doc.text("Soni Painting - Attendance Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Worker: ${report.worker.name} (${report.worker.workerCode})`, 14, 28);
    doc.text(`Period: ${period}`, 14, 35);
    if (report.paidAt) doc.text(`Paid: ${formatDate(report.paidAt)}`, 14, 42);

    autoTable(doc, {
      startY: report.paidAt ? 50 : 44,
      head: [["Total Hajiri", "Gross", "Advance", "Net Payable"]],
      body: [[String(report.totalUnits), formatMoney(report.grossWage), formatMoney(report.totalAdvance), formatMoney(report.netPayable)]],
      theme: "grid",
    });

    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 10
        : 70,
      head: [["Date", "Hajiri", "Advance", "Project", "Notes"]],
      body: dateRows.map((row) => [
        formatDate(row.date),
        String(row.units),
        formatMoney(row.advance),
        Array.from(new Set(row.projects)).join(", ") || "-",
        row.notes.join(" | ") || "-",
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`worker-report-${report.worker.workerCode}-${dayKey(report.startDate)}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-5 shadow-sm">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-4 h-20 w-full" />
          <Skeleton className="mt-4 h-44 w-full" />
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-center">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="font-semibold text-slate-900">Report not found</p>
          <p className="mt-1 text-sm text-slate-500">Please check the report link and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-5 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-4">
        <div className="rounded-xl bg-slate-950 px-5 py-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Soni Painting</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Attendance Report</h1>
              <p className="mt-1 text-sm text-slate-300">
                {preview.workerName} · {formatDate(preview.startDate)} - {formatDate(preview.endDate)}
              </p>
            </div>
            {report ? (
              <Button type="button" onClick={downloadPdf} className="bg-white text-slate-950 hover:bg-slate-100">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            ) : null}
          </div>
        </div>

        {!report ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-50 p-2 text-blue-700">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900">Unlock Report</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter the last 4 digits of your registered mobile number.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px] lg:items-start">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Worker", preview.workerName],
                  ["Period", `${formatDate(preview.startDate)} - ${formatDate(preview.endDate)}`],
                  ["Hajiri", String(preview.totalUnits)],
                  ["Net Payable", formatMoney(preview.netPayable)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={verifyReport} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <Label htmlFor="last4" className="text-sm font-semibold text-slate-800">Last 4 mobile digits</Label>
                <div className="mt-3 flex gap-2">
                  <Input
                    id="last4"
                    inputMode="numeric"
                    value={last4}
                    onChange={(event) => setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="1234"
                    maxLength={4}
                    className="h-11 text-center text-lg font-bold tracking-[0.35em]"
                  />
                  <Button type="submit" disabled={verifying || last4.length !== 4} className="h-11 shrink-0 bg-slate-900 px-4 hover:bg-slate-800">
                    {verifying ? "Checking..." : "View"}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">This keeps the report private without requiring login.</p>
              </form>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Total Hajiri", value: report.totalUnits, icon: CalendarDays, color: "text-blue-700", bg: "bg-blue-50" },
                { label: "Gross Wage", value: formatMoney(report.grossWage), icon: Banknote, color: "text-green-700", bg: "bg-green-50" },
                { label: "Advance", value: formatMoney(report.totalAdvance), icon: Wallet, color: "text-amber-700", bg: "bg-amber-50" },
                { label: "Net Payable", value: formatMoney(report.netPayable), icon: CheckCircle2, color: "text-indigo-700", bg: "bg-indigo-50" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`rounded-xl border border-slate-200 p-4 shadow-sm ${item.bg}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-600">{item.label}</p>
                      <Icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    <p className={`mt-3 text-xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold text-slate-900">Date-wise Details</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Hajiri</th>
                      <th className="px-4 py-3">Advance</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dateRows.map((row) => (
                      <tr key={row.date}>
                        <td className="px-4 py-3 font-medium text-slate-900">{formatDate(row.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                        <td className="px-4 py-3 text-blue-700">{row.units}</td>
                        <td className="px-4 py-3 text-amber-700">{formatMoney(row.advance)}</td>
                        <td className="px-4 py-3 text-slate-600">{Array.from(new Set(row.projects)).join(", ") || "-"}</td>
                        <td className="px-4 py-3 text-slate-500">{row.notes.join(" · ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4">
              <h2 className="px-1 font-semibold text-slate-900">Attendance Calendar</h2>
              {calendarMonths.map((month) => (
                <div key={month.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">{month.label}</h3>
                    <p className="text-xs text-slate-500">
                      {month.days.length} days in report
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                      <div key={`${month.label}-${day}-${index}`} className="py-1">{day}</div>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {Array.from({ length: month.days[0]?.getDay() || 0 }).map((_, index) => (
                      <div key={`${month.label}-blank-${index}`} />
                    ))}
                    {month.days.map((date) => {
                      const row = rowByDate.get(dayKey(date));
                      return (
                        <div
                          key={dayKey(date)}
                          className={`min-h-20 rounded-lg border p-2 text-xs ${
                            row ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-slate-50"
                          }`}
                        >
                          <p className="font-semibold text-slate-800">{date.getDate()}</p>
                          {row ? (
                            <div className="mt-2 space-y-1">
                              <p className="font-semibold text-blue-700">{row.units} H</p>
                              {row.advance > 0 ? <p className="break-words font-semibold text-amber-700">{formatMoney(row.advance)}</p> : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {calendarMonths.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
                  No calendar dates available for this report.
                </div>
              ) : null}
              </div>
          </>
        )}
      </div>
    </div>
  );
}
