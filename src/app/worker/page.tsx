"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarCheck2,
  ChevronDown,
  CircleDollarSign,
  Home,
  Info,
  Minus,
  Trophy,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Worker = {
  _id: string;
  workerCode: string;
  name: string;
  mobile: string;
  dailyWage: number;
};

type SummaryResponse = {
  worker: Worker;
  period: {
    month: string;
  };
  summary: {
    totalUnits: number;
    attendanceDays: number;
    grossWage: number;
    totalAdvance: number;
    netPayable: number;
  };
  loyalty: {
    rules: {
      dailyMaxEarnPoints: number;
      pointValueInRupees: number;
      weeklyPayoutSeparateFromWages: boolean;
    };
    totalPoints: number;
    earnedPoints: number;
    deductedPoints: number;
    pointsRupees: number;
    weeklyPayouts: Array<{
      isoWeekYear: number;
      isoWeek: number;
      weekStart: string;
      weekEnd: string;
      earnedPoints: number;
      deductedPoints: number;
      netPoints: number;
      weeklyPayoutRupees: number;
      payoutStatus: "pending" | "paid";
      paidAt: string | null;
      payoutRecordId: string | null;
    }>;
  };
  attendanceEntries: Array<{ _id: string; date: string; units: number; note?: string }>;
  advances: Array<{ _id: string; date: string; amount: number; note?: string }>;
  loyaltyEntries: Array<{
    _id: string;
    date: string;
    entryType: "credit" | "debit";
    points: number;
    category: string;
    reason: string;
    note?: string;
    imageUrl?: string;
  }>;
};

type LeaderboardEntry = {
  rank: number;
  workerCode: string;
  name: string;
  totalPoints: number;
  totalRupees: number;
};

type WorkerTab = "home" | "payout" | "attendance" | "leaderboard";
const WORKER_TABS: WorkerTab[] = ["home", "payout", "attendance", "leaderboard"];
type MonthlyMetrics = {
  netPayable: number;
  loyaltyValue: number;
  attendanceDays: number;
  advances: number;
};

export default function WorkerDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <WorkerDashboardContent />
    </Suspense>
  );
}

function WorkerDashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [isMonthLoading, setIsMonthLoading] = useState(false);
  const [previousMonthMetrics, setPreviousMonthMetrics] = useState<MonthlyMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<WorkerTab>("home");
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [infoDialogTitle, setInfoDialogTitle] = useState("");
  const [infoDialogDescription, setInfoDialogDescription] = useState("");
  const lastScrollYRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const monthPickerRef = useRef<HTMLInputElement | null>(null);
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const setTabWithUrl = (tab: WorkerTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams?.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const shiftMonth = (monthValue: string, delta: number) => {
    const [year, monthNum] = monthValue.split("-").map(Number);
    const nextDate = new Date(year, monthNum - 1 + delta, 1);
    return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
  };

  const load = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsMonthLoading(true);
      }
      const response = await fetch(`/api/workers/payroll/summary?month=${month}`);
      const json = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/worker/login");
          return;
        }
        throw new Error(json.error || "Failed to load worker dashboard");
      }
      setData(json);
      const previousMonth = shiftMonth(month, -1);
      const previousResponse = await fetch(`/api/workers/payroll/summary?month=${previousMonth}`);
      if (previousResponse.ok) {
        const previousJson = await previousResponse.json();
        setPreviousMonthMetrics({
          netPayable: Math.round(previousJson.summary?.netPayable || 0),
          loyaltyValue: Math.max(0, previousJson.loyalty?.pointsRupees || 0),
          attendanceDays: Number(previousJson.summary?.attendanceDays || 0),
          advances: Math.round(previousJson.summary?.totalAdvance || 0),
        });
      } else {
        setPreviousMonthMetrics(null);
      }

      const leaderboardRes = await fetch("/api/workers/loyalty/leaderboard?period=weekly");
      const leaderboardJson = await leaderboardRes.json();
      if (leaderboardRes.ok) {
        setLeaderboard(leaderboardJson.leaderboard || []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load worker dashboard");
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setIsMonthLoading(false);
      }
    }
  };

  useEffect(() => {
    const isInitialLoad = !hasLoadedOnceRef.current;
    load(isInitialLoad);
    hasLoadedOnceRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && WORKER_TABS.includes(tabParam as WorkerTab)) {
      setActiveTab(tabParam as WorkerTab);
      return;
    }
    setActiveTab("home");
  }, [searchParams]);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;

      if (currentY <= 24) {
        setIsBottomNavVisible(true);
      } else if (currentY > lastY + 6) {
        setIsBottomNavVisible(false);
      } else if (currentY < lastY - 6) {
        setIsBottomNavVisible(true);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const monthName = useMemo(() => {
    const [year, monthNum] = month.split("-");
    const date = new Date(Number(year), Number(monthNum) - 1, 1);
    return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
  }, [month]);

  const openMonthPicker = () => {
    const input = monthPickerRef.current;
    if (!input) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  const openInfoDialog = (title: string, description: string) => {
    setInfoDialogTitle(title);
    setInfoDialogDescription(description);
    setIsInfoDialogOpen(true);
  };

  const leaderboardInsight = useMemo(() => {
    if (!data || leaderboard.length === 0) {
      return "No leaderboard data yet for this week.";
    }

    const me = leaderboard.find((entry) => entry.workerCode === data.worker.workerCode);
    if (!me) {
      const target = leaderboard[leaderboard.length - 1];
      const diff = Math.max(1, target.totalPoints + 1);
      return `Get ${diff} point${diff > 1 ? "s" : ""} to join this week leaderboard near ${target.name || target.workerCode}.`;
    }

    if (me.rank === 1) {
      return "You are leading this week. Keep quality and timing strong.";
    }

    const above = leaderboard.find((entry) => entry.rank === me.rank - 1);
    if (!above) {
      return "Keep going. Your points are being tracked live.";
    }

    const diff = above.totalPoints - me.totalPoints + 1;
    return `Get ${diff} point${diff > 1 ? "s" : ""} to go ahead of ${above.name || above.workerCode}.`;
  }, [data, leaderboard]);

  const logout = async () => {
    await fetch("/api/worker-auth/logout", { method: "POST" });
    router.push("/worker/login");
  };

  if (loading || !data) return <div className="p-6">Loading...</div>;

  const payoutTotal = Math.round(data.summary.netPayable) + Math.max(0, data.loyalty.pointsRupees);
  const workerDisplayName = data.worker.name || data.worker.workerCode;
  const workerInitial = workerDisplayName.trim().charAt(0).toUpperCase() || "W";
  const currentMetrics: MonthlyMetrics = {
    netPayable: Math.round(data.summary.netPayable),
    loyaltyValue: Math.max(0, data.loyalty.pointsRupees),
    attendanceDays: data.summary.attendanceDays,
    advances: Math.round(data.summary.totalAdvance),
  };

  const getDeltaNode = (currentValue: number, previousValue?: number) => {
    if (previousValue === undefined) {
      return <p className="mt-1 text-[11px] text-slate-400">No last month data</p>;
    }
    const delta = currentValue - previousValue;
    if (delta > 0) {
      return (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <ArrowUpRight className="h-3.5 w-3.5" />+{delta} vs last month
        </p>
      );
    }
    if (delta < 0) {
      return (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
          <ArrowDownRight className="h-3.5 w-3.5" />
          {delta} vs last month
        </p>
      );
    }
    return (
      <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
        <Minus className="h-3.5 w-3.5" />
        No change vs last month
      </p>
    );
  };
  const sortedLoyaltyEntries = [...data.loyaltyEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-100 px-3 pb-4 sm:px-4">
      <div className="mx-auto w-full max-w-xl space-y-4 pb-24 lg:w-1/2">
        <div className="-mx-3 border-y border-slate-200 bg-white px-4 py-4 sm:-mx-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 items-center">
              <Image src="/logo.png" alt="Soni Painting" width={120} height={40} className="h-10 w-auto" priority />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openMonthPicker}
                className="inline-flex h-10 items-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                aria-label="Open month selector"
              >
                {monthName}
                <ChevronDown className="h-4 w-4" />
              </button>
              <DropdownMenu open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
                <DropdownMenuTrigger asChild onMouseEnter={() => setIsProfileMenuOpen(true)}>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                    aria-label="Open profile menu"
                  >
                    {workerInitial}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56"
                  onMouseLeave={() => setIsProfileMenuOpen(false)}
                >
                  <DropdownMenuLabel className="text-sm">{workerDisplayName}</DropdownMenuLabel>
                  <p className="px-2 pb-2 text-xs text-slate-500">{data.worker.mobile}</p>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <input
          ref={monthPickerRef}
          type="month"
          value={month}
          max={currentMonth}
          onChange={(e) => {
            const selectedMonth = e.target.value;
            if (!selectedMonth || selectedMonth > currentMonth) return;
            setMonth(selectedMonth);
          }}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
        <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>{infoDialogTitle}</DialogTitle>
              <DialogDescription>{infoDialogDescription}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {isMonthLoading ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-8 text-center text-sm text-slate-500">Loading month data...</CardContent>
          </Card>
        ) : null}

        {!isMonthLoading && activeTab === "home" ? (
          <div className="space-y-4">
            <Card className="gap-3 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm">
              <div className="flex items-center gap-2 bg-black px-4 py-2.5 text-white">
                <BarChart3 className="h-5 w-5" />
                <h3 className="text-xl font-semibold tracking-tight">Home Summary</h3>
              </div>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-3 px-1">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">Net Wage</p>
                      <button
                        type="button"
                        onClick={() =>
                          openInfoDialog("Net Wage", "Net wage is this month wage after advance deductions.")
                        }
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Net wage info"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-lg font-semibold">Rs. {currentMetrics.netPayable}</p>
                    {getDeltaNode(currentMetrics.netPayable, previousMonthMetrics?.netPayable)}
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">Loyalty Value</p>
                      <button
                        type="button"
                        onClick={() =>
                          openInfoDialog("Loyalty Value", "Loyalty value is points amount for this month.")
                        }
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Loyalty value info"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-lg font-semibold">Rs. {currentMetrics.loyaltyValue}</p>
                    {getDeltaNode(currentMetrics.loyaltyValue, previousMonthMetrics?.loyaltyValue)}
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">Hajiri Days</p>
                      <button
                        type="button"
                        onClick={() =>
                          openInfoDialog("Hajiri Days", "Hajiri days means total attendance days marked in this month.")
                        }
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Hajiri info"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-lg font-semibold">{currentMetrics.attendanceDays}</p>
                    {getDeltaNode(currentMetrics.attendanceDays, previousMonthMetrics?.attendanceDays)}
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">Advances</p>
                      <button
                        type="button"
                        onClick={() =>
                          openInfoDialog("Advances", "Advances are total advance payments taken in this month.")
                        }
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Advances info"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-lg font-semibold">Rs. {currentMetrics.advances}</p>
                    {getDeltaNode(currentMetrics.advances, previousMonthMetrics?.advances)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-3 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm">
              <div className="flex items-center gap-2 bg-black px-4 py-2.5 text-white">
                <Zap className="h-5 w-5" />
                <h3 className="text-xl font-semibold tracking-tight">Quick Actions</h3>
              </div>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" className="h-9 text-xs" onClick={() => setTabWithUrl("payout")}>
                    Payout
                  </Button>
                  <Button variant="outline" className="h-9 text-xs" onClick={() => setTabWithUrl("attendance")}>
                    Attendance
                  </Button>
                  <Button variant="outline" className="h-9 text-xs" onClick={() => setTabWithUrl("leaderboard")}>
                    Leaderboard
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-3 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm">
              <div className="flex items-center gap-2 bg-black px-4 py-2.5 text-white">
                <Trophy className="h-5 w-5" />
                <h3 className="text-xl font-semibold tracking-tight">Leaderboard Insight</h3>
              </div>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-sm text-slate-600">{leaderboardInsight}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!isMonthLoading && activeTab === "payout" ? (
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Payout Overview</CardTitle>
                <CardDescription>Daily wage and loyalty payout are tracked separately.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] text-slate-500">Daily Wage</p>
                    <p className="text-lg font-semibold">Rs. {data.worker.dailyWage}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] text-slate-500">Gross Wage</p>
                    <p className="text-lg font-semibold">Rs. {Math.round(data.summary.grossWage)}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="text-[11px] text-slate-500">Advance Deduction</p>
                    <p className="text-lg font-semibold">Rs. {Math.round(data.summary.totalAdvance)}</p>
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-3">
                    <p className="text-[11px] text-slate-500">Loyalty (weekly payout)</p>
                    <p className="text-lg font-semibold">Rs. {Math.max(0, data.loyalty.pointsRupees)}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-[11px] text-slate-500">Potential Total (Wage + Loyalty)</p>
                  <p className="text-xl font-semibold">Rs. {payoutTotal}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Loyalty Points Summary</CardTitle>
                <CardDescription>Clear monthly view of earned and deducted points.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                    <p className="text-[11px] text-green-700">Earned</p>
                    <p className="text-lg font-semibold text-green-900">+{data.loyalty.earnedPoints}</p>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-[11px] text-red-700">Deducted</p>
                    <p className="text-lg font-semibold text-red-900">-{data.loyalty.deductedPoints}</p>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                    <p className="text-[11px] text-indigo-700">Net</p>
                    <p className="text-lg font-semibold text-indigo-900">{data.loyalty.totalPoints}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                  <p className="text-[11px] text-cyan-700">Point Value (1 point = Rs.1)</p>
                  <p className="text-xl font-semibold text-cyan-900">Rs. {Math.max(0, data.loyalty.pointsRupees)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Weekly Loyalty Payout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.loyalty.weeklyPayouts.length === 0 ? (
                  <p className="text-sm text-slate-500">No loyalty entries for this month.</p>
                ) : (
                  data.loyalty.weeklyPayouts.map((week) => (
                    <div key={`${week.isoWeekYear}-${week.isoWeek}`} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Week {week.isoWeek}</p>
                        <span
                          className={`rounded px-2 py-1 text-[10px] font-medium ${
                            week.payoutStatus === "paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {week.payoutStatus}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(week.weekStart).toLocaleDateString()} - {new Date(week.weekEnd).toLocaleDateString()}
                      </p>
                      <p className="mt-2 text-sm">
                        Earned {week.earnedPoints} | Deducted {week.deductedPoints} | Net {week.netPoints}
                      </p>
                      <p className="text-sm font-semibold">Payout: Rs. {week.weeklyPayoutRupees}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Points Statement</CardTitle>
                <CardDescription>Credit/debit transactions for selected month.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedLoyaltyEntries.length === 0 ? (
                  <p className="text-sm text-slate-500">No loyalty transactions found.</p>
                ) : (
                  sortedLoyaltyEntries.map((entry) => (
                    <div key={entry._id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{new Date(entry.date).toLocaleDateString()}</p>
                          <p className="text-xs text-slate-500">{entry.category}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`rounded px-2 py-1 text-[10px] font-medium ${
                              entry.entryType === "credit"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {entry.entryType}
                          </span>
                          <p
                            className={`mt-1 text-sm font-semibold ${
                              entry.entryType === "credit" ? "text-green-700" : "text-red-700"
                            }`}
                          >
                            {entry.points > 0 ? `+${entry.points}` : entry.points} pts
                          </p>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{entry.reason}</p>
                      {entry.note ? <p className="mt-1 text-xs text-slate-500">Note: {entry.note}</p> : null}
                      {entry.imageUrl ? (
                        <a
                          href={entry.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                        >
                          View evidence image
                        </a>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!isMonthLoading && activeTab === "attendance" ? (
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Attendance</CardTitle>
                <CardDescription>All attendance entries for selected month.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.attendanceEntries.length === 0 ? (
                  <p className="text-sm text-slate-500">No attendance entries found.</p>
                ) : (
                  data.attendanceEntries.map((entry) => (
                    <div key={entry._id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{new Date(entry.date).toLocaleDateString()}</p>
                        <p className="text-sm font-semibold">{entry.units} unit</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{entry.note || "No note"}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Advance Payments</CardTitle>
                <CardDescription>All advances for selected month.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.advances.length === 0 ? (
                  <p className="text-sm text-slate-500">No advance payment entries found.</p>
                ) : (
                  data.advances.map((entry) => (
                    <div key={entry._id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{new Date(entry.date).toLocaleDateString()}</p>
                        <p className="text-sm font-semibold">Rs. {entry.amount}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{entry.note || "No note"}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!isMonthLoading && activeTab === "leaderboard" ? (
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Weekly Leaderboard</CardTitle>
                <CardDescription>{leaderboardInsight}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-slate-500">No leaderboard data yet.</p>
                ) : (
                  leaderboard.map((row) => (
                    <div
                      key={`${row.rank}-${row.workerCode}`}
                      className={`rounded-xl border p-3 ${
                        row.workerCode === data.worker.workerCode
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          #{row.rank} {row.name || row.workerCode}
                        </p>
                        <p className="text-sm font-semibold">{row.totalPoints} pts</p>
                      </div>
                      <p className="text-xs text-slate-500">Value: Rs. {row.totalRupees}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div
          className={`fixed inset-x-0 bottom-0 z-40 transform transition-transform duration-300 ${
            isBottomNavVisible ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="w-full border-t border-slate-200 bg-white p-2 shadow-lg">
            <div className="grid grid-cols-4 gap-1">
              <Button
                variant="ghost"
                className={`h-11 flex-col gap-0.5 text-[11px] hover:bg-transparent hover:text-indigo-600 ${
                  activeTab === "home" ? "text-indigo-700" : "text-slate-500"
                }`}
                onClick={() => setTabWithUrl("home")}
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              <Button
                variant="ghost"
                className={`h-11 flex-col gap-0.5 text-[11px] hover:bg-transparent hover:text-indigo-600 ${
                  activeTab === "payout" ? "text-indigo-700" : "text-slate-500"
                }`}
                onClick={() => setTabWithUrl("payout")}
              >
                <CircleDollarSign className="h-4 w-4" />
                Payout
              </Button>
              <Button
                variant="ghost"
                className={`h-11 flex-col gap-0.5 text-[11px] hover:bg-transparent hover:text-indigo-600 ${
                  activeTab === "attendance" ? "text-indigo-700" : "text-slate-500"
                }`}
                onClick={() => setTabWithUrl("attendance")}
              >
                <CalendarCheck2 className="h-4 w-4" />
                Attendance
              </Button>
              <Button
                variant="ghost"
                className={`h-11 flex-col gap-0.5 text-[11px] hover:bg-transparent hover:text-indigo-600 ${
                  activeTab === "leaderboard" ? "text-indigo-700" : "text-slate-500"
                }`}
                onClick={() => setTabWithUrl("leaderboard")}
              >
                <Trophy className="h-4 w-4" />
                Leaderboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
