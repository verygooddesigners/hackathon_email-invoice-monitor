import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processAccount } from "@/lib/monitoring";

/**
 * Cron endpoint — called by Vercel Cron every minute.
 * Checks which accounts are due for monitoring and processes them.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find accounts that are due (nextRun <= now or nextRun is null)
    const dueAccounts = await prisma.monitoredAccount.findMany({
      where: {
        enabled: true,
        googleTokens: { not: null },
        OR: [
          { nextRun: { lte: now } },
          { nextRun: null },
        ],
      },
    });

    if (dueAccounts.length === 0) {
      return NextResponse.json({ message: "No accounts due", processed: 0 });
    }

    const results: any[] = [];

    for (const account of dueAccounts) {
      // Calculate next run time based on cron schedule
      const intervalMinutes = parseCronInterval(account.cronSchedule);
      const nextRun = new Date(now.getTime() + intervalMinutes * 60 * 1000);

      // Update next run immediately to prevent double-processing
      await prisma.monitoredAccount.update({
        where: { id: account.id },
        data: { nextRun },
      });

      // Process the account
      const result = await processAccount(account.id);
      results.push({
        accountId: account.id,
        email: account.email,
        ...result,
      });
    }

    return NextResponse.json({
      message: `Processed ${dueAccounts.length} account(s)`,
      results,
    });
  } catch (e: any) {
    console.error("Cron error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * Simple cron interval parser — extracts the minute interval from common patterns.
 * Supports: "* /N * * * *" patterns. Falls back to 5 minutes.
 */
function parseCronInterval(cron: string): number {
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return 5;

    const minutePart = parts[0];

    // "*/5" → every 5 minutes
    if (minutePart.startsWith("*/")) {
      return parseInt(minutePart.slice(2)) || 5;
    }

    // "0" with hour part → hourly or more
    if (minutePart === "0" && parts[1] !== "*") {
      if (parts[1].startsWith("*/")) {
        return (parseInt(parts[1].slice(2)) || 1) * 60;
      }
      return 60; // hourly
    }

    return 5; // default
  } catch {
    return 5;
  }
}
