"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
    Send,
    Download,
    User,
    Phone,
    IndianRupee,
    Clock,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
    generateEmployeeReportPDF,
    type MonthlyReportData,
    type AttendanceRecord,
} from "@/app/lib/generate-employee-report-pdf";

interface Staff {
    _id: string;
    staffId: string;
    name: string;
    mobile: string;
    dailyRate: number;
}

interface SendReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staff: Staff | null;
    month: number;
    year: number;
    attendanceData: AttendanceRecord[];
    monthlyTotals: {
        hajiri: number;
        advance: number;
    };
}

export default function SendReportDialog({
    open,
    onOpenChange,
    staff,
    month,
    year,
    attendanceData,
    monthlyTotals,
}: SendReportDialogProps) {
    const [name, setName] = useState("");
    const [mobile, setMobile] = useState("");
    const [sending, setSending] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle");

    // Format phone number with +91 if not already formatted
    const formatPhoneWithCountryCode = (phone: string): string => {
        if (!phone) return "";
        // Remove all non-digit characters except +
        const cleaned = phone.replace(/[^\d+]/g, "");
        // If already has +91, return as is
        if (cleaned.startsWith("+91")) return cleaned;
        // If starts with 91 (without +), add +
        if (cleaned.startsWith("91") && cleaned.length > 10) return "+" + cleaned;
        // If it's a 10-digit number, add +91
        if (cleaned.length === 10) return "+91" + cleaned;
        // Otherwise return with +91 prefix
        return "+91" + cleaned.replace(/^0+/, ""); // Remove leading zeros
    };

    // Reset form when dialog opens
    useEffect(() => {
        if (open && staff) {
            setName(staff.name);
            setMobile(formatPhoneWithCountryCode(staff.mobile));
            setSendStatus("idle");
        }
    }, [open, staff]);

    if (!staff) return null;

    const earnings = monthlyTotals.hajiri * staff.dailyRate;
    const netPayable = earnings - monthlyTotals.advance;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getMonthName = () => {
        const date = new Date(year, month, 1);
        return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const reportData: MonthlyReportData = {
                staff: {
                    staffId: staff.staffId,
                    name: name,
                    mobile: mobile,
                    dailyRate: staff.dailyRate,
                },
                month,
                year,
                attendance: attendanceData,
            };

            generateEmployeeReportPDF(reportData, { download: true });
            toast.success("PDF downloaded successfully!");
        } catch (error) {
            console.error("Error downloading PDF:", error);
            toast.error("Failed to download PDF");
        } finally {
            setDownloading(false);
        }
    };

    const handleSend = async () => {
        if (!mobile || mobile.length < 10) {
            toast.error("Please enter a valid mobile number");
            return;
        }

        setSending(true);
        setSendStatus("idle");

        try {
            const response = await fetch("/api/staff/send-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    staffId: staff._id,
                    staffName: name,
                    mobile: mobile,
                    month,
                    year,
                    dailyRate: staff.dailyRate,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send report");
            }

            setSendStatus("success");
            toast.success("Report sent successfully on WhatsApp!");
        } catch (error) {
            console.error("Error sending report:", error);
            setSendStatus("error");
            toast.error(error instanceof Error ? error.message : "Failed to send report");
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-green-600" />
                        Send Monthly Report
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Period */}
                    <div className="text-center text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg py-2">
                        Report for <span className="font-semibold">{getMonthName()}</span>
                    </div>

                    {/* Editable fields */}
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="flex items-center gap-1.5 text-xs">
                                <User className="w-3 h-3" /> Employee Name
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Employee name"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="mobile" className="flex items-center gap-1.5 text-xs">
                                <Phone className="w-3 h-3" /> WhatsApp Number
                            </Label>
                            <Input
                                id="mobile"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                placeholder="+91 XXXXXXXXXX"
                            />
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-2">
                        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
                            <CardContent className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-purple-600 mb-1">
                                    <Clock className="w-3 h-3" /> Total Hajiri
                                </div>
                                <p className="text-xl font-bold text-purple-700">
                                    {monthlyTotals.hajiri}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
                            <CardContent className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-green-600 mb-1">
                                    <IndianRupee className="w-3 h-3" /> Earnings
                                </div>
                                <p className="text-xl font-bold text-green-700">
                                    {formatCurrency(earnings)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200">
                            <CardContent className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-orange-600 mb-1">
                                    <IndianRupee className="w-3 h-3" /> Advance
                                </div>
                                <p className="text-xl font-bold text-orange-700">
                                    {formatCurrency(monthlyTotals.advance)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                            <CardContent className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-blue-600 mb-1">
                                    <IndianRupee className="w-3 h-3" /> Net Payable
                                </div>
                                <p className="text-xl font-bold text-blue-700">
                                    {formatCurrency(netPayable)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Status message */}
                    {sendStatus === "success" && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            Report sent successfully!
                        </div>
                    )}
                    {sendStatus === "error" && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm">
                            <AlertCircle className="w-4 h-4" />
                            Failed to send. Try downloading instead.
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={handleDownload}
                        disabled={downloading || sending}
                        className="flex-1"
                    >
                        {downloading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        Download PDF
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={sending || downloading || sendStatus === "success"}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 mr-2" />
                        )}
                        Send WhatsApp
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
