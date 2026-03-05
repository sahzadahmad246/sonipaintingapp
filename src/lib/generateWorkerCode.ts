import dbConnect from "@/lib/mongodb";
import Counter from "@/models/Counter";

export async function generateWorkerCode(): Promise<string> {
  await dbConnect();

  const counter = await Counter.findOneAndUpdate(
    { _id: "worker_counter" },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );

  if (!counter) {
    throw new Error("Failed to generate worker code");
  }

  return `WRK${counter.count.toString().padStart(4, "0")}`;
}
