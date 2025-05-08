import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

const CACHE_KEY = 'google_places_reviews';
const CACHE_TTL = 172800; // 48 hours in seconds

export async function GET() {
  const placeId = process.env.GOOGLE_PLACE_ID || 'ChIJN1t_tDeuEmsRUsoyG83frY4';
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  // Log environment variables for debugging
  console.log('GOOGLE_PLACE_ID:', placeId);
  console.log('NEXT_PUBLIC_GOOGLE_API_KEY:', apiKey ? 'Set' : 'Missing');
  console.log('REDIS_URL:', process.env.REDIS_URL ? 'Set' : 'Missing');
  console.log('REDIS_TOKEN:', process.env.REDIS_TOKEN ? 'Set' : 'Missing');

  if (!apiKey) {
    console.error('API key not configured');
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  if (!placeId) {
    console.error('Place ID not configured');
    return NextResponse.json({ error: 'Place ID not configured' }, { status: 500 });
  }

  try {
    // Check Redis cache
    const cachedData = await redis.get(CACHE_KEY);
    if (cachedData) {
      console.log('Serving reviews from Redis cache');
      return NextResponse.json(cachedData);
    }

    // Fetch from Google Places API
    console.log('Fetching reviews from Google Places API');
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API request failed:', response.status, errorText);
      return NextResponse.json(
        { error: `Google Places API request failed: ${errorText}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      return NextResponse.json(
        { error: `Google Places API error: ${data.error_message || data.status}` },
        { status: 500 }
      );
    }

    // Cache the result in Redis
    await redis.set(CACHE_KEY, data.result, { ex: CACHE_TTL });
    console.log('Cached reviews in Redis for 48 hours');

    return NextResponse.json(data.result);
  } catch (error) {
    console.error('Error fetching or caching reviews:', error);
    return NextResponse.json({ error: `Server error: ${(error as Error).message}` }, { status: 500 });
  }
}