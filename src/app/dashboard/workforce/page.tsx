"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, Loader2, Pencil, Trash2, ArrowLeft, ChevronLeft, ChevronRight, Plus, MoreVertical, ChevronDown, Trophy, Coins, CalendarDays, Banknote, Wallet, Sparkles, ArrowUpRight, ArrowDownRight, Info } from "lucide-react";

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

type AttendanceProject = {
  _id: string;
  projectId: string;
  clientName: string;
  clientAddress: string;
  status?: "ongoing" | "completed";
};

type AttendanceEntry = {
  _id: string;
  date: string;
  units: number;
  note?: string;
  workerId: Worker;
  projectId?: AttendanceProject | null;
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
  const payrollMonthInputRef = useRef<HTMLInputElement>(null);
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

  const openPayrollMonthPicker = () => {
    const input = payrollMonthInputRef.current;
    if (!input) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [activeProjects, setActiveProjects] = useState<AttendanceProject[]>([]);
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
    projectId: "",
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
  const [leaderboardWeekLabel, setLeaderboardWeekLabel] = useState("");
  const [selectedLeaderboardWeek, setSelectedLeaderboardWeek] = useState<number | null>(null);
  const [selectedLeaderboardWeekYear, setSelectedLeaderboardWeekYear] = useState<number | null>(null);
  const [isLeaderboardWeekPickerOpen, setIsLeaderboardWeekPickerOpen] = useState(false);
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
  const [editingAttendanceProjectId, setEditingAttendanceProjectId] = useState("");
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
  const payrollMonthLabel = useMemo(() => {
    const [year, month] = payrollMonth.split("-");
    if (!year || !month) return "Current month";
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }, [payrollMonth]);
  const payoutPreview = useMemo(
    () => payrollSummary?.loyalty.weeklyPayouts.slice(0, 3) || [],
    [payrollSummary]
  );
  const loyaltyHistoryPreview = useMemo(
    () => loyaltyHistory.slice(0, 3),
    [loyaltyHistory]
  );

  const getCurrentISOWeek = () => {
    const d = new Date();
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const isoWeek = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { isoWeek, isoWeekYear: utc.getUTCFullYear() };
  };

  const currentISOWeek = useMemo(() => getCurrentISOWeek(), []);

  const getWeekDateRange = (isoWeek: number, isoWeekYear: number) => {
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

  const leaderboardRecentWeeks = useMemo(() => {
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

  const formatWeekDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const getIsoWeekAndYear = (dateValue: string) => {
    const date = new Date(dateValue);
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const isoWeek = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { isoWeek, isoWeekYear: utc.getUTCFullYear() };
  };

  const isEntryReversible = (entry: LoyaltyHistoryEntry) => {
    if (!payrollSummary) return false;
    const { isoWeek, isoWeekYear } = getIsoWeekAndYear(entry.date);
    const matchedWeek = payrollSummary.loyalty.weeklyPayouts.find(
      (week) => week.isoWeek === isoWeek && week.isoWeekYear === isoWeekYear
    );
    return !matchedWeek || matchedWeek.payoutStatus === "pending";
  };

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

  const fetchActiveProjects = async () => {
    const response = await fetch("/api/projects/ongoing");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch active projects");
    setActiveProjects(data.projects || []);
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

  const fetchLoyaltyLeaderboard = async (week?: number, year?: number) => {
    let url = "/api/workers/loyalty/leaderboard?period=weekly";
    if (week !== undefined && year !== undefined) {
      url += `&week=${week}&year=${year}`;
    }
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch loyalty leaderboard");
    setLoyaltyLeaderboard(data.leaderboard || []);
    if (data.isoWeek !== undefined) setSelectedLeaderboardWeek(data.isoWeek);
    if (data.isoWeekYear !== undefined) setSelectedLeaderboardWeekYear(data.isoWeekYear);
    if (data.isoWeek && data.isoWeekYear) {
      const range = getWeekDateRange(data.isoWeek, data.isoWeekYear);
      setLeaderboardWeekLabel(`Week ${data.isoWeek} · ${formatWeekDate(range.start)} - ${formatWeekDate(range.end)}`);
    } else {
      setLeaderboardWeekLabel("Current week");
    }
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
        await Promise.all([fetchWorkers(), fetchActiveProjects(), fetchAttendance(TODAY), fetchAdvances(TODAY)]);
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
          projectId: attendanceForm.projectId || undefined,
          note: attendanceForm.note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to mark attendance");

      toast.success("Attendance marked");
      setAttendanceForm((prev) => ({ ...prev, projectId: "", note: "" }));
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
    setEditingAttendanceProjectId(entry.projectId?._id || "");
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
        body: JSON.stringify({
          units,
          projectId: editingAttendanceProjectId || undefined,
          note: editingAttendanceNote,
        }),
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
                                {entry.projectId ? (
                                  <span className="bg-violet-50 text-violet-700 px-2.5 py-1 rounded-md font-medium border border-violet-100">
                                    {entry.projectId.clientName} · {entry.projectId.clientAddress}
                                  </span>
                                ) : null}
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
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0 flex-1 max-w-[220px]">
                  <Label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Select Worker
                  </Label>
                  <Select value={selectedWorkerForPayroll} onValueChange={setSelectedWorkerForPayroll}>
                    <SelectTrigger className="h-9 rounded-full border-slate-200 bg-white px-3 text-xs shadow-none">
                      <SelectValue placeholder="Worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWorkers.map((worker) => (
                        <SelectItem key={worker._id} value={worker._id}>
                          {worker.name || worker.workerCode} ({worker.workerCode})
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
                    onClick={openPayrollMonthPicker}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-none transition-colors hover:bg-slate-50"
                  >
                    {payrollMonthLabel}
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                  <Input
                    ref={payrollMonthInputRef}
                    type="month"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
              </div>

            {payrollSummary && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Daily Wage</p>
                        <Banknote className="h-4 w-4 text-blue-700" />
                      </div>
                      <p className="text-xl font-bold text-blue-950">₹{payrollSummary.worker.dailyWage}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Units</p>
                        <CalendarCheck className="h-4 w-4 text-emerald-700" />
                      </div>
                      <p className="text-xl font-bold text-emerald-950">{payrollSummary.summary.totalUnits}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Days Present</p>
                        <CalendarDays className="h-4 w-4 text-amber-700" />
                      </div>
                      <p className="text-xl font-bold text-amber-950">{payrollSummary.summary.attendanceDays}</p>
                    </div>
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Gross Wage</p>
                        <Wallet className="h-4 w-4 text-violet-700" />
                      </div>
                      <p className="text-xl font-bold text-violet-950">₹{Math.round(payrollSummary.summary.grossWage)}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Advances</p>
                        <ArrowDownRight className="h-4 w-4 text-rose-700" />
                      </div>
                      <p className="text-xl font-bold text-rose-950">₹{payrollSummary.summary.totalAdvance}</p>
                    </div>
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Net Payable</p>
                        <ArrowUpRight className="h-4 w-4 text-green-700" />
                      </div>
                      <p className="text-xl font-bold text-green-950">₹{Math.round(payrollSummary.summary.netPayable)}</p>
                    </div>
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Net Points</p>
                        <Sparkles className="h-4 w-4 text-indigo-700" />
                      </div>
                      <p className="text-xl font-bold text-indigo-950">{payrollSummary.loyalty.totalPoints}</p>
                    </div>
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Points Value</p>
                        <Coins className="h-4 w-4 text-cyan-700" />
                      </div>
                      <p className="text-xl font-bold text-cyan-950">₹{payrollSummary.loyalty.pointsRupees}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="text-lg font-semibold text-white">Weekly Loyalty Payouts</h3>
                    {selectedWorkerForPayroll ? (
                      <Link
                        href={`/dashboard/workforce/payroll/payouts?workerId=${selectedWorkerForPayroll}&month=${payrollMonth}`}
                        className="text-xs font-medium text-slate-200 transition-colors hover:text-white"
                      >
                        View all
                      </Link>
                    ) : null}
                  </div>
                  <div className="p-4 sm:p-6">
                    {payrollSummary.loyalty.weeklyPayouts.length === 0 ? (
                      <div className="text-center text-slate-500 py-8">
                        No loyalty entries for this month
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {payoutPreview.map((week) => (
                          <div key={`${week.isoWeekYear}-${week.isoWeek}`} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    Week {week.isoWeek}
                                  </p>
                                  <span className="text-xs text-slate-500">
                                    {new Date(week.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(week.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                      week.payoutStatus === "paid"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-yellow-100 text-yellow-700"
                                    }`}
                                  >
                                    {week.payoutStatus}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toast.info(
                                        `Payout for this week is ${week.payoutStatus}.`
                                      )
                                    }
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

                {/* Loyalty History Card */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="text-lg font-semibold text-white">Loyalty History</h3>
                    {selectedWorkerForPayroll ? (
                      <Link
                        href={`/dashboard/workforce/payroll/history?workerId=${selectedWorkerForPayroll}&month=${payrollMonth}`}
                        className="text-xs font-medium text-slate-200 transition-colors hover:text-white"
                      >
                        View all
                      </Link>
                    ) : null}
                  </div>
                  <div className="p-4 sm:p-6">
                    {loyaltyHistory.length === 0 ? (
                      <div className="text-center text-slate-500 py-8">
                        No loyalty entries for this month
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {loyaltyHistoryPreview.map((entry) => (
                          <div key={entry._id} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    entry.entryType === "credit"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}>
                                    {entry.entryType === "credit" ? "+" : "-"}{entry.points}
                                  </span>
                                  <span className="text-xs font-medium text-slate-600">{entry.category}</span>
                                </div>
                                <div className="space-y-3">
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
                                <div className="text-xs space-y-0.5">
                                  {entry.imageUrl && (
                                    <p><span className="text-slate-600">Evidence:</span> <a href={entry.imageUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">View image</a></p>
                                  )}
                                </div>
                                </div>
                              </div>
                              {!entry.isReversal && entry.category !== "reversal" && isEntryReversible(entry) ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={reversingEntryId === entry._id}
                                  onClick={() => openReverseLoyaltyDialog(entry)}
                                  className="rounded-full text-xs"
                                >
                                  Reverse
                                </Button>
                              ) : null}
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
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-white">Weekly Leaderboard</h3>
                      <button
                        type="button"
                        onClick={() => setIsLeaderboardWeekPickerOpen(true)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
                      >
                        {selectedLeaderboardWeek ? `Week ${selectedLeaderboardWeek}` : "Current week"}
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    {leaderboardWeekLabel ? (
                      <p className="mb-3 text-[11px] text-slate-400">{leaderboardWeekLabel}</p>
                    ) : null}
                    {loyaltyLeaderboard.length === 0 ? (
                      <div className="text-center text-slate-500 py-8">
                        No leaderboard data yet
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {loyaltyLeaderboard.map((row) => (
                          <div
                            key={`${row.rank}-${row.workerCode}`}
                            className={`flex items-center justify-between px-1 py-3 ${
                              row.workerCode === payrollSummary.worker.workerCode ? "bg-indigo-50/70" : ""
                            }`}
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
                                    {row.workerCode === payrollSummary.worker.workerCode && (
                                      <span className="text-slate-500 font-normal text-xs">(Selected)</span>
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
                <Label className="text-slate-700 font-medium mb-1.5 block">Project</Label>
                <Select
                  value={attendanceForm.projectId || "none"}
                  onValueChange={(value) => setAttendanceForm((p) => ({ ...p, projectId: value === "none" ? "" : value }))}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Select active project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {activeProjects.map((project) => (
                      <SelectItem key={project._id} value={project._id}>
                        {project.clientName} - {project.clientAddress}
                      </SelectItem>
                    ))}
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

      <Dialog open={isLeaderboardWeekPickerOpen} onOpenChange={setIsLeaderboardWeekPickerOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Select Week</DialogTitle>
            <DialogDescription>Choose a week to view leaderboard data.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 -mx-2 overflow-y-auto divide-y divide-slate-100 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 max-sm:[&::-webkit-scrollbar]:hidden">
            {leaderboardRecentWeeks.map((week) => {
              const isActive =
                week.isoWeek === (selectedLeaderboardWeek ?? currentISOWeek.isoWeek) &&
                week.isoWeekYear === (selectedLeaderboardWeekYear ?? currentISOWeek.isoWeekYear);
              const isCurrent =
                week.isoWeek === currentISOWeek.isoWeek &&
                week.isoWeekYear === currentISOWeek.isoWeekYear;
              return (
                <button
                  key={`${week.isoWeekYear}-${week.isoWeek}`}
                  type="button"
                  onClick={() => {
                    setIsLeaderboardWeekPickerOpen(false);
                    fetchLoyaltyLeaderboard(week.isoWeek, week.isoWeekYear).catch((error) => {
                      toast.error(error instanceof Error ? error.message : "Failed to load loyalty leaderboard");
                    });
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors hover:bg-slate-50 ${
                    isActive ? "bg-indigo-50 hover:bg-indigo-50" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Week {week.isoWeek}
                      {isCurrent ? <span className="ml-1.5 text-[10px] font-normal text-slate-400">(Current)</span> : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatWeekDate(week.start)} - {formatWeekDate(week.end)}, {week.isoWeekYear}
                    </p>
                  </div>
                  {isActive ? (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white">
                      Selected
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
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
              <Label>Project</Label>
              <Select
                value={editingAttendanceProjectId || "none"}
                onValueChange={(value) => setEditingAttendanceProjectId(value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select active project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {activeProjects.map((project) => (
                    <SelectItem key={project._id} value={project._id}>
                      {project.clientName} - {project.clientAddress}
                    </SelectItem>
                  ))}
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
