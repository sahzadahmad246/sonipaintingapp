"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Camera,
  Settings,
  LogOut,
  MoreHorizontal,
  Plus,
  DollarSign,
  MessageSquare,
  Star,
  BookOpen,
  User as UserIcon,
  UsersRound,
  Wallet,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface DashboardMobileNavProps {
  pendingQuotations?: number;
}

export default function DashboardMobileNav({
  pendingQuotations = 0,
}: DashboardMobileNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      href: "/dashboard/quotations",
      label: "Quotations",
      icon: <FileText className="h-5 w-5" />,
      badge: pendingQuotations > 0 ? pendingQuotations : undefined,
    },
    {
      href: "/dashboard/quotations/create",
      label: "Create",
      icon: <Plus className="h-5 w-5" />,
    },
    {
      href: "/dashboard/projects",
      label: "Projects",
      icon: <Briefcase className="h-5 w-5" />,
    },
  ];

  const moreItems = [
    { href: "/profile", label: "Profile", icon: <UserIcon className="h-5 w-5" /> },
    { href: "/dashboard/invoices", label: "Invoices", icon: <DollarSign className="h-5 w-5" /> },
    { href: "/dashboard/expenses", label: "Expenses", icon: <Wallet className="h-5 w-5" /> },
    { href: "/dashboard/workforce", label: "Workforce", icon: <UsersRound className="h-5 w-5" /> },
    { href: "/dashboard/portfolio", label: "Portfolio", icon: <Camera className="h-5 w-5" /> },
    { href: "/dashboard/settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
    { href: "/dashboard/contact", label: "Contact Messages", icon: <MessageSquare className="h-5 w-5" /> },
    { href: "/dashboard/reviews", label: "Reviews", icon: <Star className="h-5 w-5" /> },
    { href: "/dashboard/blog", label: "Blog", icon: <BookOpen className="h-5 w-5" /> },
    { href: "/dashboard/audit-logs", label: "Audit Logs", icon: <Badge className="h-5 w-5" /> },
  ];

  return (
    <motion.div
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 py-2"
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : 100 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center py-2 px-1 rounded-md transition-colors relative",
              pathname === item.href
                ? "text-primary"
                : "text-gray-500 hover:text-primary hover:bg-gray-50"
            )}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
            {item.badge && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center bg-yellow-500 text-white">
                {item.badge}
              </Badge>
            )}
          </Link>
        ))}

        <Sheet>
          <SheetTrigger className="flex flex-col items-center justify-center py-2 px-1 rounded-md text-gray-500 hover:text-primary hover:bg-gray-50">
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-xs mt-1">More</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[95vh] sm:h-full p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-semibold text-lg">Menu</span>
              <SheetClose>
                <X className="h-6 w-6 text-gray-500" />
              </SheetClose>
            </div>
            <div className="overflow-y-auto max-h-[calc(95vh-60px)] p-4">
              <div className="grid grid-cols-1 gap-2">
                {moreItems.map((item) => (
                  <SheetClose key={item.href} asChild>
                    <Link
                      href={item.href}
                      className="flex items-center p-3 rounded-md hover:bg-gray-100"
                    >
                      <div className="text-gray-500 mr-3">{item.icon}</div>
                      <span className="text-base font-medium">{item.label}</span>
                    </Link>
                  </SheetClose>
                ))}
                <div className="border-t border-gray-200 my-2"></div>
                <SheetClose asChild>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center p-3 rounded-md hover:bg-gray-100 text-red-500 w-full text-left"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    <span className="text-base font-medium">Sign Out</span>
                  </button>
                </SheetClose>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </motion.div>
  );
}
