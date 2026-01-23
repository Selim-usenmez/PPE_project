import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 🚀 FORCE DYNAMIC : Pas de cache serveur
export const dynamic = "force-dynamic"; 

// --- GET : Récupérer le planning (Filtré ou Global) ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId"); // 👈 On récupère l'ID demandé

    // Si userId est présent, on filtre. Sinon, on renvoie tout (comportement par défaut)
    const whereClause = userId ? { id_employe: userId } : {};

    const resas = await prisma.reservationSalle.findMany({
      where: whereClause, // 👈 Application du filtre
      include: {
        salle: { select: { nom_salle: true } },
        projet: { select: { nom_projet: true } },
        employe: { select: { id_employe: true, nom: true, prenom: true } }
      },
      orderBy: { date_debut: 'asc' }
    });
    
    return NextResponse.json(resas, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur chargement" }, { status: 500 });
  }
}

// --- POST : Créer ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, id_salle, id_projet, date_debut, date_fin, objet } = body;

    if (!date_debut || !date_fin) return NextResponse.json({ error: "Dates requises." }, { status: 400 });

    const start = new Date(date_debut);
    const end = new Date(date_fin);

    if (start >= end) return NextResponse.json({ error: "La fin doit être après le début." }, { status: 400 });

    // Vérif conflit (GLOBAL : On vérifie quand même si la salle est prise par QUELQU'UN D'AUTRE)
    if (id_salle) {
        const conflit = await prisma.reservationSalle.findFirst({
          where: {
            id_salle: id_salle,
            AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }]
          }
        });
        if (conflit) return NextResponse.json({ error: "⚠️ Salle déjà réservée par un autre collègue !" }, { status: 409 });
    }

    const resa = await prisma.reservationSalle.create({
      data: {
        id_employe, id_salle: id_salle || null, id_projet: id_projet || null,
        date_debut: start, date_fin: end, objet: objet || "Réunion", statut: "CONFIRMEE"
      }
    });

    return NextResponse.json({ success: true, data: resa });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- PUT : Modifier ---
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id_reservation, id_salle, date_debut, date_fin, objet } = body;
    
    const exists = await prisma.reservationSalle.findUnique({ where: { id_reservation }});
    if (!exists) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const start = new Date(date_debut);
    const end = new Date(date_fin);

    if (start >= end) return NextResponse.json({ error: "Dates invalides" }, { status: 400 });

    if (id_salle) {
        const conflit = await prisma.reservationSalle.findFirst({
          where: {
            id_salle,
            id_reservation: { not: id_reservation },
            AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }]
          }
        });
        if (conflit) return NextResponse.json({ error: "⚠️ Conflit : Salle occupée." }, { status: 409 });
    }

    const updated = await prisma.reservationSalle.update({
        where: { id_reservation },
        data: { id_salle: id_salle || null, date_debut: start, date_fin: end, objet }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Erreur modification" }, { status: 500 });
  }
}

// --- DELETE : Supprimer ---
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    await prisma.reservationSalle.delete({ where: { id_reservation: id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}