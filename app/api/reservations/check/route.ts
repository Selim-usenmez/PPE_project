import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    if (!startStr || !endStr) return NextResponse.json({ occupiedRooms: [], occupiedResources: [] });

    const start = new Date(startStr);
    const end = new Date(endStr);

    // On cherche TOUTES les réservations qui chevauchent ce créneau
    const conflicts = await prisma.reservationSalle.findMany({
      where: {
        AND: [
          { date_debut: { lt: end } }, // Commence avant la fin demandée
          { date_fin: { gt: start } }, // Finit après le début demandé
          { statut: { not: "ANNULEE" } } // On ignore les annulées
        ]
      },
      select: {
        id_salle: true,
        id_ressource: true // Assure-toi que ce champ existe dans ton schema.prisma
      }
    });

    // On extrait les IDs occupés
    const occupiedRooms = conflicts.map(c => c.id_salle).filter(Boolean);
    const occupiedResources = conflicts.map(c => c.id_ressource).filter(Boolean);

    return NextResponse.json({ occupiedRooms, occupiedResources });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}