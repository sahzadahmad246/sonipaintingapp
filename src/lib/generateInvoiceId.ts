import dbConnect from "@/lib/mongodb";
import Counter from "@/models/Counter";

export async function generateInvoiceId(): Promise<string> {
  try {
    await dbConnect();
    const counter = await Counter.findOneAndUpdate(
      { _id: "invoice_counter" },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
    if (!counter) {
      throw new Error("Failed to generate invoice ID: Counter not found");
    }
    return `INV${counter.count.toString().padStart(5, "0")}`;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error generating invoice ID:", error);
    throw new Error(`Failed to generate invoice ID: ${errorMessage}`);
  }
}