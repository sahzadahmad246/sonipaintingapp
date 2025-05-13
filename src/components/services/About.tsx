import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MapPin, Send } from "lucide-react";

export default function About() {
  const generalInfo = {
    siteName: "Soni Painting",
    mobileNumber1: "+919022846640",
    mobileNumber2: "+918452085416",
    address:
      "Hiranandani Estate, Patlipada, Ghodbunder Road, Thane (West), Maharashtra - 400607, India",
    logoUrl: "/logo.png",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative w-full h-[50vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/painting.jpg"
            alt="Soni Painting interior work in Mumbai and Thane"
            fill
            className="object-cover brightness-[0.7]"
            priority
          />
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              About Soni Painting
            </h1>
            <p className="text-xl text-white/90">
              Founded by Omprakash Gupta, Soni Painting delivers premium interior
              contracting services across Mumbai and Thane.
            </p>
          </div>
        </div>
      </section>

      {/* About Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* About Story */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-primary">
                  Our Story
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Soni Painting was founded by Omprakash Gupta, a visionary with
                  over 7 years of experience in the interior contracting industry.
                  Based in Thane, our company has grown to become a trusted name
                  in Mumbai and Thane, delivering high-quality interior solutions
                  for homes and offices.
                </p>
                <p>
                  Omprakash’s expertise spans all types of interior work,
                  including painting, carpentry, POP (Plaster of Paris), tiles,
                  wood polish, waterproofing, and false ceilings. His commitment
                  to excellence and customer satisfaction drives Soni Painting to
                  transform spaces with precision and creativity.
                </p>
                <p>
                  At Soni Painting, we pride ourselves on using premium materials,
                  skilled craftsmanship, and innovative techniques to meet the
                  unique needs of our clients in Mumbai and Thane.
                </p>
                <Button asChild>
                  <Link href="/services">Explore Our Services</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-primary">
                  <Phone className="mr-2 h-6 w-6" />
                  Get in Touch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Image
                    src={generalInfo.logoUrl}
                    alt={`${generalInfo.siteName} Logo`}
                    width={40}
                    height={30}
                    className="w-[40px] h-auto"
                  />
                  <div>
                    <h3 className="text-lg font-semibold">
                      {generalInfo.siteName}
                    </h3>
                    <p className="text-gray-600">
                      Premium Interior Contracting Services
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p className="font-medium">Call Us</p>
                      <Link
                        href={`tel:${generalInfo.mobileNumber1}`}
                        className="text-gray-600 hover:text-primary transition-colors"
                      >
                        {generalInfo.mobileNumber1}
                      </Link>
                      <p className="text-sm text-gray-500">
                        Mon-Sat: 9am - 6pm
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <Link
                        href={`https://wa.me/${generalInfo.mobileNumber2.replace(
                          /\D/g,
                          ""
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-primary transition-colors"
                      >
                        {generalInfo.mobileNumber2}
                      </Link>
                      <p className="text-sm text-gray-500">Available 24/7</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p className="font-medium">Visit Us</p>
                      <p className="text-gray-600">{generalInfo.address}</p>
                    </div>
                  </div>
                </div>
                <Button asChild>
                  <Link href="/contact">
                    <Send className="mr-2 h-4 w-4" />
                    Contact Us
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}