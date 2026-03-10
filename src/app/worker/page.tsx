"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Home,
  Info,
  Lightbulb,
  Minus,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
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
  attendanceEntries: Array<{
    _id: string;
    date: string;
    units: number;
    note?: string;
    projectId?: {
      _id: string;
      projectId: string;
      clientName: string;
      clientAddress: string;
    } | null;
  }>;
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
  attendanceUnits: number;
  advances: number;
};

function WorkerSkeletonBox({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />;
}

function WorkerPageSkeleton({ tab = "home" }: { tab?: WorkerTab }) {
  return (
    <div className="min-h-screen bg-slate-100 px-3 pb-4 sm:px-4">
      <div className="mx-auto w-full max-w-xl space-y-4 pb-24 lg:w-1/2">
        <div className="-mx-3 border-y border-slate-200 bg-white px-4 py-4 sm:-mx-4">
          <div className="flex items-start justify-between gap-3">
            <WorkerSkeletonBox className="h-10 w-32 rounded-xl" />
            <div className="flex items-center gap-2">
              <WorkerSkeletonBox className="h-10 w-28 rounded-full" />
              <WorkerSkeletonBox className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>

        {(tab === "home" || tab === "payout" || tab === "attendance" || tab === "leaderboard") && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 bg-black px-4 py-2.5">
                <WorkerSkeletonBox className="h-5 w-5 rounded-full bg-white/20" />
                <WorkerSkeletonBox className="h-5 w-36 rounded-md bg-white/20" />
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <WorkerSkeletonBox className="h-24" />
                  <WorkerSkeletonBox className="h-24" />
                  <WorkerSkeletonBox className="h-24" />
                  <WorkerSkeletonBox className="h-24" />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-black px-4 py-2.5">
                <WorkerSkeletonBox className="h-5 w-40 rounded-md bg-white/20" />
                <WorkerSkeletonBox className="h-8 w-24 rounded-full bg-white/20" />
              </div>
              <div className="space-y-3 p-4">
                {tab === "attendance" ? (
                  <>
                    <WorkerSkeletonBox className="h-72 rounded-2xl" />
                    <WorkerSkeletonBox className="h-16" />
                    <WorkerSkeletonBox className="h-16" />
                  </>
                ) : (
                  <>
                    <WorkerSkeletonBox className="h-16" />
                    <WorkerSkeletonBox className="h-16" />
                    <WorkerSkeletonBox className="h-16" />
                  </>
                )}
              </div>
            </div>

            {tab !== "leaderboard" ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 bg-black px-4 py-2.5">
                  <WorkerSkeletonBox className="h-5 w-5 rounded-full bg-white/20" />
                  <WorkerSkeletonBox className="h-5 w-32 rounded-md bg-white/20" />
                </div>
                <div className="space-y-3 p-4">
                  <WorkerSkeletonBox className="h-14" />
                  <WorkerSkeletonBox className="h-14" />
                  <WorkerSkeletonBox className="h-14" />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkerDashboardPage() {
  return (
    <Suspense fallback={<WorkerPageSkeleton />}>
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
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedWeekYear, setSelectedWeekYear] = useState<number | null>(null);
  const [payoutWeek, setPayoutWeek] = useState<number | null>(null);
  const [payoutWeekYear, setPayoutWeekYear] = useState<number | null>(null);
  const [statementWeek, setStatementWeek] = useState<number | null>(null);
  const [statementWeekYear, setStatementWeekYear] = useState<number | null>(null);
  const [selectedDateInfo, setSelectedDateInfo] = useState<{
    date: Date;
    attendance?: {
      units: number;
      notes: string[];
      projects: Array<{ _id: string; projectId: string; clientName: string; clientAddress: string }>;
    };
    advance?: { amount: number; note?: string };
  } | null>(null);
  const [isWeekPickerOpen, setIsWeekPickerOpen] = useState(false);
  const [weekPickerTarget, setWeekPickerTarget] = useState<"leaderboard" | "payout" | "statement">("leaderboard");
  const lastScrollYRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const monthPickerRef = useRef<HTMLInputElement | null>(null);
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const getCurrentISOWeek = (): { isoWeek: number; isoWeekYear: number } => {
    const d = new Date();
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const isoWeek = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { isoWeek, isoWeekYear: utc.getUTCFullYear() };
  };

  const currentISOWeek = useMemo(() => getCurrentISOWeek(), []);

  const getWeekDateRange = (isoWeek: number, isoWeekYear: number): { start: Date; end: Date } => {
    const jan4 = new Date(Date.UTC(isoWeekYear, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1));
    const start = new Date(week1Monday);
    start.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { start, end };
  };

  const recentWeeks = useMemo(() => {
    const weeks: { isoWeek: number; isoWeekYear: number; start: Date; end: Date }[] = [];
    let w = currentISOWeek.isoWeek;
    let y = currentISOWeek.isoWeekYear;
    for (let i = 0; i < 12; i++) {
      const range = getWeekDateRange(w, y);
      weeks.push({ isoWeek: w, isoWeekYear: y, ...range });
      w -= 1;
      if (w < 1) {
        y -= 1;
        const dec28 = new Date(Date.UTC(y, 11, 28));
        const utc = new Date(Date.UTC(dec28.getFullYear(), dec28.getMonth(), dec28.getDate()));
        utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
        const ys = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
        w = Math.ceil(((utc.getTime() - ys.getTime()) / 86400000 + 1) / 7);
      }
    }
    return weeks;
  }, [currentISOWeek]);

  const fetchLeaderboard = async (week?: number, year?: number) => {
    try {
      let url = "/api/workers/loyalty/leaderboard?period=weekly";
      if (week !== undefined && year !== undefined) {
        url += `&week=${week}&year=${year}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setLeaderboard(json.leaderboard || []);
        if (json.isoWeek !== undefined) setSelectedWeek(json.isoWeek);
        if (json.isoWeekYear !== undefined) setSelectedWeekYear(json.isoWeekYear);
      }
    } catch {
      // ignore
    }
  };

  const openWeekPicker = (target: "leaderboard" | "payout" | "statement") => {
    setWeekPickerTarget(target);
    setIsWeekPickerOpen(true);
  };

  const getActiveWeekForTarget = (target: "leaderboard" | "payout" | "statement") => {
    if (target === "payout") return payoutWeek ?? currentISOWeek.isoWeek;
    if (target === "statement") return statementWeek ?? currentISOWeek.isoWeek;
    return selectedWeek ?? currentISOWeek.isoWeek;
  };

  const getActiveWeekYearForTarget = (target: "leaderboard" | "payout" | "statement") => {
    if (target === "payout") return payoutWeekYear ?? currentISOWeek.isoWeekYear;
    if (target === "statement") return statementWeekYear ?? currentISOWeek.isoWeekYear;
    return selectedWeekYear ?? currentISOWeek.isoWeekYear;
  };

  const selectWeek = (isoWeek: number, isoWeekYear: number) => {
    setIsWeekPickerOpen(false);
    if (weekPickerTarget === "leaderboard") {
      fetchLeaderboard(isoWeek, isoWeekYear);
    } else if (weekPickerTarget === "payout") {
      setPayoutWeek(isoWeek);
      setPayoutWeekYear(isoWeekYear);
    } else {
      setStatementWeek(isoWeek);
      setStatementWeekYear(isoWeekYear);
    }
  };

  const formatDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const activeWeek = selectedWeek ?? currentISOWeek.isoWeek;
  const activeWeekYear = selectedWeekYear ?? currentISOWeek.isoWeekYear;
  const activeWeekRange = getWeekDateRange(activeWeek, activeWeekYear);

  const activePayoutWeek = payoutWeek ?? currentISOWeek.isoWeek;
  const activePayoutWeekYear = payoutWeekYear ?? currentISOWeek.isoWeekYear;

  const activeStatementWeek = statementWeek ?? currentISOWeek.isoWeek;
  const activeStatementWeekYear = statementWeekYear ?? currentISOWeek.isoWeekYear;
  const activeStatementWeekRange = getWeekDateRange(activeStatementWeek, activeStatementWeekYear);

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
          attendanceUnits: Number(previousJson.summary?.totalUnits || 0),
          advances: Math.round(previousJson.summary?.totalAdvance || 0),
        });
      } else {
        setPreviousMonthMetrics(null);
      }

      await fetchLeaderboard();
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

    const leader = leaderboard[0];
    const leaderName = leader ? (leader.name || leader.workerCode) : "";

    const me = leaderboard.find((entry) => entry.workerCode === data.worker.workerCode);
    if (!me) {
      const target = leaderboard[leaderboard.length - 1];
      const diff = Math.max(1, target.totalPoints + 1);
      return `${leaderName} is leading. Get ${diff} point${diff > 1 ? "s" : ""} to join this week leaderboard near ${target.name || target.workerCode}.`;
    }

    if (me.rank === 1) {
      return "You are leading this week. Keep quality and timing strong.";
    }

    const above = leaderboard.find((entry) => entry.rank === me.rank - 1);
    if (!above) {
      return `${leaderName} is leading. Keep going. Your points are being tracked live.`;
    }

    const diff = above.totalPoints - me.totalPoints + 1;
    const isAboveLeader = above.workerCode === leader?.workerCode;
    
    if (isAboveLeader) {
      return `${leaderName} is leading. Get ${diff} point${diff > 1 ? "s" : ""} to take the lead!`;
    }

    return `${leaderName} is leading. Get ${diff} point${diff > 1 ? "s" : ""} to go ahead of ${above.name || above.workerCode}.`;
  }, [data, leaderboard]);

  const getLocalDayKey = (dateValue: Date | string) => {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const monthValue = String(date.getMonth() + 1).padStart(2, "0");
    const dayValue = String(date.getDate()).padStart(2, "0");
    return `${year}-${monthValue}-${dayValue}`;
  };

  const attendanceByDay = useMemo(() => {
    const daily = new Map<
      string,
      {
        units: number;
        notes: string[];
        projects: Array<{ _id: string; projectId: string; clientName: string; clientAddress: string }>;
      }
    >();

    for (const entry of data?.attendanceEntries || []) {
      const dayKey = getLocalDayKey(entry.date);
      const current = daily.get(dayKey) || { units: 0, notes: [], projects: [] };
      current.units += entry.units;
      if (entry.note?.trim()) {
        current.notes.push(entry.note.trim());
      }
      if (entry.projectId && !current.projects.some((project) => project._id === entry.projectId?._id)) {
        current.projects.push(entry.projectId);
      }
      daily.set(dayKey, current);
    }

    return daily;
  }, [data?.attendanceEntries]);

  const logout = async () => {
    await fetch("/api/worker-auth/logout", { method: "POST" });
    router.push("/worker/login");
  };

  if (loading || !data) return <WorkerPageSkeleton tab={activeTab} />;

  const workerDisplayName = data.worker.name || data.worker.workerCode;
  const workerInitial = workerDisplayName.trim().charAt(0).toUpperCase() || "W";
  const currentMetrics: MonthlyMetrics = {
    netPayable: Math.round(data.summary.netPayable),
    loyaltyValue: Math.max(0, data.loyalty.pointsRupees),
    attendanceUnits: data.summary.totalUnits,
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

        <Dialog open={isWeekPickerOpen} onOpenChange={setIsWeekPickerOpen}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle>Select Week</DialogTitle>
              <DialogDescription>Choose a week to view data.</DialogDescription>
            </DialogHeader>
            <div className="max-h-80 -mx-2 overflow-y-auto divide-y divide-slate-100 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 max-sm:[&::-webkit-scrollbar]:hidden">
              {recentWeeks.map((w) => {
                const pickerActiveWeek = getActiveWeekForTarget(weekPickerTarget);
                const pickerActiveYear = getActiveWeekYearForTarget(weekPickerTarget);
                const isActive = w.isoWeek === pickerActiveWeek && w.isoWeekYear === pickerActiveYear;
                const isCurrent = w.isoWeek === currentISOWeek.isoWeek && w.isoWeekYear === currentISOWeek.isoWeekYear;
                return (
                  <button
                    key={`${w.isoWeekYear}-${w.isoWeek}`}
                    type="button"
                    onClick={() => selectWeek(w.isoWeek, w.isoWeekYear)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors hover:bg-slate-50 ${
                      isActive ? "bg-indigo-50 hover:bg-indigo-50" : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        Week {w.isoWeek}
                        {isCurrent && <span className="ml-1.5 text-[10px] font-normal text-slate-400">(Current)</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(w.start)} – {formatDate(w.end)}, {w.isoWeekYear}
                      </p>
                    </div>
                    {isActive && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedDateInfo} onOpenChange={(open) => !open && setSelectedDateInfo(null)}>
          <DialogContent className="sm:max-w-[320px] p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl">
                {selectedDateInfo?.date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Attendance</h4>
                {selectedDateInfo?.attendance ? (
                  <div className="space-y-1">
                    <p className="flex items-baseline gap-2">
                      <span className={`text-xl font-bold ${
                        selectedDateInfo.attendance!.units >= 1 ? "text-green-600" :
                        selectedDateInfo.attendance!.units > 0 ? "text-amber-500" : "text-red-500"
                      }`}>
                        {selectedDateInfo.attendance!.units}
                      </span>
                      <span className="text-sm font-medium text-slate-600">
                        {selectedDateInfo.attendance!.units >= 1 ? "Hajiri (Present)" :
                         selectedDateInfo.attendance!.units > 0 ? "Hajiri (Half-day)" : "Hajiri (Absent)"}
                      </span>
                    </p>
                    {selectedDateInfo.attendance!.projects.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Projects</p>
                        {selectedDateInfo.attendance!.projects.map((project) => (
                          <p key={project._id} className="text-sm text-slate-600">
                            {project.clientName} · {project.clientAddress}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {selectedDateInfo.attendance!.notes.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</p>
                        {selectedDateInfo.attendance!.notes.map((note, index) => (
                          <p key={`${selectedDateInfo.date.toISOString()}-${index}`} className="text-sm text-slate-500">
                            {note}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Not marked</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Advance</h4>
                {selectedDateInfo?.advance ? (
                  <div className="space-y-1">
                    <p className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-800">
                        Rs. {selectedDateInfo.advance!.amount}
                      </span>
                    </p>
                    {selectedDateInfo.advance!.note && (
                      <p className="text-sm text-slate-500 mt-1">Note: {selectedDateInfo.advance!.note}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No advance</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {isMonthLoading ? <WorkerPageSkeleton tab={activeTab} /> : null}

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
                      <p className="text-[11px] text-slate-500">Total Hajiri</p>
                      <button
                        type="button"
                        onClick={() =>
                          openInfoDialog("Total Hajiri", "Total Hajiri means total attendance units marked in this month.")
                        }
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Hajiri info"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-lg font-semibold">{currentMetrics.attendanceUnits}</p>
                    {getDeltaNode(currentMetrics.attendanceUnits, previousMonthMetrics?.attendanceUnits)}
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
                  <Button variant="outline" className="h-9 rounded-full text-xs" onClick={() => setTabWithUrl("payout")}>
                    Payout
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" className="h-9 rounded-full text-xs" onClick={() => setTabWithUrl("attendance")}>
                    Attendance
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" className="h-9 rounded-full text-xs" onClick={() => setTabWithUrl("leaderboard")}>
                    Leaderboard
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-3 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm">
              <div className="flex items-center justify-between bg-black px-4 py-2.5 text-white">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  <h3 className="text-xl font-semibold tracking-tight">Leaderboard Insight</h3>
                </div>
                <button
                  type="button"
                  onClick={() => openWeekPicker("leaderboard")}
                  className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                >
                  Week {activeWeek}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <CardContent className="px-4 pb-4 pt-1">
                <p className="mb-3 text-[11px] text-slate-400">
                  {formatDate(activeWeekRange.start)} – {formatDate(activeWeekRange.end)}
                </p>
                {leaderboard.length > 0 && (
                  <div className="mb-4 divide-y divide-slate-100">
                    {leaderboard.map((row) => (
                      <div
                        key={`${row.rank}-${row.workerCode}`}
                        className="flex items-center justify-between py-3 px-1"
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-5 shrink-0 text-center text-sm font-semibold text-slate-400">
                            #{row.rank}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                              {(row.name || row.workerCode).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="flex items-center gap-1 text-sm font-medium text-slate-800">
                                {row.name || row.workerCode}
                                {row.workerCode === data.worker.workerCode && (
                                  <span className="text-slate-500 font-normal text-xs">(You)</span>
                                )}
                                {row.rank === 1 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                              </p>
                              <p className="text-xs text-slate-500">Value: Rs. {row.totalRupees}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-indigo-600">{row.totalPoints} pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                  <Lightbulb className="mt-0.5 shrink-0 h-4 w-4 text-emerald-600" />
                  <p>{leaderboardInsight}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!isMonthLoading && activeTab === "payout" ? (
          <div className="space-y-4">
            <Card className="gap-3 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm">
              <div className="flex items-center gap-2 bg-black px-4 py-2.5 text-white">
                <Wallet className="h-5 w-5" />
                <h3 className="text-xl font-semibold tracking-tight">Payout Overview</h3>
              </div>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-3 px-1">
                  <div className="rounded-xl bg-slate-50 p-3 col-span-2">
                    <p className="text-[11px] text-slate-500">Wage & Hajiri</p>
                    <p className="text-lg font-semibold">
                      Rs. {data.worker.dailyWage} × <button type="button" onClick={() => setTabWithUrl("attendance")} className="text-indigo-600 underline underline-offset-2">{data.summary.totalUnits} hajiri</button>
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] text-slate-500">Gross Wage</p>
                    <p className="text-lg font-semibold">Rs. {Math.round(data.summary.grossWage)}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="text-[11px] text-slate-500">Advance Deduction</p>
                    <p className="text-lg font-semibold">Rs. {Math.round(data.summary.totalAdvance)}</p>
                  </div>
                </div>
                <div className="mx-1 mt-3 rounded-xl bg-emerald-50 p-3">
                  <p className="text-[11px] text-slate-500">Net Payable</p>
                  <p className="text-xl font-semibold">Rs. {Math.round(data.summary.netPayable)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-3 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm">
              <div className="flex items-center justify-between bg-black px-4 py-2.5 text-white">
                <div className="flex items-center gap-2">
                  <CalendarCheck2 className="h-5 w-5" />
                  <h3 className="text-xl font-semibold tracking-tight">Weekly Loyalty Payout</h3>
                </div>
                <button
                  type="button"
                  onClick={() => openWeekPicker("payout")}
                  className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                >
                  Week {activePayoutWeek}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <CardContent className="px-4 pb-4 pt-0">
                {(() => {
                  const filteredPayouts = data.loyalty.weeklyPayouts.filter(
                    (w) => w.isoWeek === activePayoutWeek && w.isoWeekYear === activePayoutWeekYear
                  );
                  const weekPayouts = filteredPayouts.length > 0 ? filteredPayouts : [];
                  if (weekPayouts.length === 0) {
                    return (
                      <p className="py-4 text-center text-sm text-slate-500">
                        No payout data for Week {activePayoutWeek}.
                      </p>
                    );
                  }
                  return (
                    <div className="divide-y divide-slate-100">
                      {weekPayouts.map((week) => (
                      <div key={`${week.isoWeekYear}-${week.isoWeek}`} className="py-4 px-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Week {week.isoWeek}</p>
                            <p className="text-[11px] text-slate-400">
                              {new Date(week.weekStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(week.weekEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                              week.payoutStatus === "paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {week.payoutStatus}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="rounded-lg bg-green-50 px-2.5 py-2 text-center">
                            <p className="text-[10px] font-medium text-green-600">Earned</p>
                            <p className="text-sm font-bold text-green-800">+{week.earnedPoints}</p>
                          </div>
                          <div className="rounded-lg bg-red-50 px-2.5 py-2 text-center">
                            <p className="text-[10px] font-medium text-red-600">Deducted</p>
                            <p className="text-sm font-bold text-red-800">-{week.deductedPoints}</p>
                          </div>
                          <div className="rounded-lg bg-indigo-50 px-2.5 py-2 text-center">
                            <p className="text-[10px] font-medium text-indigo-600">Net</p>
                            <p className="text-sm font-bold text-indigo-800">{week.netPoints}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-500">Payout Amount</p>
                          <p className="text-base font-bold text-slate-800">Rs. {week.weeklyPayoutRupees}</p>
                        </div>
                      </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card className="gap-3 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm">
              <div className="flex items-center justify-between bg-black px-4 py-2.5 text-white">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <h3 className="text-xl font-semibold tracking-tight">Points Statement</h3>
                </div>
                <button
                  type="button"
                  onClick={() => openWeekPicker("statement")}
                  className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                >
                  Week {activeStatementWeek}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <CardContent className="px-4 pb-4 pt-1">
                <p className="mb-3 text-[11px] text-slate-400">
                  {formatDate(activeStatementWeekRange.start)} – {formatDate(activeStatementWeekRange.end)}
                </p>
                {(() => {
                  const weekStart = activeStatementWeekRange.start;
                  const weekEnd = activeStatementWeekRange.end;
                  const filtered = sortedLoyaltyEntries.filter((entry) => {
                    const d = new Date(entry.date);
                    return d >= weekStart && d <= weekEnd;
                  });
                  if (filtered.length === 0) {
                    return (
                      <p className="py-4 text-center text-sm text-slate-500">
                        No transactions for Week {activeStatementWeek}.
                      </p>
                    );
                  }
                  return (
                  <div className="divide-y divide-slate-200">
                    {filtered.map((entry) => (
                      <div key={entry._id} className="flex items-start gap-3 py-3.5 px-1">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          entry.entryType === "credit"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}>
                          {entry.entryType === "credit" ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{entry.category}</p>
                              <p className="text-[11px] text-slate-400">
                                {new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            </div>
                            <p className={`shrink-0 text-sm font-bold ${
                              entry.entryType === "credit" ? "text-green-700" : "text-red-600"
                            }`}>
                              {entry.entryType === "credit" ? "+" : ""}{entry.points} pts
                            </p>
                          </div>
                          {entry.reason && (
                            <p className="mt-1 text-xs text-slate-500">{entry.reason}</p>
                          )}
                          {entry.note && (
                            <p className="mt-0.5 text-[11px] text-slate-400 italic">Note: {entry.note}</p>
                          )}
                          {entry.imageUrl && (
                            <a
                              href={entry.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-[11px] font-medium text-blue-600 hover:underline"
                            >
                              View evidence →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!isMonthLoading && activeTab === "attendance" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Total Hajiri</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-slate-800">{data.summary.totalUnits || 0}</p>
                  <span className="text-sm font-medium text-slate-500">units</span>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-xs font-medium text-amber-700">Total Advance</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-sm font-semibold text-amber-600">Rs.</span>
                  <p className="text-2xl font-bold text-amber-800">{data.summary.totalAdvance || 0}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <p className="text-xs font-medium text-emerald-700">Net Payable</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-sm font-semibold text-emerald-600">Rs.</span>
                  <p className="text-2xl font-bold text-emerald-800">{Math.round(data.summary.netPayable) || 0}</p>
                </div>
              </div>
            </div>

            <div className="-mx-1 sm:mx-0 overflow-hidden bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 bg-black px-4 py-2.5 text-white">
                <ClipboardCheck className="h-5 w-5" />
                <h3 className="text-xl font-semibold tracking-tight">Attendance Calendar</h3>
              </div>
              <div className="pb-4 pt-4">
                {(() => {
                  const [yearStr, monthStr] = month.split("-");
                  const year = parseInt(yearStr);
                  const monthIdx = parseInt(monthStr) - 1;

                  const firstDay = new Date(year, monthIdx, 1);
                  const lastDay = new Date(year, monthIdx + 1, 0);
                  const daysInMonth = lastDay.getDate();
                  const startDayOfWeek = firstDay.getDay();

                  const days = [];
                  for (let i = 0; i < startDayOfWeek; i++) {
                    days.push(null);
                  }
                  for (let d = 1; d <= daysInMonth; d++) {
                    days.push(new Date(year, monthIdx, d));
                  }

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  return (
                    <div>
                      <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-50 border-y border-slate-200">
                        <div className="py-2 border-r border-slate-200">Sun</div>
                        <div className="py-2 border-r border-slate-200">Mon</div>
                        <div className="py-2 border-r border-slate-200">Tue</div>
                        <div className="py-2 border-r border-slate-200">Wed</div>
                        <div className="py-2 border-r border-slate-200">Thu</div>
                        <div className="py-2 border-r border-slate-200">Fri</div>
                        <div className="py-2">Sat</div>
                      </div>
                      <div className="grid grid-cols-7 bg-white">
                        {days.map((date, idx) => {
                          const isLastCol = (idx + 1) % 7 === 0;
                          const rightBorder = isLastCol ? "" : "border-r border-slate-200";
                          const bottomBorder = "border-b border-slate-200";
                          
                          if (!date) return <div key={`empty-${idx}`} className={`min-h-[72px] sm:min-h-[84px] bg-slate-50/30 ${rightBorder} ${bottomBorder}`}></div>;

                          const dayKey = getLocalDayKey(date);
                          const attEntry = attendanceByDay.get(dayKey);

                          const advEntry = data.advances.find(e => {
                            const ed = new Date(e.date);
                            return ed.getFullYear() === date.getFullYear() && ed.getMonth() === date.getMonth() && ed.getDate() === date.getDate();
                          });

                          const isToday = date.getTime() === today.getTime();
                          const isFuture = date > today;
                          
                          let statusColor = "bg-white text-slate-600";
                          let label = "";

                          if (attEntry) {
                            if (attEntry.units === 0) {
                              label = "A";
                              statusColor = "bg-red-50 text-red-700";
                            } else {
                              label = `${attEntry.units}H`;
                              statusColor = "bg-green-50 text-green-700";
                            }
                          } else if (isFuture) {
                             statusColor = "bg-slate-50/50 text-slate-300";
                          } else {
                            label = "-";
                            statusColor = "bg-slate-100/50 text-slate-400";
                          }

                          return (
                            <button 
                              type="button"
                              onClick={() => setSelectedDateInfo({ date, attendance: attEntry, advance: advEntry })}
                              key={date.toISOString()} 
                              className={`relative flex flex-col items-center justify-center p-0.5 sm:p-1 min-h-[72px] sm:min-h-[84px] hover:opacity-80 transition-all overflow-hidden ${rightBorder} ${bottomBorder} ${
                                isToday ? 'bg-emerald-100/40 shadow-inner' : statusColor
                              }`}
                            >
                              <span className={`absolute top-1 left-1 sm:left-2 text-[10px] sm:text-[11px] font-medium leading-none ${isToday ? 'text-emerald-800 font-bold' : ''}`}>
                                {date.getDate()}
                              </span>
                              
                              <div className="mt-3 flex flex-col items-center justify-center w-full gap-0.5 sm:gap-1">
                                {label && (
                                   <span className={`text-xs sm:text-sm font-bold leading-none ${isToday && !attEntry ? 'text-emerald-600' : ''}`}>{label}</span>
                                )}
                                {advEntry && (
                                   <span className="mt-0.5 w-[96%] sm:w-[90%] truncate rounded-[4px] bg-amber-100 px-0.5 sm:px-1 py-[2px] sm:py-[3px] text-center text-[9px] sm:text-[10px] font-semibold leading-none text-amber-700 border border-amber-200 tracking-tighter" title={`Advance: Rs. ${advEntry.amount}`}>
                                     ₹{advEntry.amount}
                                   </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 px-4 sm:px-0 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-600 border-t-0 pt-1">
                        <div className="flex items-center gap-1.5 font-medium"><div className="w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200"></div> Present (P)</div>
                        <div className="flex items-center gap-1.5 font-medium"><div className="w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200"></div> Half-day (½)</div>
                        <div className="flex items-center gap-1.5 font-medium"><div className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200"></div> Absent (A)</div>
                        <div className="flex items-center gap-1.5 font-medium"><div className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-200"></div> Not Marked (-)</div>
                        <div className="flex items-center gap-1.5 font-medium"><div className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-200"></div> Advance (₹)</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <Card className="gap-3 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm">
              <div className="flex items-center gap-2 bg-black px-4 py-2.5 text-white">
                <Banknote className="h-5 w-5" />
                <h3 className="text-xl font-semibold tracking-tight">Advance Payments</h3>
              </div>
              <CardContent className="px-4 pb-4 pt-4">
                {data.advances.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No advance payment entries found.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.advances.map((entry) => (
                      <div key={entry._id} className="py-3 px-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800">
                            {new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", weekday: 'short' })}
                          </p>
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-sm font-bold text-amber-700">
                            Rs. {entry.amount}
                          </span>
                        </div>
                        {entry.note ? (
                          <p className="mt-1 text-xs text-slate-500 italic">Note: {entry.note}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!isMonthLoading && activeTab === "leaderboard" ? (
          <div className="space-y-4">
            <Card className="gap-3 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm">
              <div className="flex items-center justify-between bg-black px-4 py-2.5 text-white">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  <h3 className="text-xl font-semibold tracking-tight">Weekly Leaderboard</h3>
                </div>
                <button
                  type="button"
                  onClick={() => openWeekPicker("leaderboard")}
                  className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                >
                  Week {activeWeek}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <CardContent className="px-4 pb-4 pt-1">
                <p className="mb-3 text-[11px] text-slate-400">
                  {formatDate(activeWeekRange.start)} – {formatDate(activeWeekRange.end)}
                </p>
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-slate-500">No leaderboard data yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {leaderboard.map((row) => (
                      <div
                        key={`${row.rank}-${row.workerCode}`}
                        className="flex items-center justify-between py-3 px-1"
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-5 shrink-0 text-center text-sm font-semibold text-slate-400">
                            #{row.rank}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                              {(row.name || row.workerCode).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="flex items-center gap-1 text-sm font-medium text-slate-800">
                                {row.name || row.workerCode}
                                {row.workerCode === data.worker.workerCode && (
                                  <span className="text-slate-500 font-normal text-xs">(You)</span>
                                )}
                                {row.rank === 1 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                              </p>
                              <p className="text-xs text-slate-500">Value: Rs. {row.totalRupees}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-indigo-600">{row.totalPoints} pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                  <Lightbulb className="mt-0.5 shrink-0 h-4 w-4 text-emerald-600" />
                  <p>{leaderboardInsight}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div
          className={`fixed inset-x-0 bottom-0 z-40 transform transition-transform duration-300 ${
            isBottomNavVisible ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto w-full max-w-xl px-3 sm:px-4 lg:w-1/2">
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
    </div>
  );
}
