import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET : Récupérer toutes les réservations
export async function GET() {
  try {
    const resas = await prisma.reservationSalle.findMany({
      include: {
        salle: { select: { nom_salle: true } },
        projet: { select: { nom_projet: true } }
      },
      orderBy: { date_debut: 'asc' }
    });
    return NextResponse.json(resas);
  } catch (error) {
    return NextResponse.json({ error: "Erreur chargement" }, { status: 500 });
  }
}

// POST : Créer une réservation
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, id_salle, id_projet, id_ressource, date_debut, date_fin, objet } = body;

    if (!id_projet || !date_debut || !date_fin) {
        return NextResponse.json({ error: "Le projet et les dates sont requis." }, { status: 400 });
    }

    const start = new Date(date_debut);
    const end = new Date(date_fin);

    if (start >= end) {
        return NextResponse.json({ error: "La date de fin doit être après le début." }, { status: 400 });
    }

    // A. SALLE : Vérification conflit
    if (id_salle) {
        const conflit = await prisma.reservationSalle.findFirst({
          where: {
            id_salle: id_salle,
            AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }]
          }
        });

        if (conflit) return NextResponse.json({ error: "⚠️ Salle déjà réservée sur ce créneau !" }, { status: 409 });

        await prisma.reservationSalle.create({
          data: { id_salle, id_projet, date_debut: start, date_fin: end, objet: objet || "Réunion Projet", statut: "CONFIRMEE" }
        });
    }

    // B. RESSOURCE : Mise à jour état
    if (id_ressource) {
        const ressource = await prisma.ressource.findUnique({ where: { id_ressource } });
        if (!ressource || ressource.etat !== "DISPONIBLE") {
            return NextResponse.json({ error: "Cet équipement n'est pas disponible." }, { status: 400 });
        }
        await prisma.ressource.update({ where: { id_ressource }, data: { etat: "EN_UTILISATION" } });
    }

    // C. LOG
    if (id_employe) {
        await prisma.historiqueAction.create({
            data: { action: "RESERVATION", details: `Projet ${id_projet}`, auteur: id_employe }
        });
    }

    return NextResponse.json({ success: true, message: "Réservation effectuée !" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT : Modifier une réservation existante
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id_reservation, id_salle, date_debut, date_fin, objet } = body;

    // 1. Vérifier existence
    const oldResa = await prisma.reservationSalle.findUnique({ where: { id_reservation } });
    if (!oldResa) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

    const start = new Date(date_debut);
    const end = new Date(date_fin);

    // 2. Vérifier Conflit SALLE (en excluant la réservation actuelle !)
    if (id_salle) {
        const conflit = await prisma.reservationSalle.findFirst({
          where: {
            id_salle: id_salle,
            id_reservation: { not: id_reservation }, // 👈 EXCLURE SOI-MÊME
            AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }]
          }
        });

        if (conflit) return NextResponse.json({ error: "⚠️ Conflit : Salle prise sur ce créneau." }, { status: 409 });
    }

    // 3. Mise à jour
    const updated = await prisma.reservationSalle.update({
        where: { id_reservation },
        data: { id_salle, date_debut: start, date_fin: end, objet }
    });

    return NextResponse.json(updated);

  } catch (error) {
    console.error("Erreur PUT:", error);
    return NextResponse.json({ error: "Erreur modification" }, { status: 500 });
  }
}