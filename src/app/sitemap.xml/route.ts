import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "https://www.sonipainting.com";
  const currentDate = new Date().toISOString().split("T")[0]; // 2025-05-14

  const pages = [
    { url: `${baseUrl}/`, lastmod: currentDate, changefreq: "monthly", priority: 1.0 },
    { url: `${baseUrl}/services`, lastmod: currentDate, changefreq: "monthly", priority: 0.8 },
    { url: `${baseUrl}/contact`, lastmod: currentDate, changefreq: "monthly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastmod: currentDate, changefreq: "monthly", priority: 0.8 },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map(
      (page) => `
    <url>
      <loc>${page.url}</loc>
      <lastmod>${page.lastmod}</lastmod>
      <changefreq>${page.changefreq}</changefreq>
      <priority>${page.priority}</priority>
    </url>
  `
    )
    .join("")}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}