import dbConnect from "@/lib/mongodb";
import Counter from "@/models/Counter";

export async function generateQuotationNumber(): Promise<string> {
  await dbConnect();
  const counter = await Counter.findOneAndUpdate(
    { _id: "quotation_counter" },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );
  return `QT${counter.count.toString().padStart(5, "0")}`; // e.g., QT00001
}