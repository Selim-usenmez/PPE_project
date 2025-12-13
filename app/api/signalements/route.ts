import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger";

// POST : Créer un signalement
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, id_ressource, description } = body;

    if (!id_employe || !id_ressource || !description) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    // 1. Création du signalement
    const signalement = await prisma.signalement.create({
      data: {
        id_employe,
        id_ressource,
        description,
        statut: "EN_ATTENTE"
      }
    });

    // 2. Optionnel : On peut passer la ressource en "EN_MAINTENANCE" automatiquement
    // Pour l'instant on laisse l'admin décider, mais on loggue l'action.

    await createLog("SIGNALEMENT_INCIDENT", `Incident signalé sur la ressource ID ${id_ressource}`);

    return NextResponse.json(signalement, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET : Lister les signalements (Pour l'admin plus tard)
export async function GET() {
  try {
    const list = await prisma.signalement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        employe: { select: { nom: true, prenom: true } },
        ressource: { select: { nom_ressource: true, numero_serie: true } }
      }
    });
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}