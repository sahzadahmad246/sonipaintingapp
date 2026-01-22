"use client";

import { useState } from "react";
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
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface AddStaffDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function AddStaffDialog({
    open,
    onOpenChange,
    onSuccess,
}: AddStaffDialogProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [mobile, setMobile] = useState("");
    const [dailyRate, setDailyRate] = useState("");
    const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split("T")[0]);
    const [address, setAddress] = useState("");
    const [emergencyContact, setEmergencyContact] = useState("");
    const [notes, setNotes] = useState("");

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
            const response = await fetch("/api/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    mobile: mobile.trim(),
                    dailyRate: parseFloat(dailyRate),
                    joiningDate,
                    address: address.trim() || undefined,
                    emergencyContact: emergencyContact.trim() || undefined,
                    notes: notes.trim() || undefined,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to add staff");
            }

            toast.success("Staff member added successfully");

            // Reset form
            setName("");
            setMobile("");
            setDailyRate("");
            setJoiningDate(new Date().toISOString().split("T")[0]);
            setAddress("");
            setEmergencyContact("");
            setNotes("");

            onSuccess();
        } catch (error) {
            console.error("Error adding staff:", error);
            toast.error(error instanceof Error ? error.message : "Failed to add staff");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-orange-500" />
                        Add New Staff
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                            id="name"
                            placeholder="Enter staff name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Mobile */}
                    <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile Number *</Label>
                        <Input
                            id="mobile"
                            placeholder="Enter mobile number"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            required
                        />
                    </div>

                    {/* Daily Rate */}
                    <div className="space-y-2">
                        <Label htmlFor="dailyRate">Daily Rate (₹ per Hajiri) *</Label>
                        <Input
                            id="dailyRate"
                            type="number"
                            placeholder="Enter daily rate"
                            value={dailyRate}
                            onChange={(e) => setDailyRate(e.target.value)}
                            min="0"
                            required
                        />
                    </div>

                    {/* Joining Date */}
                    <div className="space-y-2">
                        <Label htmlFor="joiningDate">Joining Date</Label>
                        <Input
                            id="joiningDate"
                            type="date"
                            value={joiningDate}
                            onChange={(e) => setJoiningDate(e.target.value)}
                        />
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <Label htmlFor="address">Address (Optional)</Label>
                        <Input
                            id="address"
                            placeholder="Enter address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-2">
                        <Label htmlFor="emergencyContact">Emergency Contact (Optional)</Label>
                        <Input
                            id="emergencyContact"
                            placeholder="Enter emergency contact"
                            value={emergencyContact}
                            onChange={(e) => setEmergencyContact(e.target.value)}
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
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
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>Add Staff</>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
