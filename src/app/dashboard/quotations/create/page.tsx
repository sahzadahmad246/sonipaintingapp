'use client';

import dynamic from 'next/dynamic';

const QuotationForm = dynamic(() => import('@/components/Quotation/QuotationForm'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-12">Loading form...</div>,
});

export default function CreateQuotationPage() {
  return <QuotationForm />;
}