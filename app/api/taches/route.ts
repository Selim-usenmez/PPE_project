import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET (Ton code existant)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json([]);
  const taches = await prisma.tache.findMany({
    where: { id_assigne_a: userId },
    include: { assigne_par: { select: { nom: true, prenom: true } }, projet: { select: { nom_projet: true } } },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(taches);
}

// POST : Assignation avec blocage Congés
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { titre, id_projet, id_assigne_a, id_assigne_par } = body;

    // ⛔ VÉRIFICATION : L'employé cible est-il en congé AUJOURD'HUI ?
    const now = new Date();
    const enConge = await prisma.conge.findFirst({
        where: {
            id_employe: id_assigne_a,
            statut: "VALIDE",
            date_debut: { lte: now },
            date_fin: { gte: now }
        }
    });

    if (enConge) {
        return NextResponse.json({ error: "Impossible : Cet employé est actuellement en congés (validés) ! 🌴" }, { status: 400 });
    }

    const tache = await prisma.tache.create({
        data: { titre, id_projet, id_assigne_a, id_assigne_par, statut: "A_FAIRE" }
    });

    return NextResponse.json(tache);
  } catch (e) { return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
}

// PUT (Ton code existant)
export async function PUT(req: Request) {
    const body = await req.json();
    const updated = await prisma.tache.update({ where: { id_tache: body.id_tache }, data: { statut: body.statut } });
    return NextResponse.json(updated);
}