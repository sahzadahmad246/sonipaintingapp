"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, BarChart3 } from "lucide-react";
import AttendanceSheet from "@/components/staff/AttendanceSheet";
import MonthlySummary from "@/components/staff/MonthlySummary";

export default function AttendancePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <Tabs defaultValue="daily" className="w-full">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="daily" className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Daily Attendance
                        </TabsTrigger>
                        <TabsTrigger value="summary" className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Monthly Summary
                        </TabsTrigger>
                    </TabsList>
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
