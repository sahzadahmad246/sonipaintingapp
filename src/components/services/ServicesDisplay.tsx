// components/services/ServicesDisplay.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { services } from "@/app/lib/servicesData";
import ServiceCard from "./ServiceCard";
import ServiceSearch from "./ServiceSearch";
import { Card, CardContent } from "@/components/ui/card";

export default function ServicesDisplay() {
  const [filteredServices, setFilteredServices] = useState(services);

  const handleSearch = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const filtered = services.filter(
      (service) =>
        service.title.toLowerCase().includes(lowerQuery) ||
        service.description.toLowerCase().includes(lowerQuery)
    );
    setFilteredServices(filtered);
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Our Services
        </motion.h2>
        <ServiceSearch onSearch={handleSearch} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ServiceCard service={service} />
              </motion.div>
            ))
          ) : (
            <Card className="col-span-full text-center p-6">
              <CardContent>
                <p className="text-muted-foreground">No services found.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}