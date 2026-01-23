import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Récupérer les réservations
    const reservations = await prisma.reservationSalle.findMany({
      where: {
        id_employe: id, // On filtre par l'ID de l'employé
      },
      include: {
        projet: {
          select: { nom_projet: true }
        },
        salle: {
          select: { nom_salle: true, id_salle: true }
        },
        employe: {
            select: { nom: true, prenom: true }
        }
      },
      orderBy: {
        date_debut: 'asc',
      },
    });

    // Formater pour FullCalendar
    const events = reservations.map(res => {
      // 👇 CORRECTION ICI : On utilise "?." et "||" pour gérer les nulls
      const nomProjet = res.projet?.nom_projet || "Projet Inconnu";
      const nomSalle = res.salle?.nom_salle || "Aucune salle";
      const objet = res.objet || "Réunion";

      return {
        id: res.id_reservation,
        id_reservation: res.id_reservation, // Gardé pour compatibilité
        // On construit un titre sécurisé
        title: `${objet} - ${nomSalle}`,
        start: res.date_debut,
        end: res.date_fin,
        
        // Données supplémentaires pour ton frontend
        projet: res.projet,
        salle: res.salle,
        objet: objet,
        employe: res.employe,
        
        // Props étendues (souvent utilisées par FullCalendar)
        extendedProps: {
            nom_projet: nomProjet,
            nom_salle: nomSalle,
            objet: objet,
            id_salle: res.salle?.id_salle || null
        }
      };
    });

    return NextResponse.json(events);

  } catch (error) {
    console.error("Erreur planning:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}