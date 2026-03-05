import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Fetch list of ongoing projects
export async function GET() {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const projects = await Project.find({ status: "ongoing" })
            .select("projectId clientName clientAddress")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ projects });
    } catch (error) {
        console.error("Error fetching ongoing projects:", error);
        return NextResponse.json(
            { error: "Failed to fetch projects" },
            { status: 500 }
        );
    }
}
