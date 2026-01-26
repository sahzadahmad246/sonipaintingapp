"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, BarChart3 } from "lucide-react";
import AttendanceSheet from "@/components/staff/AttendanceSheet";
import MonthlySummary from "@/components/staff/MonthlySummary";

export default function AttendancePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <Tabs defaultValue="daily" className="w-full">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
                    <div className="max-w-5xl mx-auto px-4 py-3">
                        <TabsList className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-full md:w-auto">
                            <TabsTrigger
                                value="daily"
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 md:px-6 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white flex-1 md:flex-none"
                            >
                                <Clock className="w-4 h-4" />
                                <span>Daily Attendance</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="summary"
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 md:px-6 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white flex-1 md:flex-none"
                            >
                                <BarChart3 className="w-4 h-4" />
                                <span>Monthly Summary</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </div>

                <TabsContent value="daily" className="mt-0">
                    <AttendanceSheet />
                </TabsContent>

                <TabsContent value="summary" className="mt-0">
                    <MonthlySummary />
                </TabsContent>
            </Tabs>
        </div>
    );
}
