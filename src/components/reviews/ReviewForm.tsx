"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reviewSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MessageSquare, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

type ReviewFormData = {
  name: string;
  phone: string;
  rating: number;
  comment: string;
  serviceType: "painting" | "carpentry" | "false-ceiling" | "pop" | "tiles" | "waterproofing" | "wood-polish";
};

const serviceTypes = [
  { value: "painting", label: "Painting" },
  { value: "carpentry", label: "Carpentry" },
  { value: "false-ceiling", label: "False Ceiling" },
  { value: "pop", label: "POP Work" },
  { value: "tiles", label: "Tiles" },
  { value: "waterproofing", label: "Waterproofing" },
  { value: "wood-polish", label: "Wood Polish" },
];

export default function ReviewForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      name: "",
      phone: "",
      rating: 5,
      comment: "",
      serviceType: "painting",
    },
  });

  // const watchedRating = watch("rating");

  // const renderStars = (rating: number) => {
  //   return Array.from({ length: 5 }, (_, i) => (
  //     <Star
  //       key={i}
  //       className={`h-6 w-6 cursor-pointer transition-colors ${
  //         i < rating ? "text-yellow-400 fill-current" : "text-gray-300 hover:text-yellow-300"
  //       }`}
  //     />
  //   ));
  // };

  const onSubmit = async (data: ReviewFormData) => {
    try {
      setIsSubmitting(true);
      const response = await apiFetch<{ reviewId: string; message: string; verificationRequired: boolean }>("/reviews", {
        method: "POST",
        body: JSON.stringify(data),
      });
      
      setReviewId(response.reviewId);
      setIsSubmitted(true);
      toast.success("Review submitted successfully! Please verify your mobile number.");
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 409) {
        toast.error("You have already submitted a review for this service type.");
      } else if (err.status === 429) {
        toast.error("Too many requests. Please wait before submitting again.");
      } else {
        toast.error("Failed to submit review. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerify = async () => {
    if (!reviewId || !verificationCode) return;
    
    try {
      setIsVerifying(true);
      await apiFetch(`/reviews/${reviewId}`, {
        method: "POST",
        body: JSON.stringify({ verificationCode }),
      });
      
      toast.success("Review verified successfully! Your review will be published after moderation.");
      setIsSubmitted(false);
      setReviewId(null);
      setVerificationCode("");
      reset();
    } catch (error: unknown) {
      const err = error as { error?: string };
      if (err.error === "Invalid verification code") {
        toast.error("Invalid verification code. Please try again.");
      } else {
        toast.error("Failed to verify review. Please try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (isSubmitted && reviewId) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Verify Your Review</CardTitle>
          <CardDescription>
            We&apos;ve sent a verification code to your mobile number. Please enter it below to publish your review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="verificationCode">Verification Code</Label>
            <Input
              id="verificationCode"
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
          </div>
          <Button
            onClick={onVerify}
            disabled={isVerifying || verificationCode.length !== 6}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Publish Review"
            )}
          </Button>
          <p className="text-sm text-gray-600 text-center">
            Didn&apos;t receive the code? Check your SMS or try submitting the review again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Share Your Experience
        </CardTitle>
        <CardDescription>
          Help others by sharing your experience with our services. Your review will be published after verification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div>
            <Label htmlFor="name">Your Name *</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="name"
                  placeholder="Enter your full name"
                  className={errors.name ? "border-red-500" : ""}
                />
              )}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Mobile Number *</Label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="phone"
                  type="tel"
                  placeholder="Enter your 10-digit mobile number"
                  className={errors.phone ? "border-red-500" : ""}
                />
              )}
            />
            {errors.phone && (
              <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
            )}
            <p className="text-sm text-gray-600 mt-1">
              We&apos;ll send a verification code to this number
            </p>
          </div>

          {/* Service Type */}
          <div>
            <Label htmlFor="serviceType">Service Type *</Label>
            <Controller
              name="serviceType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={errors.serviceType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select the service you received" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((service) => (
                      <SelectItem key={service.value} value={service.value}>
                        {service.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.serviceType && (
              <p className="text-sm text-red-500 mt-1">{errors.serviceType.message}</p>
            )}
          </div>

          {/* Rating */}
          <div>
            <Label>Rating *</Label>
            <Controller
              name="rating"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2 mt-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => field.onChange(i + 1)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          i < field.value ? "text-yellow-400 fill-current" : "text-gray-300 hover:text-yellow-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {field.value}/5 stars
                  </span>
                </div>
              )}
            />
            {errors.rating && (
              <p className="text-sm text-red-500 mt-1">{errors.rating.message}</p>
            )}
          </div>

          {/* Comment */}
          <div>
            <Label htmlFor="comment">Your Review *</Label>
            <Controller
              name="comment"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="comment"
                  placeholder="Share your experience with our service..."
                  rows={4}
                  className={errors.comment ? "border-red-500" : ""}
                />
              )}
            />
            {errors.comment && (
              <p className="text-sm text-red-500 mt-1">{errors.comment.message}</p>
            )}
            <p className="text-sm text-gray-600 mt-1">
              Minimum 10 characters, maximum 500 characters
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Review...
              </>
            ) : (
              "Submit Review"
            )}
          </Button>

          <p className="text-sm text-gray-600 text-center">
            By submitting this review, you agree to our terms of service. 
            Your review will be verified before being published.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
