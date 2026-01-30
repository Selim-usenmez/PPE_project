import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger";

// Fonction de vérification des congés
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
  } catch (e) { return null; }
}

// --- GET (Lecture avec Filtres & Tri) ---
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  
  const sort = searchParams.get("sort") || "date_debut"; 
  const order = searchParams.get("order") || "asc";
  const filterSalle = searchParams.get("salleId");

  const whereClause: any = {};
  if (userId) whereClause.id_employe = userId;
  if (filterSalle) whereClause.id_salle = filterSalle;
  
  try {
    const resas = await prisma.reservationSalle.findMany({
      where: whereClause,
      include: { salle: true, ressource: true, projet: true, employe: true },
      orderBy: { [sort]: order }
    });
    return NextResponse.json(resas);
  } catch (e) { return NextResponse.json({ error: "Erreur chargement" }, { status: 500 }); }
}

// --- POST (Création) ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, id_salle, id_ressource, id_projet, date_debut, date_fin, objet } = body;

    if (!id_employe) return NextResponse.json({ error: "Utilisateur requis." }, { status: 400 });
    if (!date_debut || !date_fin) return NextResponse.json({ error: "Dates manquantes." }, { status: 400 });

    const start = new Date(date_debut);
    const end = new Date(date_fin);
    const now = new Date();

    if (start.getTime() < now.setSeconds(0, 0)) {
        return NextResponse.json({ error: "Impossible de réserver dans le passé." }, { status: 400 });
    }
    if (start >= end) return NextResponse.json({ error: "La fin doit être après le début." }, { status: 400 });

    const enConge = await checkCongeConflict(id_employe, start, end);
    if (enConge) return NextResponse.json({ error: "Utilisateur en congé sur cette période." }, { status: 400 });

    // 1. Vérif Salle
    if (id_salle && id_salle !== "") {
        const conflit = await prisma.reservationSalle.findFirst({
            where: { id_salle, statut: { not: "ANNULEE" }, AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }] }
        });
        if (conflit) return NextResponse.json({ error: "Salle déjà occupée." }, { status: 409 });
    }

    // 2. Vérif Matériel (AVEC SÉCURITÉ MAINTENANCE)
    if (id_ressource && id_ressource !== "") {
        // A. Vérifier si le matériel est en état de marche
        const ressource = await prisma.ressource.findUnique({ where: { id_ressource } });
        
        if (ressource?.etat === "EN_MAINTENANCE" || ressource?.etat === "HORS_SERVICE") {
            return NextResponse.json({ error: "⛔ Cet équipement est en maintenance ou HS." }, { status: 400 });
        }

        // B. Vérifier les conflits de dates
        const conflitMat = await prisma.reservationSalle.findFirst({
            where: { id_ressource, statut: { not: "ANNULEE" }, AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }] }
        });
        if (conflitMat) return NextResponse.json({ error: "Matériel déjà réservé." }, { status: 409 });
    }

    const reservation = await prisma.reservationSalle.create({
        data: {
            id_employe,
            id_salle: id_salle || null,
            id_ressource: id_ressource || null,
            id_projet: id_projet || null,
            date_debut: start, date_fin: end, objet: objet || "Réservation"
        }
    });

    await createLog("RESERVATION_CREATION", `Objet: ${objet}, ID: ${reservation.id_reservation}`, id_employe);
    
    return NextResponse.json(reservation);

  } catch (e: any) { return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
}

// --- PUT (Modification) ---
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id_reservation, date_debut, date_fin, id_salle, id_ressource, objet } = body;
        
        const existing = await prisma.reservationSalle.findUnique({ where: { id_reservation } });
        if(!existing) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

        const start = new Date(date_debut);
        const end = new Date(date_fin);

        // Pas de check "Date passée" pour permettre la correction d'historique

        if (id_salle && id_salle !== "") {
            const conflit = await prisma.reservationSalle.findFirst({
                where: { 
                    id_salle, 
                    statut: { not: "ANNULEE" }, 
                    id_reservation: { not: id_reservation }, // Ignore soi-même
                    AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }] 
                }
            });
            if (conflit) return NextResponse.json({ error: "Salle déjà occupée sur ce créneau." }, { status: 409 });
        }

        if (id_ressource && id_ressource !== "") {
            const conflitMat = await prisma.reservationSalle.findFirst({
                where: { 
                    id_ressource, 
                    statut: { not: "ANNULEE" }, 
                    id_reservation: { not: id_reservation }, // Ignore soi-même
                    AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }] 
                }
            });
            if (conflitMat) return NextResponse.json({ error: "Matériel déjà réservé." }, { status: 409 });
        }

        const updated = await prisma.reservationSalle.update({
            where: { id_reservation },
            data: { 
                date_debut: start, 
                date_fin: end,
                id_salle: id_salle || null,
                id_ressource: id_ressource || null,
                objet: objet || existing.objet
            }
        });

        // ✅ Correction TypeScript : id_employe || undefined
        await createLog("RESERVATION_MODIF", `Mise à jour ID: ${id_reservation}`, existing.id_employe || undefined);

        return NextResponse.json(updated);

    } catch(e) { 
        console.error("Erreur PUT:", e);
        return NextResponse.json({ error: "Erreur lors de la modification" }, { status: 500 }); 
    }
}

// --- DELETE (Suppression) ---
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if(!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

        const old = await prisma.reservationSalle.findUnique({ where: { id_reservation: id }});

        await prisma.reservationSalle.delete({ where: { id_reservation: id } });
        
        // ✅ Correction TypeScript : id_employe || undefined
        if(old) await createLog("RESERVATION_SUPPRESSION", `Annulation ID: ${id}`, old.id_employe || undefined);

        return NextResponse.json({ success: true });
    } catch(e) { return NextResponse.json({ error: "Erreur suppression" }, { status: 500 }); }
}