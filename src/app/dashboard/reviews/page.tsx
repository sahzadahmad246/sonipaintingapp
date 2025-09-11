"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Star, Phone, Calendar, MessageSquare, Eye, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface Review {
  _id: string;
  name: string;
  phone: string;
  rating: number;
  comment: string;
  serviceType: string;
  status: "pending" | "approved" | "rejected";
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

interface ReviewResponse {
  reviews: Review[];
  total: number;
  pages: number;
  currentPage: number;
  statistics?: {
    totalReviews: number;
    averageRating: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    serviceTypeStats: Array<{
      _id: string;
      count: number;
      averageRating: number;
    }>;
  };
}

export default function ReviewManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState<ReviewResponse["statistics"]>(undefined);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch<ReviewResponse>(`/reviews?page=${currentPage}&status=${selectedStatus}`);
      setReviews(response.reviews);
      setTotalPages(response.pages);
      setStatistics(response.statistics || undefined);
    } catch {
      toast.error("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedStatus]);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || session.user.role !== "admin") {
      router.push("/");
      return;
    }
    
    fetchReviews();
  }, [session, status, fetchReviews, router]);

  const updateReviewStatus = async (reviewId: string, status: string, notes?: string) => {
    try {
      await apiFetch(`/reviews/${reviewId}`, {
        method: "PUT",
        body: JSON.stringify({ status, adminNotes: notes }),
      });
      toast.success("Review status updated successfully");
      fetchReviews();
    } catch {
      toast.error("Failed to update review status");
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    
    try {
      await apiFetch(`/reviews/${reviewId}`, {
        method: "DELETE",
      });
      toast.success("Review deleted successfully");
      fetchReviews();
    } catch {
      toast.error("Failed to delete review");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getServiceTypeColor = (serviceType: string) => {
    const colors = {
      painting: "bg-blue-100 text-blue-800",
      carpentry: "bg-green-100 text-green-800",
      "false-ceiling": "bg-purple-100 text-purple-800",
      pop: "bg-orange-100 text-orange-800",
      tiles: "bg-red-100 text-red-800",
      waterproofing: "bg-cyan-100 text-cyan-800",
      "wood-polish": "bg-amber-100 text-amber-800",
    };
    return colors[serviceType as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-lg text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Review Management</h1>
        <p className="text-gray-600">Manage customer reviews and ratings</p>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Reviews</p>
                  <p className="text-2xl font-bold text-primary">{statistics.totalReviews}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {statistics.averageRating.toFixed(1)}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{statistics.pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.approvedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Type Statistics */}
      {statistics?.serviceTypeStats && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Reviews by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statistics.serviceTypeStats.map((stat) => (
                <div key={stat._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{stat._id?.replace("-", " ") || "Unknown"}</p>
                    <p className="text-sm text-gray-600">{stat.count} reviews</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{stat.averageRating.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="mb-6">
        <TabsList>
          <TabsTrigger value="pending">Pending ({statistics?.pendingCount || 0})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({statistics?.approvedCount || 0})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({statistics?.rejectedCount || 0})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Reviews */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{review.name}</CardTitle>
                      {getStatusBadge(review.status)}
                      {review.isVerified && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {review.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(review.createdAt)}
                      </span>
                      <Badge className={getServiceTypeColor(review.serviceType)}>
                        {review.serviceType?.replace("-", " ") || "Unknown"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-600 ml-2">({review.rating}/5)</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Review Details</DialogTitle>
                          <DialogDescription>
                            From: {review.name} ({review.phone})
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Rating:</span>
                            <div className="flex items-center gap-1">
                              {renderStars(review.rating)}
                              <span className="text-sm text-gray-600">({review.rating}/5)</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Service Type</Label>
                            <Badge className={getServiceTypeColor(review.serviceType)}>
                              {review.serviceType?.replace("-", " ") || "Unknown"}
                            </Badge>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Comment</Label>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{review.comment}</p>
                          </div>
                          {review.adminNotes && (
                            <div>
                              <Label className="text-sm font-medium">Admin Notes</Label>
                              <p className="text-sm text-gray-600">{review.adminNotes}</p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => updateReviewStatus(review._id, "approved")}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => updateReviewStatus(review._id, "rejected")}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => deleteReview(review._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Comment</Label>
                    <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
