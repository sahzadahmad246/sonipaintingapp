import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import ClientWrapper from "@/components/helpers/ClientWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Soni Painting- Interior Contractor",
  description: "Interior painting, POP, carpentry, and tiling services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <meta
          name="google-site-verification"
          content="NXJfLPwHsoTaLMkWZbm8LJPG6qxr_W8OiMIxXoVYl-0"
        />
      </head>
      <body className={inter.className}>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
