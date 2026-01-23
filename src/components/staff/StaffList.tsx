"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    Phone,
    IndianRupee,
    Edit,
    UserX,
    Users,
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

    const activeCount = staff.filter((s) => s.status === "active").length;
    const inactiveCount = staff.filter((s) => s.status === "inactive").length;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            <div className="max-w-7xl mx-auto">
                {/* Header - Compact */}
                <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 px-4 pt-4 pb-2">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            Staff
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
                            placeholder="Search staff..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 bg-white dark:bg-slate-800"
                        />
                    </div>
                </div>

                {/* Stats - Compact Row */}
                <div className="px-4 py-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1 mb-1">
                                <Users className="w-3 h-3 text-green-600" />
                                <span className="text-[10px] text-slate-500 uppercase">Active</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {activeCount}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1 mb-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] text-slate-500 uppercase">Inactive</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {inactiveCount}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters - Chips */}
                <div className="px-4 pb-3">
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setStatusFilter("all")}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === "all"
                                    ? "bg-black text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setStatusFilter("active")}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === "active"
                                    ? "bg-black text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusFilter("inactive")}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === "inactive"
                                    ? "bg-black text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>

                {/* Staff Section */}
                <div className="px-4">
                    <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                        Staff Members
                    </h2>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        </div>
                    ) : staff.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">No staff members found</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {staff.map((member, index) => (
                                    <motion.div
                                        key={member._id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        className={`flex items-center justify-between py-3 ${member.status === "inactive" ? "opacity-60" : ""
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                                    {member.name}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {member.mobile}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1 text-green-600 font-medium">
                                                        <IndianRupee className="w-3 h-3" />
                                                        {formatCurrency(member.dailyRate)}/day
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                                    <MoreVertical className="w-4 h-4 text-slate-500" />
                                                </button>
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
                                    </motion.div>
                                ))}
                            </div>
                        </AnimatePresence>
                    )}
                </div>
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
