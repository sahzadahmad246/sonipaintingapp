"use client"

import { use } from "react"
import InvoiceView from "@/components/invoice/InvoiceView"

interface PageProps {
    params: Promise<{ id: string }>
}

export default function InvoicePage({ params }: PageProps) {
    const { id } = use(params)
    return <InvoiceView invoiceId={id} />
}
