"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Worker = {
  _id: string;
  workerCode: string;
  name: string;
  mobile: string;
  status: "active" | "inactive";
};

type WeeklyPayout = {
  isoWeekYear: number;
  isoWeek: number;
  weekStart: string;
  weekEnd: string;
  earnedPoints: number;
  deductedPoints: number;
  netPoints: number;
  weeklyPayoutRupees: number;
  payoutStatus: "pending" | "paid";
};

function PayrollPayoutsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workerId = searchParams.get("workerId") || "";
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const monthInputRef = useRef<HTMLInputElement | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [payouts, setPayouts] = useState<WeeklyPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPayoutKey, setUpdatingPayoutKey] = useState("");
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

  useEffect(() => {
    const load = async () => {
      if (!workerId) {
        setLoading(false);
        return;
      }

      try {
        const [workersRes, summaryRes] = await Promise.all([
          fetch("/api/workers?status=all"),
          fetch(`/api/workers/payroll/summary?workerId=${workerId}&month=${month}`),
        ]);

        const workersJson = await workersRes.json();
        const summaryJson = await summaryRes.json();

        if (!workersRes.ok) throw new Error(workersJson.error || "Failed to load workers");
        if (!summaryRes.ok) throw new Error(summaryJson.error || "Failed to load weekly payouts");

        setWorkers(workersJson.workers || []);
        setPayouts(summaryJson.loyalty?.weeklyPayouts || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load weekly payouts");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [month, workerId]);

  const reloadPayouts = async () => {
    const summaryRes = await fetch(`/api/workers/payroll/summary?workerId=${workerId}&month=${month}`);
    const summaryJson = await summaryRes.json();
    if (!summaryRes.ok) throw new Error(summaryJson.error || "Failed to load weekly payouts");
    setPayouts(summaryJson.loyalty?.weeklyPayouts || []);
  };

  const updateWeeklyPayoutStatus = async (
    isoWeekYear: number,
    isoWeek: number,
    status: "pending" | "paid"
  ) => {
    if (!workerId) return;
    const key = `${isoWeekYear}-${isoWeek}`;
    try {
      setUpdatingPayoutKey(key);
      const response = await fetch("/api/workers/loyalty/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId,
          isoWeekYear,
          isoWeek,
          status,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to update payout status");
      toast.success(`Weekly payout marked as ${status}`);
      await reloadPayouts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update payout status");
    } finally {
      setUpdatingPayoutKey("");
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
            <h1 className="text-lg font-semibold">Weekly Loyalty Payouts</h1>
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
                router.replace(`/dashboard/workforce/payroll/payouts?${params.toString()}`);
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
                router.replace(`/dashboard/workforce/payroll/payouts?${params.toString()}`);
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
            <h3 className="text-lg font-semibold text-white">All Weeks</h3>
          </div>
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="py-8 text-center text-slate-500">Loading payouts...</div>
            ) : payouts.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No loyalty entries for this month.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {payouts.map((week) => (
                  <div key={`${week.isoWeekYear}-${week.isoWeek}`} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">Week {week.isoWeek}</p>
                          <span className="text-xs text-slate-500">
                            {new Date(week.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(week.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            week.payoutStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {week.payoutStatus}
                          </span>
                          <button
                            type="button"
                            onClick={() => toast.info(`Payout for this week is ${week.payoutStatus}.`)}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            aria-label={`Payout status info for week ${week.isoWeek}`}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Earned</p>
                            <p className="mt-1 text-sm font-bold text-emerald-700">+{week.earnedPoints}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Deducted</p>
                            <p className="mt-1 text-sm font-bold text-rose-700">-{week.deductedPoints}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Net Points</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{week.netPoints}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Payout Amount</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">₹{week.weeklyPayoutRupees}</p>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingPayoutKey === `${week.isoWeekYear}-${week.isoWeek}`}
                          onClick={() =>
                            updateWeeklyPayoutStatus(
                              week.isoWeekYear,
                              week.isoWeek,
                              week.payoutStatus === "paid" ? "pending" : "paid"
                            )
                          }
                          className={`rounded-full text-xs font-semibold ${
                            week.payoutStatus === "paid"
                              ? "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                              : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          {week.payoutStatus === "paid" ? "Mark Pending" : "Mark Paid"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayrollPayoutsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PayrollPayoutsContent />
    </Suspense>
  );
}
