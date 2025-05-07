"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image" // Import Image component
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useSession, signIn, signOut } from "next-auth/react"
import { Menu, X, User, LogOut, LogIn, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Define props interface for CustomNavLink
interface CustomNavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

const CustomNavLink = ({ href, children, className, ...props }: CustomNavLinkProps) => {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <NavigationMenuLink
      asChild
      className={cn(navigationMenuTriggerStyle(), isActive && "bg-primary/10 text-primary font-medium", className)}
    >
      <Link
        href={href}
        className="inline-flex items-center justify-center rounded-md text-sm transition-colors focus:outline-none focus:bg-accent focus:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4"
        {...props}
      >
        {children}
      </Link>
    </NavigationMenuLink>
  )
}

export default function Navbar() {
  const { data: session } = useSession()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    // Disable body scroll when mobile menu is open
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isMobileMenuOpen])

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/contact", label: "Contact" },
  ]

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        isScrolled ? "bg-white shadow-md py-2" : "bg-transparent py-4",
      )}
    >
      <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-2xl font-bold text-primary z-10">
          SoniPainting
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-2">
          <NavigationMenu>
            <NavigationMenuList>
              {navItems.map((item) => (
                <NavigationMenuItem key={item.href}>
                  <CustomNavLink href={item.href}>{item.label}</CustomNavLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full h-8 w-8 p-0 overflow-hidden">
                  {session.user.image ? (
                    <Image
                      src={session.user.image || "/placeholder.svg"}
                      alt={session.user.name || "Profile"}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      {session.user.name?.charAt(0) || "U"}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>

                {session.user.role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center text-red-500 focus:text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => signIn("google", { callbackUrl: "/profile" })}
              variant="default"
              className="flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden z-10 p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-white z-[49] md:hidden flex flex-col"
            >
              <div className="flex flex-col items-center justify-center flex-1 p-8">
                <div className="flex flex-col items-center space-y-6 text-lg">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="py-2 px-4 hover:text-primary transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}

                  {session ? (
                    <>
                      <Link
                        href="/profile"
                        className="py-2 px-4 hover:text-primary transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Profile
                      </Link>

                      {session.user.role === "admin" && (
                        <Link
                          href="/dashboard"
                          className="py-2 px-4 hover:text-primary transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                      )}

                      <Button
                        onClick={() => {
                          signOut({ callbackUrl: "/" })
                          setIsMobileMenuOpen(false)
                        }}
                        variant="destructive"
                        className="mt-4"
                      >
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        signIn("google", { callbackUrl: "/profile" })
                        setIsMobileMenuOpen(false)
                      }}
                      className="mt-4"
                    >
                      Sign In
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}