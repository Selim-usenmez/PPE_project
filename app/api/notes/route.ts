import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json([]);

  const notes = await prisma.notePerso.findMany({
    where: { id_employe: userId },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  try {
    const { contenu, id_employe } = await req.json();
    const note = await prisma.notePerso.create({
        data: { contenu, id_employe }
    });
    return NextResponse.json(note);
  } catch (e) { return NextResponse.json({ error: "Erreur" }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await prisma.notePerso.delete({ where: { id_note: id! } });
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: "Erreur" }, { status: 500 }); }
}