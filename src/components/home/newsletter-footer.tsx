import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Facebook, Instagram, Linkedin, MapPin, Phone, Mail } from "lucide-react"

export default function NewsletterFooter() {
    return (
        <footer className="bg-[#0B0F19] border text-white pt-40 pb-12 relative mt-24 sm:mt-32">
            {/* Floating Newsletter Card */}
            <div className="absolute -top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full max-w-4xl bg-white rounded-3xl p-6 md:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left z-20">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">Subscribe to Our Newsletter</h3>
                    <p className="text-sm text-slate-500">For the latest trends and exclusive offers.</p>
                </div>
                <div className="flex w-full md:w-auto gap-2 flex-col sm:flex-row">
                    <Input placeholder="Enter your email" className="rounded-full bg-slate-50 border-slate-200 h-10 sm:h-12 text-slate-900" />
                    <Button className="rounded-full h-10 sm:h-12 px-8 bg-slate-900 hover:bg-slate-800 w-full sm:w-auto">
                        Subscribe
                    </Button>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-0">
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 border-b border-white/10 pb-12 mb-8 md:mb-12">
                    <div className="sm:col-span-2 md:col-span-1">
                        <div className="text-xl font-bold mb-4">Soni Painting</div>
                        <p className="text-sm text-slate-400 leading-relaxed mb-6">
                            Your trusted partner for premium interior painting and contracting services. Quality guaranteed.
                        </p>
                        <div className="flex gap-4">
                            {[Facebook, Instagram, Linkedin].map((Icon, i) => (
                                <Link key={i} href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-colors">
                                    <Icon className="w-4 h-4" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-base mb-4">Services</h4>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li><Link href="#" className="hover:text-white transition-colors">Interior Painting</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">False Ceilings</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Waterproofing</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Modular Kitchens</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-base mb-4">Company</h4>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Our Projects</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                            <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-base mb-4">Contact</h4>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 mt-1 shrink-0" />
                                <span>Shop No 4, Ghodbunder Rd, Thane West, Maharashtra 400607</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-4 h-4 shrink-0" />
                                <span>+91 90228 46640</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-4 h-4 shrink-0" />
                                <span>contact@sonipainting.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-slate-500 gap-4">
                    <p>&copy; {new Date().getFullYear()} Soni Painting. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-white">Privacy Policy</Link>
                        <Link href="#" className="hover:text-white">Terms of use</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
