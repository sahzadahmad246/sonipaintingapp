// components/services/ServiceSearch.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface ServiceSearchProps {
  onSearch: (query: string) => void;
}

export default function ServiceSearch({ onSearch }: ServiceSearchProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, onSearch]);

  return (
    <motion.div
      className="relative max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search services..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10"
      />
    </motion.div>
  );
}