import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { services } from "@/app/lib/servicesData";

type ServiceDetailCopy = {
  intro: string;
  scope: string[];
  idealFor: string[];
  faq: Array<{ question: string; answer: string }>;
};

const detailedContent: Record<string, ServiceDetailCopy> = {
  painting: {
    intro:
      "Our painting service focuses on long-lasting finish quality, clean application, and minimal disruption for occupied homes and offices in Mumbai and Thane.",
    scope: [
      "Site inspection, moisture and crack assessment",
      "Surface preparation with putty, sanding, and primer",
      "Interior and exterior wall painting with premium paints",
      "Final touch-ups, cleanup, and handover quality checks",
    ],
    idealFor: ["Apartment repainting", "New flat possession", "Office renovation", "Rental property refresh"],
    faq: [
      {
        question: "How long does interior painting usually take?",
        answer: "Most residential projects are completed within 3 to 7 days, depending on area size and surface condition.",
      },
      {
        question: "Do you help with shade selection?",
        answer: "Yes. We support color consultation based on room lighting, usage, and desired finish style.",
      },
    ],
  },
  carpentry: {
    intro:
      "Our carpentry team handles custom woodwork with practical design, sturdy construction, and clean finishing suited to both modern and classic interiors.",
    scope: [
      "Custom storage units and furniture planning",
      "Wardrobe, cabinet, and partition execution",
      "Precision fitting and edge finishing",
      "Hardware installation and final alignment checks",
    ],
    idealFor: ["Custom wardrobes", "Storage optimization", "Office cabinetry", "Furniture upgrades"],
    faq: [
      {
        question: "Can you build furniture based on my layout?",
        answer: "Yes. We execute carpentry based on site measurements and your preferred design style.",
      },
      {
        question: "Do you support repair and modification work?",
        answer: "Yes. We also take up selected modification and restoration carpentry projects.",
      },
    ],
  },
  pop: {
    intro:
      "We deliver POP ceiling and wall design work that adds depth, detail, and a polished architectural look to residential and commercial spaces.",
    scope: [
      "Ceiling and wall design discussion",
      "POP framework and molding work",
      "Edge profile and pattern finishing",
      "Sanding and paint-ready final finish",
    ],
    idealFor: ["Living room enhancements", "Feature ceilings", "Decorative wall elements", "Commercial reception areas"],
    faq: [
      {
        question: "Is POP suitable for all rooms?",
        answer: "Yes, with correct design and moisture-safe planning. We recommend alternatives for high-humidity zones if required.",
      },
      {
        question: "Can POP include lighting points?",
        answer: "Yes. We coordinate false ceiling and POP work to support integrated lighting designs.",
      },
    ],
  },
  tiles: {
    intro:
      "Our tile installation service prioritizes level alignment, neat joints, and durable fixing for floors, walls, kitchens, and bathroom applications.",
    scope: [
      "Base surface preparation and leveling",
      "Tile layout planning for symmetry and wastage control",
      "Adhesive application and tile setting",
      "Grouting, finishing, and final inspection",
    ],
    idealFor: ["Floor replacement", "Kitchen backsplashes", "Bathroom wall tiling", "Commercial flooring"],
    faq: [
      {
        question: "Do you install all tile sizes?",
        answer: "Yes. We install standard and large-format tiles with suitable adhesive and leveling systems.",
      },
      {
        question: "Will you guide tile quantity planning?",
        answer: "Yes. We help estimate quantity with buffer for cutting and future maintenance.",
      },
    ],
  },
  "wood-polish": {
    intro:
      "Our wood polish service restores and protects wooden surfaces while enhancing grain visibility and creating a refined finish that lasts.",
    scope: [
      "Wood surface assessment and sanding",
      "Stain and base coat application",
      "Polish layering for depth and sheen",
      "Protective sealing and curing guidance",
    ],
    idealFor: ["Doors and frames", "Solid wood furniture", "Decor panels", "Refurbishment projects"],
    faq: [
      {
        question: "Do you offer matte and glossy polish finishes?",
        answer: "Yes. Finish options are selected based on wood type, usage, and maintenance preference.",
      },
      {
        question: "Can old furniture be polished again?",
        answer: "Yes. We can refinish many old wooden surfaces after proper sanding and preparation.",
      },
    ],
  },
  waterproofing: {
    intro:
      "We provide targeted waterproofing systems to prevent seepage, dampness, and structural damage across bathrooms, terraces, and external walls.",
    scope: [
      "Leak source diagnosis and substrate preparation",
      "Crack filling and chemical treatment application",
      "Membrane/coating-based waterproof layer installation",
      "Testing and post-application quality verification",
    ],
    idealFor: ["Terrace leakage", "Bathroom seepage", "External wall dampness", "Basement moisture control"],
    faq: [
      {
        question: "How do you identify the exact leakage source?",
        answer: "We conduct on-site inspection and treatment planning based on crack lines, damp zones, and usage area.",
      },
      {
        question: "Is waterproofing done before or after tiling?",
        answer: "Typically before tiling for bathrooms and wet areas, with process tailored to site condition.",
      },
    ],
  },
  "false-ceiling": {
    intro:
      "Our false ceiling solutions combine aesthetics and utility through clean layouts, integrated lighting planning, and acoustic-friendly design.",
    scope: [
      "Room-wise design and utility planning",
      "Grid/framework setup and leveling",
      "Panel/board fixing with joint finishing",
      "Lighting slot preparation and final paint-ready finish",
    ],
    idealFor: ["Modern living rooms", "Office interiors", "Lighting upgrades", "Acoustic improvement"],
    faq: [
      {
        question: "Which false ceiling material do you use?",
        answer: "Material selection depends on design, budget, and room usage. We generally recommend durable gypsum-based systems.",
      },
      {
        question: "Can I add spotlights and cove lighting?",
        answer: "Yes. We plan the ceiling layout to support lighting and electrical coordination.",
      },
    ],
  },
  "modular-kitchens": {
    intro:
      "Our modular kitchen service delivers workflow-first layouts, optimized storage, and durable finishes for everyday cooking comfort and long-term utility.",
    scope: [
      "Site measurement and kitchen triangle planning",
      "Module design for base, wall, and tall units",
      "Countertop, accessories, and hardware selection",
      "Installation, alignment, and final handover inspection",
    ],
    idealFor: ["New kitchen setup", "Kitchen renovation", "Compact apartment kitchens", "Premium utility kitchens"],
    faq: [
      {
        question: "Do you customize layouts for small kitchens?",
        answer: "Yes. We optimize narrow and compact layouts with practical module planning and storage efficiency.",
      },
      {
        question: "Can I choose finishes and accessories?",
        answer: "Yes. You can select shutter finishes, handles, channels, baskets, and hardware options.",
      },
    ],
  },
};

