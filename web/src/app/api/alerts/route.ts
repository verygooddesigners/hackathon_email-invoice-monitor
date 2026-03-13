import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const accountId = req.nextUrl.searchParams.get("accountId");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  // Build where clause — only show alerts for this user's accounts
  const where: any = {
    account: { userId },
  };
  if (accountId) where.accountId = accountId;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: { account: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.alert.count({ where }),
  ]);

  return NextResponse.json({ alerts, total });
}
