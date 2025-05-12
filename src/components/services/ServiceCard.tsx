// components/services/ServiceCard.tsx
import { Service } from "@/app/types/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Paintbrush,
  Hammer,
  Wand,
  Grid,
  Brush,
  Droplet,
  Lightbulb,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface ServiceCardProps {
  service: Service;
}

// Map service icons to their respective Lucide components
const icons: { [key: string]: LucideIcon } = {
  Paintbrush,
  Hammer,
  Wand,
  Grid,
  Brush,
  Droplet,
  Lightbulb,
};

export default function ServiceCard({ service }: ServiceCardProps) {
  const Icon = icons[service.icon];

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-8 h-8 text-primary" />}
          <CardTitle>{service.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Image
          src={service.image}
          alt={service.title}
          width={400} // Adjust based on your design needs
          height={160} // Adjust based on your design needs
          className="w-full h-40 object-cover rounded-md mb-4"
        />
        <p className="text-muted-foreground mb-4">{service.description}</p>
        <Button asChild>
          <Link href={`/services/${service.slug}`}>View Details</Link>
        </Button>
      </CardContent>
    </Card>
  );
}