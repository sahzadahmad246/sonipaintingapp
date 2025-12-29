import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getPopularPosts, getPostsByCategory, getRecentPosts, getPosts } from "@/lib/blog";
import { formatDate } from "@/lib/utils";
import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function BlogPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; category?: string }>;
}) {
    const { search, category } = await searchParams;
    const isFiltered = !!(search || category);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filteredPosts: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recentPosts: any[] = [], popularPosts: any[] = [], paintingPosts: any[] = [], popPosts: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let featuredPost: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let latestPosts: any[] = [];

    if (isFiltered) {
        const res = await getPosts({ search, category, limit: 12 });
        filteredPosts = res.posts;
    } else {
        const results = await Promise.all([
            getRecentPosts(5), // 1 Featured + 4 list
            getPopularPosts(4),
            getPostsByCategory("Painting", 4),
            getPostsByCategory("POP", 4)
        ]);
        recentPosts = results[0];
        popularPosts = results[1];
        paintingPosts = results[2];
        popPosts = results[3];

        featuredPost = recentPosts[0];
        latestPosts = recentPosts.slice(1);
    }



    async function handleSearch(formData: FormData) {
        "use server";
        const query = formData.get("search")?.toString();
        if (query) {
            redirect(`/blog?search=${encodeURIComponent(query)}`);
        }
    }

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                        Our Blog
                    </h1>
                    <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
                        Insights, tips, and updates from the Soni Painting team.
                    </p>

                    <div className="mt-8 max-w-lg mx-auto relative">
                        <form action={handleSearch} className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                name="search"
                                className="pl-10 h-12 bg-white text-lg shadow-sm"
                                placeholder="Search articles..."
                                defaultValue={search || ""}
                            />
                        </form>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                {isFiltered ? (
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {search ? `Search results for "${search}"` : `Category: ${category}`}
                            </h2>
                            <Link href="/blog" className="text-sm text-primary hover:underline">Clear Filters</Link>
                        </div>

                        {filteredPosts.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                No articles found.
                            </div>
                        ) : (
                            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {filteredPosts.map((post: any) => <BlogCard key={post._id} post={post} />)}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Featured Post (Hero) */}
                        {featuredPost && (
                            <div className="mb-16">
                                <Link href={`/blog/${featuredPost.slug}`} className="group relative block rounded-3xl overflow-hidden shadow-xl aspect-[21/9] min-h-[400px]">
                                    <Image
                                        src={featuredPost.coverImage}
                                        alt={featuredPost.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                                        priority
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-8 md:p-12">
                                        <Badge className="w-fit mb-4 bg-primary text-primary-foreground hover:bg-primary/90 text-md px-3 py-1">
                                            Featured
                                        </Badge>
                                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight group-hover:text-primary-foreground/90 transition-colors">
                                            {featuredPost.title}
                                        </h2>
                                        <div className="flex items-center text-gray-300 text-sm md:text-base gap-4">
                                            <span>{formatDate(featuredPost.publishedAt)}</span>
                                            <span>•</span>
                                            <span>{featuredPost.readTime} min read</span>
                                            <span>•</span>
                                            <span>{featuredPost.author?.name || "Soni Team"}</span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            {/* Left Column (Content) */}
                            <div className="lg:col-span-8 space-y-16">

                                {/* Recent Articles */}
                                {latestPosts.length > 0 && (
                                    <section>
                                        <SectionHeader title="Recent Articles" />
                                        <div className="grid gap-8">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {latestPosts.map((post: any) => (
                                                <BlogCardHorizontal key={post._id} post={post} />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Painting Category */}
                                {paintingPosts.length > 0 && (
                                    <section>
                                        <SectionHeader title="Painting Guides" href="/blog?category=Painting" />
                                        <div className="grid md:grid-cols-2 gap-8">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {paintingPosts.map((post: any) => (
                                                <BlogCard key={post._id} post={post} />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* POP Category */}
                                {popPosts.length > 0 && (
                                    <section>
                                        <SectionHeader title="POP Designs" href="/blog?category=POP" />
                                        <div className="grid md:grid-cols-2 gap-8">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {popPosts.map((post: any) => (
                                                <BlogCard key={post._id} post={post} />
                                            ))}
                                        </div>
                                    </section>
                                )}

                            </div>

                            {/* Right Sidebar (Popular & Categories) */}
                            <aside className="lg:col-span-4 space-y-12">

                                {/* Popular Posts */}
                                {popularPosts.length > 0 && (
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                        <h3 className="text-xl font-bold text-gray-900 mb-6">Popular Articles</h3>
                                        <div className="space-y-6">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {popularPosts.map((post: any, index: number) => (
                                                <Link href={`/blog/${post.slug}`} key={post._id} className="group flex gap-4 items-start">
                                                    <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                                                        <Image src={post.coverImage} alt={post.title} fill className="object-cover group-hover:scale-110 transition-transform" />
                                                        <div className="absolute top-0 left-0 bg-black/60 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-br-lg">
                                                            {index + 1}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 text-sm leading-snug">
                                                            {post.title}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 mt-1">{formatDate(post.publishedAt)}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Categories List */}
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">Categories</h3>
                                    <div className="space-y-2">
                                        {['Painting', 'POP', 'Carpentry', 'Tiling', 'General'].map(cat => (
                                            <Link href={`/blog?category=${cat}`} key={cat} className="flex items-center justify-between p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all group">
                                                <span className="font-medium text-gray-700 group-hover:text-primary">{cat}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                            </aside>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function SectionHeader({ title, href }: { title: string, href?: string }) {
    return (
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 relative">
                {title}
                <span className="block h-1 w-12 bg-primary mt-2 rounded-full"></span>
            </h2>
            {href && (
                <Link href={href} className="text-sm font-medium text-primary hover:text-primary/80">
                    View All
                </Link>
            )}
        </div>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BlogCard({ post }: { post: any }) {
    return (
        <Link href={`/blog/${post.slug}`} className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ring-1 ring-gray-200 overflow-hidden flex flex-col h-full">
            <div className="relative h-48 w-full overflow-hidden">
                <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                    <span className="font-medium text-primary uppercase">{post.category}</span>
                    <span>•</span>
                    <span>{post.readTime} min</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
                    {post.excerpt}
                </p>
                <div className="text-xs text-gray-400 mt-auto">
                    {formatDate(post.publishedAt)}
                </div>
            </div>
        </Link>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BlogCardHorizontal({ post }: { post: any }) {
    return (
        <Link href={`/blog/${post.slug}`} className="group flex flex-col sm:flex-row bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ring-1 ring-gray-200 overflow-hidden h-full sm:h-44">
            <div className="relative h-44 w-full sm:w-64 max-w-full overflow-hidden shrink-0">
                <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                    <Badge variant="secondary" className="px-2 py-0 text-[10px]">{post.category}</Badge>
                    <span>{post.readTime} min read</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2 mb-3 hidden sm:block">
                    {post.excerpt}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-auto">
                    <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-600">{post.author?.name || "Soni Team"}</span>
                    </div>
                    <span>•</span>
                    <span>{formatDate(post.publishedAt)}</span>
                </div>
            </div>
        </Link>
    )
}
