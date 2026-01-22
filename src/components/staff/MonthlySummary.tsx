"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Calendar,
    IndianRupee,
    Clock,
    User,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Staff {
    _id: string;
    staffId: string;
    name: string;
    dailyRate: number;
}

interface AttendanceRecord {
    _id: string;
    date: string;
    hajiriCount: number;
    advancePayment: number;
    projectInfo?: {
        clientName: string;
    };
    notes?: string;
}

interface SummaryData {
    staff: Staff;
    period: {
        startDate: string;
        endDate: string;
    };
    summary: {
        totalHajiri: number;
        uniqueDaysWorked: number;
        totalEntries: number;
        grossEarnings: number;
        totalAdvance: number;
        netPayable: number;
    };
    attendanceRecords: AttendanceRecord[];
}

export default function MonthlySummary() {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch staff list
    const fetchStaff = useCallback(async () => {
        try {
            const response = await fetch("/api/staff?status=active");
            if (response.ok) {
                const data = await response.json();
                setStaffList(data.staff);
                if (data.staff.length > 0 && !selectedStaffId) {
                    setSelectedStaffId(data.staff[0]._id);
                }
            }
        } catch (error) {
            console.error("Error fetching staff:", error);
        }
    }, [selectedStaffId]);

    // Fetch summary data
    const fetchSummary = useCallback(async () => {
        if (!selectedStaffId) return;

        setLoading(true);
        try {
            const response = await fetch(
                `/api/attendance/summary?staffId=${selectedStaffId}&month=${selectedMonth}`
            );
            if (!response.ok) throw new Error("Failed to fetch summary");
            const data = await response.json();
            setSummaryData(data);
        } catch (error) {
            console.error("Error fetching summary:", error);
            toast.error("Failed to fetch summary");
        } finally {
            setLoading(false);
        }
    }, [selectedStaffId, selectedMonth]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const changeMonth = (delta: number) => {
        const [year, month] = selectedMonth.split("-").map(Number);
        const date = new Date(year, month - 1 + delta, 1);
        setSelectedMonth(
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
        });
    };

    const getMonthName = (monthStr: string) => {
        const [year, month] = monthStr.split("-").map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                        Monthly Summary
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        View earnings calculation for staff members
                    </p>
                </div>

                {/* Filters */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            {/* Staff Selector */}
                            <div className="flex-1 w-full">
                                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                                    <SelectTrigger>
                                        <User className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Select staff member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffList.map((staff) => (
                                            <SelectItem key={staff._id} value={staff._id}>
                                                {staff.name} ({staff.staffId})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Month Selector */}
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="min-w-[150px] text-center">
                                    <span className="font-medium">{getMonthName(selectedMonth)}</span>
                                </div>
                                <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : summaryData ? (
                    <>
                        {/* Staff Info */}
                        <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white border-0 shadow-lg">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                                        {summaryData.staff.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">{summaryData.staff.name}</h2>
                                        <p className="text-white/80">
                                            {summaryData.staff.staffId} • Rate: {formatCurrency(summaryData.staff.dailyRate)}/hajiri
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Total Hajiri
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-purple-600">
                                            {summaryData.summary.totalHajiri}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {summaryData.summary.uniqueDaysWorked} unique days
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" />
                                            Gross Earnings
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-green-600">
                                            {formatCurrency(summaryData.summary.grossEarnings)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                            <IndianRupee className="w-4 h-4" />
                                            Total Advance
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-orange-600">
                                            {formatCurrency(summaryData.summary.totalAdvance)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white border-0 shadow-lg">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                                            <Wallet className="w-4 h-4" />
                                            Net Payable
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold">
                                            {formatCurrency(summaryData.summary.netPayable)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>

                        {/* Calculation Breakdown */}
                        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Calendar className="w-5 h-5" />
                                    Calculation Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                        <span>Total Hajiri × Daily Rate</span>
                                        <span>
                                            {summaryData.summary.totalHajiri} × {formatCurrency(summaryData.staff.dailyRate)} = {formatCurrency(summaryData.summary.grossEarnings)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                        <span>Less: Advance Payments</span>
                                        <span className="text-orange-600">- {formatCurrency(summaryData.summary.totalAdvance)}</span>
                                    </div>
                                    <div className="flex justify-between py-2 font-bold text-lg">
                                        <span>Net Payable</span>
                                        <span className="text-teal-600">{formatCurrency(summaryData.summary.netPayable)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Attendance Records */}
                        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Clock className="w-5 h-5" />
                                    Attendance Records
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {summaryData.attendanceRecords.length === 0 ? (
                                    <p className="text-center text-slate-500 py-8">
                                        No attendance records for this month
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                                    <th className="text-left p-2">Date</th>
                                                    <th className="text-left p-2">Project</th>
                                                    <th className="text-right p-2">Hajiri</th>
                                                    <th className="text-right p-2">Earnings</th>
                                                    <th className="text-right p-2">Advance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summaryData.attendanceRecords.map((record) => (
                                                    <tr
                                                        key={record._id}
                                                        className="border-b border-slate-100 dark:border-slate-800"
                                                    >
                                                        <td className="p-2">{formatDate(record.date)}</td>
                                                        <td className="p-2 text-slate-500">
                                                            {record.projectInfo?.clientName || "-"}
                                                        </td>
                                                        <td className="p-2 text-right">
                                                            <Badge variant="secondary">{record.hajiriCount}</Badge>
                                                        </td>
                                                        <td className="p-2 text-right text-green-600">
                                                            {formatCurrency(record.hajiriCount * summaryData.staff.dailyRate)}
                                                        </td>
                                                        <td className="p-2 text-right text-orange-600">
                                                            {record.advancePayment > 0
                                                                ? formatCurrency(record.advancePayment)
                                                                : "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <div className="text-center py-12 text-slate-500">
                        <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Select a staff member to view their monthly summary</p>
                    </div>
                )}
            </div>
        </div>
    );
}
