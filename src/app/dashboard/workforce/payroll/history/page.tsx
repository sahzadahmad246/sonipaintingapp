"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Worker = {
  _id: string;
  workerCode: string;
  name: string;
  mobile: string;
  status: "active" | "inactive";
};

type LoyaltyHistoryEntry = {
  _id: string;
  date: string;
  entryType: "credit" | "debit";
  points: number;
  category: string;
  reason: string;
  note?: string;
  imageUrl?: string;
  isReversal?: boolean;
};

type WeeklyPayout = {
  isoWeekYear: number;
  isoWeek: number;
  payoutStatus: "pending" | "paid";
};

function PayrollHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workerId = searchParams.get("workerId") || "";
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const monthInputRef = useRef<HTMLInputElement | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [entries, setEntries] = useState<LoyaltyHistoryEntry[]>([]);
  const [weeklyPayouts, setWeeklyPayouts] = useState<WeeklyPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [reversingEntryId, setReversingEntryId] = useState("");
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [reverseTargetEntry, setReverseTargetEntry] = useState<LoyaltyHistoryEntry | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const worker = useMemo(
    () => workers.find((item) => item._id === workerId) || null,
    [workerId, workers]
  );

  const monthLabel = useMemo(() => {
    const [year, monthValue] = month.split("-");
    return new Date(Number(year), Number(monthValue) - 1, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }, [month]);

  const openMonthPicker = () => {
    const input = monthInputRef.current;
    if (!input) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  const getIsoWeekAndYear = (dateValue: string) => {
    const date = new Date(dateValue);
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const isoWeek = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { isoWeek, isoWeekYear: utc.getUTCFullYear() };
  };

  const isEntryReversible = (entry: LoyaltyHistoryEntry) => {
    if (entry.isReversal || entry.category === "reversal") return false;
    const { isoWeek, isoWeekYear } = getIsoWeekAndYear(entry.date);
    const matchedWeek = weeklyPayouts.find(
      (week) => week.isoWeek === isoWeek && week.isoWeekYear === isoWeekYear
    );
    return !matchedWeek || matchedWeek.payoutStatus === "pending";
  };

  useEffect(() => {
    const load = async () => {
      if (!workerId) {
        setLoading(false);
        return;
      }

      try {
        const [workersRes, historyRes, summaryRes] = await Promise.all([
          fetch("/api/workers?status=all"),
          (async () => {
            const [year, monthValue] = month.split("-").map(Number);
            const startDate = new Date(year, monthValue - 1, 1).toISOString().slice(0, 10);
            const endDate = new Date(year, monthValue, 0).toISOString().slice(0, 10);
            return fetch(`/api/workers/loyalty?workerId=${workerId}&startDate=${startDate}&endDate=${endDate}`);
          })(),
          fetch(`/api/workers/payroll/summary?workerId=${workerId}&month=${month}`),
        ]);

        const workersJson = await workersRes.json();
        const historyJson = await historyRes.json();
        const summaryJson = await summaryRes.json();

        if (!workersRes.ok) throw new Error(workersJson.error || "Failed to load workers");
        if (!historyRes.ok) throw new Error(historyJson.error || "Failed to load loyalty history");
        if (!summaryRes.ok) throw new Error(summaryJson.error || "Failed to load payroll summary");

        setWorkers(workersJson.workers || []);
        setEntries(historyJson.entries || []);
        setWeeklyPayouts(summaryJson.loyalty?.weeklyPayouts || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load loyalty history");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [month, workerId]);

  const reloadData = async () => {
    const [year, monthValue] = month.split("-").map(Number);
    const startDate = new Date(year, monthValue - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, monthValue, 0).toISOString().slice(0, 10);
    const [historyRes, summaryRes] = await Promise.all([
      fetch(`/api/workers/loyalty?workerId=${workerId}&startDate=${startDate}&endDate=${endDate}`),
      fetch(`/api/workers/payroll/summary?workerId=${workerId}&month=${month}`),
    ]);
    const historyJson = await historyRes.json();
    const summaryJson = await summaryRes.json();
    if (!historyRes.ok) throw new Error(historyJson.error || "Failed to load loyalty history");
    if (!summaryRes.ok) throw new Error(summaryJson.error || "Failed to load payroll summary");
    setEntries(historyJson.entries || []);
    setWeeklyPayouts(summaryJson.loyalty?.weeklyPayouts || []);
  };

  const openReverseDialog = (entry: LoyaltyHistoryEntry) => {
    setReverseTargetEntry(entry);
    setReverseReason("");
    setReverseDialogOpen(true);
  };

  const reverseEntry = async () => {
    if (!reverseTargetEntry) return;
    const reason = reverseReason.trim();
    if (!reason) {
      toast.error("Reversal reason is required");
      return;
    }
    try {
      setReversingEntryId(reverseTargetEntry._id);
      const response = await fetch("/api/workers/loyalty/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: reverseTargetEntry._id, reason }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to reverse loyalty entry");
      toast.success("Loyalty entry reversed");
      setReverseDialogOpen(false);
      setReverseTargetEntry(null);
      setReverseReason("");
      await reloadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reverse loyalty entry");
    } finally {
      setReversingEntryId("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-6">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="flex flex-row items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto flex w-full max-w-4xl flex-row items-center justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Loyalty History</h1>
            <div className="w-8" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-4 px-3 pt-4 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1 max-w-[220px]">
            <Label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Select Worker
            </Label>
            <Select
              value={workerId}
              onValueChange={(value) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("workerId", value);
                params.set("month", month);
                router.replace(`/dashboard/workforce/payroll/history?${params.toString()}`);
              }}
            >
              <SelectTrigger className="h-9 rounded-full border-slate-200 bg-white px-3 text-xs shadow-none">
                <SelectValue placeholder="Worker" />
              </SelectTrigger>
              <SelectContent>
                {workers
                  .filter((item) => item.status === "active")
                  .map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.name || item.workerCode} ({item.workerCode})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="shrink-0">
            <Label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Select Month
            </Label>
            <button
              type="button"
              onClick={openMonthPicker}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-none transition-colors hover:bg-slate-50"
            >
              {monthLabel}
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>
            <Input
              ref={monthInputRef}
              type="month"
              value={month}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("workerId", workerId);
                params.set("month", e.target.value);
                router.replace(`/dashboard/workforce/payroll/history?${params.toString()}`);
              }}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {worker ? (
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {worker.name || worker.workerCode} ({worker.workerCode})
            </span>
          ) : null}
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
            {monthLabel}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-900 px-4 py-3 sm:px-6 sm:py-4">
            <h3 className="text-lg font-semibold text-white">All Entries</h3>
          </div>
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="py-8 text-center text-slate-500">Loading history...</div>
            ) : entries.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No loyalty entries for this month.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {entries.map((entry) => (
                  <div key={entry._id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          entry.entryType === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {entry.entryType === "credit" ? "+" : "-"}{entry.points}
                        </span>
                        <span className="text-xs font-medium text-slate-600">{entry.category}</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Reason</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{entry.reason}</p>
                      </div>
                      {entry.note ? (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Note</p>
                          <p className="mt-1 text-sm text-slate-600">{entry.note}</p>
                        </div>
                      ) : null}
                      {entry.imageUrl ? (
                        <div className="text-xs">
                          <span className="text-slate-600">Evidence:</span>{" "}
                          <a href={entry.imageUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">
                            View image
                          </a>
                        </div>
                      ) : null}
                      {!entry.isReversal && entry.category !== "reversal" && isEntryReversible(entry) ? (
                        <div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reversingEntryId === entry._id}
                            onClick={() => openReverseDialog(entry)}
                            className="rounded-full text-xs"
                          >
                            Reverse
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Loyalty Entry</DialogTitle>
            <DialogDescription>
              {reverseTargetEntry
                ? `Add a reason to reverse ${reverseTargetEntry.entryType} ${reverseTargetEntry.points} points.`
                : "Add a reason to reverse this loyalty entry."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Reason</Label>
              <Input value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="Reason for reversal" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReverseDialogOpen(false);
                setReverseTargetEntry(null);
                setReverseReason("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={reverseEntry} disabled={!reverseReason.trim() || reversingEntryId === reverseTargetEntry?._id}>
              {reversingEntryId === reverseTargetEntry?._id ? "Reversing..." : "Confirm Reverse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PayrollHistoryPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PayrollHistoryContent />
    </Suspense>
  );
}
