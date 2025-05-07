"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Home, Brush, ImageIcon, Phone, User, Menu } from "lucide-react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function MobileNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const navItems = [
    { href: "/", label: "Home", icon: <Home className="h-5 w-5" /> },
    { href: "/services", label: "Services", icon: <Brush className="h-5 w-5" /> },
    { href: "/portfolio", label: "Portfolio", icon: <ImageIcon className="h-5 w-5" /> },
    { href: "/contact", label: "Contact", icon: <Phone className="h-5 w-5" /> },
    ...(session ? [{ href: "/profile", label: "Profile", icon: <User className="h-5 w-5" /> }] : []),
  ]

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <motion.div
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 py-2"
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : 100 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-5 gap-1">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-md transition-colors",
                pathname === item.href ? "text-primary" : "text-gray-500 hover:text-primary hover:bg-gray-50",
              )}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}

          <Sheet>
            <SheetTrigger className="flex flex-col items-center justify-center py-2 px-1 rounded-md text-gray-500 hover:text-primary hover:bg-gray-50">
              <Menu className="h-5 w-5" />
              <span className="text-xs mt-1">More</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[50vh]">
              <div className="grid grid-cols-1 gap-4 pt-6">
                {session?.user.role === "admin" && (
                  <Link href="/dashboard" className="flex items-center p-3 rounded-md hover:bg-gray-100">
                    <span className="ml-3 text-base font-medium">Dashboard</span>
                  </Link>
                )}
                {session ? (
                  <Link href="/profile" className="flex items-center p-3 rounded-md hover:bg-gray-100">
                    <User className="h-5 w-5 mr-3" />
                    <span className="text-base font-medium">Profile</span>
                  </Link>
                ) : null}
                <div className="border-t border-gray-200 my-2"></div>
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="flex items-center p-3 rounded-md hover:bg-gray-100">
                    {item.icon}
                    <span className="ml-3 text-base font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.div>
    </>
  )
}
