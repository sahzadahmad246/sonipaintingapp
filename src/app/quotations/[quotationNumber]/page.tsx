//src/app/quotations/[quotationNumber]/page.tsx
import QuotationView from "@/components/Quotation/quotation-view";

interface EditQuotationPageProps {
  params: Promise<{
    quotationNumber: string;
  }>;
}


export default async function EditQuotationPage({ params }: EditQuotationPageProps) {
  
  const { quotationNumber } = await params;

  return <QuotationView quotationNumber={quotationNumber} />;
}