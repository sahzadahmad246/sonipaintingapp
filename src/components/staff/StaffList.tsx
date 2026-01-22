"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    Phone,
    IndianRupee,
    Calendar,
    Edit,
    UserX,
    User,
    Users,
    MoreVertical,
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import AddStaffDialog from "./AddStaffDialog";
import EditStaffDialog from "./EditStaffDialog";

interface Staff {
    _id: string;
    staffId: string;
    name: string;
    mobile: string;
    dailyRate: number;
    status: "active" | "inactive";
    joiningDate: string;
    address?: string;
    emergencyContact?: string;
    notes?: string;
    createdAt: string;
}

export default function StaffList() {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editStaff, setEditStaff] = useState<Staff | null>(null);
    const [deactivateId, setDeactivateId] = useState<string | null>(null);
    const [deactivating, setDeactivating] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("active");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
            if (searchQuery) params.set("search", searchQuery);

            const response = await fetch(`/api/staff?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch staff");

            const data = await response.json();
            setStaff(data.staff);
        } catch (error) {
            console.error("Error fetching staff:", error);
            toast.error("Failed to fetch staff");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, searchQuery]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const handleDeactivate = async () => {
        if (!deactivateId) return;
        setDeactivating(true);
        try {
            const response = await fetch(`/api/staff/${deactivateId}`, {
                method: "DELETE",
            });
            if (!response.ok) throw new Error("Failed to deactivate staff");
            toast.success("Staff marked as inactive");
            fetchStaff();
        } catch (error) {
            console.error("Error deactivating staff:", error);
            toast.error("Failed to deactivate staff");
        } finally {
            setDeactivating(false);
            setDeactivateId(null);
        }
    };

    const handleAddSuccess = () => {
        setIsAddDialogOpen(false);
        fetchStaff();
    };

    const handleEditSuccess = () => {
        setEditStaff(null);
        fetchStaff();
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

    const activeCount = staff.filter((s) => s.status === "active").length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                            Staff Management
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Manage your workers and their daily rates
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsAddDialogOpen(true)}
                        className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Staff
                    </Button>
                </div>

                {/* Stats Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0 shadow-lg shadow-orange-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Active Workers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{activeCount}</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Filters */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search by name, mobile, or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Staff List */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Staff Members
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : staff.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No staff members found</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {staff.map((member, index) => (
                                        <motion.div
                                            key={member._id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`p-4 rounded-xl border-2 ${member.status === "active"
                                                    ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                                    : "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600 opacity-70"
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold">
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {member.name}
                                                        </h3>
                                                        <p className="text-xs text-slate-500">{member.staffId}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={member.status === "active" ? "default" : "secondary"}
                                                        className={
                                                            member.status === "active"
                                                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                                : ""
                                                        }
                                                    >
                                                        {member.status}
                                                    </Badge>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => setEditStaff(member)}>
                                                                <Edit className="w-4 h-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            {member.status === "active" && (
                                                                <DropdownMenuItem
                                                                    onClick={() => setDeactivateId(member._id)}
                                                                    className="text-red-600"
                                                                >
                                                                    <UserX className="w-4 h-4 mr-2" />
                                                                    Deactivate
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                    <Phone className="w-4 h-4" />
                                                    <span>{member.mobile}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                    <IndianRupee className="w-4 h-4" />
                                                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                                                        {formatCurrency(member.dailyRate)}/day
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Joined {formatDate(member.joiningDate)}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </AnimatePresence>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add Staff Dialog */}
            <AddStaffDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSuccess={handleAddSuccess}
            />

            {/* Edit Staff Dialog */}
            {editStaff && (
                <EditStaffDialog
                    open={!!editStaff}
                    onOpenChange={(open) => !open && setEditStaff(null)}
                    staff={editStaff}
                    onSuccess={handleEditSuccess}
                />
            )}

            {/* Deactivate Confirmation Dialog */}
            <AlertDialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate Staff</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to mark this staff member as inactive?
                            Their attendance history will be preserved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deactivating}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeactivate}
                            disabled={deactivating}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {deactivating ? "Deactivating..." : "Deactivate"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
