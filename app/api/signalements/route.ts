import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger";

// GET : Lister les signalements (Admin OU Employé spécifique)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId"); // On récupère l'ID si fourni

  // Si userId est présent, on filtre. Sinon, on renvoie tout (pour l'admin).
  const whereClause = userId ? { id_employe: userId } : {};

  try {
    const list = await prisma.signalement.findMany({
      where: whereClause,
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

// ... (Le POST reste inchangé)
export async function POST(req: Request) {
    // ... Ton code existant pour créer le signalement
    // (Copie-colle ton POST précédent ici si tu l'as effacé)
    try {
        const body = await req.json();
        const { id_employe, id_ressource, description } = body;
        if (!id_employe || !id_ressource || !description) return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
        
        const signalement = await prisma.signalement.create({
            data: { id_employe, id_ressource, description, statut: "EN_ATTENTE" }
        });
        await createLog("SIGNALEMENT_INCIDENT", `Incident ID: ${id_ressource}`, id_employe);
        return NextResponse.json(signalement, { status: 201 });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}