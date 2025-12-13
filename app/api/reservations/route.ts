import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger"; // ✅ Importé

// GET : Lister les réservations
export async function GET() {
  try {
    const reservations = await prisma.reservationSalle.findMany({
      orderBy: { date_debut: 'desc' },
      include: {
        salle: { select: { nom_salle: true } },
        projet: { select: { nom_projet: true } }
      }
    });
    return NextResponse.json(reservations);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

// POST : Créer une réservation
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_salle, id_projet, date_debut, date_fin, objet } = body;

    // 1. Validation basique
    if (!id_salle || !id_projet || !date_debut || !date_fin) {
      return NextResponse.json({ error: "Salle, Projet et Dates sont obligatoires" }, { status: 400 });
    }

    const start = new Date(date_debut);
    const end = new Date(date_fin);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
    }

    if (end <= start) {
      return NextResponse.json({ error: "La fin doit être après le début" }, { status: 400 });
    }

    // 3. VÉRIFICATION DES CONFLITS
    const conflit = await prisma.reservationSalle.findFirst({
      where: {
        id_salle: id_salle,
        statut: { not: "ANNULEE" },
        AND: [
          { date_debut: { lt: end } },
          { date_fin: { gt: start } }
        ]
      }
    });

    if (conflit) {
      return NextResponse.json({ 
        error: "CRÉNEAU INDISPONIBLE : Cette salle est déjà réservée sur cette période." 
      }, { status: 409 });
    }

    // 4. Création
    const newReservation = await prisma.reservationSalle.create({
      data: {
        id_salle,
        id_projet,
        date_debut: start,
        date_fin: end,
        objet: objet || "Réunion de projet",
        statut: "CONFIRMEE"
      },
      // On inclut les infos pour avoir le nom de la salle dans le log sans refaire une requête
      include: {
        salle: { select: { nom_salle: true } }
      }
    });

    // 👇 LOG DE L'ACTION
    await createLog(
        "RÉSERVATION", 
        `Salle ${newReservation.salle.nom_salle} réservée le ${start.toLocaleDateString()} de ${start.toLocaleTimeString()} à ${end.toLocaleTimeString()}`
    );

    return NextResponse.json(newReservation, { status: 201 });

  } catch (error: any) {
    console.error("Erreur Reservation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}