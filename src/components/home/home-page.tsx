"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Phone,
  MapPin,
  ArrowRight,
  Star,
  Clock,
  ShieldCheck,
  Users,
  Palette,
  Hammer,
  Grid,
  User,
  Layers,
  Quote,
  Facebook,
  Instagram,
  Linkedin,
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

  const services = [
    {
      title: "Interior Painting",
      description: "Transform your walls with premium quality paints and expert application.",
      image: "/service-painting.png",
      icon: Palette,
      features: ["Color Consultation", "Texture Painting", "Stencil Work"],
    },
    {
      title: "POP & False Ceilings",
      description: "Elegant false ceiling designs and POP work to elevate your interiors.",
      image: "/service-pop.png",
      icon: Layers,
      features: ["Modern Designs", "Cove Lighting", "Gypsum Work"],
    },
    {
      title: "Custom Carpentry",
      description: "Bespoke furniture and woodwork tailored to your space and style.",
      image: "/service-carpentry.png",
      icon: Hammer,
      features: ["Modular Kitchens", "Wardrobes", "TV Units"],
    },
    {
      title: "Tiling & Flooring",
      description: "Premium flooring solutions including marble, vitrified tiles, and wooden flooring.",
      image: "/service-tiling.png",
      icon: Grid,
      features: ["Marble Polishing", "Tile Installation", "Floor Repair"],
    },
  ]

  return (
    <div className="flex flex-col min-h-screen font-sans text-slate-900">
      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-interior.png"
            alt="Luxury Interior"
            fill
            className="object-cover"
            priority
            quality={100}
          />
          {/* Darker overlay for better text visibility */}
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />
        </div>

        <div className="container relative z-10 px-4 sm:px-6 lg:px-8 text-center mt-10">
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-8 border-white/40 text-white px-6 py-2 text-sm md:text-base backdrop-blur-md bg-white/10 tracking-wide uppercase">
              <Star className="w-4 h-4 mr-2 fill-yellow-400 text-yellow-400" />
              #1 Rated Interior Service Provider
            </Badge>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 tracking-tight leading-[1.1] text-balance drop-shadow-lg">
              Crafting <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">Dream</span> <br />
              Interiors
            </h1>
            <p className="text-lg md:text-2xl text-gray-100 mb-12 max-w-2xl mx-auto leading-relaxed text-pretty drop-shadow-md font-medium">
              Elevate your living space with our premium painting, carpentry, and interior design services.
              Where quality meets elegance.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-10 py-7 text-lg rounded-full shadow-xl shadow-primary/20 transition-all hover:scale-105 font-semibold">
                <Phone className="mr-2 h-5 w-5" />
                Book Free Consultation
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black px-10 py-7 text-lg rounded-full backdrop-blur-sm transition-all font-semibold bg-transparent">
                Explore Services
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Stats - Improved visibility */}
        <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/40 backdrop-blur-xl hidden md:block">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-4 gap-8 text-white">
              {[
                { label: "Years Experience", value: "15+" },
                { label: "Projects Completed", value: "500+" },
                { label: "Happy Clients", value: "100%" },
                { label: "Team Members", value: "50+" },
              ].map((stat, index) => (
                <div key={index} className="text-center border-r border-white/10 last:border-0">
                  <div className="text-4xl font-bold text-amber-400 mb-2">{stat.value}</div>
                  <div className="text-sm text-gray-300 uppercase tracking-widest font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid - Darker background, reduced spacing */}
      <section className="py-16 bg-slate-100 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">Our Premium Services</h2>
            <p className="text-slate-600 text-xl max-w-2xl mx-auto leading-relaxed">
              Comprehensive interior solutions tailored to bring your vision to life with precision and care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <div key={index} className="group relative overflow-hidden rounded-[2rem] bg-white shadow-xl hover:shadow-2xl transition-all duration-500 h-[500px] border border-slate-200">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {/* Stronger gradient for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90" />

                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3.5 bg-primary rounded-2xl text-white shadow-lg shadow-primary/30">
                      <service.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white">{service.title}</h3>
                  </div>
                  <p className="text-gray-200 mb-6 text-lg line-clamp-2 group-hover:line-clamp-none transition-all font-medium">
                    {service.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {service.features.map((feature, i) => (
                      <Badge key={i} variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0 px-3 py-1 text-sm backdrop-blur-sm">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="link" className="text-amber-400 p-0 h-auto font-bold text-lg group-hover:text-amber-300 hover:no-underline flex items-center gap-2">
                    Learn More <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us - Warm background */}
      <section className="py-16 bg-stone-200 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <Badge variant="outline" className="mb-6 border-primary/20 text-primary bg-primary/5 px-4 py-1.5 text-sm">
                Why Choose Us
              </Badge>
              <h2 className="text-4xl md:text-4xl font-bold mb-6 leading-tight text-slate-900">
                Excellence in Every <br />
                <span className="text-primary">Detail</span>
              </h2>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                We don&apos;t just renovate spaces; we create environments that inspire. Our commitment to quality and customer satisfaction sets us apart.
              </p>

              <div className="space-y-8">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Quality Guarantee",
                    desc: "We use only premium materials and offer warranty on our workmanship."
                  },
                  {
                    icon: Clock,
                    title: "On-Time Delivery",
                    desc: "Strict adherence to timelines ensuring your project is completed as scheduled."
                  },
                  {
                    icon: Users,
                    title: "Expert Team",
                    desc: "Highly skilled professionals with years of experience in their respective fields."
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-stone-100 flex items-center justify-center text-primary shadow-sm">
                        <item.icon className="h-8 w-8" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2 text-slate-900">{item.title}</h3>
                      <p className="text-slate-600 text-lg leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative order-1 lg:order-2">
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-slate-50 aspect-[3/4] lg:aspect-auto lg:h-[700px]">
                <Image
                  src="/hero-interior.png"
                  alt="Interior Work"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/10" />
              </div>

              {/* Fixed Floating Card - Positioned securely */}
              <div className="absolute -bottom-6 left-8 right-6 
                md:left-10 md:-bottom-0 md:w-80 
                bg-white p-6 md:p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] 
                animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 
                border border-slate-100">
                <Quote className="h-10 w-10 text-primary/20 absolute top-6 right-6" />
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600">
                        <User className="h-5 w-5" />
                      </div>
                    ))}
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    <span className="text-primary text-lg block">500+</span>
                    Happy Clients
                  </div>
                </div>
                <p className="text-slate-600 italic leading-relaxed relative z-10">
                  &quot;Absolutely transformed our home! The team was professional and the finish is flawless.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Reduced spacing */}
      <section className="py-20 bg-zinc-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/abstract-pattern.png')] opacity-5 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-30" />

        <div className="container relative z-10 mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">Ready to Start Your Project?</h2>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Get a free consultation and detailed quote. Let&apos;s build something beautiful together.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" className="bg-white text-zinc-900 hover:bg-gray-100 px-12 py-8 text-xl rounded-full shadow-2xl font-bold transition-transform hover:-translate-y-1">
              <Phone className="mr-3 h-6 w-6" />
              Call: {mobileNumber1}
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white/20 text-white hover:bg-white/10 px-12 py-8 text-xl rounded-full backdrop-blur-sm font-bold bg-transparent transition-transform hover:-translate-y-1">
              <MapPin className="mr-3 h-6 w-6" />
              Visit Our Office
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-zinc-300 py-16 border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white p-1.5 rounded-xl">
                  <Image
                    src={logoUrl || "/placeholder.svg"}
                    alt={siteName}
                    width={40}
                    height={40}
                    className="rounded-lg"
                  />
                </div>
                <h3 className="text-2xl font-bold text-white">{siteName}</h3>
              </div>
              <p className="mb-8 max-w-md leading-relaxed text-zinc-400">
                Your trusted partner for premium interior services. We bring expertise, quality, and dedication to every project we undertake.
              </p>
              <div className="flex gap-4">
                {[
                  { icon: Facebook, href: "#" },
                  { icon: Instagram, href: "#" },
                  { icon: Linkedin, href: "#" }
                ].map((item, i) => (
                  <Link key={i} href={item.href} className="w-12 h-12 rounded-full bg-white/10 border border-white/10 hover:bg-primary hover:border-primary hover:text-white transition-all flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-8">Quick Links</h4>
              <ul className="space-y-4">
                {['Home', 'Services', 'Portfolio', 'About Us', 'Contact'].map((item) => (
                  <li key={item}>
                    <Link href="#" className="hover:text-primary transition-colors block py-1">{item}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-8">Contact Info</h4>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="p-2 bg-white/10 rounded-lg text-white">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="mt-1">{address}</span>
                </li>
                <li className="flex items-center gap-4">
                  <div className="p-2 bg-white/10 rounded-lg text-white">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span>{mobileNumber1}</span>
                </li>
                {mobileNumber2 && (
                  <li className="flex items-center gap-4">
                    <div className="p-2 bg-white/10 rounded-lg text-white">
                      <Phone className="w-5 h-5" />
                    </div>
                    <span>{mobileNumber2}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-zinc-600">
            <p>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
            <div className="flex gap-8">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
