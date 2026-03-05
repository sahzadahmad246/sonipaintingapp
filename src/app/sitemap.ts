import { MetadataRoute } from "next";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import { services } from "@/app/lib/servicesData";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await dbConnect();

  const baseUrl = "https://www.zycrainterior.com"; // Replace with actual domain if env var available, or use a default

  // Static pages
  const staticRoutes = [
    "",
    "/services",
    "/about",
    "/contact",
    "/portfolio",
    "/reviews",
    "/privacy-policy",
    "/terms-of-service",
    "/blog",
    "/auth/signin",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Dynamic Blog Posts
  const posts = await Post.find({ isPublished: true }).select("slug updatedAt");

  const blogRoutes = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const serviceRoutes = services.map((service) => ({
    url: `${baseUrl}/services/${service.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...serviceRoutes, ...blogRoutes];
}
