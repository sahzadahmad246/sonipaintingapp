#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("MONGODB_URI is not set. Add it to .env.local or export it before running this script.");
  process.exit(1);
}

const shouldDelete = process.argv.includes("--yes");

async function main() {
  await mongoose.connect(mongoUri, { bufferCommands: false });

  const db = mongoose.connection.db;
  const attendanceCollection = db.collection("workerattendances");
  const advancesCollection = db.collection("workeradvances");
  const loyaltyCollection = db.collection("workerloyaltyentries");
  const payoutCollection = db.collection("workerloyaltyweeklypayouts");

  const [attendanceCount, advancesCount, loyaltyCount, payoutCount] = await Promise.all([
    attendanceCollection.countDocuments(),
    advancesCollection.countDocuments(),
    loyaltyCollection.countDocuments(),
    payoutCollection.countDocuments(),
  ]);

  console.log("Workforce data reset preview:");
  console.log(`- Attendance records: ${attendanceCount}`);
  console.log(`- Advance records: ${advancesCount}`);
  console.log(`- Loyalty entries: ${loyaltyCount}`);
  console.log(`- Weekly payout records: ${payoutCount}`);

  if (!shouldDelete) {
    console.log("");
    console.log("No data deleted. Re-run with --yes to permanently remove these records.");
    return;
  }

  const [attendanceResult, advancesResult, loyaltyResult, payoutResult] = await Promise.all([
    attendanceCollection.deleteMany({}),
    advancesCollection.deleteMany({}),
    loyaltyCollection.deleteMany({}),
    payoutCollection.deleteMany({}),
  ]);

  console.log("");
  console.log("Deleted workforce records:");
  console.log(`- Attendance records: ${attendanceResult.deletedCount}`);
  console.log(`- Advance records: ${advancesResult.deletedCount}`);
  console.log(`- Loyalty entries: ${loyaltyResult.deletedCount}`);
  console.log(`- Weekly payout records: ${payoutResult.deletedCount}`);
}

main()
  .catch((error) => {
    console.error("Failed to reset workforce data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
