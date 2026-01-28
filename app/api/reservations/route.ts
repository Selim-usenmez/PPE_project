import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fonction de vérification des congés (Inchangée)
async function checkCongeConflict(userId: string, start: Date, end: Date) {
  try {
      const conge = await prisma.conge.findFirst({
        where: {
          id_employe: userId,
          statut: "VALIDE",
          date_debut: { lt: end },
          date_fin: { gt: start }
        }
      });
      return conge;
  } catch (e) {
      console.error("⚠️ Erreur lors de la vérif congés:", e);
      return null;
  }
}

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
  } catch (e) { return NextResponse.json({ error: "Erreur chargement" }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, id_salle, id_ressource, id_projet, date_debut, date_fin, objet } = body;

    // 1. Validation de base
    if (!id_employe) return NextResponse.json({ error: "Utilisateur non identifié." }, { status: 400 });
    if (!date_debut || !date_fin) return NextResponse.json({ error: "Dates manquantes." }, { status: 400 });

    const start = new Date(date_debut);
    const end = new Date(date_fin);
    const now = new Date();

    // 🛑 2. VÉRIFICATION TEMPORELLE (NOUVEAU)
    // On enlève les secondes/millisecondes pour éviter les bugs si on réserve à la minute près
    if (start.getTime() < now.setSeconds(0, 0)) {
        return NextResponse.json({ error: "⛔ Impossible de réserver dans le passé !" }, { status: 400 });
    }

    if (start >= end) return NextResponse.json({ error: "La fin doit être après le début." }, { status: 400 });

    // 3. VÉRIF CONGÉS
    const enConge = await checkCongeConflict(id_employe, start, end);
    if (enConge) return NextResponse.json({ error: "⛔ Impossible : Vous êtes en congé validé !" }, { status: 400 });

    // 4. VÉRIF DISPO SALLE
    if (id_salle && id_salle !== "") {
        const conflit = await prisma.reservationSalle.findFirst({
            where: { 
                id_salle, 
                statut: { not: "ANNULEE" }, 
                AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }] 
            }
        });
        if (conflit) return NextResponse.json({ error: "⚠️ La salle est déjà occupée." }, { status: 409 });
    }

    // 5. VÉRIF DISPO MATÉRIEL
    if (id_ressource && id_ressource !== "") {
        const conflitMat = await prisma.reservationSalle.findFirst({
            where: { 
                id_ressource, 
                statut: { not: "ANNULEE" }, 
                AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }] 
            }
        });
        if (conflitMat) return NextResponse.json({ error: "⚠️ Le matériel est déjà réservé." }, { status: 409 });
    }

    // 6. CRÉATION
    const reservation = await prisma.reservationSalle.create({
        data: {
            id_employe,
            id_salle: id_salle && id_salle !== "" ? id_salle : null,
            id_ressource: id_ressource && id_ressource !== "" ? id_ressource : null,
            id_projet: id_projet && id_projet !== "" ? id_projet : null,
            date_debut: start,
            date_fin: end,
            objet: objet || "Réservation"
        }
    });

    return NextResponse.json(reservation);

  } catch (e: any) { 
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); 
  }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id_reservation, date_debut, date_fin, id_salle, id_ressource, objet } = body;
        
        const existing = await prisma.reservationSalle.findUnique({ where: { id_reservation } });
        if(!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

        const start = new Date(date_debut);
        const end = new Date(date_fin);
        const now = new Date();

        // 🛑 VÉRIFICATION TEMPORELLE AUSSI EN MODIFICATION
        if (start.getTime() < now.setSeconds(0, 0)) {
            return NextResponse.json({ error: "⛔ Impossible de déplacer une réservation dans le passé !" }, { status: 400 });
        }

        const enConge = await checkCongeConflict(existing.id_employe!, start, end);
        if (enConge) return NextResponse.json({ error: "Impossible : Période de congés !" }, { status: 400 });

        const updated = await prisma.reservationSalle.update({
            where: { id_reservation },
            data: { 
                date_debut: start, 
                date_fin: end,
                id_salle: id_salle && id_salle !== "" ? id_salle : null,
                id_ressource: id_ressource && id_ressource !== "" ? id_ressource : null,
                objet: objet || existing.objet
            }
        });
        return NextResponse.json(updated);
    } catch(e) { return NextResponse.json({ error: "Erreur modification" }, { status: 500 }); }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if(!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });
        await prisma.reservationSalle.delete({ where: { id_reservation: id } });
        return NextResponse.json({ success: true });
    } catch(e) { return NextResponse.json({ error: "Erreur suppression" }, { status: 500 }); }
}