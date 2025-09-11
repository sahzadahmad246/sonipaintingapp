import { Suspense } from "react";
import { Metadata } from "next";
import ReviewsDisplay from "@/components/reviews/ReviewsDisplay";
import ReviewForm from "@/components/reviews/ReviewForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Customer Reviews - SoniPainting",
  description: "Read customer reviews and share your experience with SoniPainting services",
};

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Customer Reviews
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See what our customers say about our services and share your own experience
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="view" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="view" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                View Reviews
              </TabsTrigger>
              <TabsTrigger value="write" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Write Review
              </TabsTrigger>
            </TabsList>

            <TabsContent value="view" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  What Our Customers Say
                </h2>
                <p className="text-gray-600">
                  Real reviews from customers who have used our services
                </p>
              </div>
              
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              }>
                <ReviewsDisplay />
              </Suspense>
            </TabsContent>

            <TabsContent value="write" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Share Your Experience
                </h2>
                <p className="text-gray-600">
                  Help others by sharing your experience with our services
                </p>
              </div>
              
              <ReviewForm />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Verified Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  All reviews are verified through mobile number confirmation to ensure authenticity
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Real Experiences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Reviews are only from customers who have actually used our services
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  <Star className="h-5 w-5 text-green-500" />
                  Quality Assured
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We maintain high standards and continuously improve based on customer feedback
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}