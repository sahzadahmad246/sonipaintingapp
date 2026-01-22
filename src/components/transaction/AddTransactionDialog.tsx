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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const CATEGORIES = [
    { value: "material", label: "Material" },
    { value: "labour", label: "Labour" },
    { value: "transport", label: "Transport" },
    { value: "rent", label: "Rent" },
    { value: "utilities", label: "Utilities" },
    { value: "equipment", label: "Equipment" },
    { value: "client_payment", label: "Client Payment" },
    { value: "other", label: "Other" },
];

export default function AddTransactionDialog({
    open,
    onOpenChange,
    onSuccess,
}: AddTransactionDialogProps) {
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<"credit" | "debit">("credit");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [note, setNote] = useState("");
    const [category, setCategory] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (!note.trim()) {
            toast.error("Please enter a note");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    amount: parseFloat(amount),
                    date,
                    note: note.trim(),
                    category: category || undefined,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to add transaction");
            }

            toast.success(
                type === "credit" ? "Income added successfully" : "Expense added successfully"
            );

            // Reset form
            setType("credit");
            setAmount("");
            setDate(new Date().toISOString().split("T")[0]);
            setNote("");
            setCategory("");

            onSuccess();
        } catch (error) {
            console.error("Error adding transaction:", error);
            toast.error(error instanceof Error ? error.message : "Failed to add transaction");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {type === "credit" ? (
                            <ArrowDownLeft className="w-5 h-5 text-green-500" />
                        ) : (
                            <ArrowUpRight className="w-5 h-5 text-red-500" />
                        )}
                        Add {type === "credit" ? "Income" : "Expense"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Type Selection */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            variant={type === "credit" ? "default" : "outline"}
                            className={
                                type === "credit"
                                    ? "bg-green-500 hover:bg-green-600"
                                    : "hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                            }
                            onClick={() => setType("credit")}
                        >
                            <ArrowDownLeft className="w-4 h-4 mr-2" />
                            Income
                        </Button>
                        <Button
                            type="button"
                            variant={type === "debit" ? "default" : "outline"}
                            className={
                                type === "debit"
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                            }
                            onClick={() => setType("debit")}
                        >
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                            Expense
                        </Button>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (₹)</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Category (Optional)</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                        <Label htmlFor="note">Note</Label>
                        <Textarea
                            id="note"
                            placeholder={
                                type === "credit"
                                    ? "e.g., Payment received from ABC Client"
                                    : "e.g., Purchased paint for XYZ project"
                            }
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            required
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
                            className={
                                type === "credit"
                                    ? "bg-green-500 hover:bg-green-600"
                                    : "bg-red-500 hover:bg-red-600"
                            }
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>Add {type === "credit" ? "Income" : "Expense"}</>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
