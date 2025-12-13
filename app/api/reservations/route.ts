import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET : Récupérer le planning
export async function GET() {
  try {
    const resas = await prisma.reservationSalle.findMany({
      include: {
        salle: { select: { nom_salle: true, capacite: true } },
        projet: { select: { nom_projet: true } }
      },
      orderBy: { date_debut: 'asc' }
    });
    return NextResponse.json(resas);
  } catch (error) {
    return NextResponse.json({ error: "Erreur chargement" }, { status: 500 });
  }
}

// POST : Créer une réservation (Avec vérification de conflit !)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_salle, id_projet, date_debut, date_fin, objet } = body;

    // 1. Validation de base
    if (!id_salle || !id_projet || !date_debut || !date_fin) {
        return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    const start = new Date(date_debut);
    const end = new Date(date_fin);

    if (start >= end) {
        return NextResponse.json({ error: "La date de fin doit être après le début" }, { status: 400 });
    }

    // 2. Vérification de DISPONIBILITÉ (Chevauchement)
    const conflit = await prisma.reservationSalle.findFirst({
      where: {
        id_salle: id_salle,
        // Logique : (DebutA < FinB) ET (FinA > DebutB)
        AND: [
            { date_debut: { lt: end } },
            { date_fin: { gt: start } }
        ]
      }
    });

    if (conflit) {
        return NextResponse.json({ error: "⚠️ Salle déjà réservée sur ce créneau !" }, { status: 409 });
    }

    // 3. Création
    const resa = await prisma.reservationSalle.create({
      data: {
        id_salle, 
        id_projet, 
        date_debut: start, 
        date_fin: end, 
        objet: objet || "Réunion",
        statut: "CONFIRMEE"
      }
    });

    return NextResponse.json(resa);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE : Annuler une réservation
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if(!id) return NextResponse.json({error: "ID manquant"}, {status: 400});

    await prisma.reservationSalle.delete({ where: { id_reservation: id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}