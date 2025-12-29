"use client"

import HeroSection from "./hero-section"
import ExpertiseSection from "./expertise-section"
import PrecisionSection from "./precision-section"
import ProcessSection from "./process-section"
import TestimonialsSection from "./testimonials-section"
import NewsletterFooter from "./newsletter-footer"

export default function HomePage() {
  return (
    <div className="bg-white font-sans text-slate-900 selection:bg-primary/20">
      <HeroSection />
      <ExpertiseSection />
      <PrecisionSection />
      <ProcessSection />
      <TestimonialsSection />
      <NewsletterFooter />
    </div>
  )
}
