"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, Loader2, Pencil, Trash2, ArrowLeft, ChevronLeft, ChevronRight, Plus, MoreVertical, ChevronDown, Trophy, Coins, CalendarDays, Banknote, Wallet, Sparkles, ArrowUpRight, ArrowDownRight, Info, X, UserRound, Send } from "lucide-react";

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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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

type WorkerPayPeriod = {
  _id?: string;
  id?: string;
  status?: "current" | "paid" | "past_unpaid";
  startDate: string;
  endDate: string;
  totalUnits: number;
  attendanceDays: number;
  grossWage: number;
  totalAdvance: number;
  netPayable: number;
  dailyWage?: number;
  paidAt?: string;
  reportSentAt?: string;
  reportError?: string;
  attendanceEntries?: AttendanceEntry[];
  advances?: AdvanceEntry[];
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

type WorkforceCache = {
  cachedAt: number;
  workers?: Worker[];
  activeProjects?: AttendanceProject[];
  advances?: AdvanceEntry[];
  advanceFilterDate?: string;
  attendanceMonth?: string;
  attendanceMonthEntries?: AttendanceEntry[];
  advanceMonthEntries?: AdvanceEntry[];
};

const TODAY = new Date().toISOString().slice(0, 10);
const CURRENT_MONTH = new Date().toISOString().slice(0, 7);
const WORKFORCE_CACHE_KEY = "dashboard-workforce-cache-v1";
const WORKFORCE_CACHE_TTL_MS = 30_000;
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
    : "attendance";
  const activeTab = validTab as "workers" | "attendance" | "advances" | "payroll";
  const selectedAttendanceDate = searchParams.get("attendanceDate");
  const selectedAttendanceWorkerId = searchParams.get("attendanceWorkerId");
  const selectedWorkerDetailMode = searchParams.get("workerDetailMode");
  const initialCacheSkipsRef = useRef({ attendanceMonth: false, advances: false });

  const setTabInUrl = (tab: "workers" | "attendance" | "advances" | "payroll") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.delete("attendanceDate");
    params.delete("attendanceWorkerId");
    params.delete("workerDetailMode");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const chipScrollRef = useRef<HTMLDivElement>(null);
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
  const [advances, setAdvances] = useState<AdvanceEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingWorker, setSavingWorker] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [addWorkerDialogOpen, setAddWorkerDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [addManualProjectDialogOpen, setAddManualProjectDialogOpen] = useState(false);

  const [advanceFilterDate, setAdvanceFilterDate] = useState(TODAY);
  const [attendanceMonth, setAttendanceMonth] = useState(CURRENT_MONTH);
  const [attendanceMonthEntries, setAttendanceMonthEntries] = useState<AttendanceEntry[]>([]);
  const [advanceMonthEntries, setAdvanceMonthEntries] = useState<AdvanceEntry[]>([]);
  const [loadingAttendanceMonth, setLoadingAttendanceMonth] = useState(false);
  const [manualProjects, setManualProjects] = useState<AttendanceProject[]>([]);
  const [manualProjectName, setManualProjectName] = useState("");
  const [manualProjectAddress, setManualProjectAddress] = useState("");
  const [workerDetailMode, setWorkerDetailMode] = useState<"month" | "payperiod">("month");
  const [payPeriods, setPayPeriods] = useState<WorkerPayPeriod[]>([]);
  const [currentPayPeriod, setCurrentPayPeriod] = useState<WorkerPayPeriod | null>(null);
  const [pastUnpaidPayPeriod, setPastUnpaidPayPeriod] = useState<WorkerPayPeriod | null>(null);
  const [selectedPayPeriodKey, setSelectedPayPeriodKey] = useState("current");
  const [loadingPayPeriods, setLoadingPayPeriods] = useState(false);
  const [markingPayPeriodPaid, setMarkingPayPeriodPaid] = useState(false);
  const [resendingPayPeriodReportId, setResendingPayPeriodReportId] = useState("");

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
    status: "present" as "present" | "absent",
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
  const [editingAttendanceStatus, setEditingAttendanceStatus] = useState<"present" | "absent">("present");
  const [editingAttendanceUnits, setEditingAttendanceUnits] = useState("1");
  const [editingAttendanceProjectId, setEditingAttendanceProjectId] = useState("");
  const [editingAttendanceNote, setEditingAttendanceNote] = useState("");
  const [attendanceToDelete, setAttendanceToDelete] = useState<AttendanceEntry | null>(null);

  const [editingAdvance, setEditingAdvance] = useState<AdvanceEntry | null>(null);
  const [editingAdvanceAmount, setEditingAdvanceAmount] = useState("");
  const [editingAdvanceNote, setEditingAdvanceNote] = useState("");
  const [advanceToDelete, setAdvanceToDelete] = useState<AdvanceEntry | null>(null);

  const readWorkforceCache = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(WORKFORCE_CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw) as WorkforceCache;
      if (!cache.cachedAt || Date.now() - cache.cachedAt > WORKFORCE_CACHE_TTL_MS) {
        window.sessionStorage.removeItem(WORKFORCE_CACHE_KEY);
        return null;
      }
      return cache;
    } catch {
      window.sessionStorage.removeItem(WORKFORCE_CACHE_KEY);
      return null;
    }
  };

  const writeWorkforceCache = (patch: Partial<WorkforceCache>) => {
    if (typeof window === "undefined") return;
    const current = readWorkforceCache() || { cachedAt: Date.now() };
    window.sessionStorage.setItem(
      WORKFORCE_CACHE_KEY,
      JSON.stringify({ ...current, ...patch, cachedAt: Date.now() })
    );
  };

  const applyWorkforceCache = (cache: WorkforceCache) => {
    setWorkers(cache.workers || []);
    setActiveProjects(cache.activeProjects || []);
    setAdvances(cache.advances || []);
    setAttendanceMonth(cache.attendanceMonth || CURRENT_MONTH);
    setAdvanceFilterDate(cache.advanceFilterDate || TODAY);
    setAttendanceMonthEntries(cache.attendanceMonthEntries || []);
    setAdvanceMonthEntries(cache.advanceMonthEntries || []);

    const firstActive = cache.workers?.find((worker) => worker.status === "active");
    if (firstActive) {
      setAdvanceForm((prev) => ({ ...prev, workerId: prev.workerId || firstActive._id }));
      setSelectedWorkerForPayroll((prev) => prev || firstActive._id);
    }
  };

  const activeWorkers = useMemo(
    () => workers.filter((worker) => worker.status === "active"),
    [workers]
  );
  const getLocalDayKey = (dateValue: string | Date) => {
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const formatDateLabel = (dateValue: string | Date, options?: Intl.DateTimeFormatOptions) =>
    new Date(dateValue).toLocaleDateString("en-IN", options || { day: "numeric", month: "short", year: "numeric" });
  const formatFullDateLabel = (dateValue: string | Date) =>
    formatDateLabel(dateValue, { day: "numeric", month: "long", year: "numeric" });
  const formatAttendanceUnits = (units: number) => units > 0 ? `${units} Hajiri` : "Absent";
  const formatAttendanceSummary = (units: number, hasAttendance: boolean) =>
    hasAttendance ? formatAttendanceUnits(units) : "0 Hajiri";
  const attendanceMonthLabel = useMemo(() => {
    const [year, month] = attendanceMonth.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }, [attendanceMonth]);
  const attendanceMonthRange = useMemo(
    () => getMonthDateRange(attendanceMonth),
    [attendanceMonth]
  );
  const attendanceByDay = useMemo(() => {
    const map = new Map<string, { totalUnits: number; absentCount: number; entries: AttendanceEntry[] }>();
    for (const entry of attendanceMonthEntries) {
      const dayKey = getLocalDayKey(entry.date);
      const current = map.get(dayKey) || { totalUnits: 0, absentCount: 0, entries: [] };
      const units = Number(entry.units || 0);
      current.totalUnits += units;
      if (units === 0) current.absentCount += 1;
      current.entries.push(entry);
      map.set(dayKey, current);
    }
    return map;
  }, [attendanceMonthEntries]);
  const advancesByDay = useMemo(() => {
    const map = new Map<string, { totalAmount: number; entries: AdvanceEntry[] }>();
    for (const entry of advanceMonthEntries) {
      const dayKey = getLocalDayKey(entry.date);
      const current = map.get(dayKey) || { totalAmount: 0, entries: [] };
      current.totalAmount += Number(entry.amount || 0);
      current.entries.push(entry);
      map.set(dayKey, current);
    }
    return map;
  }, [advanceMonthEntries]);
  const selectedDayAttendance = useMemo(
    () => (selectedAttendanceDate ? attendanceByDay.get(selectedAttendanceDate)?.entries || [] : []),
    [attendanceByDay, selectedAttendanceDate]
  );
  const selectedDayAdvances = useMemo(
    () => (selectedAttendanceDate ? advancesByDay.get(selectedAttendanceDate)?.entries || [] : []),
    [advancesByDay, selectedAttendanceDate]
  );
  const selectedDayWorkerRows = useMemo(() => {
    const rowMap = new Map<string, { worker: Worker; attendance: AttendanceEntry[]; advances: AdvanceEntry[]; totalUnits: number; totalAdvance: number }>();
    for (const entry of selectedDayAttendance) {
      if (!entry.workerId?._id) continue;
      const current = rowMap.get(entry.workerId._id) || {
        worker: entry.workerId,
        attendance: [],
        advances: [],
        totalUnits: 0,
        totalAdvance: 0,
      };
      current.attendance.push(entry);
      current.totalUnits += Number(entry.units || 0);
      rowMap.set(entry.workerId._id, current);
    }
    for (const entry of selectedDayAdvances) {
      if (!entry.workerId?._id) continue;
      const current = rowMap.get(entry.workerId._id) || {
        worker: entry.workerId,
        attendance: [],
        advances: [],
        totalUnits: 0,
        totalAdvance: 0,
      };
      current.advances.push(entry);
      current.totalAdvance += Number(entry.amount || 0);
      rowMap.set(entry.workerId._id, current);
    }
    return Array.from(rowMap.values()).sort((a, b) =>
      (a.worker.name || a.worker.workerCode).localeCompare(b.worker.name || b.worker.workerCode)
    );
  }, [selectedDayAttendance, selectedDayAdvances]);
  const selectedAttendanceWorker = selectedAttendanceWorkerId
    ? workers.find((worker) => worker._id === selectedAttendanceWorkerId) ||
      attendanceMonthEntries.find((entry) => entry.workerId?._id === selectedAttendanceWorkerId)?.workerId ||
      advanceMonthEntries.find((entry) => entry.workerId?._id === selectedAttendanceWorkerId)?.workerId
    : null;
  const selectedWorkerAttendanceEntries = useMemo(
    () =>
      selectedAttendanceWorkerId
        ? attendanceMonthEntries.filter((entry) => entry.workerId?._id === selectedAttendanceWorkerId)
        : [],
    [attendanceMonthEntries, selectedAttendanceWorkerId]
  );
  const selectedWorkerAdvanceEntries = useMemo(
    () =>
      selectedAttendanceWorkerId
        ? advanceMonthEntries.filter((entry) => entry.workerId?._id === selectedAttendanceWorkerId)
        : [],
    [advanceMonthEntries, selectedAttendanceWorkerId]
  );
  const selectedPayPeriod =
    selectedPayPeriodKey === "current"
      ? currentPayPeriod
      : selectedPayPeriodKey === "past-unpaid"
        ? pastUnpaidPayPeriod
      : payPeriods.find((period) => period._id === selectedPayPeriodKey || period.id === selectedPayPeriodKey) || null;
  const visibleWorkerAttendanceEntries = useMemo(
    () =>
      workerDetailMode === "payperiod"
        ? selectedPayPeriod?.attendanceEntries || []
        : selectedWorkerAttendanceEntries,
    [selectedPayPeriod, selectedWorkerAttendanceEntries, workerDetailMode]
  );
  const visibleWorkerAdvanceEntries = useMemo(
    () =>
      workerDetailMode === "payperiod"
        ? selectedPayPeriod?.advances || []
        : selectedWorkerAdvanceEntries,
    [selectedPayPeriod, selectedWorkerAdvanceEntries, workerDetailMode]
  );
  const selectedWorkerUnits =
    workerDetailMode === "payperiod" && selectedPayPeriod
      ? selectedPayPeriod.totalUnits
      : selectedWorkerAttendanceEntries.reduce((sum, entry) => sum + Number(entry.units || 0), 0);
  const selectedWorkerAdvanceTotal =
    workerDetailMode === "payperiod" && selectedPayPeriod
      ? selectedPayPeriod.totalAdvance
      : selectedWorkerAdvanceEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const selectedWorkerGrossWage =
    workerDetailMode === "payperiod" && selectedPayPeriod
      ? Math.round(selectedPayPeriod.grossWage)
      : Math.round((selectedAttendanceWorker?.dailyWage || 0) * selectedWorkerUnits);
  const selectedWorkerNetWage =
    workerDetailMode === "payperiod" && selectedPayPeriod
      ? Math.round(selectedPayPeriod.netPayable)
      : selectedWorkerGrossWage - selectedWorkerAdvanceTotal;
  const selectedWorkerPeriodLabel =
    workerDetailMode === "payperiod" && selectedPayPeriod
      ? `${formatDateLabel(selectedPayPeriod.startDate, { day: "numeric", month: "short" })} - ${formatDateLabel(selectedPayPeriod.endDate, { day: "numeric", month: "short", year: "numeric" })}`
      : attendanceMonthLabel;
  const selectedPayPeriodHistoryRows = useMemo(() => {
    const rows = new Map<string, { date: string; units: number; advance: number; attendanceNotes: string[]; advanceNotes: string[] }>();

    for (const entry of visibleWorkerAttendanceEntries) {
      const date = getLocalDayKey(entry.date);
      const row = rows.get(date) || { date, units: 0, advance: 0, attendanceNotes: [], advanceNotes: [] };
      row.units += Number(entry.units || 0);
      if (entry.note) row.attendanceNotes.push(entry.note);
      rows.set(date, row);
    }

    for (const entry of visibleWorkerAdvanceEntries) {
      const date = getLocalDayKey(entry.date);
      const row = rows.get(date) || { date, units: 0, advance: 0, attendanceNotes: [], advanceNotes: [] };
      row.advance += Number(entry.amount || 0);
      if (entry.note) row.advanceNotes.push(entry.note);
      rows.set(date, row);
    }

    return Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [visibleWorkerAttendanceEntries, visibleWorkerAdvanceEntries]);
  const projectOptions = useMemo(
    () => [...manualProjects, ...activeProjects],
    [manualProjects, activeProjects]
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

  const FormattedDateInput = ({
    value,
    onChange,
    className = "border-slate-200 bg-white text-slate-900",
    iconClassName = "text-slate-400",
  }: {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    iconClassName?: string;
  }) => (
    <div className={`relative flex h-10 items-center justify-between gap-3 rounded-md border px-3 text-sm ${className}`}>
      <span className="font-medium">{formatFullDateLabel(value)}</span>
      <CalendarDays className={`h-4 w-4 shrink-0 ${iconClassName}`} />
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => {
          const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
          input.showPicker?.();
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );

  const fetchWorkers = async () => {
    const response = await fetch("/api/workers?status=all");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch workers");

    const fetchedWorkers: Worker[] = data.workers || [];
    setWorkers(fetchedWorkers);
    writeWorkforceCache({ workers: fetchedWorkers });

    if (!selectedWorkerForPayroll && fetchedWorkers.length > 0) {
      const firstActive = fetchedWorkers.find((w) => w.status === "active");
      if (firstActive) {
        setAdvanceForm((prev) => ({ ...prev, workerId: firstActive._id }));
        setSelectedWorkerForPayroll(firstActive._id);
      }
    }

    return fetchedWorkers;
  };

  const fetchActiveProjects = async () => {
    const response = await fetch("/api/projects/ongoing");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch active projects");
    const projects: AttendanceProject[] = data.projects || [];
    setActiveProjects(projects);
    writeWorkforceCache({ activeProjects: projects });
    return projects;
  };

  const fetchAdvances = async (date = advanceFilterDate) => {
    const response = await fetch(`/api/workers/advances?date=${date}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch advances");
    const fetchedAdvances: AdvanceEntry[] = data.advances || [];
    setAdvances(fetchedAdvances);
    writeWorkforceCache({ advances: fetchedAdvances, advanceFilterDate: date });
    return fetchedAdvances;
  };

  const fetchAttendanceMonth = async (month = attendanceMonth) => {
    const { startDate, endDate } = getMonthDateRange(month);
    const response = await fetch(`/api/workers/attendance?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch monthly attendance");
    const attendance: AttendanceEntry[] = data.attendance || [];
    setAttendanceMonthEntries(attendance);
    writeWorkforceCache({ attendanceMonth: month, attendanceMonthEntries: attendance });
    return attendance;
  };

  const fetchAdvanceMonth = async (month = attendanceMonth) => {
    const { startDate, endDate } = getMonthDateRange(month);
    const response = await fetch(`/api/workers/advances?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch monthly advances");
    const fetchedAdvances: AdvanceEntry[] = data.advances || [];
    setAdvanceMonthEntries(fetchedAdvances);
    writeWorkforceCache({ attendanceMonth: month, advanceMonthEntries: fetchedAdvances });
    return fetchedAdvances;
  };

  const refreshAttendanceMonth = async (month = attendanceMonth) => {
    setLoadingAttendanceMonth(true);
    try {
      const [attendance, monthAdvances] = await Promise.all([fetchAttendanceMonth(month), fetchAdvanceMonth(month)]);
      return { attendance, advances: monthAdvances };
    } finally {
      setLoadingAttendanceMonth(false);
    }
  };

  const fetchWorkerPayPeriods = async (workerId = selectedAttendanceWorkerId || "") => {
    if (!workerId) return;
    setLoadingPayPeriods(true);
    try {
      const response = await fetch(`/api/workers/pay-periods?workerId=${workerId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load pay periods");
      setCurrentPayPeriod(data.current || null);
      setPastUnpaidPayPeriod(data.pastUnpaid || null);
      setPayPeriods(data.periods || []);
      setSelectedPayPeriodKey((prev) => {
        if (prev === "current") return prev;
        if (prev === "past-unpaid") return data.pastUnpaid ? prev : "current";
        const exists = (data.periods || []).some((period: WorkerPayPeriod) => period._id === prev || period.id === prev);
        return exists ? prev : "current";
      });
    } finally {
      setLoadingPayPeriods(false);
    }
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

  function getMonthDateRange(monthValue: string) {
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
  }

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

  const changeAttendanceMonth = (direction: "previous" | "next") => {
    const [year, month] = attendanceMonth.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + (direction === "next" ? 1 : -1), 1);
    setAttendanceMonth(getLocalDayKey(nextDate).slice(0, 7));
  };

  const markSelectedPayPeriodPaid = async () => {
    if (!selectedAttendanceWorkerId) return;
    const isPastUnpaid = selectedPayPeriodKey === "past-unpaid";
    if (!isPastUnpaid && !currentPayPeriod) return;
    try {
      setMarkingPayPeriodPaid(true);
      const response = await fetch("/api/workers/pay-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: selectedAttendanceWorkerId,
          endDate: isPastUnpaid
            ? undefined
            : getLocalDayKey(new Date(currentPayPeriod?.endDate || TODAY)),
          payPeriodType: isPastUnpaid ? "past_unpaid" : "current",
          sendReport: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to mark pay period paid");
      toast.success(data.reportSent ? "Pay period marked paid and WhatsApp report sent" : "Pay period marked paid");
      if (data.reportError) {
        toast.warning(`WhatsApp report not sent: ${data.reportError}`);
      }
      setWorkerDetailMode("payperiod");
      setSelectedPayPeriodKey(data.payPeriod?._id || "current");
      await fetchWorkerPayPeriods(selectedAttendanceWorkerId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark pay period paid");
    } finally {
      setMarkingPayPeriodPaid(false);
    }
  };

  const resendSelectedPayPeriodReport = async () => {
    if (!selectedAttendanceWorkerId || !selectedPayPeriod?._id) return;
    try {
      setResendingPayPeriodReportId(selectedPayPeriod._id);
      const response = await fetch("/api/workers/pay-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resend_report",
          payPeriodId: selectedPayPeriod._id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send WhatsApp report");
      if (data.reportSent) {
        toast.success("WhatsApp report sent again");
      } else {
        toast.info("Report was not sent, please try again");
      }
      if (data.reportError) {
        toast.warning(`WhatsApp report not sent: ${data.reportError}`);
      }
      await fetchWorkerPayPeriods(selectedAttendanceWorkerId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send WhatsApp report");
    } finally {
      setResendingPayPeriodReportId("");
    }
  };

  const openAttendanceDate = (dateKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "attendance");
    params.set("attendanceDate", dateKey);
    params.delete("attendanceWorkerId");
    params.delete("workerDetailMode");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const openMarkAttendanceForDate = (dateKey = selectedAttendanceDate || TODAY) => {
    setAttendanceForm((prev) => ({
      ...prev,
      workerId: "",
      date: dateKey,
      status: "present",
      units: prev.units === "0" ? "1" : prev.units,
      projectId: "",
      note: "",
    }));
    setFormDialogOpen(true);
  };

  const closeAttendanceDate = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("attendanceDate");
    params.delete("attendanceWorkerId");
    params.delete("workerDetailMode");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const openAttendanceWorker = (workerId: string, options?: { keepTab?: boolean; mode?: "month" | "payperiod" }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!options?.keepTab) params.set("tab", "attendance");
    params.set("attendanceWorkerId", workerId);
    if (options?.mode) {
      params.set("workerDetailMode", options.mode);
      setWorkerDetailMode(options.mode);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const closeAttendanceWorker = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("attendanceWorkerId");
    params.delete("workerDetailMode");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const addManualProject = () => {
    const name = manualProjectName.trim();
    const address = manualProjectAddress.trim();
    if (!name) {
      toast.error("Manual project name is required");
      return;
    }

    const project: AttendanceProject = {
      _id: `manual:${Date.now()}`,
      projectId: `manual-${Date.now()}`,
      clientName: name,
      clientAddress: address || "Manual project",
    };
    setManualProjects((prev) => [project, ...prev]);
    setAttendanceForm((prev) => ({ ...prev, projectId: project._id }));
    setManualProjectName("");
    setManualProjectAddress("");
    setAddManualProjectDialogOpen(false);
  };

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.role !== "admin") {
      router.push("/");
      return;
    }

    const load = async () => {
      try {
        const cached = readWorkforceCache();
        if (cached) {
          initialCacheSkipsRef.current = { attendanceMonth: true, advances: true };
          applyWorkforceCache(cached);
          setLoading(false);
          return;
        }

        setLoading(true);
        const [fetchedWorkers, fetchedProjects, fetchedAdvances, monthData] = await Promise.all([
          fetchWorkers(),
          fetchActiveProjects(),
          fetchAdvances(TODAY),
          refreshAttendanceMonth(CURRENT_MONTH),
        ]);
        writeWorkforceCache({
          workers: fetchedWorkers,
          activeProjects: fetchedProjects,
          advances: fetchedAdvances,
          advanceFilterDate: TODAY,
          attendanceMonth: CURRENT_MONTH,
          attendanceMonthEntries: monthData.attendance,
          advanceMonthEntries: monthData.advances,
        });
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
    if (initialCacheSkipsRef.current.attendanceMonth) {
      initialCacheSkipsRef.current.attendanceMonth = false;
      return;
    }
    refreshAttendanceMonth(attendanceMonth).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load monthly attendance");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceMonth]);

  useEffect(() => {
    if (!selectedAttendanceWorkerId) return;
    fetchWorkerPayPeriods(selectedAttendanceWorkerId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load pay periods");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAttendanceWorkerId]);

  useEffect(() => {
    if (selectedWorkerDetailMode === "month" || selectedWorkerDetailMode === "payperiod") {
      setWorkerDetailMode(selectedWorkerDetailMode);
    }
  }, [selectedWorkerDetailMode]);

  useEffect(() => {
    if (initialCacheSkipsRef.current.advances) {
      initialCacheSkipsRef.current.advances = false;
      return;
    }
    fetchAdvances(advanceFilterDate).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load advances");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceFilterDate]);

  useEffect(() => {
    if (activeTab !== "payroll") return;
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
  }, [activeTab, selectedWorkerForPayroll, payrollMonth]);

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
      const isAbsent = attendanceForm.status === "absent";
      const selectedProject = projectOptions.find((project) => project._id === attendanceForm.projectId);
      const isManualProject = !isAbsent && Boolean(selectedProject?._id.startsWith("manual:"));
      const note = isManualProject
        ? [
            `Manual project: ${selectedProject?.clientName}${selectedProject?.clientAddress ? ` - ${selectedProject.clientAddress}` : ""}`,
            attendanceForm.note.trim(),
          ].filter(Boolean).join("\n")
        : attendanceForm.note;
      const response = await fetch("/api/workers/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: attendanceForm.workerId,
          date: attendanceForm.date,
          units: isAbsent ? 0 : Number(attendanceForm.units),
          projectId: isAbsent || isManualProject ? undefined : attendanceForm.projectId || undefined,
          note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to mark attendance");

      toast.success(isAbsent ? "Absence marked" : "Attendance marked");
      setAttendanceForm((prev) => ({ ...prev, workerId: "", status: "present", projectId: "", note: "" }));
      await refreshAttendanceMonth();
      await fetchPayrollSummary();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark attendance");
      return false;
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
      await refreshAttendanceMonth();
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
    setEditingAttendanceStatus(entry.units > 0 ? "present" : "absent");
    setEditingAttendanceUnits(entry.units > 0 ? String(entry.units) : "1");
    setEditingAttendanceProjectId(entry.projectId?._id || "");
    setEditingAttendanceNote(entry.note || "");
  };

  const updateAttendance = async () => {
    if (!editingAttendance) return;
    const units = editingAttendanceStatus === "absent" ? 0 : Number(editingAttendanceUnits);
    if (![0, 0.5, 1, 1.5, 2].includes(units)) {
      toast.error("Units must be 0, 0.5, 1, 1.5, or 2");
      return;
    }
    try {
      const response = await fetch(`/api/workers/attendance/${editingAttendance._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          units,
          projectId: editingAttendanceStatus === "absent" ? undefined : editingAttendanceProjectId || undefined,
          note: editingAttendanceNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update attendance");

      toast.success("Attendance updated");
      setEditingAttendance(null);
      await refreshAttendanceMonth();
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
      await refreshAttendanceMonth();
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
      await refreshAttendanceMonth();
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
      await refreshAttendanceMonth();
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
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Workforce</h1>
            <button
              onClick={() => {
                if (activeTab === "workers") setAddWorkerDialogOpen(true);
                else {
                  if (activeTab === "attendance") {
                    openMarkAttendanceForDate(selectedAttendanceDate || attendanceForm.date || TODAY);
                  } else {
                    setFormDialogOpen(true);
                  }
                }
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
              { id: "attendance", label: "Attendance" },
              { id: "advances", label: "Advances" },
              { id: "payroll", label: "Payroll" },
              { id: "workers", label: "Workers" },
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
                    role="button"
                    tabIndex={0}
                    onClick={() => openAttendanceWorker(worker._id, { keepTab: true, mode: workerDetailMode })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openAttendanceWorker(worker._id, { keepTab: true, mode: workerDetailMode });
                      }
                    }}
                    className="relative cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => event.stopPropagation()}
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleWorkerStatus(worker);
                            }}
                          >
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
                <div className="bg-slate-900 px-4 py-3 sm:px-6 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarCheck className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white truncate">Attendance Calendar</h3>
                    <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full ml-2">
                      {attendanceMonthEntries.reduce((sum, entry) => sum + Number(entry.units || 0), 0)} Hajiri
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => changeAttendanceMonth("previous")}
                      className="h-9 w-9 rounded-full bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-[150px] text-center text-sm font-semibold text-white">
                      {attendanceMonthLabel}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => changeAttendanceMonth("next")}
                      className="h-9 w-9 rounded-full bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  {loadingAttendanceMonth ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                      <Loader2 className="h-7 w-7 animate-spin text-slate-700" />
                    </div>
                  ) : null}
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[10px] font-semibold uppercase text-slate-500 sm:text-xs">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="border-r border-slate-200 py-2 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 bg-white">
                    {(() => {
                      const [yearStr, monthStr] = attendanceMonth.split("-");
                      const year = Number(yearStr);
                      const monthIdx = Number(monthStr) - 1;
                      const firstDay = new Date(year, monthIdx, 1);
                      const lastDay = new Date(year, monthIdx + 1, 0);
                      const days: Array<Date | null> = [];
                      for (let i = 0; i < firstDay.getDay(); i += 1) days.push(null);
                      for (let day = 1; day <= lastDay.getDate(); day += 1) days.push(new Date(year, monthIdx, day));
                      const todayKey = getLocalDayKey(new Date());
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      return days.map((date, index) => {
                        const isLastCol = (index + 1) % 7 === 0;
                        if (!date) {
                          return (
                            <div
                              key={`blank-${index}`}
                              className={`min-h-[84px] bg-slate-50/60 sm:min-h-[112px] ${isLastCol ? "" : "border-r"} border-b border-slate-200`}
                            />
                          );
                        }
                        const dayKey = getLocalDayKey(date);
                        const dayAttendance = attendanceByDay.get(dayKey);
                        const dayAdvances = advancesByDay.get(dayKey);
                        const isToday = dayKey === todayKey;
                        const isFuture = date > today;
                        return (
                          <button
                            key={dayKey}
                            type="button"
                            onClick={() => openAttendanceDate(dayKey)}
                            className={`group flex min-h-[84px] flex-col items-start gap-2 border-b border-slate-200 p-2 text-left transition-colors hover:bg-blue-50 sm:min-h-[112px] sm:p-3 ${isLastCol ? "" : "border-r"} ${
                              isToday ? "bg-emerald-50" : ""
                            }`}
                          >
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                              isToday ? "bg-emerald-600 text-white" : "text-slate-700"
                            }`}>
                              {date.getDate()}
                            </span>
	                            <div className="mt-auto w-full space-y-1">
	                              {dayAttendance ? (
                                  <>
                                    {dayAttendance.absentCount > 0 ? (
                                      <div className="px-2 py-1 text-xs font-semibold text-red-600">
                                        {dayAttendance.absentCount} A
                                      </div>
                                    ) : null}
                                    {dayAttendance.totalUnits > 0 ? (
                                      <div className="px-2 py-1 text-xs font-semibold text-blue-700">
                                        {dayAttendance.totalUnits} P
                                      </div>
                                    ) : null}
                                  </>
	                              ) : isFuture ? null : (
	                                <div className="px-2 py-1 text-sm font-semibold text-slate-300">-</div>
	                              )}
                              {dayAdvances ? (
                                <div className="truncate rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                                  ₹{dayAdvances.totalAmount} advance
                                </div>
                              ) : null}
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                    <span className="font-medium">{attendanceMonthEntries.length} attendance logs</span>
                    <span className="font-medium">{advanceMonthEntries.length} advance logs</span>
                    <span className="font-medium">{formatFullDateLabel(attendanceMonthRange.startDate)} to {formatFullDateLabel(attendanceMonthRange.endDate)}</span>
                  </div>
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
                  <FormattedDateInput
                    value={advanceFilterDate}
                    onChange={setAdvanceFilterDate}
                    className="h-9 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                    iconClassName="text-slate-400"
                  />
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
                                    {formatDateLabel(week.weekStart, { day: "numeric", month: "long" })} - {formatDateLabel(week.weekEnd, { day: "numeric", month: "long" })}
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
                                    {formatFullDateLabel(entry.date)}
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
                <FormattedDateInput
                  value={attendanceForm.date}
                  onChange={(value) => setAttendanceForm((p) => ({ ...p, date: value }))}
                />
              </div>
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 block">Status</Label>
                <div className="grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
                  {[
                    { value: "present", label: "P" },
                    { value: "absent", label: "A" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setAttendanceForm((p) => ({
                          ...p,
                          status: option.value as "present" | "absent",
                          projectId: option.value === "absent" ? "" : p.projectId,
                        }))
                      }
                      className={`h-10 rounded-full text-sm font-bold transition-colors ${
                        attendanceForm.status === option.value
                          ? option.value === "present"
                            ? "bg-green-600 text-white shadow-sm"
                            : "bg-red-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {attendanceForm.status === "present" ? (
                <>
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
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <Label className="text-slate-700 font-medium">Project</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddManualProjectDialogOpen(true)}
                        className="h-8 px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add project
                      </Button>
                    </div>
                    <Select
                      value={attendanceForm.projectId || "none"}
                      onValueChange={(value) => setAttendanceForm((p) => ({ ...p, projectId: value === "none" ? "" : value }))}
                    >
                      <SelectTrigger className="h-auto min-h-10 border-slate-200 [&>span]:line-clamp-2">
                        <SelectValue placeholder="Select active project" />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                        <SelectItem value="none" className="min-h-10 border-b border-slate-100">
                          No project
                        </SelectItem>
                        {manualProjects.length > 0 ? <SelectSeparator /> : null}
                        {projectOptions.map((project) => (
                          <SelectItem key={project._id} value={project._id} className="min-h-[58px] items-start border-b border-slate-100 py-2 last:border-b-0 [&>span:first-child]:top-3">
                            <div className="min-w-0 pr-1">
                              <p className="whitespace-normal break-words text-sm font-medium leading-snug">
                                {project.clientName}
                                {project._id.startsWith("manual:") ? <span className="ml-1 text-[10px] uppercase text-blue-600">Manual</span> : null}
                              </p>
                              <p className="mt-0.5 whitespace-normal break-words text-xs leading-snug text-slate-500">
                                {project.clientAddress}
                              </p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : null}
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
                onClick={async () => {
                  const saved = await markAttendance();
                  if (saved) setFormDialogOpen(false);
                }}
                disabled={savingAttendance || !attendanceForm.workerId}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {savingAttendance ? "Saving..." : attendanceForm.status === "absent" ? "Mark Absent" : "Mark Attendance"}
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
                <FormattedDateInput
                  value={advanceForm.date}
                  onChange={(value) => setAdvanceForm((p) => ({ ...p, date: value }))}
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
                <FormattedDateInput
                  value={loyaltyForm.date}
                  onChange={(value) => setLoyaltyForm((prev) => ({ ...prev, date: value }))}
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

      <Dialog open={activeTab === "attendance" && !!selectedAttendanceDate} onOpenChange={(open) => !open && closeAttendanceDate()}>
        <DialogContent data-attendance-dialog="true" className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 p-0 sm:max-w-none md:left-[calc(50%+8rem)] md:w-[calc(100vw-16rem)] [&>button:last-child]:hidden">
          <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  {selectedAttendanceDate ? formatDateLabel(selectedAttendanceDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Attendance Details"}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  {formatAttendanceSummary(selectedDayAttendance.reduce((sum, entry) => sum + Number(entry.units || 0), 0), selectedDayAttendance.length > 0)} · ₹{selectedDayAdvances.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)} advance
                </DialogDescription>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeAttendanceDate} className="h-9 w-9 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close attendance details">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              {selectedDayWorkerRows.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center">
                  <div>
                    <p className="text-sm font-medium text-slate-700">No attendance or advance records found for this date.</p>
                    <p className="mt-1 text-sm text-slate-500">Add attendance here without going back to the calendar.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => openMarkAttendanceForDate()}
                    className="rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Mark Attendance
                  </Button>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {selectedDayWorkerRows.map((row) => (
                    <button
                      key={row.worker._id}
                      type="button"
                      onClick={() => openAttendanceWorker(row.worker._id)}
                      className="block w-full border-b border-slate-100 p-4 text-left transition-colors last:border-b-0 hover:bg-blue-50 sm:p-5"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                          {(row.worker.name || row.worker.workerCode || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {row.worker.name || "Unnamed Worker"}{" "}
                            <span className="font-normal text-slate-500">({row.worker.workerCode} · {row.worker.mobile})</span>
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                              row.totalUnits > 0
                                ? "border-blue-100 bg-blue-50 text-blue-700"
                                : row.attendance.length > 0
                                  ? "border-red-100 bg-red-50 text-red-700"
                                  : "border-slate-100 bg-slate-50 text-slate-600"
                            }`}>
                              {formatAttendanceSummary(row.totalUnits, row.attendance.length > 0)}
                            </span>
                            <span className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              ₹{row.totalAdvance} advance
                            </span>
                            <span className="rounded-md border border-green-100 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                              ₹{Math.round((row.worker.dailyWage || 0) * row.totalUnits)} wage
                            </span>
                            <span className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              ₹{row.worker.dailyWage || 0} daily wage
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAttendanceWorkerId} onOpenChange={(open) => !open && closeAttendanceWorker()}>
        <DialogContent data-attendance-dialog="true" className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 p-0 sm:max-w-none md:left-[calc(50%+8rem)] md:w-[calc(100vw-16rem)] [&>button:last-child]:hidden">
          <div className="flex h-full min-h-0 flex-col bg-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <UserRound className="h-5 w-5 text-blue-600" />
                  <span className="truncate">{selectedAttendanceWorker?.name || selectedAttendanceWorker?.workerCode || "Worker"}</span>
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  {selectedAttendanceWorker?.workerCode || "No code"} · {selectedWorkerPeriodLabel}
                </DialogDescription>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeAttendanceWorker} className="h-9 w-9 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close worker details">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              <div className="mx-auto grid w-full max-w-5xl gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex rounded-full bg-slate-100 p-1">
                      {(["month", "payperiod"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setWorkerDetailMode(mode);
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("workerDetailMode", mode);
                            router.replace(`?${params.toString()}`, { scroll: false });
                          }}
                          className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                            workerDetailMode === mode ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {mode === "month" ? "Month" : "Pay Period"}
                        </button>
                      ))}
                    </div>

                    {workerDetailMode === "month" ? (
                      <div className="flex items-center justify-between gap-2 lg:justify-end">
                        <Button type="button" variant="outline" size="icon" onClick={() => changeAttendanceMonth("previous")} className="h-9 w-9 rounded-full">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[140px] text-center text-sm font-semibold text-slate-800">{attendanceMonthLabel}</span>
                        <Button type="button" variant="outline" size="icon" onClick={() => changeAttendanceMonth("next")} className="h-9 w-9 rounded-full">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Select value={selectedPayPeriodKey} onValueChange={setSelectedPayPeriodKey}>
                          <SelectTrigger className="h-9 min-w-[230px] border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="current" disabled={!currentPayPeriod}>
                              {currentPayPeriod
                                ? `Current unpaid · ${formatDateLabel(currentPayPeriod.startDate, { day: "numeric", month: "short" })} - ${formatDateLabel(currentPayPeriod.endDate, { day: "numeric", month: "short" })}`
                                : "No current unpaid period"}
                            </SelectItem>
                            {pastUnpaidPayPeriod ? (
                              <SelectItem value="past-unpaid">
                                Past unpaid · {pastUnpaidPayPeriod.totalUnits} Hajiri · ₹{Math.round(pastUnpaidPayPeriod.netPayable)}
                              </SelectItem>
                            ) : null}
                            {payPeriods.length > 0 ? <SelectSeparator /> : null}
                            {payPeriods.map((period) => (
                              <SelectItem key={period._id || period.id} value={period._id || period.id || ""}>
                                {formatDateLabel(period.startDate, { day: "numeric", month: "short" })} - {formatDateLabel(period.endDate, { day: "numeric", month: "short", year: "numeric" })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          onClick={markSelectedPayPeriodPaid}
                          disabled={
                            markingPayPeriodPaid ||
                            loadingPayPeriods ||
                            (selectedPayPeriodKey !== "current" && selectedPayPeriodKey !== "past-unpaid") ||
                            (selectedPayPeriodKey === "current" && !currentPayPeriod) ||
                            (selectedPayPeriodKey === "past-unpaid" && !pastUnpaidPayPeriod)
                          }
                          className="h-9 rounded-full bg-green-600 px-4 text-xs font-semibold hover:bg-green-700"
                        >
                          {markingPayPeriodPaid
                            ? "Marking..."
                            : selectedPayPeriodKey === "past-unpaid"
                              ? "Mark Past Paid"
                              : "Mark Paid"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {loadingAttendanceMonth || loadingPayPeriods ? (
                    [1, 2, 3, 4].map((item) => (
                      <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="mt-4 h-8 w-16" />
                      </div>
                    ))
                  ) : (
                    [
                      { title: "Total Hajiri", value: selectedWorkerUnits, tone: "text-blue-700", bg: "bg-blue-50", icon: CalendarCheck },
                      { title: "Gross Wage", value: `₹${selectedWorkerGrossWage}`, tone: "text-green-700", bg: "bg-green-50", icon: Banknote },
                      { title: "Advance", value: `₹${selectedWorkerAdvanceTotal}`, tone: "text-amber-700", bg: "bg-amber-50", icon: Wallet },
                      { title: "Net", value: `₹${selectedWorkerNetWage}`, tone: "text-indigo-700", bg: "bg-indigo-50", icon: Coins },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${item.bg}`}>
                          <div className="mb-4 flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-slate-500">{item.title}</p>
                            <Icon className={`h-4 w-4 ${item.tone}`} />
                          </div>
                          <p className={`text-2xl font-bold ${item.tone}`}>{item.value}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 bg-slate-900 px-4 py-3 text-white">
                      <CalendarCheck className="h-5 w-5 text-blue-300" />
                      <h3 className="font-semibold">Attendance</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {loadingAttendanceMonth || loadingPayPeriods ? (
                        [1, 2, 3].map((item) => (
                          <div key={item} className="p-4">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="mt-2 h-3 w-28" />
                          </div>
                        ))
                      ) : visibleWorkerAttendanceEntries.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">
                          No attendance for this {workerDetailMode === "payperiod" ? "pay period" : "month"}.
                        </p>
                      ) : (
                        visibleWorkerAttendanceEntries.map((entry) => (
                          <div key={entry._id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {formatDateLabel(entry.date, { weekday: "short", day: "numeric", month: "short" })}
                                </p>
                                {entry.projectId ? (
                                  <p className="mt-1 text-xs text-slate-500">{entry.projectId.clientName} · {entry.projectId.clientAddress}</p>
                                ) : null}
                                {entry.note ? <p className="mt-1 text-xs italic text-slate-500">&quot;{entry.note}&quot;</p> : null}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                                  entry.units > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                                }`}>
                                  {formatAttendanceUnits(entry.units)}
                                </span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditAttendanceDialog(entry)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setAttendanceToDelete(entry)} className="text-red-600 focus:text-red-600">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
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

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 bg-slate-900 px-4 py-3 text-white">
                      <Wallet className="h-5 w-5 text-amber-300" />
                      <h3 className="font-semibold">Advances</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {loadingAttendanceMonth || loadingPayPeriods ? (
                        [1, 2, 3].map((item) => (
                          <div key={item} className="p-4">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="mt-2 h-3 w-24" />
                          </div>
                        ))
                      ) : visibleWorkerAdvanceEntries.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">
                          No advances for this {workerDetailMode === "payperiod" ? "pay period" : "month"}.
                        </p>
                      ) : (
                        visibleWorkerAdvanceEntries.map((entry) => (
                          <div key={entry._id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {formatDateLabel(entry.date, { weekday: "short", day: "numeric", month: "short" })}
                                </p>
                                {entry.note ? <p className="mt-1 text-xs italic text-slate-500">&quot;{entry.note}&quot;</p> : null}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">₹{entry.amount}</span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditAdvanceDialog(entry)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setAdvanceToDelete(entry)} className="text-red-600 focus:text-red-600">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
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

                {workerDetailMode === "payperiod" && selectedPayPeriod ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-1 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Pay Period History</h3>
                        <p className="text-xs text-slate-500">
                          {selectedWorkerPeriodLabel}
                          {selectedPayPeriod.paidAt ? ` · Paid ${formatDateLabel(selectedPayPeriod.paidAt, { day: "numeric", month: "short", year: "numeric" })}` : ""}
                          {selectedPayPeriod.reportSentAt ? ` · Sent ${formatDateLabel(selectedPayPeriod.reportSentAt, { day: "numeric", month: "short" })}` : ""}
                        </p>
                        {selectedPayPeriod.reportError ? (
                          <p className="mt-1 text-xs text-amber-600">WhatsApp: {selectedPayPeriod.reportError}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-md bg-blue-50 px-2.5 py-1 text-blue-700">{selectedWorkerUnits} Hajiri</span>
                        <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-700">₹{selectedWorkerAdvanceTotal} advance</span>
                        <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-indigo-700">₹{selectedWorkerNetWage} net</span>
                        {selectedPayPeriod._id ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resendSelectedPayPeriodReport}
                            disabled={resendingPayPeriodReportId === selectedPayPeriod._id}
                            className="h-7 rounded-md border-green-200 bg-green-50 px-2.5 text-xs font-semibold text-green-700 hover:bg-green-100 hover:text-green-800"
                          >
                            {resendingPayPeriodReportId === selectedPayPeriod._id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Send Again
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {selectedPayPeriodHistoryRows.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">No date-wise history stored for this pay period.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Date</th>
                              <th className="px-4 py-3 font-semibold">Hajiri</th>
                              <th className="px-4 py-3 font-semibold">Advance</th>
                              <th className="px-4 py-3 font-semibold">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedPayPeriodHistoryRows.map((row) => (
                              <tr key={row.date}>
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  {formatDateLabel(row.date, { weekday: "short", day: "numeric", month: "short" })}
                                </td>
                                <td className="px-4 py-3 text-blue-700">{row.units}</td>
                                <td className="px-4 py-3 text-amber-700">₹{row.advance}</td>
                                <td className="px-4 py-3 text-slate-500">
                                  {[...row.attendanceNotes, ...row.advanceNotes].join(" · ") || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addManualProjectDialogOpen}
        onOpenChange={(open) => {
          setAddManualProjectDialogOpen(open);
          if (!open) {
            setManualProjectName("");
            setManualProjectAddress("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
            <DialogDescription>
              Add a temporary project for this attendance entry.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-slate-700 font-medium mb-1.5 block">Project name</Label>
              <Input
                value={manualProjectName}
                onChange={(e) => setManualProjectName(e.target.value)}
                placeholder="Project name"
                className="border-slate-200"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-slate-700 font-medium mb-1.5 block">Address or location</Label>
              <Input
                value={manualProjectAddress}
                onChange={(e) => setManualProjectAddress(e.target.value)}
                placeholder="Address or short location"
                className="border-slate-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddManualProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addManualProject} className="bg-slate-900 hover:bg-slate-800">
              Add Project
            </Button>
          </DialogFooter>
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
              <Label>Status</Label>
              <div className="mt-1 grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
                {[
                  { value: "present", label: "P" },
                  { value: "absent", label: "A" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setEditingAttendanceStatus(option.value as "present" | "absent");
                      if (option.value === "absent") setEditingAttendanceProjectId("");
                    }}
                    className={`h-10 rounded-full text-sm font-bold transition-colors ${
                      editingAttendanceStatus === option.value
                        ? option.value === "present"
                          ? "bg-green-600 text-white shadow-sm"
                          : "bg-red-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {editingAttendanceStatus === "present" ? (
              <>
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
              </>
            ) : null}
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
