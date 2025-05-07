import  { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import type { JWT } from "next-auth/jwt"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"

// Define session and JWT types
export interface SessionUser {
  id?: string
  name?: string
  email?: string
  image?: string
  role?: "user" | "staff" | "admin"
}

export interface ExtendedJWT extends JWT {
  id?: string
  role?: "user" | "staff" | "admin"
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }): Promise<ExtendedJWT> {
      // Initial sign in
      if (account && user) {
        // Connect to MongoDB
        await dbConnect()

        // Check if user exists in database
        const existingUser = await User.findOne({ email: user.email })

        if (existingUser) {
          // Return existing user data
          return {
            ...token,
            id: existingUser._id.toString(),
            role: existingUser.role,
          }
        } else {
          // Create new user in database
          const newUser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
            role: "user", // Default role
          })

          return {
            ...token,
            id: newUser._id.toString(),
            role: newUser.role,
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      // Add user ID and role to session
      if (session.user && token) {
        const extendedToken = token as ExtendedJWT
        if (extendedToken.id) {
          (session.user as SessionUser).id = extendedToken.id
        }
        if (extendedToken.role) {
          (session.user as SessionUser).role = extendedToken.role
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}