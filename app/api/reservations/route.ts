import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger"; // 👈 Import

export const dynamic = "force-dynamic";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, id_salle, id_ressource, id_projet, date_debut, date_fin, objet } = body;

    if (!date_debut || !date_fin) return NextResponse.json({ error: "Dates requises." }, { status: 400 });
    const start = new Date(date_debut);
    const end = new Date(date_fin);
    if (start >= end) return NextResponse.json({ error: "Fin avant début." }, { status: 400 });

    // Vérif Conflits
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

    // ✅ LOG CRÉATION
    await createLog(
        "RESERVATION_CREATION", 
        `Objet: ${objet} | SalleID: ${id_salle || 'Aucune'} | MatérielID: ${id_ressource || 'Aucun'}`,
        id_employe
    );

    return NextResponse.json({ success: true, data: resa });
  } catch (error) { return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id_reservation, id_salle, id_ressource, date_debut, date_fin, objet } = body;
    
    const exists = await prisma.reservationSalle.findUnique({ where: { id_reservation }});
    if (!exists) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const start = new Date(date_debut);
    const end = new Date(date_fin);

    const newIdSalle = id_salle === undefined ? exists.id_salle : (id_salle || null);
    const newIdRessource = id_ressource === undefined ? exists.id_ressource : (id_ressource || null);

    const updated = await prisma.reservationSalle.update({
        where: { id_reservation },
        data: { 
            id_salle: newIdSalle,
            id_ressource: newIdRessource,
            date_debut: start, 
            date_fin: end, 
            objet: objet || exists.objet 
        }
    });

    // ✅ LOG MODIFICATION
    let logMsg = `Update résa ${updated.objet}`;
    // Détection Drag & Drop (Changement d'heure seulement)
    if (new Date(exists.date_debut).getTime() !== start.getTime()) {
        logMsg += " (Changement horaire/Drag&Drop)";
    }
    await createLog("RESERVATION_MODIF", logMsg, exists.id_employe || undefined);

    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: "Erreur modification" }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    // Récupérer avant suppression pour le log
    const target = await prisma.reservationSalle.findUnique({ where: { id_reservation: id! } });

    await prisma.reservationSalle.delete({ where: { id_reservation: id! } });

    // ✅ LOG SUPPRESSION
    if (target && target.id_employe) {
        await createLog("RESERVATION_SUPPRESSION", `Annulation résa: ${target.objet}`, target.id_employe);
    }

    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Erreur suppression" }, { status: 500 }); }
}