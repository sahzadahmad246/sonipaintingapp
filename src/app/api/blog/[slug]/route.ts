import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import { blogPostSchema } from "@/lib/validators";
import { z } from "zod";
import { generateUniqueSlug } from "@/lib/slugHelper";
import { calculateReadTime } from "@/lib/utils";

// Helper to determine if the identifier is an ID or a Slug
const isObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params; // params is a promise in Next.js 15
    await dbConnect();

    // Try finding by slug first, then by ID if it looks like one

    // If it's not a valid ObjectId, we assume it's definitely a slug. 
    // If we wanted to support finding by ID OR Slug strictly, we could do $or, 
    // but usually slug is primary for public face.
    // However, for admin edit by ID, we often use the ID. 
    // The route is [slug], so it catches both.

    // Correct logic: Try finding by slug. If not found and it's a valid ObjectId, try finding by ID.
    // Actually, simple strategy: query $or: [{ slug: slug }, { _id: slug if valid else null }]

    // But typically public access is by slug. Admin might access by ID.

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "admin";

    let post = await Post.findOne({ slug }).populate("author", "name email image");

    if (!post && isObjectId(slug)) {
      post = await Post.findById(slug).populate("author", "name email image");
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check visibility
    if (!post.isPublished && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Increment views if public access
    if (!isAdmin) {
      await Post.updateOne({ _id: post._id }, { $inc: { views: 1 } });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog post" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    await dbConnect();

    // Find by ID primarily for updates
    let post;
    if (isObjectId(slug)) {
      post = await Post.findById(slug);
    } else {
      post = await Post.findOne({ slug });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await req.json();

    // Partial validation
    // We reuse blogPostSchema but allowing partials is tricky with zod unless we define a separate update schema
    // or use partial(). But standard Zod partial() makes EVERYTHING optional.
    // For now, we will use partial() for validation.
    const updateSchema = blogPostSchema.partial();

    const validatedData = updateSchema.parse(body);

    // If updating slug, check uniqueness using helper, but exclude current post?
    // generateUniqueSlug allows duplicates if we don't exclude. 
    // But generateUniqueSlug logic iterates.
    // If user changes slug to "foo", and "foo" exists (but it's THIS post?), we should keep "foo".
    // So we need to check if new slug != old slug.
    if (validatedData.slug && validatedData.slug !== post.slug) {
      const uniqueSlug = await generateUniqueSlug({
        model: Post,
        baseSlug: validatedData.slug,
      });
      validatedData.slug = uniqueSlug;
    }

    // Handle publishing logic
    if (validatedData.isPublished === true && !post.isPublished) {
      // @ts-expect-error - dynamic property assignment
      validatedData.publishedAt = new Date();
    }

    // Recalculate readTime if content is updated
    if (validatedData.content) {
      validatedData.readTime = calculateReadTime(validatedData.content);
    }

    // Update
    const updatedPost = await Post.findByIdAndUpdate(
      post._id,
      { $set: validatedData },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedPost);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating blog post:", error);
    return NextResponse.json(
      { error: "Failed to update blog post" },
      { status: 500 }
    );
  }
}

import cloudinary from "@/lib/cloudinary";

const extractPublicId = (url: string) => {
  try {
    if (!url || !url.includes("cloudinary.com")) return null;
    // Extracts public_id from Cloudinary URL
    // Matches: .../upload/{v.../}({public_id}).{extension}
    // or .../upload/{public_id}.{extension} (if no version)

    const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const extractImagesFromContent = (html: string) => {
  const regex = /<img[^>]+src="([^">]+)"/g;
  const images: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    images.push(match[1]);
  }
  return images;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    await dbConnect();

    // Find the post first to get images
    let post;
    if (isObjectId(slug)) {
      post = await Post.findById(slug);
    } else {
      post = await Post.findOne({ slug });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Cleanup images
    const imagesToDelete = new Set<string>();

    // Cover image
    if (post.coverImage) {
      const pid = extractPublicId(post.coverImage);
      if (pid) imagesToDelete.add(pid);
    }

    // Content images
    if (post.content) {
      const contentImages = extractImagesFromContent(post.content);
      contentImages.forEach(url => {
        const pid = extractPublicId(url);
        if (pid) imagesToDelete.add(pid);
      });
    }

    // Process deletions
    if (imagesToDelete.size > 0) {
      // We do this asynchronously without waiting? Or wait? 
      // Better to wait to ensure it's done, but don't fail the request if it fails?
      // Let's try to delete them.
      const deletePromises = Array.from(imagesToDelete).map(pid =>
        cloudinary.uploader.destroy(pid).catch(err => console.error("Failed to delete image", pid, err))
      );
      await Promise.all(deletePromises);
    }

    // Delete the post
    await Post.findByIdAndDelete(post._id);

    return NextResponse.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return NextResponse.json(
      { error: "Failed to delete blog post" },
      { status: 500 }
    );
  }
}
