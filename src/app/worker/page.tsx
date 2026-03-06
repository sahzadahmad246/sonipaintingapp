"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck2, CircleDollarSign, Home, Trophy } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [activeTab, setActiveTab] = useState<WorkerTab>("home");

  const setTabWithUrl = (tab: WorkerTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams?.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const load = async () => {
    try {
      setLoading(true);
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

      const leaderboardRes = await fetch("/api/workers/loyalty/leaderboard?period=weekly");
      const leaderboardJson = await leaderboardRes.json();
      if (leaderboardRes.ok) {
        setLeaderboard(leaderboardJson.leaderboard || []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load worker dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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

  const monthName = useMemo(() => {
    const [year, monthNum] = month.split("-");
    const date = new Date(Number(year), Number(monthNum) - 1, 1);
    return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
  }, [month]);

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

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return null;

  const payoutTotal = Math.round(data.summary.netPayable) + Math.max(0, data.loyalty.pointsRupees);
  const sortedLoyaltyEntries = [...data.loyaltyEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-4 sm:px-4">
      <div className="mx-auto w-full max-w-xl space-y-4 pb-24 lg:w-1/2">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">Worker Dashboard</h1>
              <p className="text-xs text-slate-500">
                {data.worker.name || data.worker.workerCode} | {data.worker.mobile}
              </p>
              <p className="text-xs font-medium text-slate-600">{monthName}</p>
            </div>
            <Button variant="outline" onClick={logout} className="h-8 px-3 text-xs">
              Logout
            </Button>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-2 p-4">
            <label className="text-xs font-medium text-slate-600">Select Month</label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9"
            />
          </CardContent>
        </Card>

        {activeTab === "home" ? (
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Home Summary</CardTitle>
                <CardDescription>Quick snapshot of your wages and points.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Net Wage</p>
                  <p className="text-lg font-semibold">Rs. {Math.round(data.summary.netPayable)}</p>
                </div>
                <div className="rounded-xl bg-indigo-50 p-3">
                  <p className="text-[11px] text-slate-500">Loyalty Value</p>
                  <p className="text-lg font-semibold">Rs. {Math.max(0, data.loyalty.pointsRupees)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-[11px] text-slate-500">Attendance Days</p>
                  <p className="text-lg font-semibold">{data.summary.attendanceDays}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-[11px] text-slate-500">Advances</p>
                  <p className="text-lg font-semibold">Rs. {Math.round(data.summary.totalAdvance)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="h-9 text-xs" onClick={() => setTabWithUrl("payout")}>
                  Payout
                </Button>
                <Button variant="outline" className="h-9 text-xs" onClick={() => setTabWithUrl("attendance")}>
                  Attendance
                </Button>
                <Button variant="outline" className="h-9 text-xs" onClick={() => setTabWithUrl("leaderboard")}>
                  Leaderboard
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Leaderboard Insight</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{leaderboardInsight}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "payout" ? (
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

        {activeTab === "attendance" ? (
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

        {activeTab === "leaderboard" ? (
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

        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
          <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-2 shadow-lg lg:w-1/2">
            <div className="grid grid-cols-4 gap-1">
              <Button
                variant={activeTab === "home" ? "default" : "ghost"}
                className="h-11 flex-col gap-0.5 text-[11px]"
                onClick={() => setTabWithUrl("home")}
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              <Button
                variant={activeTab === "payout" ? "default" : "ghost"}
                className="h-11 flex-col gap-0.5 text-[11px]"
                onClick={() => setTabWithUrl("payout")}
              >
                <CircleDollarSign className="h-4 w-4" />
                Payout
              </Button>
              <Button
                variant={activeTab === "attendance" ? "default" : "ghost"}
                className="h-11 flex-col gap-0.5 text-[11px]"
                onClick={() => setTabWithUrl("attendance")}
              >
                <CalendarCheck2 className="h-4 w-4" />
                Attendance
              </Button>
              <Button
                variant={activeTab === "leaderboard" ? "default" : "ghost"}
                className="h-11 flex-col gap-0.5 text-[11px]"
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
