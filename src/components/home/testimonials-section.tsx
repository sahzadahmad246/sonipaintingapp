"use client"

import { useState, useEffect } from "react"


const testimonials = [
    {
        text: "The team at Soni Painting was incredible. They finished my entire 3BHK in 6 days as promised. The quality is unmatched.",
        name: "Aditya Tiwari",
        role: "Thane, Local Guide",
        image: "/hero-interior.png" // Placeholder
    },
    {
        text: "Professional, clean, and reasonably priced. I loved how they handled the furniture covering.",
        name: "Sanjay Gupta",
        role: "Ghodbunder Road",
        image: "/service-pop.png" // Placeholder
    },
    {
        text: "Best decision for my office renovation. The false ceiling work is precise and elegant.",
        name: "Amit Patel",
        role: "Business Owner",
        image: "/hero-interior.png"
    }
]

export default function TestimonialsSection() {
    const [currentSlide, setCurrentSlide] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev >= testimonials.length - 1 ? 0 : prev + 1))
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    return (
        <section className="py-16 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-left mb-10">
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-serif mb-2">
                        Trusted by Homeowners
                    </h2>
                </div>

                <div className="relative overflow-hidden ">
                    <div
                        className="flex transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                        {testimonials.map((item, i) => (
                            <div key={i} className="w-full flex-shrink-0 px-2 sm:px-4">
                                <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] h-full border">
                                    <div className="text-4xl sm:text-6xl text-slate-200 font-serif leading-none mb-4">“</div>
                                    <p className="text-sm sm:text-lg text-slate-700 mb-6 sm:mb-8 font-medium leading-relaxed">
                                        {item.text}
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden relative border-2 border-white shadow-md">
                                            <div className="w-full h-full bg-slate-300 flex items-center justify-center font-bold text-slate-600">
                                                {item.name.charAt(0)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm sm:text-base">{item.name}</div>
                                            <div className="text-xs sm:text-sm text-slate-500">{item.role}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Dots */}
                    <div className="flex justify-center gap-2 mt-6">
                        {testimonials.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentSlide(i)}
                                className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? "w-8 bg-[#0B0F19]" : "w-2 bg-slate-200"}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
