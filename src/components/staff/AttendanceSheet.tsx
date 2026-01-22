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
    User,
    Building2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
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
    { value: "0.5", label: "0.5 (Half Day)" },
    { value: "1", label: "1 (Full Day)" },
    { value: "1.5", label: "1.5 (Overtime)" },
    { value: "2", label: "2 (Double Shift)" },
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

    // Date selection
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Attendance Sheet
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Mark daily hajiri for your workers
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsAddDialogOpen(true)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Mark Attendance
                    </Button>
                </div>

                {/* Date Selector */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="flex items-center gap-4">
                                <Calendar className="w-5 h-5 text-purple-500" />
                                <div className="text-center">
                                    <Input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-auto text-center font-medium"
                                    />
                                    <p className="text-sm text-slate-500 mt-1">
                                        {formatDisplayDate(selectedDate)}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Day Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Total Hajiri
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{dayTotals.hajiri}</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <IndianRupee className="w-4 h-4" />
                                    Day Earnings
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{formatCurrency(dayTotals.earnings)}</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <IndianRupee className="w-4 h-4" />
                                    Advance Given
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{formatCurrency(dayTotals.advance)}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Attendance List */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Attendance Records
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : attendance.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No attendance recorded for this day</p>
                                <Button
                                    onClick={() => setIsAddDialogOpen(true)}
                                    variant="link"
                                    className="text-purple-600 mt-2"
                                >
                                    Mark attendance now
                                </Button>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                <div className="space-y-3">
                                    {attendance.map((record, index) => (
                                        <motion.div
                                            key={record._id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center justify-between p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
                                                    onClick={() => setHistoryStaff(record.staffId)}
                                                >
                                                    {record.staffId.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p
                                                        className="font-medium text-slate-800 dark:text-slate-200 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                                        onClick={() => setHistoryStaff(record.staffId)}
                                                    >
                                                        {record.staffId.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                        <span>{record.staffId.staffId}</span>
                                                        {record.projectInfo && (
                                                            <>
                                                                <span>•</span>
                                                                <div className="flex items-center gap-1">
                                                                    <Building2 className="w-3 h-3" />
                                                                    <span>{record.projectInfo.clientName}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    {record.notes && (
                                                        <p className="text-xs text-slate-400 mt-1">{record.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                                        {record.hajiriCount} Hajiri
                                                    </Badge>
                                                    <p className="text-sm font-semibold text-green-600 mt-1">
                                                        {formatCurrency(record.hajiriCount * record.staffId.dailyRate)}
                                                    </p>
                                                    {record.advancePayment > 0 && (
                                                        <p className="text-xs text-orange-500">
                                                            Advance: {formatCurrency(record.advancePayment)}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                                    onClick={() => setDeleteId(record._id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </AnimatePresence>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add Attendance Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-500" />
                            Mark Attendance
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAdd} className="space-y-4 mt-4">
                        {/* Staff Selection */}
                        <div className="space-y-2">
                            <Label>Staff Member *</Label>
                            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select staff member" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staff.map((s) => (
                                        <SelectItem key={s._id} value={s._id}>
                                            {s.name} ({s.staffId}) - {formatCurrency(s.dailyRate)}/day
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
                                    <SelectValue placeholder="Select project site" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Project</SelectItem>
                                    {projects.map((p) => (
                                        <SelectItem key={p._id} value={p._id}>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4" />
                                                {p.clientName}
                                                <span className="text-slate-400">({p.projectId})</span>
                                            </div>
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
                                        className={hajiriCount === option.value ? "bg-purple-500 hover:bg-purple-600" : ""}
                                        onClick={() => setHajiriCount(option.value)}
                                    >
                                        {option.value}
                                    </Button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">
                                0.5 = Half Day, 1 = Full Day (9-5), 1.5 = With Overtime, 2 = Double Shift
                            </p>
                        </div>

                        {/* Advance Payment */}
                        <div className="space-y-2">
                            <Label>Advance Payment (₹)</Label>
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
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                placeholder="Work details, overtime reason..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsAddDialogOpen(false);
                                    resetForm();
                                }}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={saving}
                                className="bg-purple-500 hover:bg-purple-600"
                            >
                                {saving ? "Saving..." : "Mark Attendance"}
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
                            Are you sure you want to delete this attendance record?
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
