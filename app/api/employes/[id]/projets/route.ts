import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log(`🔍 [API Projets] Recherche pour ID: ${id}`); // DEBUG

  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  try {
    const participations = await prisma.participationProjet.findMany({
      where: { id_employe: id }, // Le filtre
      include: {
        projet: true
      },
      orderBy: {
        projet: { date_fin: 'asc' }
      }
    });

    console.log(`📊 [API Projets] Participations trouvées: ${participations.length}`); // DEBUG

    const projets = participations.map(p => p.projet);

    return NextResponse.json(projets);
  } catch (error) {
    console.error("Erreur API Projets:", error);
    return NextResponse.json({ error: "Erreur chargement projets" }, { status: 500 });
  }
}