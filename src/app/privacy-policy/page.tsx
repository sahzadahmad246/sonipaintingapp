import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Database,
  Mail,
  ChevronRight,
  Globe,
  Fingerprint,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Zycra",
  description:
    "Privacy Policy for Zycra covering account data, Google sign-in data usage, storage, retention, and user rights.",
  alternates: {
    canonical: "https://www.zycrainterior.com/privacy-policy",
  },
};

const brandName = "Zycra";

const sections = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    icon: Database,
    body: "When you sign in with Google, we collect basic profile information such as your name, email address, and profile photo. We also store account role and account activity needed to operate your dashboard experience.",
  },
  {
    id: "how-we-use-information",
    title: "How We Use Your Information",
    icon: Globe,
    body: "We use your information to authenticate your account, provide secure access to your profile and dashboards, manage quotations/projects/invoices, and communicate service-related updates.",
  },
  {
    id: "google-oauth-data-usage",
    title: "Google OAuth Data Usage",
    icon: Fingerprint,
    body: "We only request standard Google login scopes (openid, email, profile). We do not request Gmail, Drive, or other sensitive/restricted Google scopes. Your Google data is used only for login and account identity within this app.",
  },
  {
    id: "data-sharing",
    title: "Data Sharing",
    icon: Lock,
    body: "We do not sell your personal information. Data may be processed by trusted service providers required to operate the app, such as hosting, database, and authentication infrastructure.",
  },
  {
    id: "data-retention",
    title: "Data Retention",
    icon: Database,
    body: "We retain account information while your account is active or as required for legal, security, operational, and financial record-keeping purposes. You may request account-related data removal subject to legal obligations.",
  },
  {
    id: "security",
    title: "Security",
    icon: ShieldCheck,
    body: "We use reasonable administrative and technical safeguards to protect your data. However, no online system can be guaranteed as fully secure at all times.",
  },
  {
    id: "your-rights",
    title: "Your Rights",
    icon: Lock,
    body: "You may request access, correction, or deletion of your personal information by contacting us. We will respond in accordance with applicable law.",
  },
  {
    id: "policy-updates",
    title: "Policy Updates",
    icon: Globe,
    body: "We may update this policy when required by legal, operational, or product changes. Material changes will be reflected on this page with an updated effective date.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background via-secondary/10 to-background">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
        </div>
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2.5 rounded-full bg-secondary/10 px-4 py-2 text-sm font-medium text-secondary border border-secondary/20 mb-6">
              <ShieldCheck className="h-4 w-4" />
              PRIVACY
            </div>
            
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground leading-tight mb-4">
              Your Data, <span className="text-secondary">Protected</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-6">
              {brandName} values your trust and privacy. This policy explains what we collect, why we collect it, and how we protect your information with industry-leading standards.
            </p>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-full border border-border">
                <Fingerprint className="h-3.5 w-3.5" />
                Standard Google Scopes
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-full border border-border">
                <Globe className="h-3.5 w-3.5" />
                Last Updated: March 4, 2026
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
                  className="group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/10 transition-all duration-200"
                >
                  <span>{section.title}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="space-y-6 max-w-4xl">
            {sections.map((section) => {
              const IconComponent = section.icon;
              return (
                <article
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-8 group"
                >
                  <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-secondary/15 text-secondary">
                          <IconComponent className="h-6 w-6" />
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
              );
            })}

            {/* Data Rights Section */}
            <article className="scroll-mt-8">
              <div className="bg-gradient-to-br from-secondary/10 to-accent/5 border border-secondary/20 rounded-2xl p-8 md:p-10">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-secondary/20 text-secondary">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-3">
                      Your Privacy Rights
                    </h2>
                    <p className="text-base text-muted-foreground leading-relaxed mb-4">
                      You have the right to access, correct, or request deletion of your personal information. You can also opt-out of non-essential communications. Contact our privacy team at{" "}
                      <a
                        href="mailto:contact@zycrainterior.com"
                        className="font-semibold text-secondary hover:text-secondary/80 transition-colors"
                      >
                        contact@zycrainterior.com
                      </a>{" "}
                      to exercise these rights.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            {/* Contact Section */}
            <article className="scroll-mt-8">
              <div className="bg-gradient-to-br from-accent/10 to-secondary/5 border border-accent/20 rounded-2xl p-8 md:p-10">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent/20 text-accent">
                      <Mail className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-3">
                      Questions About Privacy?
                    </h2>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      If you have any concerns or questions about our privacy practices, please don&apos;t hesitate to reach out to our dedicated privacy team.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            {/* Navigation Links */}
            <div className="flex flex-col sm:flex-row gap-3 pt-8 border-t border-border">
              <Link
                href="/terms-of-service"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-white rounded-lg font-medium hover:bg-secondary/90 transition-all duration-200 transform hover:scale-105"
              >
                <Lock className="h-4 w-4" />
                Terms of Service
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-all duration-200"
              >
                <Mail className="h-4 w-4" />
                Contact Privacy Team
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-muted/30 transition-all duration-200"
              >
                <Database className="h-4 w-4" />
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
              Privacy is Our Priority
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              We&apos;re committed to protecting your data with the highest standards of security and transparency. Trust {brandName} with your business.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 bg-secondary text-white rounded-lg font-medium hover:bg-secondary/90 transition-all duration-200"
            >
              Return to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
