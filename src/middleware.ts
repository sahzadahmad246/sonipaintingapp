import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const adminProtectedPath = (path: string) =>
  path.startsWith("/dashboard") || path.startsWith("/projects") || path.startsWith("/settings")

const authMiddleware = withAuth(
  function middleware(req) {
    const host = (req.headers.get("host") || "").toLowerCase().split(":")[0]
    const isOldDomain = host === "sonipainting.com" || host === "www.sonipainting.com"

    // Permanent redirect from old domain to new domain, preserving path + query.
    if (isOldDomain) {
      const redirectUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, "https://www.zycrainterior.com")
      return NextResponse.redirect(redirectUrl, 308)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = req.nextauth.token as any;
    const path = req.nextUrl.pathname;

    // Check for admin role on dashboard routes
    // (Double check path because matcher catches them, but safe to check)
    if (adminProtectedPath(path)) {
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
        const isAuthProtected =
          path.startsWith("/dashboard") ||
          path.startsWith("/projects") ||
          path.startsWith("/portfolio") ||
          path.startsWith("/settings") ||
          path === "/audit-logs" ||
          path.startsWith("/audit-logs");

        if (!isAuthProtected) return true;
        if (path.startsWith("/invoices/")) return true;

        // If user is NOT logged in, return false (redirects to sign-in)
        if (!token) return false;

        // If user IS logged in, return true (let the middleware function handle role checks)
        return true;
      },
    },
  }
)

export default function middleware(req: Parameters<typeof authMiddleware>[0]) {
  return authMiddleware(req)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
