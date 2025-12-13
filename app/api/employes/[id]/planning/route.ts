import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 👇 CORRECTION ICI : params est typé comme Promise
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 👇 INDISPENSABLE : On attend la résolution des paramètres
    const { id } = await params;

    const reservations = await prisma.reservationSalle.findMany({
      where: {
        projet: {
          statut: { in: ['EN_COURS', 'TERMINE'] },
          participations: {
            some: { id_employe: id } // On utilise l'id extrait
          }
        }
      },
      include: {
        salle: { select: { nom_salle: true } },
        projet: { select: { nom_projet: true, statut: true } }
      }
    });

    const events = reservations.map(res => ({
      id: res.id_reservation,
      title: `${res.projet.nom_projet} - ${res.salle.nom_salle}`,
      start: res.date_debut,
      end: res.date_fin,
      color: res.projet.statut === 'EN_COURS' ? '#3b82f6' : '#22c55e',
      extendedProps: {
        description: res.objet || "Réunion de projet",
        salle: res.salle.nom_salle
      }
    }));

    return NextResponse.json(events);
  } catch (error) {
    console.error("Erreur planning:", error);
    return NextResponse.json({ error: "Erreur chargement planning" }, { status: 500 });
  }
}