import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force le non-cache pour être sûr d'avoir les données fraîches
export const dynamic = "force-dynamic"; 

// --- GET : Récupérer le planning ---
export async function GET(req: Request) {
  try {
    const resas = await prisma.reservationSalle.findMany({
      include: {
        salle: { select: { nom_salle: true } },
        projet: { select: { nom_projet: true } },
        employe: { select: { id_employe: true, nom: true, prenom: true } }
      },
      orderBy: { date_debut: 'asc' }
    });
    
    return NextResponse.json(resas, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error("ERREUR GET:", error);
    return NextResponse.json({ error: "Erreur chargement" }, { status: 500 });
  }
}

// --- POST : Créer ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📥 POST REÇU:", body); // LOG DEBUG

    const { id_employe, id_salle, id_projet, date_debut, date_fin, objet } = body;

    // Validation Dates
    if (!date_debut || !date_fin) return NextResponse.json({ error: "Dates manquantes" }, { status: 400 });
    const start = new Date(date_debut);
    const end = new Date(date_fin);
    
    // Vérification validité date
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ error: "Format de date invalide" }, { status: 400 });
    }
    if (start >= end) return NextResponse.json({ error: "La fin doit être après le début" }, { status: 400 });

    // Vérif Conflit
    if (id_salle) {
        const conflit = await prisma.reservationSalle.findFirst({
          where: {
            id_salle: id_salle,
            AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }]
          }
        });
        if (conflit) return NextResponse.json({ error: "⚠️ Salle déjà prise !" }, { status: 409 });
    }

    const resa = await prisma.reservationSalle.create({
      data: {
        id_employe, 
        id_salle: id_salle || null, 
        id_projet: id_projet || null,
        date_debut: start, 
        date_fin: end, 
        objet: objet || "Réunion", 
        statut: "CONFIRMEE"
      }
    });

    console.log("✅ POST RÉUSSI:", resa.id_reservation);
    return NextResponse.json({ success: true, data: resa });

  } catch (error) {
    console.error("❌ ERREUR POST:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- PUT : Modifier (C'est ici que ça bloquait) ---
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    console.log("🔄 PUT (UPDATE) REÇU:", body); // LOG DEBUG

    const { id_reservation, id_salle, date_debut, date_fin, objet } = body;
    
    if (!id_reservation) {
        console.log("❌ ID manquant dans le PUT");
        return NextResponse.json({ error: "ID de réservation manquant" }, { status: 400 });
    }

    // 1. Vérif existence
    const exists = await prisma.reservationSalle.findUnique({ where: { id_reservation }});
    if (!exists) {
        console.log("❌ Réservation introuvable en BDD:", id_reservation);
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }

    const start = new Date(date_debut);
    const end = new Date(date_fin);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
    }

    // 2. Vérif conflit (Attention : on s'exclut soi-même avec { not: id_reservation })
    if (id_salle) {
        const conflit = await prisma.reservationSalle.findFirst({
          where: {
            id_salle,
            id_reservation: { not: id_reservation }, // 👈 TRÈS IMPORTANT
            AND: [{ date_debut: { lt: end } }, { date_fin: { gt: start } }]
          }
        });
        if (conflit) {
            console.log("⚠️ Conflit détecté avec:", conflit.id_reservation);
            return NextResponse.json({ error: "⚠️ Conflit : Salle occupée." }, { status: 409 });
        }
    }

    const updated = await prisma.reservationSalle.update({
        where: { id_reservation },
        data: { 
            id_salle: id_salle || null, 
            date_debut: start, 
            date_fin: end, 
            objet 
        }
    });

    console.log("✅ UPDATE RÉUSSI:", updated.id_reservation);
    return NextResponse.json(updated);

  } catch (error) {
    console.error("❌ ERREUR PUT CRITIQUE:", error); // Regarde ce log si ça plante !
    return NextResponse.json({ error: "Erreur modification serveur" }, { status: 500 });
  }
}

// --- DELETE ---
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