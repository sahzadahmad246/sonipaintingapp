import { Service } from "@/app/types/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

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
  LightbulbIcon,
};

export default function ServiceCard({ service }: ServiceCardProps) {
  const Icon = icons[service.icon];
  const [isOpen, setIsOpen] = useState(false);

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
          width={400}
          height={160}
          className="w-full h-40 object-cover rounded-md mb-4"
        />
        <p className="text-muted-foreground mb-4">{service.description}</p>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>View Details</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{service.title} - Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Overview */}
              <div>
                <h3 className="text-lg font-semibold">Overview</h3>
                <p className="text-muted-foreground">{service.details.overview}</p>
              </div>
              {/* Benefits */}
              <div>
                <h3 className="text-lg font-semibold">Benefits</h3>
                <ul className="list-disc pl-5">
                  {service.details.benefits.map((benefit, index) => (
                    <li key={index} className="text-muted-foreground">
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Process */}
              <div>
                <h3 className="text-lg font-semibold">Process</h3>
                <ol className="list-decimal pl-5">
                  {service.details.process.map((step, index) => (
                    <li key={index} className="text-muted-foreground">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}