"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuditLogs } from "@/app/lib/api";
import type { AuditLog, ApiError } from "@/app/types";

export default function AuditLogList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const fetchAuditLogs = useCallback(async () => {
    try {
      const { logs, pages } = await getAuditLogs(page, limit);
      setLogs(logs);
      setTotalPages(pages);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error(apiError.error || "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const filterLogs = useCallback(() => {
    let filtered = [...logs];
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredLogs(filtered);
  }, [logs, searchTerm]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    filterLogs();
  }, [filterLogs]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (logs.length === 0 && page === 1) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Audit Logs Found</h3>
          <p className="text-gray-500 mb-6 text-center">No actions have been logged yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-6 w-6 text-primary" />
            Audit Logs
          </CardTitle>
          <CardDescription>View all admin actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by action or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <AnimatePresence>
            {filteredLogs.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No matching audit logs found</h3>
                <p className="text-gray-500">Try adjusting your search criteria</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log, index) => (
                  <motion.div
                    key={log._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold">{log.action}</h3>
                            <p className="text-sm text-gray-500">
                              Performed by User ID: {log.userId} on {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Details</p>
                          <pre className="text-sm text-gray-700 bg-gray-50 p-2 rounded-md">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-center mt-6">
            <Button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
            <p>Page {page} of {totalPages}</p>
            <Button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}