import Reviews from '@/components/home/Reviews';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer Reviews | Soni Painting',
  description: 'Read what our customers say about Soni Painting’s online painting services.',
  openGraph: {
    title: 'Soni Painting Customer Reviews',
    description: 'Real reviews from satisfied clients of Soni Painting.',
    url: 'https://sonipainting.vercel.app/reviews',
    siteName: 'Soni Painting',
  },
};

export const revalidate = 172800; // Revalidate every 48 hours

export default async function ReviewsPage() {
  const placeId = process.env.GOOGLE_PLACE_ID || 'ChIJN1t_tDeuEmsRUsoyG83frY4';
  let initialData = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    console.log('Fetching reviews from:', `${baseUrl}/api/reviews`);
    const response = await fetch(`${baseUrl}/api/reviews`, {
      next: { revalidate: 172800 }, // Cache for 48 hours
    });

    if (!response.ok) {
      console.error('Failed to fetch reviews from API:', response.status, await response.text());
    } else {
      initialData = await response.json();
    }
  } catch (error) {
    console.error('Error fetching reviews from API:', error);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'Soni Painting',
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '5.0',
              reviewCount: '33',
            },
          }),
        }}
      />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">Soni Painting Reviews</h1>
        <Reviews initialData={initialData} placeId={placeId}  />
      </div>
    </>
  );
}