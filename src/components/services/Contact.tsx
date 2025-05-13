"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, MapPin, Send } from "lucide-react";
import { getGeneralInfo, apiFetch } from "@/app/lib/api";
import { GeneralInfo } from "@/app/types";
import { toast } from "sonner";

// Form validation schema
const contactFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be 15 digits or less")
    .optional(),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject must be 200 characters or less"),
  message: z
    .string()
    .min(1, "Message is required")
    .max(1000, "Message must be 1000 characters or less"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function Contact() {
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  // Fetch GeneralInfo
  useEffect(() => {
    const fetchGeneralInfo = async () => {
      try {
        const data = await getGeneralInfo();
        setGeneralInfo({
          siteName: data.siteName || "Soni Painting",
          mobileNumber1: data.mobileNumber1 || "+919022846640",
          mobileNumber2: data.mobileNumber2 || "+918452085416",
          address:
            data.address ||
            "Hiranandani Estate, Patlipada, Ghodbunder Road, Thane (West), Maharashtra - 400607, India",
          logoUrl: data.logoUrl || "/logo.png",
        });
      } catch {
        toast.error("Failed to load contact information");
        setGeneralInfo({
          siteName: "Soni Painting",
          mobileNumber1: "+919022846640",
          mobileNumber2: "+918452085416",
          address:
            "Hiranandani Estate, Patlipada, Ghodbunder Road, Thane (West), Maharashtra - 400607, India",
          logoUrl: "/logo.png",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchGeneralInfo();
  }, []);

  // Form submission
  const onSubmit = async (data: ContactFormData) => {
    try {
      await apiFetch("/contact", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Your message has been sent successfully!");
      reset();
    } catch {
      toast.error("Failed to send message. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3 text-lg">Loading...</span>
      </div>
    );
  }

  const {
    siteName = "Soni Painting",
    mobileNumber1 = "+919022846640",
    mobileNumber2 = "+918452085416",
    address = "Hiranandani Estate, Patlipada, Ghodbunder Road, Thane (West), Maharashtra - 400607, India",
    logoUrl = "/logo.png",
  } = generalInfo || {};

  return (
    <>
      {/* Contact Form and Details */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-primary">
                  <Send className="mr-2 h-6 w-6" />
                  Send Us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Controller
                        control={control}
                        name="name"
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="name"
                            placeholder="Your name"
                            className="mt-1"
                          />
                        )}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Controller
                        control={control}
                        name="email"
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="email"
                            type="email"
                            placeholder="Your email"
                            className="mt-1"
                          />
                        )}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Controller
                      control={control}
                      name="phone"
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="phone"
                          placeholder="Your phone number"
                          className="mt-1"
                        />
                      )}
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Controller
                      control={control}
                      name="subject"
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="subject"
                          placeholder="Subject of your message"
                          className="mt-1"
                        />
                      )}
                    />
                    {errors.subject && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.subject.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Controller
                      control={control}
                      name="message"
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          id="message"
                          placeholder="Your message"
                          rows={5}
                          className="mt-1 resize-none"
                        />
                      )}
                    />
                    {errors.message && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.message.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary/90 hover:bg-primary w-full"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Details */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-primary">
                  <Phone className="mr-2 h-6 w-6" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Image
                    src={logoUrl}
                    alt={`${siteName} Logo`}
                    width={40}
                    height={30}
                    className="w-[40px] h-auto"
                  />
                  <div>
                    <h3 className="text-lg font-semibold">{siteName}</h3>
                    <p className="text-gray-600">
                      Premium Interior Contracting Services
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p className="font-medium">Call Us</p>
                      <Link
                        href={`tel:${mobileNumber1}`}
                        className="text-gray-600 hover:text-primary transition-colors"
                      >
                        {mobileNumber1}
                      </Link>
                      <p className="text-sm text-gray-500">
                        Mon-Sat: 9am - 6pm
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <Link
                        href={`https://wa.me/${mobileNumber2.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-primary transition-colors"
                      >
                        {mobileNumber2}
                      </Link>
                      <p className="text-sm text-gray-500">Available 24/7</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p className="font-medium">Visit Us</p>
                      <p className="text-gray-600">{address}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}