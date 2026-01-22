"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    Trash2,
    Filter,
    Calendar,
    IndianRupee,
    TrendingUp,
    TrendingDown,
    Wallet,
    Search,
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
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

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
            year: "numeric",
        });
    };

    // Filter transactions by search query (client-side)
    const filteredTransactions = transactions.filter((t) =>
        t.note.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Expense Management
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Track your business income and expenses
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsAddDialogOpen(true)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Transaction
                    </Button>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg shadow-green-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Total Income
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{formatCurrency(totals.credit)}</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-0 shadow-lg shadow-red-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4" />
                                    Total Expenses
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{formatCurrency(totals.debit)}</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className={`border-0 shadow-lg ${totals.balance >= 0
                                ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20"
                                : "bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/20"
                            } text-white`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Wallet className="w-4 h-4" />
                                    Net Balance
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{formatCurrency(totals.balance)}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Filters */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search by note..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-[140px]"
                                    />
                                    <span className="text-slate-400">to</span>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-[140px]"
                                    />
                                </div>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Filter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="credit">Income Only</SelectItem>
                                        <SelectItem value="debit">Expenses Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Transaction List */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IndianRupee className="w-5 h-5" />
                            Transactions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filteredTransactions.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No transactions found</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                <div className="space-y-3">
                                    {filteredTransactions.map((transaction, index) => (
                                        <motion.div
                                            key={transaction._id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`flex items-center justify-between p-4 rounded-xl border ${transaction.type === "credit"
                                                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`p-2 rounded-full ${transaction.type === "credit"
                                                            ? "bg-green-500 text-white"
                                                            : "bg-red-500 text-white"
                                                        }`}
                                                >
                                                    {transaction.type === "credit" ? (
                                                        <ArrowDownLeft className="w-5 h-5" />
                                                    ) : (
                                                        <ArrowUpRight className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                                        {transaction.note}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                        <span>{formatDate(transaction.date)}</span>
                                                        {transaction.category && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="capitalize">{transaction.category}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p
                                                    className={`text-lg font-bold ${transaction.type === "credit"
                                                            ? "text-green-600 dark:text-green-400"
                                                            : "text-red-600 dark:text-red-400"
                                                        }`}
                                                >
                                                    {transaction.type === "credit" ? "+" : "-"}
                                                    {formatCurrency(transaction.amount)}
                                                </p>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                                    onClick={() => setDeleteId(transaction._id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </AnimatePresence>
                        )}

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page <= 1}
                                    onClick={() =>
                                        setPagination((p) => ({ ...p, page: p.page - 1 }))
                                    }
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </Button>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() =>
                                        setPagination((p) => ({ ...p, page: p.page + 1 }))
                                    }
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add Transaction Dialog */}
            <AddTransactionDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSuccess={handleAddSuccess}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this transaction? This action cannot be undone.
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
