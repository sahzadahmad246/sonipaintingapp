import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      const path = req.nextUrl.pathname;
      if (path.startsWith("/invoices/")) {
        return true; // Public access to invoice pages
      }
      return !!token && token.role === "admin";
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/quotations/:path*", "/projects/:path*", "/invoices/:path*", "/portfolio/:path*", "/settings", "/audit-logs"],
};