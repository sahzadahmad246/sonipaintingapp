import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Scale,
  Shield,
  Mail,
  ChevronRight,
  Gavel,
  Building2,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Zycra",
  description:
    "Terms of Service for Zycra covering account access, acceptable use, intellectual property, liability limits, and governing law.",
  alternates: {
    canonical: "https://www.zycrainterior.com/terms-of-service",
  },
};

const brandName = "Zycra";

const sections = [
  {
    id: "acceptance-of-terms",
    title: "Acceptance of Terms",
    body: "By accessing or using this website and related services, you agree to these Terms of Service. If you do not agree, do not use the service.",
  },
  {
    id: "account-and-authentication",
    title: "Account and Authentication",
    body: "You may sign in using Google authentication. You are responsible for maintaining access to your account and ensuring that account information used to sign in is accurate.",
  },
  {
    id: "permitted-use",
    title: "Permitted Use",
    body: "You agree not to misuse the platform, attempt unauthorized access, interfere with service operations, or use the platform for unlawful activity.",
  },
  {
    id: "business-content-and-records",
    title: "Business Content and Records",
    body: "Quotations, invoices, project records, and related content generated in the app are provided for business workflow support. You are responsible for reviewing and validating all final documents before sharing them externally.",
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    body: "All website design, branding, software logic, and platform content are protected by applicable intellectual property laws unless otherwise stated.",
  },
  {
    id: "disclaimer-of-warranties",
    title: "Disclaimer of Warranties",
    body: "The service is provided on an 'as is' and 'as available' basis. We do not guarantee uninterrupted or error-free operation at all times.",
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    body: "To the maximum extent allowed by law, we are not liable for indirect, incidental, special, or consequential damages arising from your use of the service.",
  },
  {
    id: "termination",
    title: "Termination",
    body: "We may suspend or terminate access to the service where necessary for security, legal compliance, abuse prevention, or policy violations.",
  },
  {
    id: "governing-law",
    title: "Governing Law",
    body: "These terms are governed by the laws of India. Any disputes are subject to the competent courts of Thane, Maharashtra, unless otherwise required by law.",
  },
  {
    id: "changes-to-terms",
    title: "Changes to Terms",
    body: "We may update these terms periodically. Continued use of the service after updates constitutes acceptance of the revised terms.",
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>
        </div>
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2.5 rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent border border-accent/20 mb-6">
              <FileText className="h-4 w-4" />
              LEGAL
            </div>
            
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground leading-tight mb-4">
              Terms of <span className="text-accent">Service</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-6">
              Our commitment to transparency and trust. These terms define the legal agreement between you and {brandName} when using our platform and services.
            </p>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-full border border-border">
                <Gavel className="h-3.5 w-3.5" />
                Effective: March 4, 2026
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-full border border-border">
                <Building2 className="h-3.5 w-3.5" />
                Thane, Maharashtra
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
          {/* Sidebar Navigation */}
          <aside className="lg:sticky lg:top-8 lg:h-fit">
            <nav className="space-y-1">
              <div className="mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  On This Page
                </h2>
              </div>
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all duration-200"
                >
                  <span>{section.title}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="space-y-6 max-w-4xl">
            {sections.map((section, index) => (
              <article
                key={section.id}
                id={section.id}
                className="scroll-mt-8 group"
              >
                <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent/10 text-accent">
                        <span className="text-sm font-semibold">{String(index + 1).padStart(2, '0')}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-3">
                        {section.title}
                      </h2>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {section.body}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {/* Contact Section */}
            <article className="scroll-mt-8">
              <div className="bg-gradient-to-br from-accent/10 to-secondary/5 border border-accent/20 rounded-2xl p-8 md:p-10">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent/20 text-accent">
                      <Mail className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-3">
                      Questions?
                    </h2>
                    <p className="text-base text-muted-foreground leading-relaxed mb-4">
                      For questions about these terms, please reach out to our team at{" "}
                      <a
                        href="mailto:contact@zycrainterior.com"
                        className="font-semibold text-accent hover:text-accent/80 transition-colors"
                      >
                        contact@zycrainterior.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </article>

            {/* Navigation Links */}
            <div className="flex flex-col sm:flex-row gap-3 pt-8 border-t border-border">
              <Link
                href="/privacy-policy"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-all duration-200 transform hover:scale-105"
              >
                <Shield className="h-4 w-4" />
                Privacy Policy
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-all duration-200"
              >
                <Mail className="h-4 w-4" />
                Contact Us
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-muted/30 transition-all duration-200"
              >
                <Scale className="h-4 w-4" />
                Back Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h3 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-3">
              Ready to get started?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              By using {brandName}, you agree to these terms. Start managing your projects with confidence.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-all duration-200"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
