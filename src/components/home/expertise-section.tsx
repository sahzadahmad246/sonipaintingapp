import { Palette, Layers, Hammer, Grid, Droplet } from "lucide-react"
import Image from "next/image"

const expertiseItems = [
    {
        icon: Palette,
        title: "Painting",
        desc: "High-quality interior and exterior painting with premium finishes.",
        image: "/images/painting.jpg"
    },
    {
        icon: Layers,
        title: "False Ceilings",
        desc: "Modern POP designs and lighting integration.",
        image: "/images/false-ceiling.jpg"
    },
    {
        icon: Grid,
        title: "Tiles Work",
        desc: "Professional tiling for floors and walls.",
        image: "/images/tiles.jpg"
    },
    {
        icon: Hammer,
        title: "Carpentry",
        desc: "Custom furniture, wardrobes, and structural woodwork.",
        image: "/images/carpentry.jpg"
    },
    {
        icon: Droplet,
        title: "Waterproofing",
        desc: "Advanced solutions to prevent leakage and dampness.",
        image: "/images/waterproofing.jpg"
    }

]

export default function ExpertiseSection() {
    return (
        <section className="py-16 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-serif mb-4">Our Expertise</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto">
                        We deliver excellence across a wide range of interior services.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {expertiseItems.map((item, index) => (
                        <div key={index} className="flex flex-col gap-6 group">
                            {/* Card Image */}
                            <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden shadow-lg bg-slate-100">
                                <Image
                                    src={item.image}
                                    alt={item.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                />
                            </div>

                            {/* Content */}
                            <div className="flex gap-4 items-start px-2">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-primary">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                                    <p className="text-slate-500 leading-relaxed text-sm">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
