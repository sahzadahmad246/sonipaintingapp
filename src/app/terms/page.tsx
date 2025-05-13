"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { getGeneralInfo } from "@/app/lib/api";
import { GeneralInfo } from "@/app/types";
import { toast } from "sonner";

export default function TermsPage() {
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGeneralInfo = async () => {
      try {
        const data = await getGeneralInfo();
        setGeneralInfo({
          siteName: data.siteName || "SoniPainting",
          mobileNumber1: data.mobileNumber1 || "+91 98765 43210",
          mobileNumber2: data.mobileNumber2,
          address: data.address || "123 Main Street, New Delhi, India 110001",
          logoUrl: data.logoUrl || "/logo.png",
          termsAndConditions: [
            "50% of the quoted amount is required as an advance payment to confirm the project and initiate work. This deposit secures materials and scheduling.",
            "30% of the quoted amount is due upon completion of 70% of the project scope, as mutually agreed upon during the site inspection.",
            "The remaining 20% is payable within 7 days of project completion and client approval of the work. Completion is defined as the successful delivery of all contracted services.",
            "All quotations are valid for 30 days from the date of issuance. Any changes in material costs or scope after this period may result in a revised quotation.",
            "Any work beyond the agreed scope of the quotation will be considered additional and subject to a separate quotation and approval. Additional charges will be discussed and agreed upon in writing before commencement.",
            "We provide a 1-year warranty on workmanship, covering defects due to faulty execution of painting, POP work, carpentry, or tiling. The warranty does not cover damages caused by misuse, natural wear, or external factors (e.g., water leakage or structural issues).",
            "Material warranties are subject to the manufacturer’s terms and conditions.",
            "Payments can be made via bank transfer, UPI, or cheque. Details will be provided in the invoice.",
            "Late payments beyond the 7-day period for the final payment may incur a late fee of 2% per month on the outstanding balance.",
            "The project timeline will be outlined in the quotation and mutually agreed upon. Delays caused by client-requested changes or unforeseen circumstances (e.g., weather or site access issues) may adjust the schedule, with prior communication.",
            "Clients are responsible for providing clear site access, necessary permissions, and a safe working environment.",
            "Any client-supplied materials must meet quality standards and be delivered on time to avoid delays.",
            "If the project is canceled after the initial deposit, the advance payment is non-refundable to cover material procurement and scheduling costs. Cancellations must be communicated in writing.",
            "Any disputes will be resolved through mutual discussion. If unresolved, both parties agree to mediation before pursuing legal action, with jurisdiction in New Delhi, India.",
            "Acceptance of the quotation and payment of the initial deposit constitute agreement to these terms and conditions.",
          ],
        });
      } catch {
        toast.error("Failed to load terms and conditions");
        setGeneralInfo({
          siteName: "SoniPainting",
          mobileNumber1: "+91 98765 43210",
          mobileNumber2: undefined,
          address: "123 Main Street, New Delhi, India 110001",
          logoUrl: "/logo.png",
          termsAndConditions: [
            "50% of the quoted amount is required as an advance payment to confirm the project and initiate work. This deposit secures materials and scheduling.",
            "30% of the quoted amount is due upon completion of 70% of the project scope, as mutually agreed upon during the site inspection.",
            "The remaining 20% is payable within 7 days of project completion and client approval of the work. Completion is defined as the successful delivery of all contracted services.",
            "All quotations are valid for 30 days from the date of issuance. Any changes in material costs or scope after this period may result in a revised quotation.",
            "Any work beyond the agreed scope of the quotation will be considered additional and subject to a separate quotation and approval. Additional charges will be discussed and agreed upon in writing before commencement.",
            "We provide a 1-year warranty on workmanship, covering defects due to faulty execution of painting, POP work, carpentry, or tiling. The warranty does not cover damages caused by misuse, natural wear, or external factors (e.g., water leakage or structural issues).",
            "Material warranties are subject to the manufacturer’s terms and conditions.",
            "Payments can be made via bank transfer, UPI, or cheque. Details will be provided in the invoice.",
            "Late payments beyond the 7-day period for the final payment may incur a late fee of 2% per month on the outstanding balance.",
            "The project timeline will be outlined in the quotation and mutually agreed upon. Delays caused by client-requested changes or unforeseen circumstances (e.g., weather or site access issues) may adjust the schedule, with prior communication.",
            "Clients are responsible for providing clear site access, necessary permissions, and a safe working environment.",
            "Any client-supplied materials must meet quality standards and be delivered on time to avoid delays.",
            "If the project is canceled after the initial deposit, the advance payment is non-refundable to cover material procurement and scheduling costs. Cancellations must be communicated in writing.",
            "Any disputes will be resolved through mutual discussion. If unresolved, both parties agree to mediation before pursuing legal action, with jurisdiction in New Delhi, India.",
            "Acceptance of the quotation and payment of the initial deposit constitute agreement to these terms and conditions.",
          ],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchGeneralInfo();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3 text-lg">Loading terms...</span>
      </div>
    );
  }

  const { siteName = "SoniPainting", logoUrl = "/logo.png", termsAndConditions = [] } = generalInfo || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-8">
            <Image
              src={logoUrl}
              alt={`${siteName} Logo`}
              width={60}
              height={45}
              className="mr-3 brightness-0 invert"
            />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">{siteName} Terms and Conditions</h1>
          </div>
          <Card className="shadow-lg">
            <CardHeader className="bg-gray-100">
              <CardTitle className="flex items-center text-primary">
                <FileText className="mr-2 h-6 w-6" />
                Terms and Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-6">
                At {siteName}, we are committed to delivering high-quality interior contracting services, including painting, POP work, carpentry, and tiling. The following terms and conditions govern our agreements with clients to ensure a transparent and mutually beneficial partnership.
              </p>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Our Commitment</h2>
              <p className="text-gray-600 mb-6">
                These terms apply to all projects undertaken by {siteName}. By accepting a quotation and paying the initial deposit, clients agree to abide by these conditions. We aim to provide clear expectations for payments, project execution, and responsibilities to ensure a smooth experience.
              </p>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Detailed Terms</h2>
              {termsAndConditions.length > 0 ? (
                <ol className="list-decimal pl-6 space-y-4 text-gray-600">
                  {termsAndConditions.map((term, index) => (
                    <li key={index} className="leading-relaxed">
                      {term}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-gray-600">
                  Terms and conditions are currently unavailable. Please contact us at{" "}
                  <a href={`tel:${generalInfo?.mobileNumber1 || "+91 98765 43210"}`} className="text-primary hover:underline">
                    {generalInfo?.mobileNumber1 || "+91 98765 43210"}
                  </a>{" "}
                  for more information.
                </p>
              )}
              <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Contact Us</h2>
              <p className="text-gray-600">
                For any questions or clarifications regarding these terms, please reach out to us:
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>
                    <strong>Phone</strong>:{" "}
                    <a href={`tel:${generalInfo?.mobileNumber1 || "+91 98765 43210"}`} className="text-primary hover:underline">
                      {generalInfo?.mobileNumber1 || "+91 98765 43210"}
                    </a>
                  </li>
                  {generalInfo?.mobileNumber2 && (
                    <li>
                      <strong>WhatsApp</strong>:{" "}
                      <a
                        href={`https://wa.me/${generalInfo.mobileNumber2.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        +91 {generalInfo.mobileNumber2}
                      </a>
                    </li>
                  )}
                  <li>
                    <strong>Address</strong>: {generalInfo?.address || "123 Main Street, New Delhi, India 110001"}
                  </li>
                </ul>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}