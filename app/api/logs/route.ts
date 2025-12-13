import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // On récupère les 100 derniers logs, triés par date décroissante
    const logs = await prisma.historiqueAction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100 
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: "Erreur chargement logs" }, { status: 500 });
  }
}