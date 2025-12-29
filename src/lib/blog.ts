import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";

export async function getPosts(filters: { search?: string; category?: string; page?: number; limit?: number } = {}) {
  try {
    await dbConnect();
    await dbConnect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { isPublished: true };

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
        Post.find(query)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("title slug coverImage publishedAt readTime views category excerpt")
            .populate("author", "name image")
            .lean(),
        Post.countDocuments(query)
    ]);

    return {
        posts: JSON.parse(JSON.stringify(posts)),
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return { posts: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 } };
  }
}

export async function getRelatedPosts(category: string, currentSlug: string, limit = 3) {
  try {
    await dbConnect();
    const posts = await Post.find({
      category,
      slug: { $ne: currentSlug },
      isPublished: true,
    })
      .select("title slug coverImage publishedAt readTime views category")
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean();

    return JSON.parse(JSON.stringify(posts));
  } catch (error) {
    console.error("Error fetching related posts:", error);
    return [];
  }
}

export async function getRecentPosts(limit = 4) {
    try {
        await dbConnect();
        const posts = await Post.find({ isPublished: true })
            .select("title slug coverImage publishedAt readTime views category excerpt")
            .sort({ publishedAt: -1 })
            .limit(limit)
            .populate("author", "name image")
            .lean();
        return JSON.parse(JSON.stringify(posts));
    } catch (error) {
        console.error("Error fetching recent posts:", error);
        return [];
    }
}

export async function getPopularPosts(limit = 4) {
    try {
        await dbConnect();
        const posts = await Post.find({ isPublished: true })
            .select("title slug coverImage publishedAt readTime views category")
            .sort({ views: -1 })
            .limit(limit)
            .lean();
        return JSON.parse(JSON.stringify(posts));
    } catch (error) {
        console.error("Error fetching popular posts:", error);
        return [];
    }
}

export async function getPostsByCategory(category: string, limit = 4) {
    try {
        await dbConnect();
        const posts = await Post.find({ category, isPublished: true })
            .select("title slug coverImage publishedAt readTime views category")
            .sort({ publishedAt: -1 })
            .limit(limit)
            .lean();
        return JSON.parse(JSON.stringify(posts));
    } catch (error) {
        console.error("Error fetching posts by category:", error);
        return [];
    }
}
