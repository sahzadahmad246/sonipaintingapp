"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar,
    Plus,
    IndianRupee,
    MapPin,
    Trash2,
    Clock,
    Building2,
    ChevronLeft,
    ChevronRight,
    Users,
    MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";
import StaffHistoryDialog from "./StaffHistoryDialog";

interface Staff {
    _id: string;
    staffId: string;
    name: string;
    mobile: string;
    dailyRate: number;
}

interface Project {
    _id: string;
    projectId: string;
    clientName: string;
    clientAddress: string;
}

interface AttendanceRecord {
    _id: string;
    staffId: Staff;
    projectInfo?: {
        projectId: string;
        clientName: string;
        clientAddress: string;
    };
    date: string;
    hajiriCount: number;
    advancePayment: number;
    notes?: string;
    createdAt: string;
}

const HAJIRI_OPTIONS = [
    { value: "0.5", label: "0.5" },
    { value: "1", label: "1" },
    { value: "1.5", label: "1.5" },
    { value: "2", label: "2" },
];

export default function AttendanceSheet() {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [historyStaff, setHistoryStaff] = useState<Staff | null>(null);
    const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);

    // Date selection
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [tempDate, setTempDate] = useState("");

    // Add form state
    const [selectedStaffId, setSelectedStaffId] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [hajiriCount, setHajiriCount] = useState("1");
    const [advancePayment, setAdvancePayment] = useState("0");
    const [notes, setNotes] = useState("");

    // Fetch active staff
    const fetchStaff = useCallback(async () => {
        try {
            const response = await fetch("/api/staff?status=active");
            if (response.ok) {
                const data = await response.json();
                setStaff(data.staff);
            }
        } catch (error) {
            console.error("Error fetching staff:", error);
        }
    }, []);

    // Fetch ongoing projects
    const fetchProjects = useCallback(async () => {
        try {
            const response = await fetch("/api/projects/ongoing");
            if (response.ok) {
                const data = await response.json();
                setProjects(data.projects);
            }
        } catch (error) {
            console.error("Error fetching projects:", error);
        }
    }, []);

    // Fetch attendance for selected date
    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/attendance?date=${selectedDate}`);
            if (!response.ok) throw new Error("Failed to fetch attendance");
            const data = await response.json();
            setAttendance(data.attendance);
        } catch (error) {
            console.error("Error fetching attendance:", error);
            toast.error("Failed to fetch attendance");
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchStaff();
        fetchProjects();
    }, [fetchStaff, fetchProjects]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedStaffId) {
            toast.error("Please select a staff member");
            return;
        }

        setSaving(true);
        try {
            const response = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    staffId: selectedStaffId,
                    projectId: selectedProjectId || undefined,
                    date: selectedDate,
                    hajiriCount: parseFloat(hajiriCount),
                    advancePayment: parseFloat(advancePayment) || 0,
                    notes: notes.trim() || undefined,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to mark attendance");
            }

            toast.success("Attendance marked successfully");
            setIsAddDialogOpen(false);
            resetForm();
            fetchAttendance();
        } catch (error) {
            console.error("Error marking attendance:", error);
            toast.error(error instanceof Error ? error.message : "Failed to mark attendance");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const response = await fetch(`/api/attendance/${deleteId}`, {
                method: "DELETE",
            });
            if (!response.ok) throw new Error("Failed to delete attendance");
            toast.success("Attendance deleted");
            fetchAttendance();
        } catch (error) {
            console.error("Error deleting attendance:", error);
            toast.error("Failed to delete attendance");
        } finally {
            setDeleting(false);
            setDeleteId(null);
        }
    };

    const resetForm = () => {
        setSelectedStaffId("");
        setSelectedProjectId("");
        setHajiriCount("1");
        setAdvancePayment("0");
        setNotes("");
    };

    const changeDate = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split("T")[0]);
    };

    const openDateDialog = () => {
        setTempDate(selectedDate);
        setIsDateDialogOpen(true);
    };

    const applyDateFilter = () => {
        if (tempDate) {
            setSelectedDate(tempDate);
        }
        setIsDateDialogOpen(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatCurrencyShort = (amount: number) => {
        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)}L`;
        } else if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(1)}K`;
        }
        return `₹${amount}`;
    };

    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
        });
    };

    // Calculate totals for the day
    const dayTotals = attendance.reduce(
        (acc, record) => ({
            hajiri: acc.hajiri + record.hajiriCount,
            advance: acc.advance + record.advancePayment,
            earnings: acc.earnings + record.hajiriCount * record.staffId.dailyRate,
        }),
        { hajiri: 0, advance: 0, earnings: 0 }
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            <div className="max-w-5xl mx-auto">
                {/* Header - Compact */}
                <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 px-4 pt-4 pb-2">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            Attendance
                        </h1>
                        <Button
                            onClick={() => setIsAddDialogOpen(true)}
                            size="icon"
                            className="bg-black hover:bg-black/90 text-white h-9 w-9"
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Date Navigation */}
                    <div className="flex items-center justify-between mt-3 bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                        <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} className="h-8 w-8">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <button
                            onClick={openDateDialog}
                            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                            <Calendar className="w-4 h-4" />
                            {formatDisplayDate(selectedDate)}
                        </button>
                        <Button variant="ghost" size="icon" onClick={() => changeDate(1)} className="h-8 w-8">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Stats - Compact Row */}
                <div className="px-4 py-3">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1 mb-1">
                                <Clock className="w-3 h-3 text-purple-600" />
                                <span className="text-[10px] text-slate-500 uppercase">Hajiri</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {dayTotals.hajiri}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1 mb-1">
                                <IndianRupee className="w-3 h-3 text-green-600" />
                                <span className="text-[10px] text-slate-500 uppercase">Earnings</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {formatCurrencyShort(dayTotals.earnings)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1 mb-1">
                                <IndianRupee className="w-3 h-3 text-orange-600" />
                                <span className="text-[10px] text-slate-500 uppercase">Advance</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {formatCurrencyShort(dayTotals.advance)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Attendance Section */}
                <div className="px-4">
                    <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                        Records ({attendance.length})
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        </div>
                    ) : attendance.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">No attendance for this day</p>
                            <button
                                onClick={() => setIsAddDialogOpen(true)}
                                className="text-sm text-black dark:text-white underline mt-2"
                            >
                                Mark attendance
                            </button>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {attendance.map((record, index) => (
                                    <motion.div
                                        key={record._id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="flex items-center justify-between py-3"
                                    >
                                        <div
                                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                                            onClick={() => setHistoryStaff(record.staffId)}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                {record.staffId.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                                    {record.staffId.name}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <span>{record.hajiriCount} hajiri</span>
                                                    {record.projectInfo && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-0.5">
                                                                <Building2 className="w-3 h-3" />
                                                                {record.projectInfo.clientName}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-green-600">
                                                    {formatCurrency(record.hajiriCount * record.staffId.dailyRate)}
                                                </p>
                                                {record.advancePayment > 0 && (
                                                    <p className="text-[10px] text-orange-500">
                                                        -{formatCurrency(record.advancePayment)}
                                                    </p>
                                                )}
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                                        <MoreVertical className="w-4 h-4 text-slate-500" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteId(record._id)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Date Selection Dialog */}
            <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
                <DialogContent className="sm:max-w-[300px]">
                    <DialogHeader>
                        <DialogTitle>Select Date</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            type="date"
                            value={tempDate}
                            onChange={(e) => setTempDate(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={applyDateFilter} className="bg-black hover:bg-black/90 text-white w-full">
                            Apply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Attendance Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Mark Attendance
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAdd} className="space-y-4 mt-2">
                        {/* Staff Selection */}
                        <div className="space-y-2">
                            <Label>Staff Member *</Label>
                            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staff.map((s) => (
                                        <SelectItem key={s._id} value={s._id}>
                                            {s.name} - {formatCurrency(s.dailyRate)}/day
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Project Selection */}
                        <div className="space-y-2">
                            <Label>Project (Optional)</Label>
                            <Select value={selectedProjectId || "none"} onValueChange={(v) => setSelectedProjectId(v === "none" ? "" : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Project</SelectItem>
                                    {projects.map((p) => (
                                        <SelectItem key={p._id} value={p._id}>
                                            {p.clientName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedProjectId && projects.find((p) => p._id === selectedProjectId) && (
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {projects.find((p) => p._id === selectedProjectId)?.clientAddress}
                                </p>
                            )}
                        </div>

                        {/* Hajiri Count */}
                        <div className="space-y-2">
                            <Label>Hajiri Count *</Label>
                            <div className="grid grid-cols-4 gap-2">
                                {HAJIRI_OPTIONS.map((option) => (
                                    <Button
                                        key={option.value}
                                        type="button"
                                        variant={hajiriCount === option.value ? "default" : "outline"}
                                        className={hajiriCount === option.value ? "bg-black hover:bg-black/90" : ""}
                                        onClick={() => setHajiriCount(option.value)}
                                        size="sm"
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Advance Payment */}
                        <div className="space-y-2">
                            <Label>Advance (₹)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={advancePayment}
                                onChange={(e) => setAdvancePayment(e.target.value)}
                                min="0"
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                placeholder="Optional notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>

                        {/* Submit */}
                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsAddDialogOpen(false);
                                    resetForm();
                                }}
                                disabled={saving}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-black hover:bg-black/90 text-white"
                            >
                                {saving ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Attendance</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this record?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {deleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Staff History Dialog */}
            <StaffHistoryDialog
                open={!!historyStaff}
                onOpenChange={(open) => !open && setHistoryStaff(null)}
                staff={historyStaff}
            />
        </div>
    );
}
