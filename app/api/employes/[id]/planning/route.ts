import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  
  const { id } = await params;
  console.log(`🔍 [API Planning] Recherche pour ID: ${id}`); // DEBUG

  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  try {
    const reservations = await prisma.reservationSalle.findMany({
      where: {
        projet: {
          statut: { in: ['EN_COURS', 'TERMINE'] },
          participations: {
            some: { id_employe: id } // Le filtre
          }
        }
      },
      include: {
        salle: { select: { nom_salle: true } },
        projet: { select: { nom_projet: true, statut: true } }
      }
    });

    console.log(`📊 [API Planning] Réservations trouvées pour cet ID: ${reservations.length}`); // DEBUG

    const events = reservations.map(res => ({
      id: res.id_reservation,
      title: `${res.projet.nom_projet} - ${res.salle.nom_salle}`,
      start: new Date(res.date_debut).toISOString(), 
      end: new Date(res.date_fin).toISOString(),
      
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