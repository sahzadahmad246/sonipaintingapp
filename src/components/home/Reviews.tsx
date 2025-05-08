"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

interface Review {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
}

interface PlaceData {
  reviews: Review[];
  rating: number;
  user_ratings_total: number;
}

interface Props {
  initialData?: PlaceData | null;
  placeId?: string;
}

const Reviews = ({ initialData }: Props) => {
  const [data, setData] = useState<PlaceData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (!initialData) {
      const fetchReviews = async () => {
        try {
          const res = await fetch("/api/reviews");
          const result = await res.json();
          if (result.error) throw new Error(result.error);
          setData(result);
        } catch (error) {
          console.error("Error fetching reviews:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchReviews();
    }
  }, [initialData]);

  if (loading)
    return <p className="text-center text-gray-600">Loading reviews...</p>;
  if (!data || !data.reviews)
    return <p className="text-center text-gray-600">No reviews available.</p>;

  return (
    <div className="reviews-section">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {data.reviews.slice(0, 3).map((review, index) => (
          <motion.div
            key={index}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { delay: index * 0.1 },
              },
            }}
            className="bg-white p-8 rounded-lg shadow-md"
          >
            <div className="flex mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < review.rating
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-gray-700 mb-6">{review.text}</p>
            <div>
              <p className="font-semibold">{review.author_name}</p>
              <p className="text-gray-500 text-sm">
                {review.relative_time_description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Reviews;
