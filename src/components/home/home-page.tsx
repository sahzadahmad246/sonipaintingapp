"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, ArrowRight, Star, Phone, MapPin } from "lucide-react";
import { getGeneralInfo } from "@/app/lib/api";
import { GeneralInfo } from "@/app/types";
import { toast } from "sonner";

export default function HomePage() {
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGeneralInfo = async () => {
      try {
        const data = await getGeneralInfo();
        // Validate and transform data to match GeneralInfo with only required fields
        const validatedData: GeneralInfo = {
          siteName: data.siteName || "SoniPainting",
          mobileNumber1: data.mobileNumber1 || "+91 98765 43210",
          mobileNumber2: data.mobileNumber2,
          address: data.address || "123 Main Street, New Delhi, India 110001",
          logoUrl: data.logoUrl || "/logo.png",
        };
        setGeneralInfo(validatedData);
      } catch {
        toast.error("Failed to load business information");
        // Set fallback data if API fails
        setGeneralInfo({
          siteName: "SoniPainting",
          mobileNumber1: "+91 98765 43210",
          mobileNumber2: undefined,
          address: "123 Main Street, New Delhi, India 110001",
          logoUrl: "/logo.png",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchGeneralInfo();
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  // Fallback values (should not be needed due to validation, but kept for safety)
  const {
    siteName = "SoniPainting",
    mobileNumber1 = "+91 98765 43210",
    mobileNumber2 = "",
    address = "123 Main Street, New Delhi, India 110001",
    logoUrl = "/logo.png",
  } = generalInfo || {};

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full h-[80vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/painting.jpg"
            alt="Interior painting"
            fill
            className="object-cover brightness-[0.7]"
            priority
          />
          {/* Gradient overlay for dark shade on the left */}
          <div
            className="absolute inset-0 z-10"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(0, 0, 0, 0.7), transparent)",
            }}
          />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              Transform Your Space with Professional Painting
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Premium interior painting, POP, carpentry, and tiling services for
              your home or business
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="text-base">
                <Link href="/services">Our Services</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20 text-base"
              >
                <Link href={`tel:${mobileNumber1}`}>Call Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Professional Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We offer a wide range of interior services to transform your space
              into something beautiful and functional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Interior Painting",
                description:
                  "Professional painting services with premium paints and finishes",
                image: "/images/painting.jpg",
              },
              {
                title: "POP Work",
                description:
                  "Custom POP designs for ceilings, walls, and decorative elements",
                image: "/images/pop.jpg",
              },
              {
                title: "Carpentry",
                description:
                  "Custom woodwork, furniture, and cabinetry for your home",
                image: "/images/carpentry.jpg",
              },
              {
                title: "Tiling",
                description:
                  "Expert tiling services for floors, walls, and backsplashes",
                image: "/images/tiles.jpg",
              },
            ].map((service, index) => (
              <Card
                key={index}
                className="overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                <div className="relative h-48">
                  <Image
                    src={service.image || "/placeholder.svg"}
                    alt={service.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle>{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{service.description}</p>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="gap-1" asChild>
                    <Link href="/services">
                      Learn More <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose {siteName}?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                With years of experience and a commitment to quality, we deliver
                exceptional results that exceed your expectations.
              </p>

              <div className="space-y-4">
                {[
                  "Professional and experienced team",
                  "Premium quality materials",
                  "Attention to detail",
                  "On-time project completion",
                  "Competitive pricing",
                  "Clean and safe work environment",
                ].map((item, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <p className="ml-3 text-gray-600">{item}</p>
                  </div>
                ))}
              </div>

              <Button asChild className="mt-8">
                <Link href="/contact">Contact Us Today</Link>
              </Button>
            </div>

            <div className="relative h-[400px] lg:h-[500px] rounded-lg overflow-hidden shadow-xl">
              <Image
                src="/images/tiles.jpg"
                alt="Our work"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Clients Say
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Do not just take our word for it. Here is what our satisfied
              customers have to say about our services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Rahul Sharma",
                role: "Homeowner",
                content:
                  `${siteName} transformed our living room with their exceptional painting service. The team was professional, punctual, and the quality of work was outstanding.`,
              },
              {
                name: "Priya Patel",
                role: "Interior Designer",
                content:
                  `I have worked with ${siteName} on multiple projects, and they consistently deliver high-quality results. Their attention to detail and craftsmanship is impressive.`,
              },
              {
                name: "Amit Verma",
                role: "Business Owner",
                content:
                  `We hired ${siteName} for our office renovation, and they exceeded our expectations. The team was efficient, and the finished work looks amazing.`,
              },
            ].map((testimonial, index) => (
              <Card key={index} className="bg-white">
                <CardHeader>
                  <div className="flex items-center gap-1 text-yellow-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 italic mb-4">
                    &quot;{testimonial.content}&quot;
                  </p>
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Space?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Contact us today for a free consultation and quote. Let us bring your
            vision to life!
          </p>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="bg-white text-primary hover:bg-white/90 border-none"
          >
            <Link href={`tel:${mobileNumber1}`}>Call Now</Link>
          </Button>
        </div>
      </section>

      {/* Contact Panel */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-sm">
              <Phone className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Call Us</h3>
              <p className="text-gray-600">
                <a href={`tel:${mobileNumber1}`}>{mobileNumber1}</a>
              </p>
              <p className="text-gray-600">Mon-Sat: 9am - 6pm</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-sm">
              <Phone className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">WhatsApp</h3>
              {mobileNumber2 ? (
                <p className="text-gray-600">
                  <a
                    href={`https://wa.me/${mobileNumber2.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    +91 {mobileNumber2}
                  </a>
                </p>
              ) : (
                <p className="text-gray-600">WhatsApp not available</p>
              )}
              <p className="text-gray-600">Available 24/7</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-sm">
              <MapPin className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Visit Us</h3>
              <p className="text-gray-600">{address}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Image
                  src={logoUrl}
                  alt={`${siteName} Logo`}
                  width={40}
                  height={30}
                  className="w-[40px] h-auto brightness-0 invert"
                />
                <span className="ml-2 font-bold text-lg">{siteName}</span>
              </div>
              <p className="text-gray-400 mb-4">
                Premium interior painting and renovation services for homes and
                businesses.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Services
                  </Link>
                </li>
                <li>
                  <Link
                    href="/portfolio"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Portfolio
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Services</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/services"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Interior Painting
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    POP Work
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Carpentry
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Tiling
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-start">
                  <MapPin className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{address}</span>
                </li>
                <li className="flex items-center">
                  <Phone className="h-5 w-5 mr-2 flex-shrink-0" />
                  <a href={`tel:${mobileNumber1}`}>{mobileNumber1}</a>
                </li>
                {mobileNumber2 && (
                  <li className="flex items-center">
                    <Phone className="h-5 w-5 mr-2 flex-shrink-0" />
                    <a
                      href={`https://wa.me/${mobileNumber2.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp: +91 {mobileNumber2}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}