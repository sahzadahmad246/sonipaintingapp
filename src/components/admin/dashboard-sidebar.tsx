"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { signOut } from "next-auth/react"
import { LayoutDashboard, FileText, Briefcase, Camera, Shield, Settings, DollarSign, LogOut, Mail, Star, BookOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardSidebarProps {
  pendingQuotations?: number
}

export default function DashboardSidebar({ pendingQuotations = 0 }: DashboardSidebarProps) {
  const { data: session } = useSession()

  if (!session) return null

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow border-r border-gray-200 bg-white pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-5">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <span className="ml-2 text-xl font-semibold">PaintPro</span>
        </div>

        <div className="mt-5 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-900 group hover:bg-gray-200 transition-colors"
            >
              <LayoutDashboard className="h-5 w-5 mr-3 text-gray-500 group-hover:text-gray-700" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/quotations"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 group transition-colors"
            >
              <FileText className="h-5 w-5 mr-3 text-gray-500 group-hover:text-gray-700" />
              Quotations
              {pendingQuotations > 0 && <Badge className="ml-auto bg-yellow-500 text-white">{pendingQuotations}</Badge>}
            </Link>
            <Link
              href="/dashboard/projects"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 group transition-colors"
            >
              <Briefcase className="h-5 w-5 mr-3 text-gray-500 group-hover:text-gray-700" />
              Projects
            </Link>
            <Link
              href="/dashboard/blog"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 group transition-colors"
            >
              <BookOpen className="h-5 w-5 mr-3 text-gray-500 group-hover:text-gray-700" />
              Blog
            </Link>
            <Link
              href="/dashboard/invoices"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 group transition-colors"
            >
              <DollarSign className="h-5 w-5 mr-3 text-gray-500 group-hover:text-gray-700" />
              Invoices
            </Link>
            <Link
              href="/dashboard/portfolio"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 group transition-colors"
            >
              <Camera className="h-5 w-5 mr-3 text-gray-500 group-hover:text-gray-700" />
              Portfolio
            </Link>
            <Link
              href="/dashboard/contact"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 group transition-colors"
            >
              <Mail className="h-5 w-5 mr-3 text-gray-500 group-hover:text-gray-700" />
              Contact Messages
            </Link>
            <Link
              href="/dashboard/reviews"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 group transition-colors"
            >
              <Star className="h-5 w-5 mr-3 text-gray-500 group-hover:text-gray-700" />
              Reviews
            </Link>
            <Link
              href="/dashboard/audit-logs"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 group transition-colors"
            >
              <Shield className="h-5 w-5 mr-3 text-gray-500 group-hover:text-gray-700" />
              Audit Logs
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 group transition-colors"
            >
              <Settings className="h-5 w-5 mr-3 text-gray-500 group-hover:text-gray-700" />
              Settings
            </Link>
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start px-2">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={session.user.image || ""} />
                  <AvatarFallback>{session.user.name?.charAt(0) || "A"}</AvatarFallback>
                </Avatar>
                <span className="truncate">{session.user.name || "Admin"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center">
                  <Avatar className="h-4 w-4 mr-2">
                    <AvatarImage src={session.user.image || ""} />
                    <AvatarFallback>{session.user.name?.charAt(0) || "A"}</AvatarFallback>
                  </Avatar>
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
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
        </div>
      </div>
    </div>
  )
}
