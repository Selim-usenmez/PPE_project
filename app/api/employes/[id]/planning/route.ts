import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // 1. On cherche les projets où l'employé est participant
    // 2. Et on ne prend que les projets EN_COURS ou TERMINE
    // 3. On récupère les réservations de salle liées à ces projets
    
    const reservations = await prisma.reservationSalle.findMany({
      where: {
        projet: {
          // Filtrer par statut du projet
          statut: { in: ['EN_COURS', 'TERMINE'] },
          // Filtrer : l'employé doit faire partie de l'équipe
          participations: {
            some: { id_employe: params.id }
          }
        }
      },
      include: {
        salle: { select: { nom_salle: true } },
        projet: { select: { nom_projet: true, statut: true } }
      }
    });

    // On transforme les données pour FullCalendar
    const events = reservations.map(res => ({
      id: res.id_reservation,
      title: `${res.projet.nom_projet} - ${res.salle.nom_salle}`,
      start: res.date_debut,
      end: res.date_fin,
      // Couleur selon le statut
      color: res.projet.statut === 'EN_COURS' ? '#3b82f6' : '#22c55e', // Bleu ou Vert
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