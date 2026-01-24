// employee-report-whatsapp.ts - WhatsApp sending for employee reports
// Separate from existing notifications.ts as requested

import twilio, { Twilio } from "twilio";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const client: Twilio = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export interface EmployeeReportMessageData {
    to: string;
    pdfUrl: string;
    staffName: string;
    month: string;
    totalHajiri: number;
    earnings: number;
    advance: number;
    netPayable: number;
}

/**
 * Send employee monthly report via WhatsApp
 * Uses Twilio API to send PDF as media message
 */
export async function sendEmployeeReportWhatsApp(
    data: EmployeeReportMessageData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const {
        to,
        pdfUrl,
        staffName,
        month,
        totalHajiri,
        earnings,
        advance,
        netPayable,
    } = data;

    // Validate and format phone number
    const sanitizedNumber = to.replace(/\s+/g, "").replace(/[^+\d]/g, "");
    const phoneNumber = parsePhoneNumberFromString(sanitizedNumber, "IN");

    if (!phoneNumber || !phoneNumber.isValid()) {
        return {
            success: false,
            error: `Invalid phone number: ${sanitizedNumber}`,
        };
    }

    const formattedNumber = phoneNumber.format("E.164");
    console.log(
        "Sending employee report WhatsApp to:",
        formattedNumber,
        "PDF URL:",
        pdfUrl
    );

    try {
        // Format currency for message
        const formatRupees = (amount: number) =>
            new Intl.NumberFormat("en-IN", {
                maximumFractionDigits: 0,
            }).format(amount);

        // Check if we have a template SID for employee reports
        const templateSid = process.env.TWILIO_EMPLOYEE_REPORT_SID;
        console.log("Template SID from env:", templateSid || "NOT FOUND - will use freeform");

        let messageInstance;

        // Try sending freeform message with PDF attachment first
        // This works when the recipient has messaged in last 24 hours
        const messageBody = `📊 *Monthly Attendance Report*

Hi ${staffName}!

Here is your attendance report for *${month}*:

📅 *Total Hajiri:* ${totalHajiri}
💰 *Earnings:* ₹${formatRupees(earnings)}
🔴 *Advance:* ₹${formatRupees(advance)}
✅ *Net Payable:* ₹${formatRupees(netPayable)}

Please find the detailed PDF report attached.

_Soni Painting_`;

        try {
            // First try freeform with media (works within session)
            messageInstance = await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: `whatsapp:${formattedNumber}`,
                body: messageBody,
                mediaUrl: [pdfUrl],
            });
            console.log("Sent as freeform message with PDF");
        } catch (freeformError: unknown) {
            const errorMsg = freeformError instanceof Error ? freeformError.message : String(freeformError);
            console.log("Freeform failed:", errorMsg, "- trying template...");

            // If freeform fails (outside session), try template
            if (templateSid) {
                messageInstance = await client.messages.create({
                    from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                    to: `whatsapp:${formattedNumber}`,
                    contentSid: templateSid,
                    contentVariables: JSON.stringify({
                        "1": staffName,
                        "2": month,
                        "3": totalHajiri.toString(),
                        "4": formatRupees(earnings),
                        "5": formatRupees(advance),
                        "6": formatRupees(netPayable),
                        "media_url": pdfUrl,
                    }),
                });
                console.log("Sent using template with PDF via contentVariables");
            } else {
                throw freeformError;
            }
        }

        console.log(
            `Employee report sent to ${formattedNumber}, SID: ${messageInstance.sid}`
        );

        return {
            success: true,
            messageId: messageInstance.sid,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(
            `Failed to send employee report to ${formattedNumber}:`,
            errorMessage
        );

        // Check for specific Twilio errors
        if (errorMessage.includes("63016")) {
            return {
                success: false,
                error:
                    "WhatsApp template required. Please configure TWILIO_EMPLOYEE_REPORT_SID in your environment.",
            };
        }

        return {
            success: false,
            error: errorMessage,
        };
    }
}
