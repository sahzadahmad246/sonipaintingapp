import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - List transactions with filters
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const type = searchParams.get("type"); // credit, debit, or null for all
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");

        // Build query
        const query: Record<string, unknown> = {};

        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                (query.date as Record<string, Date>).$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                (query.date as Record<string, Date>).$lte = end;
            }
        }

        if (type && (type === "credit" || type === "debit")) {
            query.type = type;
        }

        // Get transactions with pagination
        const skip = (page - 1) * limit;
        const transactions = await Transaction.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Transaction.countDocuments(query);

        // Calculate totals for the filtered period
        const aggregation = await Transaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$type",
                    total: { $sum: "$amount" },
                },
            },
        ]);

        const totals = {
            credit: 0,
            debit: 0,
            balance: 0,
        };

        aggregation.forEach((item) => {
            if (item._id === "credit") totals.credit = item.total;
            if (item._id === "debit") totals.debit = item.total;
        });
        totals.balance = totals.credit - totals.debit;

        return NextResponse.json({
            transactions,
            totals,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json(
            { error: "Failed to fetch transactions" },
            { status: 500 }
        );
    }
}

// POST - Create new transaction
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { type, amount, date, note, category } = body;

        // Validation
        if (!type || !["credit", "debit"].includes(type)) {
            return NextResponse.json(
                { error: "Invalid transaction type" },
                { status: 400 }
            );
        }

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { error: "Amount must be greater than 0" },
                { status: 400 }
            );
        }

        if (!date) {
            return NextResponse.json(
                { error: "Date is required" },
                { status: 400 }
            );
        }

        if (!note || note.trim() === "") {
            return NextResponse.json(
                { error: "Note is required" },
                { status: 400 }
            );
        }

        const transaction = await Transaction.create({
            type,
            amount,
            date: new Date(date),
            note: note.trim(),
            category: category?.trim() || undefined,
            createdBy: session.user?.email || "admin",
        });

        return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json(
            { error: "Failed to create transaction" },
            { status: 500 }
        );
    }
}
