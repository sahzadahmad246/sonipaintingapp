"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ChevronLeft,
    ChevronRight,
    IndianRupee,
    Clock,
    Building2,
    Calendar,
    X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
        projectId: string;
        clientName: string;
        clientAddress: string;
    };
    notes?: string;
}

interface StaffHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staff: Staff | null;
}

interface DayInfo {
    date: Date;
    dayOfMonth: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    attendance: AttendanceRecord[];
    totalHajiri: number;
    totalAdvance: number;
}

export default function StaffHistoryDialog({
    open,
    onOpenChange,
    staff,
}: StaffHistoryDialogProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);

    const fetchAttendance = useCallback(async () => {
        if (!staff) return;

        setLoading(true);
        try {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const startDate = new Date(year, month, 1).toISOString().split("T")[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

            const response = await fetch(
                `/api/attendance?staffId=${staff._id}&startDate=${startDate}&endDate=${endDate}`
            );
            if (response.ok) {
                const data = await response.json();
                setAttendanceData(data.attendance);
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
        } finally {
            setLoading(false);
        }
    }, [staff, currentMonth]);

    useEffect(() => {
        if (open && staff) {
            fetchAttendance();
        }
    }, [open, staff, fetchAttendance]);

    const changeMonth = (delta: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
        setSelectedDay(null);
    };

    const getCalendarDays = (): DayInfo[] => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const today = new Date();

        const days: DayInfo[] = [];

        // Get day of week for first day (0 = Sunday)
        const startDayOfWeek = firstDay.getDay();

        // Add previous month days
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({
                date,
                dayOfMonth: date.getDate(),
                isCurrentMonth: false,
                isToday: false,
                attendance: [],
                totalHajiri: 0,
                totalAdvance: 0,
            });
        }

        // Add current month days
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split("T")[0];

            const dayAttendance = attendanceData.filter((a) => {
                const aDate = new Date(a.date).toISOString().split("T")[0];
                return aDate === dateStr;
            });

            const totalHajiri = dayAttendance.reduce((sum, a) => sum + a.hajiriCount, 0);
            const totalAdvance = dayAttendance.reduce((sum, a) => sum + a.advancePayment, 0);

            days.push({
                date,
                dayOfMonth: day,
                isCurrentMonth: true,
                isToday:
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear(),
                attendance: dayAttendance,
                totalHajiri,
                totalAdvance,
            });
        }

        // Fill remaining days
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, month + 1, i);
            days.push({
                date,
                dayOfMonth: i,
                isCurrentMonth: false,
                isToday: false,
                attendance: [],
                totalHajiri: 0,
                totalAdvance: 0,
            });
        }

        return days;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getMonthName = () => {
        return currentMonth.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
        });
    };

    // Calculate monthly totals
    const monthlyTotals = attendanceData.reduce(
        (acc, record) => ({
            hajiri: acc.hajiri + record.hajiriCount,
            advance: acc.advance + record.advancePayment,
        }),
        { hajiri: 0, advance: 0 }
    );

    if (!staff) return null;

    const calendarDays = getCalendarDays();
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <span className="text-xl">{staff.name}</span>
                            <p className="text-sm font-normal text-slate-500">
                                {staff.staffId} • {formatCurrency(staff.dailyRate)}/hajiri
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* Monthly Summary */}
                <div className="grid grid-cols-3 gap-3 my-4">
                    <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-purple-600 dark:text-purple-400">Total Hajiri</p>
                            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                {monthlyTotals.hajiri}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-green-600 dark:text-green-400">Earnings</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                {formatCurrency(monthlyTotals.hajiri * staff.dailyRate)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-orange-600 dark:text-orange-400">Advance</p>
                            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                                {formatCurrency(monthlyTotals.advance)}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                    <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="font-semibold text-lg">{getMonthName()}</h3>
                    <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>

                {/* Calendar */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        {/* Week days header */}
                        <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-800">
                            {weekDays.map((day) => (
                                <div
                                    key={day}
                                    className="p-2 text-center text-xs font-medium text-slate-600 dark:text-slate-400"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="grid grid-cols-7">
                            {calendarDays.map((day, index) => (
                                <div
                                    key={index}
                                    onClick={() => day.isCurrentMonth && day.attendance.length > 0 && setSelectedDay(day)}
                                    className={`
                                        min-h-[70px] p-1 border-t border-r
                                        ${!day.isCurrentMonth ? "bg-slate-50 dark:bg-slate-900 text-slate-400" : "bg-white dark:bg-slate-800"}
                                        ${day.isToday ? "bg-purple-50 dark:bg-purple-900/30" : ""}
                                        ${day.attendance.length > 0 ? "cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20" : ""}
                                    `}
                                >
                                    <div className={`text-xs mb-1 ${day.isToday ? "font-bold text-purple-600" : ""}`}>
                                        {day.dayOfMonth}
                                    </div>
                                    {day.isCurrentMonth && day.totalHajiri > 0 && (
                                        <div className="space-y-1">
                                            <Badge
                                                variant="secondary"
                                                className="w-full justify-center text-xs py-0 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                            >
                                                {day.totalHajiri} H
                                            </Badge>
                                            {day.totalAdvance > 0 && (
                                                <div className="text-[10px] text-orange-600 text-center truncate">
                                                    ₹{day.totalAdvance}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Selected Day Detail Dialog */}
                {selectedDay && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedDay(null)}>
                        <div
                            className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-purple-500" />
                                    {selectedDay.date.toLocaleDateString("en-IN", {
                                        weekday: "long",
                                        day: "2-digit",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </h3>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedDay(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {selectedDay.attendance.map((record, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <Badge className="bg-purple-500">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {record.hajiriCount} Hajiri
                                            </Badge>
                                            <span className="font-semibold text-green-600">
                                                {formatCurrency(record.hajiriCount * staff.dailyRate)}
                                            </span>
                                        </div>

                                        {record.projectInfo && (
                                            <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 mb-1">
                                                <Building2 className="w-3 h-3" />
                                                {record.projectInfo.clientName}
                                            </div>
                                        )}

                                        {record.advancePayment > 0 && (
                                            <div className="flex items-center gap-1 text-sm text-orange-600">
                                                <IndianRupee className="w-3 h-3" />
                                                Advance: {formatCurrency(record.advancePayment)}
                                            </div>
                                        )}

                                        {record.notes && (
                                            <p className="text-xs text-slate-500 mt-2 italic">
                                                {record.notes}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Day totals */}
                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between text-sm">
                                    <span>Total Hajiri:</span>
                                    <span className="font-bold text-purple-600">{selectedDay.totalHajiri}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Total Earnings:</span>
                                    <span className="font-bold text-green-600">
                                        {formatCurrency(selectedDay.totalHajiri * staff.dailyRate)}
                                    </span>
                                </div>
                                {selectedDay.totalAdvance > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span>Total Advance:</span>
                                        <span className="font-bold text-orange-600">
                                            {formatCurrency(selectedDay.totalAdvance)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
