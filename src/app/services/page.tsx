import { Suspense } from "react";
import ServicesDisplay from "@/components/services/ServicesDisplay";
import { Metadata } from "next";
import { services } from "../lib/servicesData";

// Define metadata for SEO
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Soni Painting Services - Interior Contracting in Mumbai & Thane",
  description:
    "Explore Soni Painting's premium interior contracting services in Mumbai and Thane, including painting, carpentry, POP, tiles, wood polish, waterproofing, and false ceilings. Transform your space with our expert team.",
  openGraph: {
    title: "Soni Painting Services - Interior Contracting in Mumbai & Thane",
    description:
      "Premium interior services in Mumbai and Thane: painting, carpentry, POP, tiles, wood polish, waterproofing, and false ceilings by Soni Painting.",
    url: "https://www.sonipainting.com/services",
    siteName: "Soni Painting",
    images: [
      {
        url: "/images/painting.jpg",
        width: 1200,
        height: 630,
        alt: "Soni Painting Services",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Soni Painting Services - Interior Contracting in Mumbai & Thane",
    description:
      "Premium interior services in Mumbai and Thane: painting, carpentry, POP, tiles, wood polish, waterproofing, and false ceilings.",
    images: ["/images/painting.jpg"],
  },
  alternates: {
    canonical: "https://www.sonipainting.com/services",
    languages: {
      en: "https://www.sonipainting.com/services",
      "x-default": "https://www.sonipainting.com/services",
    },
  },
};

// Static JSON-LD structured data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Soni Painting",
  description:
    "Premium interior contracting services in Mumbai and Thane, including painting, carpentry, POP, tiles, wood polish, waterproofing, and false ceilings.",
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
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Interior Contracting Services",
    itemListElement: services.map((service) => ({
      "@type": "Service",
      name: service.title,
      description: service.description,
      url: `https://www.sonipainting.com/services#${service.slug}`,
      image: `https://www.sonipainting.com${service.image}`,
      areaServed: ["Mumbai", "Thane"],
    })),
  },
};

export default function ServicesPage() {
  return (
    <section className="py-16 bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">
          Our Services in Mumbai & Thane
        </h1>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Discover Soni Painting’s premium interior contracting services,
          tailored for homes and offices in Mumbai and Thane. From painting to
          false ceilings, we deliver quality and excellence.
        </p>
        <Suspense fallback={<div>Loading services...</div>}>
          <ServicesDisplay />
        </Suspense>
      </div>
    </section>
  );
}
