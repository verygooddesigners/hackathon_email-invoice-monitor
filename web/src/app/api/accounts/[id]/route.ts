import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const account = await prisma.monitoredAccount.findFirst({
    where: { id: params.id, userId },
  });

  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates = await req.json();
  const allowed = ["email", "cronSchedule", "enabled"];
  const data: any = {};
  for (const key of allowed) {
    if (key in updates) data[key] = updates[key];
  }

  const updated = await prisma.monitoredAccount.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const account = await prisma.monitoredAccount.findFirst({
    where: { id: params.id, userId },
  });

  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.monitoredAccount.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
