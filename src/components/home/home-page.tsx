"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Brush, CheckCircle, Phone, ImageIcon, Star, ArrowRight, PaintBucket, HomeIcon, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { getPortfolio, getProjects } from "@/app/lib/api";
import type { Portfolio, Project } from "@/app/types";
import { toast } from "sonner";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

export default function HomePage() {
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch portfolio and project data
  const fetchData = useCallback(async () => {
    try {
      // Fetch portfolio (limit to 10 for performance)
      const { portfolio: portfolioData } = await getPortfolio(1, 10);
      setPortfolio(portfolioData || []);

      // Fetch projects (limit to 3 for recent projects section)
      const { projects: projectData } = await getProjects(1, 3);
      setProjects(projectData || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch data";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Function to get a random portfolio image URL
  const getRandomPortfolioImage = () => {
    if (portfolio.length === 0) return "/placeholder.svg?height=600&width=800";
    const randomIndex = Math.floor(Math.random() * portfolio.length);
    return portfolio[randomIndex].imageUrl;
  };

  const services = [
    {
      icon: <Brush className="h-10 w-10 text-primary" />,
      title: "Interior Painting",
      description: "Transform your living spaces with our premium interior painting services.",
    },
    {
      icon: <PaintBucket className="h-10 w-10 text-primary" />,
      title: "Exterior Painting",
      description: "Enhance your home curb appeal with durable, weather-resistant exterior painting.",
    },
    {
      icon: <Palette className="h-10 w-10 text-primary" />,
      title: "Color Consultation",
      description: "Get expert advice on color schemes that match your style and preferences.",
    },
    {
      icon: <HomeIcon className="h-10 w-10 text-primary" />,
      title: "Residential & Commercial",
      description: "We handle projects of all sizes, from homes to commercial buildings.",
    },
  ];

  const testimonials = [
    {
      name: "Rahul Sharma",
      role: "Homeowner",
      content:
        "SoniPainting transformed our home completely. The attention to detail and quality of work was exceptional.",
      rating: 5,
    },
    {
      name: "Priya Patel",
      role: "Interior Designer",
      content:
        "As a designer, I have high standards. SoniPainting exceeded my expectations with their professionalism and skill.",
      rating: 5,
    },
    {
      name: "Amit Verma",
      role: "Business Owner",
      content: "Our office looks brand new after SoniPainting  work. Clean, efficient, and professional service.",
      rating: 4,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40 z-10" />
        <div className="absolute inset-0">
          <Image
            src={getRandomPortfolioImage()}
            alt="Painting Services"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="container mx-auto relative z-20 px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-2xl text-white">
            <motion.h1 variants={fadeIn} className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Transform Your Space With Professional Painting
            </motion.h1>
            <motion.p variants={fadeIn} className="text-lg md:text-xl mb-8 text-gray-200">
              Premium painting services for residential and commercial properties. Quality that speaks for itself.
            </motion.p>
            <motion.div variants={fadeIn} className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href="/contact">Get a Free Quote</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10" asChild>
                <Link href="/portfolio">View Our Work</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold mb-4">
              Our Services
            </motion.h2>
            <motion.p variants={fadeIn} className="text-lg text-gray-600 max-w-2xl mx-auto">
              We offer a wide range of painting and decorating services to meet all your needs
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { delay: index * 0.1 },
                  },
                }}
                className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="mb-4">{service.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose SoniPainting?
              </motion.h2>

              {[
                "Professional and experienced team",
                "Premium quality materials",
                "Attention to detail",
                "Timely project completion",
                "Clean and efficient work process",
                "Competitive pricing",
              ].map((item, index) => (
                <motion.div key={index} variants={fadeIn} className="flex items-start mb-4">
                  <CheckCircle className="h-6 w-6 text-primary mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700">{item}</p>
                </motion.div>
              ))}

              <motion.div variants={fadeIn} className="mt-8">
                <Button asChild>
                  <Link href="/services">
                    Learn More About Our Services <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-xl"
            >
              <Image
                src={getRandomPortfolioImage()}
                alt="Professional Painting"
                fill
                className="object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold mb-4">
              What Our Clients Say
            </motion.h2>
            <motion.p variants={fadeIn} className="text-lg text-gray-600 max-w-2xl mx-auto">
              Don not just take our word for it. Here is what our satisfied customers have to say.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { delay: index * 0.1 },
                  },
                }}
                className="bg-white p-8 rounded-lg shadow-md"
              >
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < testimonial.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">{testimonial.content}</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-gray-500 text-sm">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center text-white"
          >
            <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Space?
            </motion.h2>
            <motion.p variants={fadeIn} className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
              Contact us today for a free consultation and quote. Let us bring your vision to life!
            </motion.p>
            <motion.div variants={fadeIn}>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/contact">
                  <Phone className="mr-2 h-5 w-5" /> Contact Us Now
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Recent Projects Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold mb-4">
              Recent Projects
            </motion.h2>
            <motion.p variants={fadeIn} className="text-lg text-gray-600 max-w-2xl mx-auto">
              Take a look at some of our recent transformations
            </motion.p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-80 rounded-lg bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg text-gray-600">No recent projects found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <motion.div
                  key={project.projectId}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={{
                    hidden: { opacity: 0, scale: 0.9 },
                    visible: {
                      opacity: 1,
                      scale: 1,
                      transition: { delay: index * 0.1 },
                    },
                  }}
                  className="relative h-80 rounded-lg overflow-hidden shadow-md"
                >
                  <Image
                    src={
                      project.siteImages?.length > 0
                        ? project.siteImages[0].url
                        : getRandomPortfolioImage()
                    }
                    alt={`Project ${project.projectId}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end">
                    <div className="p-6 text-white">
                      <h3 className="text-xl font-semibold mb-2">Project #{project.projectId}</h3>
                      <p className="text-sm text-gray-200">
                        Client: {project.clientName || "N/A"}
                      </p>
                      <p className="text-sm text-gray-200">
                        Status: {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="text-center mt-12"
          >
            <Button variant="outline" asChild>
              <Link href="/portfolio">
                <ImageIcon className="mr-2 h-5 w-5" /> View All Projects
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}