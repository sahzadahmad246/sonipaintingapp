import About from "@/components/services/About";
import { Metadata } from "next";

// Define metadata for SEO
export const metadata: Metadata = {
  title: "About Soni Painting - Interior Contractor in Mumbai & Thane",
  description:
    "Learn about Soni Painting, founded by Omprakash Gupta with 7 years of experience, offering premium interior contracting services in Mumbai and Thane, including painting, carpentry, POP, tiles, and more.",
  openGraph: {
    title: "About Soni Painting - Interior Contractor in Mumbai & Thane",
    description:
      "Discover Soni Painting, led by Omprakash Gupta, providing expert interior services in Mumbai and Thane: painting, carpentry, POP, tiles, and more.",
    url: "https://www.sonipainting.com/about",
    siteName: "Soni Painting",
    images: [
      {
        url: "/images/painting.jpg",
        width: 1200,
        height: 630,
        alt: "Soni Painting About",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Soni Painting - Interior Contractor in Mumbai & Thane",
    description:
      "Soni Painting, founded by Omprakash Gupta, offers premium interior services in Mumbai and Thane.",
    images: ["/images/painting.jpg"],
  },
  alternates: {
    canonical: "https://www.sonipainting.com/about",
    languages: {
      en: "https://www.sonipainting.com/about",
      "x-default": "https://www.sonipainting.com/about",
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
    "Premium interior contracting services in Mumbai and Thane, founded by Omprakash Gupta with 7 years of experience, specializing in painting, carpentry, POP, tiles, wood polish, waterproofing, and false ceilings.",
  url: "https://www.sonipainting.com",
  telephone: "+919022846640",
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+919022846640",
      contactType: "Customer Service",
      availableLanguage: ["English", "Hindi"],
      areaServed: ["Mumbai", "Thane"],
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
      areaServed: ["Mumbai", "Thane"],
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
        opens: "00:00",
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
  geo: {
    "@type": "GeoCoordinates",
    latitude: "19.2542",
    longitude: "72.9813",
  },
  openingHours: "Mo-Sa 09:00-18:00",
  image: "https://www.sonipainting.com/images/painting.jpg",
  sameAs: [
    "https://www.facebook.com/sonipainting",
    "https://www.instagram.com/sonipainting",
    "https://www.linkedin.com/company/sonipainting",
  ],
  founder: {
    "@type": "Person",
    name: "Omprakash Gupta",
    jobTitle: "Founder",
    description:
      "Omprakash Gupta has 7 years of experience in interior contracting, leading Soni Painting to deliver premium services in Mumbai and Thane.",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <About />
    </div>
  );
}