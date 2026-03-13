import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/outlook";
import { prisma } from "@/lib/db";

/**
 * Microsoft OAuth callback — exchanges the code for tokens and stores them.
 * The `state` parameter is the account ID.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // account ID

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=missing_params", req.url));
  }

  try {
    const tokens = await exchangeCode(code);

    await prisma.monitoredAccount.update({
      where: { id: state },
      data: {
        googleTokens: JSON.stringify(tokens),
        enabled: true,
        nextRun: new Date(), // Run immediately
      },
    });

    return NextResponse.redirect(new URL("/dashboard/accounts?success=connected", req.url));
  } catch (e) {
    console.error("OAuth callback error:", e);
    return NextResponse.redirect(new URL("/dashboard/accounts?error=oauth_failed", req.url));
  }
}
