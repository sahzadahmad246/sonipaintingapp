"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Phone, Calendar, MessageSquare, Loader2 } from "lucide-react";
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
}

interface ReviewsResponse {
  reviews: Review[];
  total: number;
  pages: number;
  currentPage: number;
}

export default function ReviewsDisplay() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedService, setSelectedService] = useState<string>("all");

  const serviceTypes = [
    { value: "all", label: "All Services" },
    { value: "painting", label: "Painting" },
    { value: "carpentry", label: "Carpentry" },
    { value: "false-ceiling", label: "False Ceiling" },
    { value: "pop", label: "POP Work" },
    { value: "tiles", label: "Tiles" },
    { value: "waterproofing", label: "Waterproofing" },
    { value: "wood-polish", label: "Wood Polish" },
  ];

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "6",
      });
      
      if (selectedService !== "all") {
        params.append("serviceType", selectedService);
      }
      
      const response = await apiFetch<ReviewsResponse>(`/reviews?${params}`);
      setReviews(response.reviews);
      setTotalPages(response.pages);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedService]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

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

  const maskPhoneNumber = (phone: string) => {
    return phone.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2");
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Service Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {serviceTypes.map((service) => (
            <Button
              key={service.value}
              variant={selectedService === service.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedService(service.value);
                setCurrentPage(1);
              }}
            >
              {service.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Reviews Grid */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
            <p className="text-gray-600">
              {selectedService === "all" 
                ? "Be the first to share your experience with our services!"
                : `No reviews yet for ${serviceTypes.find(s => s.value === selectedService)?.label}. Be the first to review!`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <Card key={review._id} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{review.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Phone className="h-3 w-3" />
                      {maskPhoneNumber(review.phone)}
                    </CardDescription>
                  </div>
                  <Badge className={getServiceTypeColor(review.serviceType)}>
                    {review.serviceType.replace("-", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-sm text-gray-600">({review.rating}/5)</span>
                  {review.isVerified && (
                    <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                      Verified
                    </Badge>
                  )}
                </div>

                {/* Comment */}
                <p className="text-sm text-gray-700 line-clamp-4">{review.comment}</p>

                {/* Date */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {formatDate(review.createdAt)}
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
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Loading overlay for pagination */}
      {loading && reviews.length > 0 && (
        <div className="flex justify-center mt-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
    </div>
  );
}
