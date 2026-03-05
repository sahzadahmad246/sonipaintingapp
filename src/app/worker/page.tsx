"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  attendanceEntries: Array<{ _id: string; date: string; units: number; note?: string }>;
  advances: Array<{ _id: string; date: string; amount: number; note?: string }>;
};

export default function WorkerDashboardPage() {
  const router = useRouter();

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

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

  const monthName = useMemo(() => {
    const [year, monthNum] = month.split("-");
    const date = new Date(Number(year), Number(monthNum) - 1, 1);
    return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
  }, [month]);

  const logout = async () => {
    await fetch("/api/worker-auth/logout", { method: "POST" });
    router.push("/worker/login");
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4 md:p-6">
      <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Worker Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {data.worker.name || data.worker.workerCode} | {data.worker.mobile}
          </p>
        </div>
        <Button variant="outline" onClick={logout} className="w-full sm:w-auto">
          Logout
        </Button>
      </div>

      <Card className="border-orange-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>{monthName} Summary</CardTitle>
          <CardDescription>Track your attendance, advances, and payable amount.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <label className="text-sm font-medium">Select Month</label>
            <Input
              type="month"
              className="mt-1"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-lg bg-orange-50 p-3">
              <p className="text-xs text-muted-foreground">Daily Wage</p>
              <p className="text-lg font-semibold">Rs. {data.worker.dailyWage}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3">
              <p className="text-xs text-muted-foreground">Total Units</p>
              <p className="text-lg font-semibold">{data.summary.totalUnits}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3">
              <p className="text-xs text-muted-foreground">Gross</p>
              <p className="text-lg font-semibold">Rs. {Math.round(data.summary.grossWage)}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3">
              <p className="text-xs text-muted-foreground">Advance</p>
              <p className="text-lg font-semibold">Rs. {Math.round(data.summary.totalAdvance)}</p>
            </div>
            <div className="rounded-lg bg-orange-100 p-3">
              <p className="text-xs text-muted-foreground">Net Payable</p>
              <p className="text-lg font-semibold">Rs. {Math.round(data.summary.netPayable)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>Attendance Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.attendanceEntries.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                  <TableCell>{entry.units}</TableCell>
                  <TableCell>{entry.note || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-orange-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>Advance Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.advances.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                  <TableCell>Rs. {entry.amount}</TableCell>
                  <TableCell>{entry.note || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
