import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  OutlookTokens,
  getValidTokens,
  getUnreadMessages,
} from "@/lib/outlook";

/**
 * Temporary debug endpoint — checks the mail API directly and returns
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

    // Get the active account
    const account = await prisma.monitoredAccount.findFirst({
      where: { enabled: true, googleTokens: { not: null } },
    });

    if (!account || !account.googleTokens) {
      return NextResponse.json({ error: "No active account with tokens" });
    }

    // Get valid access token
    const storedTokens: OutlookTokens = JSON.parse(account.googleTokens);
    let accessToken: string;
    let tokenInfo: string;
    try {
      const result = await getValidTokens(storedTokens);
      accessToken = result.accessToken;
      tokenInfo = `valid, refreshed=${result.refreshed}`;
    } catch (e: any) {
      return NextResponse.json({
        error: "Token error",
        details: e.message,
        tokenKeys: Object.keys(storedTokens),
      });
    }

    // Try fetching unread messages directly
    let messages: any[] = [];
    let messagesError: string | null = null;
    try {
      messages = await getUnreadMessages(accessToken);
    } catch (e: any) {
      messagesError = e.message;
    }

    // Also try a raw Graph API call to /me to verify the token works
    let meInfo: any = null;
    let meError: string | null = null;
    try {
      const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (meRes.ok) {
        meInfo = await meRes.json();
      } else {
        meError = `${meRes.status}: ${await meRes.text()}`;
      }
    } catch (e: any) {
      meError = e.message;
    }

    // Try counting ALL messages (read + unread) in inbox
    let inboxCount: any = null;
    let inboxError: string | null = null;
    try {
      const countRes = await fetch(
        "https://graph.microsoft.com/v1.0/me/mailFolders/inbox?$select=totalItemCount,unreadItemCount",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (countRes.ok) {
        inboxCount = await countRes.json();
      } else {
        inboxError = `${countRes.status}: ${await countRes.text()}`;
      }
    } catch (e: any) {
      inboxError = e.message;
    }

    // Check processed messages count
    const processedCount = await prisma.processedMessage.count({
      where: { accountId: account.id },
    });

    return NextResponse.json({
      now: now.toISOString(),
      account: {
        id: account.id,
        email: account.email,
        nextRun: account.nextRun?.toISOString(),
        lastRun: account.lastRun?.toISOString(),
      },
      tokenInfo,
      me: meInfo
        ? { displayName: meInfo.displayName, mail: meInfo.mail }
        : { error: meError },
      inbox: inboxCount
        ? {
            totalItems: inboxCount.totalItemCount,
            unreadItems: inboxCount.unreadItemCount,
          }
        : { error: inboxError },
      unreadMessages: {
        count: messages.length,
        error: messagesError,
        subjects: messages.map((m: any) => ({
          id: m.id?.substring(0, 20) + "...",
          subject: m.subject,
          from: m.from?.emailAddress?.address,
          hasAttachments: m.hasAttachments,
          isRead: m.isRead,
          received: m.receivedDateTime,
        })),
      },
      processedMessagesInDb: processedCount,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
