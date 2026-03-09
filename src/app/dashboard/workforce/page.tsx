"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, Loader2, Pencil, Trash2, ArrowLeft, ChevronLeft, ChevronRight, Plus, MoreVertical, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type LoyaltyEntryType = "credit" | "debit";
type LoyaltyHistoryEntry = {
  _id: string;
  date: string;
  entryType: LoyaltyEntryType;
  points: number;
  category: string;
  reason: string;
  note?: string;
  imageUrl?: string;
  workerId: { workerCode: string; name: string; mobile: string };
  isReversal?: boolean;
};

type LoyaltyLeaderboardEntry = {
  rank: number;
  workerCode: string;
  name: string;
  totalPoints: number;
  totalRupees: number;
};

const TODAY = new Date().toISOString().slice(0, 10);
const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", localLength: 10 },
  { code: "+1", label: "United States (+1)", localLength: 10 },
  { code: "+61", label: "Australia (+61)", localLength: 9 },
  { code: "+44", label: "United Kingdom (+44)", localLength: 10 },
  { code: "+971", label: "UAE (+971)", localLength: 9 },
];

const LOYALTY_CREDIT_CATEGORIES = [
  { value: "on_time", label: "On Time" },
  { value: "attendance_consistency", label: "Attendance Consistency" },
  { value: "quality_work", label: "Quality Work" },
  { value: "zero_rework_day", label: "Zero Rework Day" },
  { value: "productivity_target_met", label: "Productivity Target Met" },
  { value: "ahead_of_schedule", label: "Ahead Of Schedule" },
  { value: "customer_praise", label: "Customer Praise" },
  { value: "site_cleanliness", label: "Site Cleanliness" },
  { value: "material_saving", label: "Material Saving" },
  { value: "tool_care", label: "Tool Care" },
  { value: "safety_followed", label: "Safety Followed" },
  { value: "team_support", label: "Team Support" },
  { value: "issue_reporting", label: "Issue Reporting" },
  { value: "professional_behavior", label: "Professional Behavior" },
  { value: "documentation_support", label: "Documentation Support" },
];

const LOYALTY_DEBIT_CATEGORIES = [
  { value: "late_arrival", label: "Late Arrival" },
  { value: "unauthorized_absence", label: "Unauthorized Absence" },
  { value: "early_leave_without_approval", label: "Early Leave Without Approval" },
  { value: "customer_complaint", label: "Customer Complaint" },
  { value: "rework_needed", label: "Rework Needed" },
  { value: "damage_to_work", label: "Damage To Work" },
  { value: "material_wastage", label: "Material Wastage" },
  { value: "unsafe_practice", label: "Unsafe Practice" },
  { value: "site_mess", label: "Site Mess" },
  { value: "tool_damage_or_loss", label: "Tool Damage Or Loss" },
  { value: "instruction_non_compliance", label: "Instruction Non Compliance" },
  { value: "misconduct", label: "Misconduct" },
  { value: "mobile_misuse", label: "Mobile Misuse" },
  { value: "false_update", label: "False Update" },
  { value: "delay_caused_to_team", label: "Delay Caused To Team" },
];

export default function WorkforcePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <WorkforcePageContent />
    </Suspense>
  );
}

function WorkforcePageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const validTab = initialTab === "workers" || initialTab === "attendance" || initialTab === "advances" || initialTab === "payroll"
    ? initialTab
    : "workers";
  const activeTab = validTab as "workers" | "attendance" | "advances" | "payroll";

  const setTabInUrl = (tab: "workers" | "attendance" | "advances" | "payroll") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const chipScrollRef = useRef<HTMLDivElement>(null);
  const attendanceDateInputRef = useRef<HTMLInputElement>(null);
  const advanceDateInputRef = useRef<HTMLInputElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollArrows = useCallback(() => {
    const el = chipScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollArrows();
    const el = chipScrollRef.current;
    if (el) {
      el.addEventListener("scroll", updateScrollArrows, { passive: true });
      window.addEventListener("resize", updateScrollArrows);
    }
    return () => {
      el?.removeEventListener("scroll", updateScrollArrows);
      window.removeEventListener("resize", updateScrollArrows);
    };
  }, [updateScrollArrows]);

  const scrollChips = (direction: "left" | "right") => {
    const el = chipScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -120 : 120, behavior: "smooth" });
  };

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [advances, setAdvances] = useState<AdvanceEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingWorker, setSavingWorker] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [addWorkerDialogOpen, setAddWorkerDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

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
  }>(null);
  const [savingLoyalty, setSavingLoyalty] = useState(false);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyHistoryEntry[]>([]);
  const [loyaltyLeaderboard, setLoyaltyLeaderboard] = useState<LoyaltyLeaderboardEntry[]>([]);
  const [reversingEntryId, setReversingEntryId] = useState("");
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [reverseTargetEntry, setReverseTargetEntry] = useState<LoyaltyHistoryEntry | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [updatingPayoutKey, setUpdatingPayoutKey] = useState("");
  const [loyaltyForm, setLoyaltyForm] = useState({
    date: TODAY,
    entryType: "credit" as LoyaltyEntryType,
    points: "",
    category: LOYALTY_CREDIT_CATEGORIES[0].value,
    reason: "",
    note: "",
    imageUrl: "",
  });
  const [uploadingLoyaltyImage, setUploadingLoyaltyImage] = useState(false);
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
  const loyaltyCategoryOptions =
    loyaltyForm.entryType === "credit" ? LOYALTY_CREDIT_CATEGORIES : LOYALTY_DEBIT_CATEGORIES;

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
      loyalty: data.loyalty,
    });
  };

  const getMonthDateRange = (monthValue: string) => {
    const [yearStr, monthStr] = monthValue.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const start = new Date(year, month - 1, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month, 0);
    end.setHours(23, 59, 59, 999);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  };

  const fetchLoyaltyHistory = async () => {
    if (!selectedWorkerForPayroll) return;
    const { startDate, endDate } = getMonthDateRange(payrollMonth);
    const response = await fetch(
      `/api/workers/loyalty?workerId=${selectedWorkerForPayroll}&startDate=${startDate}&endDate=${endDate}`
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch loyalty history");
    setLoyaltyHistory(data.entries || []);
  };

  const fetchLoyaltyLeaderboard = async () => {
    const response = await fetch("/api/workers/loyalty/leaderboard?period=weekly");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch loyalty leaderboard");
    setLoyaltyLeaderboard(data.leaderboard || []);
  };

  const addLoyaltyEntry = async () => {
    if (!selectedWorkerForPayroll) return;
    try {
      setSavingLoyalty(true);
      const response = await fetch("/api/workers/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: selectedWorkerForPayroll,
          date: loyaltyForm.date,
          entryType: loyaltyForm.entryType,
          points: Number(loyaltyForm.points),
          category: loyaltyForm.category,
          reason: loyaltyForm.reason,
          note: loyaltyForm.note,
          imageUrl: loyaltyForm.imageUrl || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save loyalty points");

      toast.success("Loyalty points updated");
      setLoyaltyForm((prev) => ({ ...prev, points: "", reason: "", note: "", imageUrl: "" }));
      await fetchPayrollSummary();
      await fetchLoyaltyHistory();
      await fetchLoyaltyLeaderboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save loyalty points");
    } finally {
      setSavingLoyalty(false);
    }
  };

  const uploadLoyaltyEvidence = async (file: File) => {
    try {
      setUploadingLoyaltyImage(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "loyalty/evidence");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      if (!data?.secure_url) {
        throw new Error("Cloudinary upload did not return a secure URL");
      }

      setLoyaltyForm((prev) => ({ ...prev, imageUrl: data.secure_url }));
      toast.success("Evidence image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingLoyaltyImage(false);
    }
  };

  const openReverseLoyaltyDialog = (entry: LoyaltyHistoryEntry) => {
    setReverseTargetEntry(entry);
    setReverseReason("");
    setReverseDialogOpen(true);
  };

  const reverseLoyaltyEntry = async () => {
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to reverse loyalty entry");
      toast.success("Loyalty entry reversed");
      setReverseDialogOpen(false);
      setReverseTargetEntry(null);
      setReverseReason("");
      await fetchPayrollSummary();
      await fetchLoyaltyHistory();
      await fetchLoyaltyLeaderboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reverse loyalty entry");
    } finally {
      setReversingEntryId("");
    }
  };

  const updateWeeklyPayoutStatus = async (
    isoWeekYear: number,
    isoWeek: number,
    status: "pending" | "paid"
  ) => {
    if (!selectedWorkerForPayroll) return;
    const key = `${isoWeekYear}-${isoWeek}`;
    try {
      setUpdatingPayoutKey(key);
      const response = await fetch("/api/workers/loyalty/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: selectedWorkerForPayroll,
          isoWeekYear,
          isoWeek,
          status,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update payout status");
      toast.success(`Weekly payout marked as ${status}`);
      await fetchPayrollSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update payout status");
    } finally {
      setUpdatingPayoutKey("");
    }
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
    fetchLoyaltyHistory().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load loyalty history");
    });
    fetchLoyaltyLeaderboard().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load loyalty leaderboard");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkerForPayroll, payrollMonth]);

  useEffect(() => {
    const categories = loyaltyForm.entryType === "credit" ? LOYALTY_CREDIT_CATEGORIES : LOYALTY_DEBIT_CATEGORIES;
    setLoyaltyForm((prev) => {
      const exists = categories.some((item) => item.value === prev.category);
      if (exists) return prev;
      return { ...prev, category: categories[0].value };
    });
  }, [loyaltyForm.entryType]);

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
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pt-2 pb-4 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Workforce</h1>
            <button
              onClick={() => {
                if (activeTab === "workers") setAddWorkerDialogOpen(true);
                else setFormDialogOpen(true);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
              aria-label="Add new"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Chips with Scroll Arrows */}
        <div className="relative mb-5">
          {canScrollLeft && (
            <button
              onClick={() => scrollChips("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
          )}
          <div
            ref={chipScrollRef}
            className="flex w-full overflow-x-auto gap-2 pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ paddingLeft: canScrollLeft ? 32 : 0, paddingRight: canScrollRight ? 32 : 0 }}
          >
            {[
              { id: "workers", label: "Workers" },
              { id: "attendance", label: "Attendance" },
              { id: "advances", label: "Advances" },
              { id: "payroll", label: "Payroll" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabInUrl(tab.id as "workers" | "attendance" | "advances" | "payroll")}
                className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {canScrollRight && (
            <button
              onClick={() => scrollChips("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          )}
        </div>

        {/* Tab Content Areas */}
        <div className="w-full">

          {activeTab === "workers" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-sm text-slate-500 mb-3">{workers.length} workers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {workers.map((worker) => (
                  <div
                    key={worker._id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow relative"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                        worker.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {(worker.name || worker.workerCode).charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-slate-900 truncate">
                            {worker.name || "Unnamed"}
                          </h3>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            worker.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {worker.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">{worker.workerCode} · {worker.mobile}</p>
                        
                        {/* Wage and Profile Info directly under name */}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">Wage</p>
                            <p className="text-sm font-bold text-slate-900">₹{worker.dailyWage}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">Profile</p>
                            <span className={`text-sm font-medium ${
                              worker.isProfileCompleted ? 'text-green-600' : 'text-amber-600'
                            }`}>
                              {worker.isProfileCompleted ? "Complete" : "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Three-dot menu top right */}
                    <div className="absolute top-4 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleWorkerStatus(worker)}>
                            {worker.status === "active" ? "Deactivate Worker" : "Activate Worker"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === "attendance" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                
                {/* Black Header */}
                <div className="bg-slate-900 px-4 py-3 sm:px-6 sm:py-4 flex flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Logs</h3>
                    <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full ml-2">
                      {attendance.length}
                    </span>
                  </div>
                  <div className="relative flex items-center bg-slate-800 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-700 transition-colors">
                    <span className="text-white text-sm font-medium">
                      {new Date(attendanceFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 text-slate-400" />
                    <input
                      ref={attendanceDateInputRef}
                      type="date"
                      value={attendanceFilterDate}
                      onChange={(e) => setAttendanceFilterDate(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker()}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>

                {/* List Body */}
                <div className="divide-y divide-slate-100">
                  {attendance.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      No attendance records found for this date.
                    </div>
                  ) : (
                    attendance.map((entry) => (
                      <div key={entry._id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors relative group">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          {/* Worker Details (Left) */}
                          <div className="flex items-start gap-3 flex-1 min-w-0 pr-8">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                              {(entry.workerId?.name || entry.workerId?.workerCode || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-slate-900 truncate">
                                {entry.workerId?.name || "Unnamed Worker"}
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {entry.workerId?.workerCode || "No Code"}
                              </p>
                              
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-medium border border-blue-100">
                                  {entry.units} {entry.units > 1 ? 'Units' : 'Unit'}
                                </span>
                                <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-md font-medium border border-green-100">
                                  Est. Wage: ₹{Math.round((entry.workerId?.dailyWage || 0) * entry.units)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right Side Info */}
                          <div className="flex flex-col sm:items-end sm:justify-start">
                            {entry.note ? (
                              <p className="text-xs text-slate-600 line-clamp-2 sm:text-right max-w-[200px] mt-1 sm:mt-0 italic">
                                &quot;{entry.note}&quot;
                              </p>
                            ) : null}
                          </div>

                          {/* 3-dot Actions Menu (Top Right) */}
                          <div className="absolute top-4 right-4 sm:top-5 sm:right-5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 focus:opacity-100 data-[state=open]:opacity-100">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditAttendanceDialog(entry)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAttendanceToDelete(entry)} className="text-red-600 focus:text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Advances Tab */}
          {activeTab === "advances" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                
                {/* Black Header */}
                <div className="bg-slate-900 px-4 py-3 sm:px-6 sm:py-4 flex flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Advances</h3>
                    <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full ml-2">
                      {advances.length}
                    </span>
                  </div>
                  <div className="relative flex items-center bg-slate-800 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-700 transition-colors">
                    <span className="text-white text-sm font-medium">
                      {new Date(advanceFilterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 text-slate-400" />
                    <input
                      ref={advanceDateInputRef}
                      type="date"
                      value={advanceFilterDate}
                      onChange={(e) => setAdvanceFilterDate(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker()}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>

                {/* List Body */}
                <div className="divide-y divide-slate-100">
                  {advances.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      No advance records found for this date.
                    </div>
                  ) : (
                    advances.map((entry) => (
                      <div key={entry._id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors relative group">
                        <div className="flex items-start gap-3 pr-8">
                          {/* Avatar */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 font-bold text-sm">
                            {(entry.workerId?.name || entry.workerId?.workerCode || "?").charAt(0).toUpperCase()}
                          </div>
                          
                          {/* Info Section */}
                          <div className="min-w-0 flex-1">
                            {/* Name and Amount on same line */}
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-semibold text-slate-900 truncate">
                                {entry.workerId?.name || "Unnamed Worker"}
                              </h4>
                              <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-md font-medium border border-green-100 text-xs shrink-0">
                                ₹{entry.amount}
                              </span>
                            </div>
                            
                            {/* Worker ID */}
                            <p className="text-xs text-slate-500 mt-0.5">
                              {entry.workerId?.workerCode || "No Code"}
                            </p>

                            {/* Note below Worker ID */}
                            {entry.note ? (
                              <p className="text-xs text-slate-600 mt-2 italic">
                                &quot;{entry.note}&quot;
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* 3-dot Actions Menu (Top Right) */}
                        <div className="absolute top-4 right-4 sm:top-5 sm:right-5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 focus:opacity-100 data-[state=open]:opacity-100">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditAdvanceDialog(entry)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAdvanceToDelete(entry)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payroll Tab */}
          {activeTab === "payroll" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Filters Card */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-900 px-4 py-3 sm:px-6 sm:py-4">
                  <h3 className="text-lg font-semibold text-white">Payroll</h3>
                </div>
                <div className="p-4 sm:p-6 grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label className="text-slate-700 font-medium mb-1.5 block text-sm">Worker</Label>
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
                    <Label className="text-slate-700 font-medium mb-1.5 block text-sm">Month</Label>
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
              <>
                {/* Worker Summary Card */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-900 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="text-lg font-semibold text-white">
                      {payrollSummary.worker.name || "Worker"} ({payrollSummary.worker.workerCode})
                    </h3>
                  </div>
                  <div className="p-4 sm:p-6 grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-xs font-medium text-blue-600 mb-1">Daily Wage</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900">₹{payrollSummary.worker.dailyWage}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="text-xs font-medium text-green-600 mb-1">Total Units</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-900">{payrollSummary.summary.totalUnits}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <p className="text-xs font-medium text-yellow-600 mb-1">Days Present</p>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-900">{payrollSummary.summary.attendanceDays}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-xs font-medium text-purple-600 mb-1">Gross Wage</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-900">₹{Math.round(payrollSummary.summary.grossWage)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <p className="text-xs font-medium text-red-600 mb-1">Advances Deducted</p>
                      <p className="text-xl sm:text-2xl font-bold text-red-900">₹{payrollSummary.summary.totalAdvance}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <p className="text-xs font-medium text-emerald-600 mb-1">Net Payable</p>
                      <p className="text-xl sm:text-2xl font-bold text-emerald-900">₹{Math.round(payrollSummary.summary.netPayable)}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <p className="text-xs font-medium text-indigo-600 mb-1">Net Points</p>
                      <p className="text-xl sm:text-2xl font-bold text-indigo-900">{payrollSummary.loyalty.totalPoints}</p>
                    </div>
                    <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                      <p className="text-xs font-medium text-cyan-700 mb-1">Points Value</p>
                      <p className="text-xl sm:text-2xl font-bold text-cyan-900">₹{payrollSummary.loyalty.pointsRupees}</p>
                    </div>
                  </div>
                </div>

                {/* Weekly Loyalty Payouts Card */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-900 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="text-lg font-semibold text-white">Weekly Loyalty Payouts</h3>
                  </div>
                  <div className="p-4 sm:p-6">
                    {payrollSummary.loyalty.weeklyPayouts.length === 0 ? (
                      <div className="text-center text-slate-500 py-8">
                        No loyalty entries for this month
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {payrollSummary.loyalty.weeklyPayouts.map((week) => (
                          <div key={`${week.isoWeekYear}-${week.isoWeek}`} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900">
                                  Week {week.isoWeek} ({new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(week.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                                </p>
                                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  <div>
                                    <span className="text-slate-600">Earned:</span>
                                    <p className="font-semibold text-slate-900">{week.earnedPoints}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Deducted:</span>
                                    <p className="font-semibold text-slate-900">{week.deductedPoints}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Net:</span>
                                    <p className="font-semibold text-slate-900">{week.netPoints}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Payout:</span>
                                    <p className="font-semibold text-slate-900">₹{week.weeklyPayoutRupees}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                                <span className={`rounded px-2 py-1 text-xs font-medium whitespace-nowrap ${
                                  week.payoutStatus === "paid"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}>
                                  {week.payoutStatus}
                                </span>
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
                                  className="text-xs"
                                >
                                  {week.payoutStatus === "paid" ? "Pending" : "Paid"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Loyalty History Card */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-900 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="text-lg font-semibold text-white">Loyalty History</h3>
                  </div>
                  <div className="p-4 sm:p-6">
                    {loyaltyHistory.length === 0 ? (
                      <div className="text-center text-slate-500 py-8">
                        No loyalty entries for this month
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {loyaltyHistory.map((entry) => (
                          <div key={entry._id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                                    entry.entryType === "credit"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}>
                                    {entry.entryType === "credit" ? "+" : "-"}{entry.points}
                                  </span>
                                </div>
                                <div className="text-xs space-y-0.5">
                                  <p><span className="text-slate-600">Category:</span> <span className="font-medium text-slate-900">{entry.category}</span></p>
                                  <p><span className="text-slate-600">Reason:</span> <span className="font-medium text-slate-900">{entry.reason}</span></p>
                                  {entry.imageUrl && (
                                    <p><span className="text-slate-600">Evidence:</span> <a href={entry.imageUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">View</a></p>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                  reversingEntryId === entry._id ||
                                  entry.isReversal ||
                                  entry.category === "reversal"
                                }
                                onClick={() => openReverseLoyaltyDialog(entry)}
                                className="text-xs"
                              >
                                Reverse
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Weekly Leaderboard Card */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-900 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="text-lg font-semibold text-white">Weekly Leaderboard</h3>
                  </div>
                  <div className="p-4 sm:p-6">
                    {loyaltyLeaderboard.length === 0 ? (
                      <div className="text-center text-slate-500 py-8">
                        No leaderboard data yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {loyaltyLeaderboard.map((row) => (
                          <div key={`${row.rank}-${row.workerCode}`} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-sm">
                                    #{row.rank}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{row.name || row.workerCode}</p>
                                    <p className="text-xs text-slate-600">{row.workerCode}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right text-xs">
                                <p className="text-slate-600">Points</p>
                                <p className="font-semibold text-slate-900">{row.totalPoints}</p>
                              </div>
                              <div className="text-right text-xs ml-4">
                                <p className="text-slate-600">Value</p>
                                <p className="font-semibold text-slate-900">₹{row.totalRupees}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            </div>
          )}
        </div>

      {/* Context-Aware Form Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeTab === "attendance" && "Mark Attendance"}
              {activeTab === "advances" && "Add Advance"}
              {activeTab === "payroll" && "Add Loyalty Points"}
            </DialogTitle>
            <DialogDescription>
              {activeTab === "attendance" && "Record attendance for a worker."}
              {activeTab === "advances" && "Issue an advance payment."}
              {activeTab === "payroll" && "Credit or debit loyalty points."}
            </DialogDescription>
          </DialogHeader>

          {/* Attendance Form */}
          {activeTab === "attendance" && (
            <div className="grid gap-4">
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Worker</Label>
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
                <Label className="text-slate-700 font-medium mb-1.5 block">Date</Label>
                <Input
                  type="date"
                  value={attendanceForm.date}
                  onChange={(e) => setAttendanceForm((p) => ({ ...p, date: e.target.value }))}
                  className="border-slate-200"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Units</Label>
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
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Note</Label>
                <Input
                  value={attendanceForm.note}
                  onChange={(e) => setAttendanceForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="e.g. Overtime"
                  className="border-slate-200"
                />
              </div>
              <Button
                onClick={() => { markAttendance(); setFormDialogOpen(false); }}
                disabled={savingAttendance || !attendanceForm.workerId}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {savingAttendance ? "Saving..." : "Mark Attendance"}
              </Button>
            </div>
          )}

          {/* Advance Form */}
          {activeTab === "advances" && (
            <div className="grid gap-4">
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Worker</Label>
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
                <Label className="text-slate-700 font-medium mb-1.5 block">Date</Label>
                <Input
                  type="date"
                  value={advanceForm.date}
                  onChange={(e) => setAdvanceForm((p) => ({ ...p, date: e.target.value }))}
                  className="border-slate-200"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Amount</Label>
                <Input
                  type="number"
                  min="1"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="500"
                  className="border-slate-200"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Note</Label>
                <Input
                  value={advanceForm.note}
                  onChange={(e) => setAdvanceForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="e.g. Material"
                  className="border-slate-200"
                />
              </div>
              <Button
                onClick={() => { addAdvance(); setFormDialogOpen(false); }}
                disabled={savingAdvance || !advanceForm.workerId}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                {savingAdvance ? "Saving..." : "Add Advance"}
              </Button>
            </div>
          )}

          {/* Loyalty Points Form */}
          {activeTab === "payroll" && (
            <div className="grid gap-4">
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Worker</Label>
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
                <Label className="text-slate-700 font-medium mb-1.5 block">Date</Label>
                <Input
                  type="date"
                  value={loyaltyForm.date}
                  onChange={(e) => setLoyaltyForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-medium mb-1.5 block">Type</Label>
                  <Select
                    value={loyaltyForm.entryType}
                    onValueChange={(value: LoyaltyEntryType) =>
                      setLoyaltyForm((prev) => ({ ...prev, entryType: value }))
                    }
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit (+)</SelectItem>
                      <SelectItem value="debit">Debit (-)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 font-medium mb-1.5 block">Points</Label>
                  <Input
                    type="number"
                    min="1"
                    value={loyaltyForm.points}
                    onChange={(e) => setLoyaltyForm((prev) => ({ ...prev, points: e.target.value }))}
                    placeholder="10"
                    className="border-slate-200"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Category</Label>
                <Select
                  value={loyaltyForm.category}
                  onValueChange={(value) => setLoyaltyForm((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loyaltyCategoryOptions.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Reason</Label>
                <Input
                  value={loyaltyForm.reason}
                  onChange={(e) => setLoyaltyForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Short reason"
                  className="border-slate-200"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Note (optional)</Label>
                <Input
                  value={loyaltyForm.note}
                  onChange={(e) => setLoyaltyForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Optional note"
                  className="border-slate-200"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Evidence Image (optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="border-slate-200"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      uploadLoyaltyEvidence(file);
                      e.target.value = "";
                    }
                  }}
                />
                {loyaltyForm.imageUrl && (
                  <div className="flex items-center gap-2 mt-1">
                    <a href={loyaltyForm.imageUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View image</a>
                    <button type="button" onClick={() => setLoyaltyForm((prev) => ({ ...prev, imageUrl: "" }))} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                )}
              </div>
              <Button
                onClick={() => { addLoyaltyEntry(); setFormDialogOpen(false); }}
                disabled={
                  savingLoyalty ||
                  uploadingLoyaltyImage ||
                  !selectedWorkerForPayroll ||
                  !loyaltyForm.points ||
                  !loyaltyForm.reason.trim()
                }
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {savingLoyalty ? "Saving..." : "Save Loyalty Points"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      <Dialog
        open={reverseDialogOpen}
        onOpenChange={(open) => {
          setReverseDialogOpen(open);
          if (!open) {
            setReverseTargetEntry(null);
            setReverseReason("");
          }
        }}
      >
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
              <Label>Reason *</Label>
              <Textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="Enter reason for reversal"
              />
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
            <Button
              onClick={reverseLoyaltyEntry}
              disabled={!reverseReason.trim() || reversingEntryId === reverseTargetEntry?._id}
            >
              {reversingEntryId === reverseTargetEntry?._id ? "Reversing..." : "Confirm Reverse"}
            </Button>
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
