import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOAuthUrl } from "@/lib/gmail";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const accounts = await prisma.monitoredAccount.findMany({
    where: { userId },
    include: { rules: true, _count: { select: { alerts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { email, cronSchedule } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Create the account (tokens will be added after OAuth)
  const account = await prisma.monitoredAccount.create({
    data: {
      userId,
      email,
      cronSchedule: cronSchedule || "*/5 * * * *",
      enabled: false, // Disabled until OAuth completes
    },
  });

  // Generate OAuth URL
  const oauthUrl = getOAuthUrl(account.id);

  return NextResponse.json({ account, oauthUrl }, { status: 201 });
}
