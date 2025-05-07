import { GeneralInfo, Quotation } from "@/app/types";
import Image from "next/image"; // Import Next.js Image

interface QuotationPrintProps {
  quotation: Quotation;
  generalInfo: GeneralInfo;
}

export default function QuotationPrint({ quotation, generalInfo }: QuotationPrintProps) {
  return (
    <div id="quotation-print" className="p-6 bg-white text-black font-sans" style={{ width: "210mm", minHeight: "297mm" }}>
      {/* Header with Contractor Info */}
      <div className="flex justify-between items-start mb-6">
        <div>
          {generalInfo.logoUrl && (
            <Image
              src={generalInfo.logoUrl}
              alt="Logo"
              width={64}
              height={64}
              className="h-16 mb-2"
            />
          )}
          <h1 className="text-2xl font-bold">{generalInfo.siteName}</h1>
          <p>{generalInfo.address}</p>
          <p>Phone: {generalInfo.mobileNumber1}{generalInfo.mobileNumber2 ? `, ${generalInfo.mobileNumber2}` : ""}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold">Quotation #{quotation.quotationNumber}</h2>
          <p>Date: {new Date(quotation.date).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Client Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Client Information</h3>
        <p><strong>Name:</strong> {quotation.clientName}</p>
        <p><strong>Address:</strong> {quotation.clientAddress}</p>
        <p><strong>Contact Number:</strong> {quotation.clientNumber}</p>
      </div>

      {/* Quotation Items */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Quotation Items</h3>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Description</th>
              <th className="border border-gray-300 p-2 text-right">Area (sq.ft)</th>
              <th className="border border-gray-300 p-2 text-right">Rate (₹)</th>
              <th className="border border-gray-300 p-2 text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items?.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 p-2">
                  {item.description}
                  {item.note && <p className="text-sm text-gray-600">{item.note}</p>}
                </td>
                <td className="border border-gray-300 p-2 text-right">{item.area || "-"}</td>
                <td className="border border-gray-300 p-2 text-right">₹{item.rate?.toFixed(2)}</td>
                <td className="border border-gray-300 p-2 text-right">₹{(item.total ?? item.rate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {quotation.subtotal && (
              <tr>
                <td colSpan={3} className="border border-gray-300 p-2 text-right font-semibold">Subtotal</td>
                <td className="border border-gray-300 p-2 text-right">₹{quotation.subtotal?.toFixed(2)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="border border-gray-300 p-2 text-right font-semibold">Discount</td>
              <td className="border border-gray-300 p-2 text-right">₹{quotation.discount?.toFixed(2)}</td>
              </tr>
            {quotation.grandTotal && (
              <tr>
                <td colSpan={3} className="border border-gray-300 p-2 text-right font-bold">Grand Total</td>
                <td className="border border-gray-300 p-2 text-right font-bold">₹{quotation.grandTotal?.toFixed(2)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Terms & Conditions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Terms & Conditions</h3>
        <ul className="list-disc pl-5">
          {quotation.terms?.map((term, index) => (
            <li key={index}>{term}</li>
          ))}
        </ul>
      </div>

      {/* Additional Notes */}
      {quotation.note && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Additional Notes</h3>
          <p className="whitespace-pre-line">{quotation.note}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-600">
        <p>Generated on {new Date().toLocaleDateString()}</p>
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
}