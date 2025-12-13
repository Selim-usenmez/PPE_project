import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: Props) {
  try {
    const { id } = await params;

    // 1. Trouver les projets où l'employé participe
    const projets = await prisma.projet.findMany({
      where: {
        participations: {
          some: { id_employe: id } // Magie de Prisma
        }
      },
      orderBy: { date_debut: 'desc' },
      include: {
        _count: { select: { participations: true } }
      }
    });

    // 2. Trouver les réservations liées à CES projets
    // On récupère les IDs des projets trouvés
    const projetIds = projets.map(p => p.id_projet);

    const reservations = await prisma.reservationSalle.findMany({
      where: {
        id_projet: { in: projetIds }, // Réservations des projets de l'employé
        date_debut: { gte: new Date() } // Seulement les futures
      },
      include: {
        salle: { select: { nom_salle: true, localisation: true } },
        projet: { select: { nom_projet: true } }
      },
      orderBy: { date_debut: 'asc' }
    });

    return NextResponse.json({
      projets,
      reservations
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}