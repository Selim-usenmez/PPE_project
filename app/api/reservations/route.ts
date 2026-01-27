import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger"; // Si tu utilises le logger

// Fonction pour vérifier si l'employé est en congé validé sur la période
async function checkCongeConflict(userId: string, start: Date, end: Date) {
  const conge = await prisma.conge.findFirst({
    where: {
      id_employe: userId,
      statut: "VALIDE",
      // Chevauchement de dates : Le congé commence avant la fin de la résa ET finit après le début de la résa
      date_debut: { lt: end },
      date_fin: { gt: start }
    }
  });
  return conge;
}

// GET (Inchangé)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const whereClause = userId ? { id_employe: userId } : {};
  try {
    const resas = await prisma.reservationSalle.findMany({
      where: whereClause,
      include: { salle: true, ressource: true, projet: true, employe: true },
      orderBy: { date_debut: 'asc' }
    });
    return NextResponse.json(resas);
  } catch (e) { return NextResponse.json({ error: "Erreur" }, { status: 500 }); }
}

// POST : Création avec vérification Congés
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, id_salle, id_ressource, id_projet, date_debut, date_fin, objet } = body;

    const start = new Date(date_debut);
    const end = new Date(date_fin);

    // ⛔ 1. VÉRIF CONGÉS
    const enConge = await checkCongeConflict(id_employe, start, end);
    if (enConge) {
        return NextResponse.json({ error: "Impossible : Vous avez un congé " }, { status: 400 });
    }

    // ⛔ 2. VÉRIF DISPO SALLE/RESSOURCE (Ton code existant)
    if (id_salle) {
        const conflit = await prisma.reservationSalle.findFirst({
            where: { id_salle, statut: { not: "ANNULEE" }, AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }] }
        });
        if (conflit) return NextResponse.json({ error: "Salle déjà occupée." }, { status: 409 });
    }

    const reservation = await prisma.reservationSalle.create({
        data: { id_employe, id_salle, id_ressource, id_projet, date_debut: start, date_fin: end, objet: objet || "Réservation" }
    });

    return NextResponse.json(reservation);
  } catch (e) { return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
}

// PUT : Modification avec vérification Congés
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id_reservation, date_debut, date_fin } = body;
        
        // Récupérer l'employé lié à cette réservation
        const existing = await prisma.reservationSalle.findUnique({ where: { id_reservation } });
        if(!existing || !existing.id_employe) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });

        const start = new Date(date_debut);
        const end = new Date(date_fin);

        // ⛔ VÉRIF CONGÉS
        const enConge = await checkCongeConflict(existing.id_employe, start, end);
        if (enConge) {
            return NextResponse.json({ error: "Impossible : Période de congés ! 🌴" }, { status: 400 });
        }

        const updated = await prisma.reservationSalle.update({
            where: { id_reservation },
            data: { ...body, date_debut: start, date_fin: end }
        });
        return NextResponse.json(updated);
    } catch(e) { return NextResponse.json({ error: "Erreur" }, { status: 500 }); }
}

// DELETE (Inchangé)
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await prisma.reservationSalle.delete({ where: { id_reservation: id! } });
    return NextResponse.json({ success: true });
}