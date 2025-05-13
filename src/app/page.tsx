import HomePage from "@/components/home/home-page";
import { Metadata } from "next";


// Define metadata for SEO
export const metadata: Metadata = {
  title: "Soni Painting - Interior Painting & Contracting Services",
  description:
    "Soni Painting offers premium interior contracting services in Thane, including house painting, office painting, POP, plumbing, carpentry, tiles, and more. Transform your space with our expert team.",
  openGraph: {
    title: "Soni Painting - Interior Painting & Contracting Services",
    description:
      "Transform your home or office with Soni Painting's premium interior services: painting, POP, plumbing, carpentry, tiles, and more.",
    url: "https://www.sonipainting.com",
    siteName: "Soni Painting",
    images: [
      {
        url: "/images/painting.jpg",
        width: 1200,
        height: 630,
        alt: "Soni Painting Interior Work",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Soni Painting - Interior Painting & Contracting Services",
    description:
      "Premium interior services by Soni Painting: painting, POP, plumbing, carpentry, tiles, and more.",
    images: ["/images/painting.jpg"],
  },
  alternates: {
    canonical: "https://www.sonipainting.com",
    languages: {
      en: "https://www.sonipainting.com",
      "x-default": "https://www.sonipainting.com",
    },
  },
  icons: {
    icon: "/logo.png", // Favicon from public/
  },
};

// Static JSON-LD structured data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Soni Painting",
  description:
    "Premium interior contracting services including painting, POP, plumbing, carpentry, tiles, and more in Thane, Maharashtra.",
  url: "https://www.sonipainting.com",
  telephone: "+919022846640",
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+919022846640",
      contactType: "Customer Service",
      availableLanguage: ["English", "Hindi"],
      areaServed: "IN",
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "09:00",
        closes: "18:00",
      },
    },
    {
      "@type": "ContactPoint",
      telephone: "+918452085416",
      contactType: "Customer Service",
      contactOption: "WhatsApp",
      availableLanguage: ["English", "Hindi"],
      areaServed: "IN",
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "00:00", // Fixed typo from "00: mustache"
        closes: "23:59",
      },
    },
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Hiranandani Estate, Patlipada, Ghodbunder Road",
    addressLocality: "Thane (West)",
    addressRegion: "MH",
    postalCode: "400607",
    addressCountry: "IN",
  },
  openingHours: "Mo-Sa 09:00-18:00",
  image: "https://www.sonipainting.com/images/painting.jpg",
  sameAs: [
    "https://www.facebook.com/sonipainting",
    "https://www.instagram.com/sonipainting",
    "https://www.linkedin.com/company/sonipainting",
  ],
  geo: {
    "@type": "GeoCoordinates",
    latitude: "19.2542", // Approximate coordinates for Thane (West)
    longitude: "72.9813",
  },
};



export default function Home() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Pass static data to HomePage component */}
      <HomePage />
    </>
  );
}