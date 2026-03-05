"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, CalendarCheck, IndianRupee, Calculator, Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  defaultShiftUnits: number;
  status: "active" | "inactive";
  isProfileCompleted: boolean;
};

type AttendanceEntry = {
  _id: string;
  date: string;
  units: number;
  note?: string;
  workerId: Worker;
};

type AdvanceEntry = {
  _id: string;
  date: string;
  amount: number;
  note?: string;
  workerId: Worker;
};

const TODAY = new Date().toISOString().slice(0, 10);
const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", localLength: 10 },
  { code: "+1", label: "United States (+1)", localLength: 10 },
  { code: "+61", label: "Australia (+61)", localLength: 9 },
  { code: "+44", label: "United Kingdom (+44)", localLength: 10 },
  { code: "+971", label: "UAE (+971)", localLength: 9 },
];

export default function WorkforcePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [advances, setAdvances] = useState<AdvanceEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingWorker, setSavingWorker] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [addWorkerDialogOpen, setAddWorkerDialogOpen] = useState(false);

  const [attendanceFilterDate, setAttendanceFilterDate] = useState(TODAY);
  const [advanceFilterDate, setAdvanceFilterDate] = useState(TODAY);

  const [newWorker, setNewWorker] = useState({
    name: "",
    countryCode: "+91",
    mobileLocal: "",
    dailyWage: "",
    defaultShiftUnits: "1",
    notes: "",
  });

  const [attendanceForm, setAttendanceForm] = useState({
    workerId: "",
    date: TODAY,
    units: "1",
    note: "",
  });

  const [advanceForm, setAdvanceForm] = useState({
    workerId: "",
    date: TODAY,
    amount: "",
    note: "",
  });

  const [selectedWorkerForPayroll, setSelectedWorkerForPayroll] = useState("");
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollSummary, setPayrollSummary] = useState<null | {
    worker: { id: string; name: string; workerCode: string; dailyWage: number };
    summary: {
      totalUnits: number;
      attendanceDays: number;
      grossWage: number;
      totalAdvance: number;
      netPayable: number;
    };
  }>(null);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceEntry | null>(null);
  const [editingAttendanceUnits, setEditingAttendanceUnits] = useState("1");
  const [editingAttendanceNote, setEditingAttendanceNote] = useState("");
  const [attendanceToDelete, setAttendanceToDelete] = useState<AttendanceEntry | null>(null);

  const [editingAdvance, setEditingAdvance] = useState<AdvanceEntry | null>(null);
  const [editingAdvanceAmount, setEditingAdvanceAmount] = useState("");
  const [editingAdvanceNote, setEditingAdvanceNote] = useState("");
  const [advanceToDelete, setAdvanceToDelete] = useState<AdvanceEntry | null>(null);

  const activeWorkers = useMemo(
    () => workers.filter((worker) => worker.status === "active"),
    [workers]
  );
  const selectedWorkerCountry =
    COUNTRY_CODES.find((item) => item.code === newWorker.countryCode) || COUNTRY_CODES[0];
  const newWorkerExpectedLength = selectedWorkerCountry.localLength;
  const isValidNewWorkerMobileLength = newWorker.mobileLocal.length === newWorkerExpectedLength;

  const fetchWorkers = async () => {
    const response = await fetch("/api/workers?status=all");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch workers");

    const fetchedWorkers: Worker[] = data.workers || [];
    setWorkers(fetchedWorkers);

    if (!attendanceForm.workerId && fetchedWorkers.length > 0) {
      const firstActive = fetchedWorkers.find((w) => w.status === "active");
      if (firstActive) {
        setAttendanceForm((prev) => ({ ...prev, workerId: firstActive._id }));
        setAdvanceForm((prev) => ({ ...prev, workerId: firstActive._id }));
        setSelectedWorkerForPayroll(firstActive._id);
      }
    }
  };

  const fetchAttendance = async (date = attendanceFilterDate) => {
    const response = await fetch(`/api/workers/attendance?date=${date}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch attendance");
    setAttendance(data.attendance || []);
  };

  const fetchAdvances = async (date = advanceFilterDate) => {
    const response = await fetch(`/api/workers/advances?date=${date}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch advances");
    setAdvances(data.advances || []);
  };

  const fetchPayrollSummary = async () => {
    if (!selectedWorkerForPayroll) return;

    const response = await fetch(
      `/api/workers/payroll/summary?workerId=${selectedWorkerForPayroll}&month=${payrollMonth}`
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch payroll summary");

    setPayrollSummary({
      worker: data.worker,
      summary: data.summary,
    });
  };

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.role !== "admin") {
      router.push("/");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchWorkers(), fetchAttendance(TODAY), fetchAdvances(TODAY)]);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Failed to load workforce data");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  useEffect(() => {
    fetchAttendance(attendanceFilterDate).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load attendance");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceFilterDate]);

  useEffect(() => {
    fetchAdvances(advanceFilterDate).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load advances");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceFilterDate]);

  useEffect(() => {
    if (!selectedWorkerForPayroll) return;

    fetchPayrollSummary().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load payroll summary");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkerForPayroll, payrollMonth]);

  const addWorker = async () => {
    try {
      if (!isValidNewWorkerMobileLength) {
        throw new Error(`Please enter a valid ${newWorkerExpectedLength}-digit mobile number`);
      }

      setSavingWorker(true);
      const response = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWorker.name,
          mobile: `${newWorker.countryCode}${newWorker.mobileLocal}`,
          dailyWage: Number(newWorker.dailyWage || 0),
          defaultShiftUnits: Number(newWorker.defaultShiftUnits || 1),
          notes: newWorker.notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add worker");

      toast.success("Worker added successfully");
      setNewWorker({
        name: "",
        countryCode: "+91",
        mobileLocal: "",
        dailyWage: "",
        defaultShiftUnits: "1",
        notes: "",
      });
      setAddWorkerDialogOpen(false);
      await fetchWorkers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add worker");
    } finally {
      setSavingWorker(false);
    }
  };

  const markAttendance = async () => {
    try {
      setSavingAttendance(true);
      const response = await fetch("/api/workers/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: attendanceForm.workerId,
          date: attendanceForm.date,
          units: Number(attendanceForm.units),
          note: attendanceForm.note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to mark attendance");

      toast.success("Attendance marked");
      setAttendanceForm((prev) => ({ ...prev, note: "" }));
      await fetchAttendance();
      await fetchPayrollSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark attendance");
    } finally {
      setSavingAttendance(false);
    }
  };

  const addAdvance = async () => {
    try {
      setSavingAdvance(true);
      const response = await fetch("/api/workers/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: advanceForm.workerId,
          date: advanceForm.date,
          amount: Number(advanceForm.amount),
          note: advanceForm.note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add advance");

      toast.success("Advance added");
      setAdvanceForm((prev) => ({ ...prev, amount: "", note: "" }));
      await fetchAdvances();
      await fetchPayrollSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add advance");
    } finally {
      setSavingAdvance(false);
    }
  };

  const toggleWorkerStatus = async (worker: Worker) => {
    try {
      const response = await fetch(`/api/workers/${worker._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: worker.status === "active" ? "inactive" : "active",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update worker");

      toast.success("Worker status updated");
      await fetchWorkers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update worker");
    }
  };

  const openEditAttendanceDialog = (entry: AttendanceEntry) => {
    setEditingAttendance(entry);
    setEditingAttendanceUnits(String(entry.units));
    setEditingAttendanceNote(entry.note || "");
  };

  const updateAttendance = async () => {
    if (!editingAttendance) return;
    const units = Number(editingAttendanceUnits);
    if (![0.5, 1, 1.5, 2].includes(units)) {
      toast.error("Units must be 0.5, 1, 1.5, or 2");
      return;
    }
    try {
      const response = await fetch(`/api/workers/attendance/${editingAttendance._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units, note: editingAttendanceNote }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update attendance");

      toast.success("Attendance updated");
      setEditingAttendance(null);
      await fetchAttendance();
      await fetchPayrollSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update attendance");
    }
  };

  const deleteAttendance = async () => {
    if (!attendanceToDelete) return;
    try {
      const response = await fetch(`/api/workers/attendance/${attendanceToDelete._id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete attendance");

      toast.success("Attendance deleted");
      setAttendanceToDelete(null);
      await fetchAttendance();
      await fetchPayrollSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete attendance");
    }
  };

  const openEditAdvanceDialog = (entry: AdvanceEntry) => {
    setEditingAdvance(entry);
    setEditingAdvanceAmount(String(entry.amount));
    setEditingAdvanceNote(entry.note || "");
  };

  const updateAdvance = async () => {
    if (!editingAdvance) return;
    const amount = Number(editingAdvanceAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    try {
      const response = await fetch(`/api/workers/advances/${editingAdvance._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: editingAdvanceNote }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update advance");

      toast.success("Advance updated");
      setEditingAdvance(null);
      await fetchAdvances();
      await fetchPayrollSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update advance");
    }
  };

  const deleteAdvance = async () => {
    if (!advanceToDelete) return;
    try {
      const response = await fetch(`/api/workers/advances/${advanceToDelete._id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete advance");

      toast.success("Advance deleted");
      setAdvanceToDelete(null);
      await fetchAdvances();
      await fetchPayrollSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete advance");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-slate-700" />
          <p className="text-slate-600 font-medium">Loading workforce data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Workforce Management</h1>
          <p className="text-lg text-slate-600">
            Manage attendance, advances, and payroll for your team
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="workers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6 bg-white border border-slate-200 rounded-lg p-1">
            <TabsTrigger value="workers" className="text-sm sm:text-base">Workers</TabsTrigger>
            <TabsTrigger value="attendance" className="text-sm sm:text-base">Attendance</TabsTrigger>
            <TabsTrigger value="advances" className="text-sm sm:text-base">Advances</TabsTrigger>
            <TabsTrigger value="payroll" className="text-sm sm:text-base">Payroll</TabsTrigger>
          </TabsList>

          {/* Workers Tab */}
          <TabsContent value="workers" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-1">
                    <Users className="h-6 w-6 text-blue-600" />
                    Worker Registry
                  </h2>
                  <p className="text-slate-600">Add and manage worker profiles</p>
                </div>
                <Button onClick={() => setAddWorkerDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  + Add Worker
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">All Workers ({workers.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50">
                      <TableHead className="text-slate-700">Code</TableHead>
                      <TableHead className="text-slate-700">Name</TableHead>
                      <TableHead className="text-slate-700">Mobile</TableHead>
                      <TableHead className="text-slate-700">Daily Wage</TableHead>
                      <TableHead className="text-slate-700">Profile</TableHead>
                      <TableHead className="text-slate-700">Status</TableHead>
                      <TableHead className="text-slate-700">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((worker) => (
                      <TableRow key={worker._id} className="border-slate-200 hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900">{worker.workerCode}</TableCell>
                        <TableCell className="text-slate-700">{worker.name || "-"}</TableCell>
                        <TableCell className="text-slate-700">{worker.mobile}</TableCell>
                        <TableCell className="font-semibold text-slate-900">₹{worker.dailyWage}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            worker.isProfileCompleted 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {worker.isProfileCompleted ? "Complete" : "Pending"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            worker.status === 'active'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {worker.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleWorkerStatus(worker)}
                            className="text-xs"
                          >
                            {worker.status === "active" ? "Deactivate" : "Activate"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-1">
                <CalendarCheck className="h-6 w-6 text-green-600" />
                Mark Attendance
              </h2>
              <p className="text-slate-600 text-sm mb-6">Units: 0.5, 1, 1.5, or 2 per day</p>
              
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label className="text-slate-700 font-medium mb-2 block">Worker</Label>
                  <Select
                    value={attendanceForm.workerId}
                    onValueChange={(value) => setAttendanceForm((p) => ({ ...p, workerId: value }))}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWorkers.map((worker) => (
                        <SelectItem key={worker._id} value={worker._id}>
                          {worker.workerCode} - {worker.name || worker.mobile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 font-medium mb-2 block">Date</Label>
                  <Input
                    type="date"
                    value={attendanceForm.date}
                    onChange={(e) => setAttendanceForm((p) => ({ ...p, date: e.target.value }))}
                    className="border-slate-200"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-medium mb-2 block">Units</Label>
                  <Select
                    value={attendanceForm.units}
                    onValueChange={(value) => setAttendanceForm((p) => ({ ...p, units: value }))}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="1.5">1.5</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label className="text-slate-700 font-medium mb-2 block">Note</Label>
                  <Input
                    value={attendanceForm.note}
                    onChange={(e) => setAttendanceForm((p) => ({ ...p, note: e.target.value }))}
                    placeholder="e.g. Overtime"
                    className="border-slate-200"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Button 
                    onClick={markAttendance} 
                    disabled={savingAttendance || !attendanceForm.workerId}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {savingAttendance ? "Saving..." : "Mark Attendance"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Attendance Log ({attendance.length})</h3>
                  <p className="text-slate-600 text-sm">View and manage attendance records</p>
                </div>
                <div className="w-full sm:w-auto">
                  <Label className="text-slate-700 font-medium text-sm block mb-2">Filter by Date</Label>
                  <Input
                    type="date"
                    value={attendanceFilterDate}
                    onChange={(e) => setAttendanceFilterDate(e.target.value)}
                    className="border-slate-200"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50">
                      <TableHead className="text-slate-700">Worker</TableHead>
                      <TableHead className="text-slate-700">Date</TableHead>
                      <TableHead className="text-slate-700">Units</TableHead>
                      <TableHead className="text-slate-700">Est. Wage</TableHead>
                      <TableHead className="text-slate-700">Note</TableHead>
                      <TableHead className="text-slate-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((entry) => (
                      <TableRow key={entry._id} className="border-slate-200 hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900">{entry.workerId?.name || entry.workerId?.workerCode}</TableCell>
                        <TableCell className="text-slate-700">{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium text-slate-700">{entry.units}</TableCell>
                        <TableCell className="font-semibold text-slate-900">
                          ₹{Math.round((entry.workerId?.dailyWage || 0) * entry.units)}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{entry.note || "-"}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditAttendanceDialog(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setAttendanceToDelete(entry)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Advances Tab */}
          <TabsContent value="advances" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-1">
                <IndianRupee className="h-6 w-6 text-amber-600" />
                Advance Payments
              </h2>
              <p className="text-slate-600 text-sm mb-6">Issue advance payments to workers</p>
              
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label className="text-slate-700 font-medium mb-2 block">Worker</Label>
                  <Select
                    value={advanceForm.workerId}
                    onValueChange={(value) => setAdvanceForm((p) => ({ ...p, workerId: value }))}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWorkers.map((worker) => (
                        <SelectItem key={worker._id} value={worker._id}>
                          {worker.workerCode} - {worker.name || worker.mobile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 font-medium mb-2 block">Date</Label>
                  <Input
                    type="date"
                    value={advanceForm.date}
                    onChange={(e) => setAdvanceForm((p) => ({ ...p, date: e.target.value }))}
                    className="border-slate-200"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-medium mb-2 block">Amount</Label>
                  <Input
                    type="number"
                    min="1"
                    value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="500"
                    className="border-slate-200"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label className="text-slate-700 font-medium mb-2 block">Note</Label>
                  <Input
                    value={advanceForm.note}
                    onChange={(e) => setAdvanceForm((p) => ({ ...p, note: e.target.value }))}
                    placeholder="e.g. Material"
                    className="border-slate-200"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Button 
                    onClick={addAdvance} 
                    disabled={savingAdvance || !advanceForm.workerId}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    {savingAdvance ? "Saving..." : "Add Advance"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Advance Log ({advances.length})</h3>
                  <p className="text-slate-600 text-sm">Manage advance payments</p>
                </div>
                <div className="w-full sm:w-auto">
                  <Label className="text-slate-700 font-medium text-sm block mb-2">Filter by Date</Label>
                  <Input
                    type="date"
                    value={advanceFilterDate}
                    onChange={(e) => setAdvanceFilterDate(e.target.value)}
                    className="border-slate-200"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50">
                      <TableHead className="text-slate-700">Worker</TableHead>
                      <TableHead className="text-slate-700">Date</TableHead>
                      <TableHead className="text-slate-700">Amount</TableHead>
                      <TableHead className="text-slate-700">Note</TableHead>
                      <TableHead className="text-slate-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.map((entry) => (
                      <TableRow key={entry._id} className="border-slate-200 hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900">{entry.workerId?.name || entry.workerId?.workerCode}</TableCell>
                        <TableCell className="text-slate-700">{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold text-slate-900">₹{entry.amount}</TableCell>
                        <TableCell className="text-slate-600 text-sm">{entry.note || "-"}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditAdvanceDialog(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setAdvanceToDelete(entry)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-1">
                <Calculator className="h-6 w-6 text-purple-600" />
                Payroll Summary
              </h2>
              <p className="text-slate-600 text-sm mb-6">Net = (Units × Daily Wage) − Advances</p>
              
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <Label className="text-slate-700 font-medium mb-2 block">Worker</Label>
                  <Select value={selectedWorkerForPayroll} onValueChange={setSelectedWorkerForPayroll}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWorkers.map((worker) => (
                        <SelectItem key={worker._id} value={worker._id}>
                          {worker.workerCode} - {worker.name || worker.mobile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 font-medium mb-2 block">Month</Label>
                  <Input
                    type="month"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="border-slate-200"
                  />
                </div>
              </div>
            </div>

            {payrollSummary && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-xl font-bold text-slate-900">
                    {payrollSummary.worker.name || "Worker"} ({payrollSummary.worker.workerCode})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-6">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm font-medium text-blue-600 mb-1">Daily Wage</p>
                    <p className="text-2xl font-bold text-blue-900">₹{payrollSummary.worker.dailyWage}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm font-medium text-green-600 mb-1">Total Units</p>
                    <p className="text-2xl font-bold text-green-900">{payrollSummary.summary.totalUnits}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm font-medium text-yellow-600 mb-1">Days Present</p>
                    <p className="text-2xl font-bold text-yellow-900">{payrollSummary.summary.attendanceDays}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm font-medium text-purple-600 mb-1">Gross Wage</p>
                    <p className="text-2xl font-bold text-purple-900">₹{Math.round(payrollSummary.summary.grossWage)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                    <p className="text-sm font-medium text-emerald-600 mb-1">Net Payable</p>
                    <p className="text-2xl font-bold text-emerald-900">₹{Math.round(payrollSummary.summary.netPayable)}</p>
                  </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Total Advances Deducted:</span>
                    <span className="font-bold text-slate-900">₹{payrollSummary.summary.totalAdvance}</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

      <Dialog open={addWorkerDialogOpen} onOpenChange={setAddWorkerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Worker</DialogTitle>
            <DialogDescription>
              Create an active worker profile for OTP login and attendance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name (optional at registration)</Label>
              <Input
                value={newWorker.name}
                onChange={(e) => setNewWorker((p) => ({ ...p, name: e.target.value }))}
                placeholder="Worker name"
              />
            </div>
            <div>
              <Label>Mobile *</Label>
              <div className="grid grid-cols-[130px_1fr] gap-2">
                <Select
                  value={newWorker.countryCode}
                  onValueChange={(value) => {
                    const next = COUNTRY_CODES.find((item) => item.code === value);
                    setNewWorker((p) => ({
                      ...p,
                      countryCode: value,
                      mobileLocal: next ? p.mobileLocal.slice(0, next.localLength) : p.mobileLocal,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={newWorker.mobileLocal}
                  onChange={(e) =>
                    setNewWorker((p) => ({
                      ...p,
                      mobileLocal: e.target.value.replace(/\D/g, "").slice(0, newWorkerExpectedLength),
                    }))
                  }
                  maxLength={newWorkerExpectedLength}
                  placeholder="Mobile number"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter {newWorkerExpectedLength} digits for {selectedWorkerCountry.label.split(" (")[0]}.
              </p>
            </div>
            <div>
              <Label>Daily Wage *</Label>
              <Input
                type="number"
                min="0"
                value={newWorker.dailyWage}
                onChange={(e) => setNewWorker((p) => ({ ...p, dailyWage: e.target.value }))}
                placeholder="800"
              />
            </div>
            <div>
              <Label>Default Units</Label>
              <Select
                value={newWorker.defaultShiftUnits}
                onValueChange={(value) => setNewWorker((p) => ({ ...p, defaultShiftUnits: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="1.5">1.5</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newWorker.notes}
                onChange={(e) => setNewWorker((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any instructions"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddWorkerDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={addWorker}
              disabled={savingWorker || !isValidNewWorkerMobileLength || !newWorker.dailyWage}
            >
              {savingWorker ? "Saving..." : "Add Worker"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAttendance} onOpenChange={(open) => !open && setEditingAttendance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
            <DialogDescription>
              Update attendance units and note for {editingAttendance?.workerId?.name || editingAttendance?.workerId?.workerCode}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Units</Label>
              <Select value={editingAttendanceUnits} onValueChange={setEditingAttendanceUnits}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="1.5">1.5</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Input
                value={editingAttendanceNote}
                onChange={(e) => setEditingAttendanceNote(e.target.value)}
                placeholder="Optional note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAttendance(null)}>Cancel</Button>
            <Button onClick={updateAttendance}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAdvance} onOpenChange={(open) => !open && setEditingAdvance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Advance</DialogTitle>
            <DialogDescription>
              Update advance amount and note for {editingAdvance?.workerId?.name || editingAdvance?.workerId?.workerCode}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min="1"
                value={editingAdvanceAmount}
                onChange={(e) => setEditingAdvanceAmount(e.target.value)}
                placeholder="Amount"
              />
            </div>
            <div>
              <Label>Note</Label>
              <Input
                value={editingAdvanceNote}
                onChange={(e) => setEditingAdvanceNote(e.target.value)}
                placeholder="Optional note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAdvance(null)}>Cancel</Button>
            <Button onClick={updateAdvance}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!attendanceToDelete} onOpenChange={(open) => !open && setAttendanceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected attendance entry will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAttendance}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!advanceToDelete} onOpenChange={(open) => !open && setAdvanceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advance Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected advance entry will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAdvance}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
