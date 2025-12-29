import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import dbConnect from "@/lib/mongodb";
import Post, { IPost } from "@/models/Post";
import "@/models/User"; // Ensure ID population works
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRelatedPosts } from "@/lib/blog";
import { Clock, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Force dynamic rendering for this page since we might rely on DB content that changes
export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getPost(slug: string): Promise<IPost | null> {
    await dbConnect();

    // Need to verify User model is registered for populate
    const post = await Post.findOne({ slug, isPublished: true }).populate("author", "name image");

    if (!post) return null;
    return JSON.parse(JSON.stringify(post)); // Serialize for client
}

export async function generateMetadata(
    { params }: Props,
    // parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) {
        return {
            title: "Article Not Found",
        };
    }

    return {
        title: post.seo?.metaTitle || post.title,
        description: post.seo?.metaDescription || post.excerpt,
        openGraph: {
            title: post.seo?.metaTitle || post.title,
            description: post.seo?.metaDescription || post.excerpt,
            images: [post.coverImage],
            type: "article",
            publishedTime: post.publishedAt?.toString(),
            authors: ["Soni Painting Team"],
            tags: post.seo?.keywords || post.tags,
        },
        twitter: {
            card: "summary_large_image",
            title: post.seo?.metaTitle || post.title,
            description: post.seo?.metaDescription || post.excerpt,
            images: [post.coverImage],
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) {
        notFound();
    }

    // JSON-LD Structured Data
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        image: [post.coverImage],
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        author: [{
            "@type": "Organization", // Or Person if we had full person data
            name: "Soni Painting Team",
            url: "https://sonipainting.com"
        }],
        description: post.excerpt,
    };

    return (
        <div className="bg-white min-h-screen pb-20">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Progress Bar could go here */}

            {/* Progress Bar could go here */}

            {/* Hero Image Section - Clean, no text overlay */}
            <div className="relative w-full h-[40vh] md:h-[50vh] min-h-[300px] bg-gray-100">
                <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            <main className="max-w-4xl mx-auto px-6 relative z-10 -mt-20 md:-mt-24 pointer-events-none">
                {/* Content Wrapper - Overlapping the image slightly for modern look */}
                <div className="bg-white rounded-t-3xl p-6 md:p-12 shadow-xl min-h-[200px] pointer-events-auto">

                    <div className="mb-8">
                        <Link href="/blog" className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 mb-6 transition-colors group">
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Blog
                        </Link>

                        {/* Title Section */}
                        <div className="space-y-6 text-center md:text-left">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1 text-sm">
                                    {post.category || "General"}
                                </Badge>
                                <span className="text-gray-400">•</span>
                                <span className="text-sm text-gray-500 font-medium">
                                    {formatDate(post.publishedAt || post.createdAt)}
                                </span>
                            </div>

                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
                                {post.title}
                            </h1>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-6 border-t border-gray-100 mt-6">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        <AvatarImage src={(post.author as any)?.image} alt={(post.author as any)?.name} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {(post.author as any)?.name?.charAt(0) || "S"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="text-left">
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        <p className="text-sm font-bold text-gray-900 leading-none">{(post.author as any)?.name || "Soni Painting Team"}</p>
                                        <p className="text-xs text-primary font-medium mt-1">Staff at Soni Painting</p>
                                    </div>
                                </div>

                                <div className="hidden md:block w-px h-8 bg-gray-200 mx-2"></div>

                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1.5" title="Estimated read time">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span>{post.readTime || 1} min read</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="Total views">
                                        <Eye className="w-4 h-4 text-gray-400" />
                                        <span>{post.views || 0} views</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Render */}
                    <article className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary prose-img:rounded-xl prose-img:shadow-lg mt-12">
                        <div dangerouslySetInnerHTML={{ __html: post.content }} />
                    </article>

                    {/* Tags footer */}
                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                            {post.tags.map(tag => (
                                <Link href={`/blog?search=${tag}`} key={tag} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors">
                                    #{tag}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Related Posts Section */}
                <RelatedPostsSection category={post.category} currentSlug={post.slug} />
            </main>
        </div>
    );
}

// Separate component for Related Posts to avoid data waterfall if possible, 
// though here we are fetching in the same format.
async function RelatedPostsSection({ category, currentSlug }: { category: string, currentSlug: string }) {
    const relatedPosts = await getRelatedPosts(category, currentSlug);

    if (!relatedPosts || relatedPosts.length === 0) return null;

    return (
        <section className="mt-20 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">Related Articles</h3>
                <Link href="/blog" className="text-primary hover:text-primary/80 font-medium text-sm">
                    View All
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {relatedPosts.map((post: any) => (
                    <Link href={`/blog/${post.slug}`} key={post._id} className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ring-1 ring-gray-200 overflow-hidden flex flex-col h-full">
                        <div className="relative h-40 w-full overflow-hidden">
                            <Image
                                src={post.coverImage}
                                alt={post.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                                <span>{formatDate(post.publishedAt)}</span>
                                <span>•</span>
                                <span>{post.readTime} min</span>
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                {post.title}
                            </h4>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
