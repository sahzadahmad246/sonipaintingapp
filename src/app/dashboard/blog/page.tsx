"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { formatDate } from "@/lib/utils";

interface Post {
    _id: string;
    title: string;
    slug: string;
    isPublished: boolean;
    publishedAt: string;
    views: number;
    author: {
        name: string;
        email: string;
    };
    createdAt: string;
}

export default function BlogDashboard() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(
                `/api/blog?page=${page}&limit=10&search=${search}&status=all`
            );
            setPosts(res.data.posts);
            setTotalPages(res.data.pagination.pages);
        } catch (error) {
            console.error("Error fetching posts:", error);
            toast.error("Failed to fetch blog posts");
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchPosts();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [fetchPosts]);

    const handleDelete = async (slug: string) => {
        if (!confirm("Are you sure you want to delete this post?")) return;

        try {
            await axios.delete(`/api/blog/${slug}`);
            toast.success("Post deleted successfully");
            fetchPosts();
        } catch (error) {
            console.error("Error deleting post:", error);
            toast.error("Failed to delete post");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your blog articles and content.
                    </p>
                </div>
                <Link href="/dashboard/blog/create">
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" /> Create New Post
                    </Button>
                </Link>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search posts..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Views</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Loading posts...
                                </TableCell>
                            </TableRow>
                        ) : posts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No posts found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            posts.map((post) => (
                                <TableRow key={post._id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="truncate max-w-[300px]">{post.title}</span>
                                            <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                /{post.slug}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={post.isPublished ? "default" : "secondary"}
                                            className={
                                                post.isPublished
                                                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                                                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                            }
                                        >
                                            {post.isPublished ? "Published" : "Draft"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{post.author?.name || "Unknown"}</TableCell>
                                    <TableCell>{post.views}</TableCell>
                                    <TableCell>
                                        {formatDate(post.publishedAt || post.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/blog/${post.slug}`} target="_blank">
                                                <Button variant="ghost" size="icon" title="View">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/dashboard/blog/${post._id}`}>
                                                <Button variant="ghost" size="icon" title="Edit">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                title="Delete"
                                                onClick={() => handleDelete(post.slug)} // Slug works for delete too in our API
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <Button
                        variant="outline"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                    >
                        Previous
                    </Button>
                    <div className="flex items-center text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
