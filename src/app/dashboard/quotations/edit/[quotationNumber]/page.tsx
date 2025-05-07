import QuotationForm from "@/components/Quotation/QuotationForm";
import { type NextPage } from "next";

// Define the props interface with params as a Promise
interface EditQuotationPageProps {
  params: Promise<{ quotationNumber: string }>;
}

// Use NextPage to ensure compatibility with Next.js types
const EditQuotationPage: NextPage<EditQuotationPageProps> = async ({ params }) => {
  // Resolve the params Promise to get the quotationNumber
  const { quotationNumber } = await params;

  return <QuotationForm quotationNumber={quotationNumber} />;
};

export default EditQuotationPage;