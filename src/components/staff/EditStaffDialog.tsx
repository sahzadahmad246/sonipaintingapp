"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Edit } from "lucide-react";
import { toast } from "sonner";

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
}

interface EditStaffDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staff: Staff;
    onSuccess: () => void;
}

export default function EditStaffDialog({
    open,
    onOpenChange,
    staff,
    onSuccess,
}: EditStaffDialogProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(staff.name);
    const [mobile, setMobile] = useState(staff.mobile);
    const [dailyRate, setDailyRate] = useState(staff.dailyRate.toString());
    const [status, setStatus] = useState(staff.status);
    const [address, setAddress] = useState(staff.address || "");
    const [emergencyContact, setEmergencyContact] = useState(staff.emergencyContact || "");
    const [notes, setNotes] = useState(staff.notes || "");

    useEffect(() => {
        setName(staff.name);
        setMobile(staff.mobile);
        setDailyRate(staff.dailyRate.toString());
        setStatus(staff.status);
        setAddress(staff.address || "");
        setEmergencyContact(staff.emergencyContact || "");
        setNotes(staff.notes || "");
    }, [staff]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("Please enter staff name");
            return;
        }

        if (!mobile.trim()) {
            toast.error("Please enter mobile number");
            return;
        }

        if (!dailyRate || parseFloat(dailyRate) <= 0) {
            toast.error("Please enter a valid daily rate");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/staff/${staff._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    mobile: mobile.trim(),
                    dailyRate: parseFloat(dailyRate),
                    status,
                    address: address.trim() || undefined,
                    emergencyContact: emergencyContact.trim() || undefined,
                    notes: notes.trim() || undefined,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to update staff");
            }

            toast.success("Staff updated successfully");
            onSuccess();
        } catch (error) {
            console.error("Error updating staff:", error);
            toast.error(error instanceof Error ? error.message : "Failed to update staff");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit className="w-5 h-5 text-black" />
                        Edit Staff - {staff.staffId}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Name *</Label>
                        <Input
                            id="edit-name"
                            placeholder="Enter staff name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Mobile */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-mobile">Mobile Number *</Label>
                        <Input
                            id="edit-mobile"
                            placeholder="Enter mobile number"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            required
                        />
                    </div>

                    {/* Daily Rate */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-dailyRate">Daily Rate (₹ per Hajiri) *</Label>
                        <Input
                            id="edit-dailyRate"
                            type="number"
                            placeholder="Enter daily rate"
                            value={dailyRate}
                            onChange={(e) => setDailyRate(e.target.value)}
                            min="0"
                            required
                        />
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-status">Status</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-address">Address (Optional)</Label>
                        <Input
                            id="edit-address"
                            placeholder="Enter address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-emergencyContact">Emergency Contact (Optional)</Label>
                        <Input
                            id="edit-emergencyContact"
                            placeholder="Enter emergency contact"
                            value={emergencyContact}
                            onChange={(e) => setEmergencyContact(e.target.value)}
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-notes">Notes (Optional)</Label>
                        <Textarea
                            id="edit-notes"
                            placeholder="Any additional notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-black hover:bg-black/90 text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>Save Changes</>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
