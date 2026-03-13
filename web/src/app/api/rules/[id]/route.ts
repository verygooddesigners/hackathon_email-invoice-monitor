import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  // Get rule with account ownership check
  const rule = await prisma.monitoringRule.findUnique({
    where: { id: params.id },
    include: { account: true },
  });
  if (!rule || rule.account.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates = await req.json();
  const data: any = {};
  if ("ruleType" in updates) data.ruleType = updates.ruleType;
  if ("ruleValue" in updates) {
    try {
      JSON.parse(updates.ruleValue);
      data.ruleValue = updates.ruleValue;
    } catch {
      return NextResponse.json({ error: "ruleValue must be valid JSON" }, { status: 400 });
    }
  }
  if ("enabled" in updates) data.enabled = updates.enabled;

  const updated = await prisma.monitoringRule.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  const rule = await prisma.monitoringRule.findUnique({
    where: { id: params.id },
    include: { account: true },
  });
  if (!rule || rule.account.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.monitoringRule.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
