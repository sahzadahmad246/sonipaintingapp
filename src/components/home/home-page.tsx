"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  Phone,
  MapPin,
  Paintbrush,
  Home,
  Building,
  Shield,
  MessageSquare,
  Play,
  Instagram,
  Facebook,
  Linkedin,
  Calendar,
  Star,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { getGeneralInfo } from "@/app/lib/api"
import type { GeneralInfo } from "@/app/types"
import { toast } from "sonner"

export default function HomePage() {
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGeneralInfo = async () => {
      try {
        const data = await getGeneralInfo()
        const validatedData: GeneralInfo = {
          siteName: data.siteName || "SoniPainting",
          mobileNumber1: data.mobileNumber1 || "+91 98765 43210",
          mobileNumber2: data.mobileNumber2,
          address: data.address || "123 Main Street, New Delhi, India 110001",
          logoUrl: data.logoUrl || "/logo.png",
        }
        setGeneralInfo(validatedData)
      } catch {
        toast.error("Failed to load business information")
        setGeneralInfo({
          siteName: "SoniPainting",
          mobileNumber1: "+91 98765 43210",
          mobileNumber2: undefined,
          address: "123 Main Street, New Delhi, India 110001",
          logoUrl: "/logo.png",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchGeneralInfo()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const {
    siteName = "SoniPainting",
    mobileNumber1 = "+91 98765 43210",
    mobileNumber2 = "",
    address = "123 Main Street, New Delhi, India 110001",
    logoUrl = "/logo.png",
  } = generalInfo || {}

  return (
    <div className="flex flex-col min-h-screen">
     

      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/placeholder-23rim.png"
            alt="Beautiful modern interior with professional painting"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <Badge className="mb-6 bg-secondary/10 text-secondary border-secondary/20 px-4 py-2">
              <Sparkles className="mr-2 h-4 w-4" />
              Premium Interior Services
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight text-balance">
              Transform Your Space with
              <span className="block text-primary">Expert Craftsmanship</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl text-pretty">
              Premium interior painting, POP work, carpentry, and tiling services. Bringing your vision to life with
              quality and precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 text-lg">
                <Phone className="mr-2 h-5 w-5" />
                Get Free Quote
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-4 text-lg bg-transparent"
              >
                <Play className="mr-2 h-5 w-5" />
                View Our Work
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">Free Consultation</span>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">Quality Guarantee</span>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">On-Time Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Trusted by Hundreds</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our commitment to excellence has earned us the trust of customers across the region
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-xl bg-background shadow-sm">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground font-medium">Projects Completed</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-background shadow-sm">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">15+</div>
              <div className="text-muted-foreground font-medium">Years Experience</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-background shadow-sm">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">98%</div>
              <div className="text-muted-foreground font-medium">Customer Satisfaction</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-background shadow-sm">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground font-medium">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Our Services</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">
              Complete Interior Solutions
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
              From painting to carpentry, we provide comprehensive interior services to transform your space into
              something extraordinary.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-2xl w-fit group-hover:bg-primary/20 transition-colors">
                  <Paintbrush className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold text-card-foreground">Interior Painting</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-muted-foreground mb-6">
                  Professional interior painting with premium quality paints and expert craftsmanship.
                </CardDescription>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-primary/10 rounded-full">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>Color Consultation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-primary/10 rounded-full">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>Surface Preparation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-primary/10 rounded-full">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>Premium Paints</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-secondary/10 rounded-2xl w-fit group-hover:bg-secondary/20 transition-colors">
                  <Home className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle className="text-xl font-bold text-card-foreground">POP Work</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-muted-foreground mb-6">
                  Expert POP (Plaster of Paris) work for ceilings and decorative elements.
                </CardDescription>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-secondary/10 rounded-full">
                      <Check className="h-3 w-3 text-secondary" />
                    </div>
                    <span>Ceiling Design</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-secondary/10 rounded-full">
                      <Check className="h-3 w-3 text-secondary" />
                    </div>
                    <span>Decorative Molding</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-secondary/10 rounded-full">
                      <Check className="h-3 w-3 text-secondary" />
                    </div>
                    <span>Textured Finish</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-2xl w-fit group-hover:bg-primary/20 transition-colors">
                  <Building className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold text-card-foreground">Carpentry</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-muted-foreground mb-6">
                  Custom carpentry solutions for furniture, cabinets, and woodwork.
                </CardDescription>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-primary/10 rounded-full">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>Custom Furniture</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-primary/10 rounded-full">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>Cabinet Making</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-primary/10 rounded-full">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>Wood Finishing</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-secondary/10 rounded-2xl w-fit group-hover:bg-secondary/20 transition-colors">
                  <Shield className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle className="text-xl font-bold text-card-foreground">Tiles & Flooring</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-muted-foreground mb-6">
                  Complete tiling and flooring solutions for all types of spaces.
                </CardDescription>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-secondary/10 rounded-full">
                      <Check className="h-3 w-3 text-secondary" />
                    </div>
                    <span>Ceramic Tiles</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-secondary/10 rounded-full">
                      <Check className="h-3 w-3 text-secondary" />
                    </div>
                    <span>Marble Work</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="p-1 bg-secondary/10 rounded-full">
                      <Check className="h-3 w-3 text-secondary" />
                    </div>
                    <span>Bathroom Tiles</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">Testimonials</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">What Our Clients Say</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-background border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  &ldquo;Exceptional work! They transformed our living room completely. The attention to detail and quality of
                  work exceeded our expectations.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">RK</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Rajesh Kumar</p>
                    <p className="text-sm text-muted-foreground">Homeowner</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  &ldquo;Professional team, on-time delivery, and excellent craftsmanship. Highly recommend for any interior
                  work.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                    <span className="text-secondary font-semibold">PS</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Priya Sharma</p>
                    <p className="text-sm text-muted-foreground">Interior Designer</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  &ldquo;Amazing POP work and painting. They brought our vision to life perfectly. Will definitely hire
                  again!&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">AS</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Amit Singh</p>
                    <p className="text-sm text-muted-foreground">Business Owner</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/abstract-geometric-pattern.png')] opacity-10"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6 text-balance">
            Ready to Transform Your Space?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto text-pretty">
            Get a free consultation and quote for your interior project. Let&apos;s bring your vision to life together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-background text-primary hover:bg-background/90 px-8 py-4 text-lg">
              <Phone className="mr-2 h-5 w-5" />
              Call Now: {mobileNumber1}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary px-8 py-4 text-lg bg-transparent"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              WhatsApp Us
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Get In Touch</h2>
            <p className="text-muted-foreground">Ready to start your project? Contact us today</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-lg bg-card hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="p-4 bg-primary/10 rounded-2xl w-fit mx-auto mb-6">
                  <Phone className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-card-foreground mb-4">Call Us</h3>
                <p className="text-muted-foreground mb-2">{mobileNumber1}</p>
                {mobileNumber2 && <p className="text-muted-foreground">{mobileNumber2}</p>}
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg bg-card hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="p-4 bg-secondary/10 rounded-2xl w-fit mx-auto mb-6">
                  <MapPin className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="font-bold text-lg text-card-foreground mb-4">Visit Us</h3>
                <p className="text-muted-foreground">{address}</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg bg-card hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="p-4 bg-primary/10 rounded-2xl w-fit mx-auto mb-6">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-card-foreground mb-4">Working Hours</h3>
                <p className="text-muted-foreground mb-2">Mon - Sat: 9:00 AM - 6:00 PM</p>
                <p className="text-muted-foreground">Sunday: Closed</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="bg-foreground text-background py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6 ">
                <div className="bg-white flex items-center justify-center p-1 rounded-[50%]"><Image
                  src={logoUrl || "/placeholder.svg"}
                  alt={siteName}
                  width={40}
                  height={40}
                  className="rounded-lg "
                /></div>
                
                <h3 className="text-2xl font-bold">{siteName}</h3>
              </div>
              <p className="text-background/80 mb-6 max-w-md">
                Professional interior painting and contracting services. Transforming spaces with quality craftsmanship
                and attention to detail.
              </p>
              <div className="flex gap-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-background/20 text-background/80 hover:bg-background/10 bg-transparent"
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-background/20 text-background/80 hover:bg-background/10 bg-transparent"
                >
                  <Instagram className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-background/20 text-background/80 hover:bg-background/10 bg-transparent"
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Services</h4>
              <ul className="space-y-3 text-background/80">
                <li>
                  <Link href="/services" className="hover:text-background transition-colors">
                    Interior Painting
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="hover:text-background transition-colors">
                    POP Work
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="hover:text-background transition-colors">
                    Carpentry
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="hover:text-background transition-colors">
                    Tiles & Flooring
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Quick Links</h4>
              <ul className="space-y-3 text-background/80">
                <li>
                  <Link href="/about" className="hover:text-background transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/portfolio" className="hover:text-background transition-colors">
                    Portfolio
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-background transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/reviews" className="hover:text-background transition-colors">
                    Reviews
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-background/20 pt-8 text-center text-background/60">
            <p>&copy; 2024 {siteName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
