import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const accountId = req.nextUrl.searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  // Verify ownership
  const account = await prisma.monitoredAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rules = await prisma.monitoringRule.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { accountId, ruleType, ruleValue } = await req.json();

  if (!accountId || !ruleType || !ruleValue) {
    return NextResponse.json({ error: "accountId, ruleType, and ruleValue are required" }, { status: 400 });
  }

  // Verify ownership
  const account = await prisma.monitoredAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Validate ruleValue is valid JSON
  try {
    JSON.parse(ruleValue);
  } catch {
    return NextResponse.json({ error: "ruleValue must be valid JSON" }, { status: 400 });
  }

  const rule = await prisma.monitoringRule.create({
    data: { accountId, ruleType, ruleValue },
  });

  return NextResponse.json(rule, { status: 201 });
}
