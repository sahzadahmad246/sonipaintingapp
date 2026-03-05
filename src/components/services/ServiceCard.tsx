import { Service } from "@/app/types/service";
import {
  Paintbrush,
  Hammer,
  Wand,
  Grid,
  Brush,
  Droplet,
  Lightbulb,
  LightbulbIcon,
  LampCeiling,
  Users
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface ServiceCardProps {
  service: Service;
}

// Map service icons
const icons: { [key: string]: LucideIcon } = {
  Paintbrush,
  Hammer,
  Wand,
  Grid,
  Brush,
  Droplet,
  Lightbulb,
  LightbulbIcon,
  LampCeiling,
  Users
};

export default function ServiceCard({ service }: ServiceCardProps) {
  const Icon = icons[service.icon] || Paintbrush;
  const whatsappNumber = "919022846640";
  const whatsappMessage = `Hi Zycra Interior, I need a quote for ${service.title} service. Please share details for inspection and pricing.`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="h-full rounded-[2rem] border border-slate-200 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-slate-300">
      <Link href={`/services/${service.slug}`} className="flex flex-col gap-5 group" aria-label={`Open ${service.title} service details`}>
        <div className="relative aspect-video w-full rounded-[1.5rem] overflow-hidden shadow-lg bg-slate-100">
          <Image
            src={service.image}
            alt={service.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>

        <div className="flex gap-4 items-start px-2">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-grow">
            <div className="text-left w-full">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{service.title}</h3>
              </div>
              <p className="text-slate-500 leading-relaxed text-sm mb-3">
                {service.description}
              </p>
            </div>
            <span className="inline-flex text-sm font-medium text-primary group-hover:underline">
              View detailed service
            </span>
          </div>
        </div>
      </Link>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex mt-4 ml-2 w-fit rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Request Quote on WhatsApp
      </a>
    </div>
  );
}
