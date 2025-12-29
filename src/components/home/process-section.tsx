import Image from "next/image"

export default function ProcessSection() {
    return (
        <section className="py-16 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-12 items-center">

                    <div className="w-full lg:w-1/2 order-1">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-serif mb-2">
                            Simple 3-Step Process
                        </h2>
                        <p className="text-slate-500 mb-10">To your dream space</p>

                        <div className="space-y-12 relative">
                            {/* Vertical Line Connector */}
                            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100 -z-10 hidden sm:block"></div>

                            {[
                                {
                                    step: "01",
                                    title: "Consultation",
                                    desc: "Book a free site visit. We discuss your requirements and take measurements."
                                },
                                {
                                    step: "02",
                                    title: "Design & Plan",
                                    desc: "Receive a detailed quotation and 3D visualization of your space."
                                },
                                {
                                    step: "03",
                                    title: "Expert Execution",
                                    desc: "Our trained team executes the project with dust-free tools and professional speed."
                                }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-6 items-start bg-white sm:bg-transparent">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#0B0F19] text-white flex items-center justify-center font-bold text-lg shadow-xl shadow-slate-900/20">
                                        {item.step}
                                    </div>
                                    <div className="pt-2">
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                                        <p className="text-slate-500 leading-relaxed text-sm">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full lg:w-1/2 order-2 mt-8 lg:mt-0">
                        <div className="relative aspect-square sm:aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl">
                            <Image
                                src="/abstract-pattern.png"
                                alt="Process planning"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                                <div className="text-white">
                                    <div className="font-bold text-xl">Hassle-free Experience</div>
                                    <div className="text-sm opacity-90">From start to finish</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
