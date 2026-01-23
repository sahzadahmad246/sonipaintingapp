"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    Calendar,
    TrendingUp,
    TrendingDown,
    Wallet,
    Search,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AddTransactionDialog from "./AddTransactionDialog";

interface Transaction {
    _id: string;
    type: "credit" | "debit";
    amount: number;
    date: string;
    note: string;
    category?: string;
    createdAt: string;
}

interface Totals {
    credit: number;
    debit: number;
    balance: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function TransactionList() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [totals, setTotals] = useState<Totals>({ credit: 0, debit: 0, balance: 0 });
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [tempStartDate, setTempStartDate] = useState("");
    const [tempEndDate, setTempEndDate] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Selection mode
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", pagination.page.toString());
            params.set("limit", pagination.limit.toString());
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);
            if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);

            const response = await fetch(`/api/transactions?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch transactions");

            const data = await response.json();
            setTransactions(data.transactions);
            setTotals(data.totals);
            setPagination(data.pagination);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            toast.error("Failed to fetch transactions");
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, startDate, endDate, typeFilter]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const response = await fetch(`/api/transactions/${deleteId}`, {
                method: "DELETE",
            });
            if (!response.ok) throw new Error("Failed to delete transaction");
            toast.success("Transaction deleted successfully");
            fetchTransactions();
        } catch (error) {
            console.error("Error deleting transaction:", error);
            toast.error("Failed to delete transaction");
        } finally {
            setDeleting(false);
            setDeleteId(null);
        }
    };

    const handleAddSuccess = () => {
        setIsAddDialogOpen(false);
        fetchTransactions();
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        setDeleting(true);
        try {
            const deletePromises = Array.from(selectedIds).map((id) =>
                fetch(`/api/transactions/${id}`, { method: "DELETE" })
            );
            await Promise.all(deletePromises);
            toast.success(`${selectedIds.size} transaction(s) deleted`);
            setSelectedIds(new Set());
            setIsSelectMode(false);
            fetchTransactions();
        } catch (error) {
            console.error("Error deleting transactions:", error);
            toast.error("Failed to delete some transactions");
        } finally {
            setDeleting(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredTransactions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTransactions.map((t) => t._id)));
        }
    };

    const exitSelectMode = () => {
        setIsSelectMode(false);
        setSelectedIds(new Set());
    };

    const handleApplyDateFilter = () => {
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
        setIsDateDialogOpen(false);
    };

    const handleClearDateFilter = () => {
        setTempStartDate("");
        setTempEndDate("");
        setStartDate("");
        setEndDate("");
        setIsDateDialogOpen(false);
    };

    const openDateDialog = () => {
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setIsDateDialogOpen(true);
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

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
        });
    };

    // Filter transactions by search query (client-side)
    const filteredTransactions = transactions.filter((t) =>
        t.note.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hasDateFilter = startDate || endDate;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            <div className="max-w-7xl mx-auto">
                {/* Header - Compact */}
                <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 px-4 pt-4 pb-2">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            Expenses
                        </h1>
                        <Button
                            onClick={() => setIsAddDialogOpen(true)}
                            size="icon"
                            className="bg-black hover:bg-black/90 text-white h-9 w-9"
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="mt-3 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 bg-white dark:bg-slate-800"
                        />
                    </div>
                </div>

                {/* Stats - Compact Row */}
                <div className="px-4 py-3">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1 mb-1">
                                <TrendingUp className="w-3 h-3 text-green-600" />
                                <span className="text-[10px] text-slate-500 uppercase">Income</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {formatCurrencyShort(totals.credit)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1 mb-1">
                                <TrendingDown className="w-3 h-3 text-red-600" />
                                <span className="text-[10px] text-slate-500 uppercase">Expense</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {formatCurrencyShort(totals.debit)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1 mb-1">
                                <Wallet className="w-3 h-3 text-slate-500" />
                                <span className="text-[10px] text-slate-500 uppercase">Balance</span>
                            </div>
                            <p className={`text-sm font-bold ${totals.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrencyShort(totals.balance)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters - Chips */}
                <div className="px-4 pb-3">
                    <div className="flex gap-2 flex-wrap">
                        {isSelectMode ? (
                            <>
                                <button
                                    onClick={toggleSelectAll}
                                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                >
                                    {selectedIds.size === filteredTransactions.length ? "Deselect All" : "Select All"}
                                </button>
                                <button
                                    onClick={exitSelectMode}
                                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                >
                                    Cancel
                                </button>
                                {selectedIds.size > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        disabled={deleting}
                                        className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-500 text-white"
                                    >
                                        {deleting ? "Deleting..." : `Delete (${selectedIds.size})`}
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setTypeFilter("all")}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === "all"
                                        ? "bg-black text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setTypeFilter("debit")}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === "debit"
                                        ? "bg-black text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                        }`}
                                >
                                    Expense
                                </button>
                                <button
                                    onClick={() => setTypeFilter("credit")}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === "credit"
                                        ? "bg-black text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                        }`}
                                >
                                    Income
                                </button>
                                <button
                                    onClick={openDateDialog}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${hasDateFilter
                                        ? "bg-black text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                        }`}
                                >
                                    <Calendar className="w-3.5 h-3.5" />
                                    Date
                                </button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                            <MoreVertical className="w-3.5 h-3.5" />
                                            More
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => setIsSelectMode(true)}>
                                            Select
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}
                    </div>
                </div>

                {/* Transactions Section */}
                <div className="px-4">
                    <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                        Transactions
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">No transactions found</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredTransactions.map((transaction, index) => (
                                    <motion.div
                                        key={transaction._id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        className={`flex items-center justify-between py-3 ${isSelectMode ? "cursor-pointer" : ""}`}
                                        onClick={isSelectMode ? () => toggleSelection(transaction._id) : undefined}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {isSelectMode ? (
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedIds.has(transaction._id)
                                                    ? "bg-black border-black"
                                                    : "border-slate-300 dark:border-slate-600"
                                                    }`}>
                                                    {selectedIds.has(transaction._id) && (
                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            ) : transaction.type === "credit" ? (
                                                <ArrowDownLeft className="w-5 h-5 text-green-600 flex-shrink-0" />
                                            ) : (
                                                <ArrowUpRight className="w-5 h-5 text-red-600 flex-shrink-0" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                                    {transaction.note}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {formatDate(transaction.date)}
                                                    {transaction.category && ` • ${transaction.category}`}
                                                </p>
                                            </div>
                                        </div>
                                        <p
                                            className={`text-sm font-semibold flex-shrink-0 ${transaction.type === "credit"
                                                ? "text-green-600"
                                                : "text-red-600"
                                                }`}
                                        >
                                            {transaction.type === "credit" ? "+" : "-"}
                                            {formatCurrency(transaction.amount)}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        </AnimatePresence>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-4 pb-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page <= 1}
                                onClick={() =>
                                    setPagination((p) => ({ ...p, page: p.page - 1 }))
                                }
                                className="h-8"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-xs text-slate-500">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() =>
                                    setPagination((p) => ({ ...p, page: p.page + 1 }))
                                }
                                className="h-8"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Transaction Dialog */}
            <AddTransactionDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSuccess={handleAddSuccess}
            />

            {/* Date Filter Dialog */}
            <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
                <DialogContent className="sm:max-w-[340px]">
                    <DialogHeader>
                        <DialogTitle>Select Date Range</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">From</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={tempStartDate}
                                onChange={(e) => setTempStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">To</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={tempEndDate}
                                onChange={(e) => setTempEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={handleClearDateFilter}>
                            Clear
                        </Button>
                        <Button onClick={handleApplyDateFilter} className="bg-black hover:bg-black/90 text-white">
                            Apply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this transaction?
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
        </div>
    );
}
