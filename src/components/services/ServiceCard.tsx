import { Service } from "@/app/types/service";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useState } from "react";

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
  // Fallback to Paintbrush if icon not found
  const Icon = icons[service.icon] || Paintbrush;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex flex-col gap-6 group h-full">
        {/* Card Image */}
        <DialogTrigger asChild>
          <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden shadow-lg bg-slate-100 cursor-pointer">
            <Image
              src={service.image}
              alt={service.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        </DialogTrigger>

        {/* Content */}
        <div className="flex gap-4 items-start px-2 flex-grow">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-grow">
            <DialogTrigger asChild>
              <div className="text-left w-full cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{service.title}</h3>
                </div>
                <p className="text-slate-500 leading-relaxed text-sm mb-3">
                  {service.description}
                </p>
              </div>
            </DialogTrigger>



          </div>
        </div>
      </div>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-serif">{service.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          {/* Image for context */}
          <div className="relative w-full h-48 sm:h-80 rounded-2xl overflow-hidden shadow-md">
            <Image src={service.image} alt={service.title} fill className="object-cover" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Overview</h3>
            <p className="text-slate-600 leading-relaxed">{service.details.overview}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Benefits</h3>
              <ul className="space-y-2">
                {service.details.benefits.map((benefit, index) => (
                  <li key={index} className="text-slate-600 text-sm flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Process</h3>
              <ol className="space-y-2">
                {service.details.process.map((step, index) => (
                  <li key={index} className="text-slate-600 text-sm flex gap-2">
                    <span className="font-bold text-primary shrink-0">{index + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}