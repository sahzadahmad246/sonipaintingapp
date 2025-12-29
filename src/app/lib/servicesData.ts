// lib/servicesData.ts
import { Service } from "../types/service";

export const services: Service[] = [
  {
    id: "painting",
    title: "Painting",
    description: "High-quality interior and exterior painting services.",
    icon: "Paintbrush",
    image: "/images/painting.jpg",
    slug: "painting",
    details: {
      overview: "Transform your space with our professional painting services, using premium paints and expert techniques.",
      benefits: ["Durable finishes", "Wide color selection", "Eco-friendly options"],
      process: ["Surface preparation", "Primer application", "Topcoat painting", "Final inspection"],
    },
  },
  {
    id: "carpentry",
    title: "Carpentry",
    description: "Custom woodworking and furniture crafting.",
    icon: "Hammer",
    image: "/images/carpentry.jpg",
    slug: "carpentry",
    details: {
      overview: "Expert carpentry services for custom furniture, cabinetry, and structural woodwork.",
      benefits: ["Precision craftsmanship", "Bespoke designs", "High-quality materials"],
      process: ["Design consultation", "Material selection", "Construction", "Installation"],
    },
  },
  {
    id: "pop",
    title: "POP (Plaster of Paris)",
    description: "Elegant POP designs for ceilings and walls.",
    icon: "Wand",
    image: "/images/pop.jpg",
    slug: "pop",
    details: {
      overview: "Create stunning ceiling and wall designs with our POP expertise.",
      benefits: ["Custom patterns", "Smooth finishes", "Quick installation"],
      process: ["Design planning", "Molding preparation", "Application", "Finishing"],
    },
  },
  {
    id: "tiles",
    title: "Tiles Work",
    description: "Professional tile installation for floors and walls.",
    icon: "Grid",
    image: "/images/tiles.jpg",
    slug: "tiles",
    details: {
      overview: "Expert tile installation for durable and aesthetic flooring and wall solutions.",
      benefits: ["Variety of materials", "Precision fitting", "Easy maintenance"],
      process: ["Surface preparation", "Tile layout", "Adhesive application", "Grouting"],
    },
  },
  {
    id: "wood-polish",
    title: "Wood Polish",
    description: "Enhance wood surfaces with premium polishing.",
    icon: "Brush",
    image: "/images/wood-polish.jpg",
    slug: "wood-polish",
    details: {
      overview: "Protect and beautify wood surfaces with our professional polishing services.",
      benefits: ["Long-lasting shine", "Scratch resistance", "Enhanced wood grain"],
      process: ["Sanding", "Base coat application", "Polishing", "Sealing"],
    },
  },
  {
    id: "waterproofing",
    title: "Waterproofing",
    description: "Effective solutions to protect against water damage.",
    icon: "Droplet",
    image: "/images/waterproofing.jpg",
    slug: "waterproofing",
    details: {
      overview: "Prevent leaks and water damage with our advanced waterproofing techniques.",
      benefits: ["Long-term protection", "Mold prevention", "Structural integrity"],
      process: ["Surface assessment", "Membrane application", "Sealing", "Testing"],
    },
  },
  {
    id: "false-ceiling",
    title: "False Ceiling",
    description: "Modern false ceiling designs for aesthetics and functionality.",
    icon: "LampCeiling",
    image: "/images/false-ceiling.jpg",
    slug: "false-ceiling",
    details: {
      overview: "Enhance your interiors with stylish and functional false ceiling installations.",
      benefits: ["Improved acoustics", "Aesthetic appeal", "Lighting integration"],
      process: ["Design consultation", "Framework installation", "Panel fitting", "Finishing"],
    },
  },
];