"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Star, } from "lucide-react"

export default function HeroSection() {
    return (
        <section className="relative bg-white pt-24 pb-12 lg:pt-32 lg:pb-20 overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                    {/* Left Content */}
                    <div className="w-full text-left order-1">
                        <div className="inline-flex items-center gap-2 mb-6">
                            <Star className="w-5 h-5 text-green-500 fill-green-500" />
                            <span className="text-sm font-bold text-slate-900">Trusted Ratings</span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] mb-6 tracking-tight font-serif">
                            Perfect Ceiling & <br /> Wall Solutions
                        </h1>

                        <p className="text-base sm:text-lg text-slate-500 mb-8 leading-relaxed max-w-lg">
                            Transform your home or office with our expert painting, false ceilings, and interior styling.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-10">
                            <Button size="lg" className="w-full sm:w-auto rounded-xl px-10 py-7 text-base font-bold bg-[#0B0F19] text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10">
                                Get a Quote <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <Button size="lg" variant="ghost" className="w-full sm:w-auto rounded-xl px-10 py-7 text-base font-bold text-slate-900 hover:bg-slate-50">
                                View Projects
                            </Button>
                        </div>

                        <div className="flex justify-between sm:justify-start gap-8 border-t border-slate-100 pt-8">
                            <div>
                                <div className="text-3xl font-bold text-slate-900 mb-1">500+</div>
                                <div className="text-sm text-slate-500 font-medium">Projects</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-slate-900 mb-1">15+</div>
                                <div className="text-sm text-slate-500 font-medium">Years</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-slate-900 mb-1">4.9</div>
                                <div className="text-sm text-slate-500 font-medium">Rating</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Image (Mobile: Bottom, Desktop: Right) */}
                    <div className="w-full relative mt-8 lg:mt-0 order-2">
                        <div className="relative aspect-[4/3] lg:aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl w-full">
                            <Image
                                src="/hero-interior.png"
                                alt="Luxury Interior Ceiling"
                                fill
                                className="object-cover"
                                priority
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
