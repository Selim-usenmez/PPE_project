import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger";

// GET (inchangé)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json([]);

  const taches = await prisma.tache.findMany({
    where: { id_assigne_a: userId },
    include: { 
        assigne_par: { select: { nom: true, prenom: true } },
        projet: { select: { nom_projet: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(taches);
}

// POST (SÉCURISÉ ET STRICT)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { titre, id_projet, id_assigne_a, id_assigne_par } = body;

    if (!id_projet) return NextResponse.json({ error: "Projet obligatoire" }, { status: 400 });

    // 1. VÉRIFICATION : Est-ce que le Chef (auteur) est bien dans ce projet ?
    const isChefInProject = await prisma.participationProjet.findUnique({
        where: { id_employe_id_projet: { id_employe: id_assigne_par, id_projet: id_projet } }
    });

    if (!isChefInProject) {
        return NextResponse.json({ error: "Vous ne faites pas partie de ce projet." }, { status: 403 });
    }

    // 2. VÉRIFICATION : Est-ce que la Cible (Dév) est bien dans ce projet ?
    const isDevInProject = await prisma.participationProjet.findUnique({
        where: { id_employe_id_projet: { id_employe: id_assigne_a, id_projet: id_projet } }
    });

    if (!isDevInProject) {
        return NextResponse.json({ error: "Cet employé n'est pas dans le projet." }, { status: 400 });
    }

    // 3. CRÉATION
    const tache = await prisma.tache.create({
        data: {
            titre,
            id_projet,
            id_assigne_a,
            id_assigne_par,
            statut: "A_FAIRE"
        }
    });

    await createLog("TACHE_ASSIGNATION", `Tâche: ${titre} (Projet ${id_projet})`, id_assigne_par);
    return NextResponse.json(tache);

  } catch (e) { 
      console.error(e);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); 
  }
}

// PUT (inchangé)
export async function PUT(req: Request) {
    const body = await req.json();
    const updated = await prisma.tache.update({
        where: { id_tache: body.id_tache },
        data: { statut: body.statut }
    });
    return NextResponse.json(updated);
}