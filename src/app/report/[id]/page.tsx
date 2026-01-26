"use client";

import { useState, useEffect, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock,
    IndianRupee,
    CheckCircle2,
    Download,
    ArrowRight,
    Shield,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface ReportData {
    reportId: string;
    staffName: string;
    month: string;
    year: number;
    totalHajiri: number;
    dailyRate: number;
    earnings: number;
    advance: number;
    netPayable: number;
    attendanceRecords?: {
        date: string;
        hajiriCount: number;
        advancePayment: number;
        projectName?: string;
    }[];
    sentAt: string;
}

interface PageParams {
    id: string;
}

export default function ReportPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const reportId = resolvedParams.id;

    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState("");
    const [phoneHint, setPhoneHint] = useState("");
    const [staffName, setStaffName] = useState("");
    const [month, setMonth] = useState("");
    const [digits, setDigits] = useState("");
    const [verified, setVerified] = useState(false);
    const [report, setReport] = useState<ReportData | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [generating, setGenerating] = useState(false);

    const fetchReportInfo = useCallback(async () => {
        try {
            const response = await fetch(`/api/report/${reportId}`);
            if (response.status === 404) {
                setNotFound(true);
                return;
            }
            if (response.ok) {
                const data = await response.json();
                setPhoneHint(data.report.phoneHint);
                setStaffName(data.report.staffName);
                setMonth(`${data.report.month} ${data.report.year}`);
            }
        } catch (err) {
            console.error("Error fetching report:", err);
            setError("Failed to load report");
        } finally {
            setLoading(false);
        }
    }, [reportId]);

    useEffect(() => {
        fetchReportInfo();
    }, [fetchReportInfo]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (digits.length !== 4) {
            setError("Please enter 4 digits");
            return;
        }

        setVerifying(true);
        setError("");

        try {
            const response = await fetch(`/api/report/${reportId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lastFourDigits: digits }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Verification failed");
                return;
            }

            setReport(data.report);
            setVerified(true);
        } catch (err) {
            console.error("Verification error:", err);
            setError("Something went wrong");
        } finally {
            setVerifying(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!report) return;

        setGenerating(true);
        try {
            const response = await fetch(`/api/report/${reportId}/pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lastFourDigits: digits }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate PDF");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${report.staffName.replace(/\s+/g, "_")}_${report.month}_${report.year}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error downloading PDF:", error);
            setError("Failed to download PDF");
        } finally {
            setGenerating(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-white/10 backdrop-blur border-white/20">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
                        <h1 className="text-2xl font-bold text-white mb-2">Report Not Found</h1>
                        <p className="text-slate-300">This report link is invalid or has expired.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg">
                        <Clock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                        Attendance Report
                    </h1>
                    <p className="text-slate-400">Soni Painting</p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {!verified ? (
                        /* Verification Form */
                        <motion.div
                            key="verify"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <Card className="bg-white/10 backdrop-blur border-white/20 overflow-hidden">
                                <CardContent className="p-6">
                                    {/* Info Preview */}
                                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                                            {staffName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{staffName}</p>
                                            <p className="text-sm text-slate-400">{month}</p>
                                        </div>
                                    </div>

                                    {/* Verification */}
                                    <div className="text-center mb-6">
                                        <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500/20 rounded-full mb-3">
                                            <Shield className="w-6 h-6 text-amber-400" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-white mb-1">
                                            Verify Your Identity
                                        </h2>
                                        <p className="text-sm text-slate-400">
                                            Enter the last 4 digits of your phone number starting with{" "}
                                            <span className="font-mono font-bold text-white">
                                                {phoneHint}****
                                            </span>
                                        </p>
                                    </div>

                                    <form onSubmit={handleVerify}>
                                        <div className="mb-4">
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="Enter 4 digits"
                                                value={digits}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                                    setDigits(val);
                                                    setError("");
                                                }}
                                                className="text-center text-2xl tracking-[0.5em] font-mono bg-white/10 border-white/20 text-white placeholder:text-slate-500 h-14"
                                                maxLength={4}
                                            />
                                        </div>

                                        {error && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-red-400 text-sm text-center mb-4"
                                            >
                                                {error}
                                            </motion.p>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={digits.length !== 4 || verifying}
                                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-12"
                                        >
                                            {verifying ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    View Report
                                                    <ArrowRight className="w-4 h-4 ml-2" />
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ) : (
                        /* Report View */
                        <motion.div
                            key="report"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            {report && (
                                <>
                                    {/* Success Badge */}
                                    <div className="flex justify-center mb-6">
                                        <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Verified Successfully
                                        </div>
                                    </div>

                                    {/* Staff Info Card */}
                                    <Card className="bg-white/10 backdrop-blur border-white/20 mb-4">
                                        <CardContent className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                                                    {report.staffName.charAt(0)}
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-white">
                                                        {report.staffName}
                                                    </h2>
                                                    <p className="text-slate-400">
                                                        {report.month} {report.year}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <Card className="bg-purple-500/20 border-purple-500/30">
                                            <CardContent className="p-4 text-center">
                                                <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                                                <p className="text-2xl font-bold text-white">
                                                    {report.totalHajiri}
                                                </p>
                                                <p className="text-xs text-purple-300">Total Hajiri</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-green-500/20 border-green-500/30">
                                            <CardContent className="p-4 text-center">
                                                <IndianRupee className="w-5 h-5 text-green-400 mx-auto mb-1" />
                                                <p className="text-2xl font-bold text-white">
                                                    {formatCurrency(report.earnings)}
                                                </p>
                                                <p className="text-xs text-green-300">Earnings</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-orange-500/20 border-orange-500/30">
                                            <CardContent className="p-4 text-center">
                                                <IndianRupee className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                                                <p className="text-2xl font-bold text-white">
                                                    {formatCurrency(report.advance)}
                                                </p>
                                                <p className="text-xs text-orange-300">Advance</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-emerald-500/20 border-emerald-500/30">
                                            <CardContent className="p-4 text-center">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                                                <p className="text-2xl font-bold text-white">
                                                    {formatCurrency(report.netPayable)}
                                                </p>
                                                <p className="text-xs text-emerald-300">Net Payable</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Calculation Breakdown */}
                                    <Card className="bg-white/10 backdrop-blur border-white/20 mb-4">
                                        <CardContent className="p-5">
                                            <h3 className="font-semibold text-white mb-3">Calculation</h3>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between text-slate-300">
                                                    <span>Total Hajiri × Daily Rate</span>
                                                    <span className="text-white">
                                                        {report.totalHajiri} × {formatCurrency(report.dailyRate)} = {formatCurrency(report.earnings)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-slate-300">
                                                    <span>Less: Advance</span>
                                                    <span className="text-orange-400">
                                                        - {formatCurrency(report.advance)}
                                                    </span>
                                                </div>
                                                <div className="border-t border-white/10 pt-2 flex justify-between font-semibold">
                                                    <span className="text-white">Net Payable</span>
                                                    <span className="text-emerald-400">
                                                        {formatCurrency(report.netPayable)}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Download Button */}
                                    <Button
                                        onClick={handleDownloadPDF}
                                        disabled={generating}
                                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white h-12"
                                    >
                                        {generating ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Download className="w-5 h-5 mr-2" />
                                                Download PDF
                                            </>
                                        )}
                                    </Button>

                                    {/* Footer */}
                                    <p className="text-center text-slate-500 text-xs mt-6">
                                        Report generated on{" "}
                                        {new Date(report.sentAt).toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </p>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
