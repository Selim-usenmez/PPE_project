import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");
    // ID à exclure (utile pour la modification : on ne veut pas que sa propre résa compte comme un conflit)
    const excludeId = searchParams.get("excludeId"); 

    // 1. Si pas de dates, on renvoie juste la liste des salles (sans statut)
    if (!startStr || !endStr) {
      const salles = await prisma.salle.findMany({ orderBy: { nom_salle: 'asc' } });
      return NextResponse.json(salles.map(s => ({ ...s, isAvailable: true })));
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    // 2. Récupérer toutes les salles
    const salles = await prisma.salle.findMany({ orderBy: { nom_salle: 'asc' } });

    // 3. Trouver les réservations conflictuelles sur ce créneau
    const conflits = await prisma.reservationSalle.findMany({
      where: {
        AND: [
          { date_debut: { lt: end } }, // Commence avant la fin demandée
          { date_fin: { gt: start } }, // Finit après le début demandé
          excludeId ? { id_reservation: { not: excludeId } } : {} // Exclure soi-même si modif
        ]
      },
      select: { id_salle: true } // On a juste besoin de l'ID de la salle prise
    });

    const idsOccupes = conflits.map(c => c.id_salle).filter(id => id !== null) as string[];

    // 4. On marque chaque salle comme dispo ou non
    const resultat = salles.map(salle => ({
      ...salle,
      isAvailable: !idsOccupes.includes(salle.id_salle)
    }));

    return NextResponse.json(resultat);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}