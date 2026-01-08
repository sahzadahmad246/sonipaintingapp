import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // This function is only called if `authorized` returns true.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = req.nextauth.token as any;
    const path = req.nextUrl.pathname;

    // Check for admin role on dashboard routes
    // (Double check path because matcher catches them, but safe to check)
    if (path.startsWith("/dashboard") || path.startsWith("/projects") || path.startsWith("/settings")) {
      if (token?.role !== "admin") {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("error", "unauthorized_admin");
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/invoices/")) return true;

        // If user is NOT logged in, return false (redirects to sign-in)
        if (!token) return false;

        // If user IS logged in, return true (let the middleware function handle role checks)
        return true;
      },
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/invoices/:path*", "/portfolio/:path*", "/settings", "/audit-logs"],
};