import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import { blogPostSchema } from "@/lib/validators";
import { z } from "zod";
import { generateUniqueSlug } from "@/lib/slugHelper";
import { calculateReadTime } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Parse query params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const tag = url.searchParams.get("tag");
    const search = url.searchParams.get("search");
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status"); // 'published', 'draft', 'all' (admin only)

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "admin";

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    // Filter by status
    if (status === "draft" || status === "all") {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Unauthorized access to drafts" },
          { status: 401 }
        );
      }
      if (status === "draft") query.isPublished = false;
      // if status is 'all', we don't add isPublished to query (fetch both)
    } else {
      // Default: Public only sees published posts
      query.isPublished = true;
    }

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
        query.category = category;
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ isPublished: -1, publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email image")
        .select("-content"), // Exclude content for list view to reduce payload
      Post.countDocuments(query),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();

    // Validate request body
    const validatedData = blogPostSchema.parse(body);

    // Generate unique slug
    // We already validated 'slug' format with Zod but uniqueness needs DB check
    const baseSlug = validatedData.slug || validatedData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const uniqueSlug = await generateUniqueSlug({
        model: Post,
        baseSlug,
    });

    // Set publishedAt if publishing now
    if (validatedData.isPublished) {
      // @ts-expect-error - validatedData is inferred from zod but publishedAt isn't in input schema explicitly maybe
      validatedData.publishedAt = new Date();
    }

    const post = await Post.create({
      ...validatedData,
      slug: uniqueSlug,
      author: session.user.id,
      readTime: calculateReadTime(validatedData.content),
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating blog post:", error);
    return NextResponse.json(
      { error: "Failed to create blog post" },
      { status: 500 }
    );
  }
}