const baseUrl = "https://www.zycrainterior.com";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);
  if (!service) {
    return { title: "Service Not Found | Zycra Interior" };
  }

  const title = `${service.title} Services in Mumbai & Thane | Zycra Interior`;
  const description = `${service.details.overview} Get professional ${service.title.toLowerCase()} solutions for homes and offices with Zycra Interior (formerly Soni Painting).`;
  const url = `${baseUrl}/services/${service.slug}`;

  return {
    title,
    description,
    keywords: [
      `${service.title.toLowerCase()} services in mumbai`,
      `${service.title.toLowerCase()} services in thane`,
      "interior contracting services",
      "zycra interior",
      "soni painting",
    ],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Zycra Interior (formerly Soni Painting)",
      type: "article",
      images: [{ url: service.image, width: 1200, height: 630, alt: service.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [service.image],
    },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    notFound();
  }

  const copy = detailedContent[service.slug] ?? {
    intro: service.details.overview,
    scope: service.details.process,
    idealFor: ["Residential interiors", "Commercial interiors"],
    faq: [],
  };
  const sharedFaqs = [
    {
      question: `Do you provide on-site inspection for ${service.title.toLowerCase()}?`,
      answer:
        "Yes. We begin with a site inspection to understand scope, measurements, and condition before finalizing work planning.",
    },
    {
      question: "Which areas do you serve?",
      answer:
        "We primarily serve Mumbai and Thane locations. For nearby areas, availability is confirmed based on project size and schedule.",
    },
    {
      question: "How do I request a quotation?",
      answer:
        "You can request a quote on WhatsApp with site details, location, and photos. Our team shares next steps and inspection timing.",
    },
  ];
  const allFaqs = [...copy.faq, ...sharedFaqs];
  const serviceInclusions = [
    `Site assessment for ${service.title.toLowerCase()} requirements`,
    "Material and finish recommendations based on budget and usage",
    "Execution planning with milestone-based updates",
    "Final quality check and handover support",
  ];
  const qualityChecks = [
    "Pre-work surface and area preparation",
    "Trained team supervision during execution",
    "Neat finishing and cleanup before handover",
    "Final walkthrough with service checklist",
  ];
  const timeline = [
    "Site visit and requirement discussion",
    "Quote finalization and work scheduling",
    "Execution as per approved scope",
    "Quality check and project closure",
  ];
  const whatsappNumber = "919022846640";
  const whatsappMessage = `Hi Zycra Interior, I need a quote for ${service.title} service. Please share details for inspection and pricing.`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  const serviceUrl = `${baseUrl}/services/${service.slug}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: `${service.title} Service`,
        serviceType: service.title,
        provider: {
          "@type": "LocalBusiness",
          name: "Zycra Interior (formerly Soni Painting)",
          url: baseUrl,
          telephone: "+91 90228 46640",
          areaServed: ["Mumbai", "Thane"],
        },
        url: serviceUrl,
        image: `${baseUrl}${service.image}`,
        description: service.details.overview,
        areaServed: ["Mumbai", "Thane"],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          { "@type": "ListItem", position: 2, name: "Services", item: `${baseUrl}/services` },
          { "@type": "ListItem", position: 3, name: service.title, item: serviceUrl },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: allFaqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <section className="bg-white py-14 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="container mx-auto px-4">
        <nav className="mb-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-800">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/services" className="hover:text-slate-800">
            Services
          </Link>{" "}
          / <span className="text-slate-800">{service.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-start">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">{service.title} Services in Mumbai & Thane</h1>
            <p className="text-slate-600 leading-relaxed mb-6">{copy.intro}</p>
            <p className="text-slate-600 leading-relaxed mb-6">{service.details.overview}</p>

            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-3">What We Handle</h2>
                <ul className="space-y-2 text-slate-600">
                  {copy.scope.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-3">Ideal For</h2>
                <ul className="space-y-2 text-slate-600">
                  {copy.idealFor.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-lg bg-slate-100">
            <Image src={service.image} alt={`${service.title} by Zycra Interior`} fill className="object-cover" />
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Benefits</h2>
            <ul className="space-y-3 text-slate-600">
              {service.details.benefits.map((benefit) => (
                <li key={benefit} className="rounded-xl border border-slate-200 p-4">
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Execution Process</h2>
            <ol className="space-y-3 text-slate-600">
              {service.details.process.map((step, index) => (
                <li key={step} className="rounded-xl border border-slate-200 p-4">
                  <span className="font-semibold text-slate-900">Step {index + 1}: </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Service Inclusions</h2>
            <ul className="space-y-2 text-slate-600">
              {serviceInclusions.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Quality Standards</h2>
            <ul className="space-y-2 text-slate-600">
              {qualityChecks.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Project Timeline</h2>
            <ol className="space-y-2 text-slate-600">
              {timeline.map((item, index) => (
                <li key={item} className="flex gap-2">
                  <span className="font-semibold text-slate-900 shrink-0">{index + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {allFaqs.map((item) => (
              <div key={item.question}>
                <h3 className="font-semibold text-slate-900">{item.question}</h3>
                <p className="text-slate-600 mt-1">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-6 py-3 hover:bg-slate-800"
          >
            Request a Free Quote
          </a>
        </div>
      </div>
    </section>
  );
}
