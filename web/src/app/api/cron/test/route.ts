import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processAccount } from "@/lib/monitoring";

/**
 * Temporary debug endpoint — triggers the monitor manually and returns
 * detailed diagnostics. Protected by the same CRON_SECRET.
 *
 * Usage: GET /api/cron/test?secret=YOUR_CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Get ALL accounts (not just due ones) so we can see the full picture
    const allAccounts = await prisma.monitoredAccount.findMany({
      select: {
        id: true,
        email: true,
        enabled: true,
        cronSchedule: true,
        nextRun: true,
        lastRun: true,
        googleTokens: true,
      },
    });

    const accountSummaries = allAccounts.map((a) => ({
      id: a.id,
      email: a.email,
      enabled: a.enabled,
      hasTokens: !!a.googleTokens,
      tokenPreview: a.googleTokens
        ? JSON.stringify(JSON.parse(a.googleTokens)).substring(0, 100) + "..."
        : null,
      cronSchedule: a.cronSchedule,
      nextRun: a.nextRun?.toISOString() || null,
      lastRun: a.lastRun?.toISOString() || null,
      isDue: a.nextRun ? a.nextRun <= now : true,
    }));

    // Find due accounts (same logic as the real cron)
    const dueAccounts = allAccounts.filter(
      (a) => a.enabled && a.googleTokens && (!a.nextRun || a.nextRun <= now)
    );

    if (dueAccounts.length === 0) {
      return NextResponse.json({
        message: "No accounts due for processing",
        now: now.toISOString(),
        allAccounts: accountSummaries,
      });
    }

    // Process the first due account
    const account = dueAccounts[0];
    const result = await processAccount(account.id);

    return NextResponse.json({
      message: "Processed account",
      now: now.toISOString(),
      processedAccount: {
        id: account.id,
        email: account.email,
      },
      result,
      allAccounts: accountSummaries,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e.message,
        stack: e.stack,
      },
      { status: 500 }
    );
  }
}
