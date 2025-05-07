import InvoiceView from "@/components/invoice/InvoiceView";

interface InvoiceViewPageProps {
  params: Promise<{
    invoiceId: string;
    token?: string;
  }>;
}

export default async function InvoiceViewPage({ params }: InvoiceViewPageProps) {
  const { invoiceId, token } = await params;

  return <InvoiceView invoiceId={invoiceId} token={token} />;
}
