import Image from "next/image"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export default function PrecisionSection() {
    return (
        <section className="py-16 bg-slate-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-12 items-center">

                    {/* Content First on Mobile */}
                    <div className="w-full lg:w-1/2 order-1">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-serif mb-6">
                            Precision in Every Corner
                        </h2>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                            We pride ourselves on attention to detail. From the first measurement to the final coat of paint, our process is precise and professional.
                        </p>

                        <div className="space-y-6 mb-8">
                            {[
                                { title: "False Ceiling & POP Specialists", desc: "Expert craftsmanship for intricate designs." },
                                { title: "End-to-End Management", desc: "We handle material, labor, and supervision." },
                                { title: "On-Time Delivery", desc: "Strict adherence to project timelines." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="mt-1">
                                        <CheckCircle2 className="w-6 h-6 text-slate-900 fill-slate-100" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-lg">{item.title}</h4>
                                        <p className="text-slate-500 text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button className="rounded-full px-8 py-6 bg-[#0B0F19] text-white hover:bg-slate-800 w-full sm:w-auto">
                            Learn More
                        </Button>
                    </div>

                    {/* Image Second on Mobile */}
                    <div className="w-full lg:w-1/2 order-2">
                        <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
                            <Image
                                src="/service-pop.png"
                                alt="Precision Work"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
