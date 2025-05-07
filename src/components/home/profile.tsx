"use client"

import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { User, Mail, Shield, LogOut, Loader2, AlertCircle, Calendar, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { SessionUser } from "@/lib/auth"

interface UserData extends SessionUser {
  createdAt: string
}

export default function Profile() {
  const { data: session, status } = useSession()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user.email) {
      fetch("/api/user")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error)
          } else {
            setUserData(data)
          }
        })
        .catch(() => setError("Failed to fetch user data"))
    }
  }, [session])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-lg text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto py-16 px-4 max-w-md"
      >
        <Card className="text-center">
          <CardContent className="flex flex-col items-center py-10">
            <User className="h-24 w-24 text-gray-300 mb-6" />
            <h2 className="text-2xl font-bold mb-2">Welcome to SoniPainting</h2>
            <p className="text-gray-600 mb-8">Sign in to access your profile and manage your quotations</p>
            <Button onClick={() => signIn("google", { callbackUrl: "/profile" })} className="w-full max-w-xs">
              Sign In with Google
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-md">
        <Card className="text-center">
          <CardContent className="py-10">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
            <p className="text-gray-700 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-lg text-gray-600">Loading user data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        {/* Cover Photo */}
        <div className="relative w-full h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/40 rounded-t-xl overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-4xl font-bold">
            SoniPainting
          </div>
        </div>

        {/* Profile Header */}
        <div className="relative bg-white rounded-b-xl shadow-md px-4 md:px-8 pb-6">
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20 mb-6 gap-4 md:gap-8">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-white shadow-md">
              {userData.image ? (
                <AvatarImage src={userData.image || "/placeholder.svg"} alt={userData.name} />
              ) : (
                <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                  {userData.name?.charAt(0) || "U"}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1 text-center md:text-left mt-2 md:mt-0 md:pb-2">
              <h1 className="text-2xl md:text-3xl font-bold">{userData.name}</h1>
              <div className="flex flex-col md:flex-row gap-2 md:gap-4 mt-2 text-sm text-gray-600 items-center md:items-start">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  <span>{userData.email}</span>
                </div>
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  <span className="capitalize">{userData.role || "User"}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>
                    Joined {userData.createdAt ? format(new Date(userData.createdAt), "MMM yyyy") : "Recently"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="about" className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">About Me</h3>
                      <p className="text-gray-600">
                        Welcome to my profile! I am interested in professional painting services.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-2">Contact Information</h3>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Mail className="h-5 w-5 text-gray-500 mr-2" />
                          <span>{userData.email}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                          <span className="text-gray-600">Location not specified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="rounded-full bg-primary/10 p-4 mb-4">
                      <Loader2 className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
                    <p className="text-gray-600 max-w-md">
                      You do not have any painting projects yet. Contact us to get started with your first project!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Account Settings</h3>
                    <p className="text-gray-600">Manage your account preferences and settings</p>

                    <div className="space-y-3 pt-2">
                      <Button variant="outline" className="w-full justify-start" disabled>
                        Edit Profile
                      </Button>
                      <Button variant="outline" className="w-full justify-start" disabled>
                        Notification Settings
                      </Button>
                      <Button
                        onClick={() => signIn("google", { callbackUrl: "/profile" })}
                        variant="outline"
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  )
}