import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Correction Next.js 15 (await params)
  const { id } = await params;

  try {
    // On récupère les participations de l'employé
    const participations = await prisma.participationProjet.findMany({
      where: { id_employe: id },
      include: {
        projet: true // On inclut les infos du projet
      },
      orderBy: {
        projet: { date_fin: 'asc' } // Tri par date de fin la plus proche
      }
    });

    // On extrait juste la partie "projet" pour simplifier le frontend
    const projets = participations.map(p => p.projet);

    return NextResponse.json(projets);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur chargement projets" }, { status: 500 });
  }
}