import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger";
import { cookies } from "next/headers"; 
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// --- GET (Lecture publique interne) ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const whereClause = userId ? { id_employe: userId } : {};

    const resas = await prisma.reservationSalle.findMany({
      where: whereClause,
      include: {
        salle: { select: { nom_salle: true, id_salle: true } },
        ressource: { select: { nom_ressource: true, id_ressource: true } },
        projet: { select: { nom_projet: true } },
        employe: { select: { id_employe: true, nom: true, prenom: true } }
      },
      orderBy: { date_debut: 'asc' }
    });
    return NextResponse.json(resas, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: "Erreur" }, { status: 500 }); }
}

// --- POST (Création) ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // On pourrait vérifier ici si l'user connecté correspond à id_employe envoyé
    // Pour simplifier, on garde la logique actuelle (l'utilisateur crée pour lui-même)
    
    const { id_employe, id_salle, id_ressource, id_projet, date_debut, date_fin, objet } = body;

    if (!date_debut || !date_fin) return NextResponse.json({ error: "Dates requises." }, { status: 400 });
    const start = new Date(date_debut);
    const end = new Date(date_fin);
    if (start >= end) return NextResponse.json({ error: "Fin avant début." }, { status: 400 });

    if (id_salle) {
        const conflit = await prisma.reservationSalle.findFirst({
          where: { id_salle, statut: { not: "ANNULEE" }, AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }] }
        });
        if (conflit) return NextResponse.json({ error: "⚠️ Salle déjà occupée." }, { status: 409 });
    }
    if (id_ressource) {
        const conflit = await prisma.reservationSalle.findFirst({
          where: { id_ressource, statut: { not: "ANNULEE" }, AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }] }
        });
        if (conflit) return NextResponse.json({ error: "⚠️ Matériel déjà réservé." }, { status: 409 });
    }

    const resa = await prisma.reservationSalle.create({
      data: {
        id_employe,
        id_salle: id_salle || null,
        id_ressource: id_ressource || null,
        id_projet: id_projet || null,
        date_debut: start, date_fin: end, objet: objet || "Réservation"
      }
    });

    await createLog("RESERVATION_CREATION", `Objet: ${objet}`, id_employe);
    return NextResponse.json({ success: true, data: resa });
  } catch (error) { return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
}

// --- PUT (Modification Sécurisée) ---
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id_reservation, id_salle, id_ressource, date_debut, date_fin, objet } = body;
    
    // 1. Authentification
    const cookieStore = await cookies();
    const session = cookieStore.get("session_user");
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const currentUser = JSON.parse(session.value);

    // 2. Vérification existence
    const exists = await prisma.reservationSalle.findUnique({ where: { id_reservation }});
    if (!exists) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // 3. 🛡️ VÉRIFICATION DROITS (RBAC)
    const isOwner = exists.id_employe === currentUser.id_employe;
    if (!can(currentUser.role, "RESERVATION", "UPDATE", isOwner)) {
        return NextResponse.json({ error: "⛔ Action non autorisée pour votre rôle." }, { status: 403 });
    }

    const start = new Date(date_debut);
    const end = new Date(date_fin);
    const newIdSalle = id_salle === undefined ? exists.id_salle : (id_salle || null);
    const newIdRessource = id_ressource === undefined ? exists.id_ressource : (id_ressource || null);

    const updated = await prisma.reservationSalle.update({
        where: { id_reservation },
        data: { 
            id_salle: newIdSalle,
            id_ressource: newIdRessource,
            date_debut: start, date_fin: end, objet: objet || exists.objet 
        }
    });

    let logMsg = `Update résa ${updated.objet}`;
    if (new Date(exists.date_debut).getTime() !== start.getTime()) logMsg += " (Déplacement)";
    await createLog("RESERVATION_MODIF", logMsg, currentUser.id_employe);

    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: "Erreur modification" }, { status: 500 }); }
}

// --- DELETE (Suppression Sécurisée) ---
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    // 1. Authentification
    const cookieStore = await cookies();
    const session = cookieStore.get("session_user");
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const currentUser = JSON.parse(session.value);

    // 2. Vérification Cible
    const target = await prisma.reservationSalle.findUnique({ where: { id_reservation: id! } });
    if (!target) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // 3. 🛡️ VÉRIFICATION DROITS (RBAC)
    // Le propriétaire ?
    const isOwner = target.id_employe === currentUser.id_employe;
    
    // On appelle notre fonction de permission
    if (!can(currentUser.role, "RESERVATION", "DELETE", isOwner)) {
        return NextResponse.json({ error: "⛔ Vous n'avez pas le droit de supprimer cette réservation." }, { status: 403 });
    }

    await prisma.reservationSalle.delete({ where: { id_reservation: id! } });

    await createLog("RESERVATION_SUPPRESSION", `Annulation résa: ${target.objet} par ${currentUser.nom}`, currentUser.id_employe);

    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erreur suppression" }, { status: 500 }); }
}