import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId"); // Voir SES propres congés
  const managerId = searchParams.get("managerId"); // Voir congés de l'ÉQUIPE

  try {
    let conges;

    if (managerId) {
        // --- MODE CHEF DE PROJET ---
        // 1. Récupérer les projets du chef
        const projetsDuChef = await prisma.participationProjet.findMany({
            where: { id_employe: managerId },
            select: { id_projet: true }
        });
        const idsProjets = projetsDuChef.map(p => p.id_projet);

        // 2. Récupérer TOUS les membres de ces projets
        const participationsEquipe = await prisma.participationProjet.findMany({
            where: { id_projet: { in: idsProjets } },
            select: { id_employe: true }
        });
        const idsEquipe = participationsEquipe.map(p => p.id_employe);

        // 3. Récupérer les congés VALIDÉS de ces membres
        conges = await prisma.conge.findMany({
            where: {
                id_employe: { in: idsEquipe },
                statut: "VALIDE" // Le chef ne voit que ce qui est validé
            },
            include: { employe: { select: { nom: true, prenom: true } } }
        });

    } else if (userId) {
        // --- MODE EMPLOYÉ ---
        conges = await prisma.conge.findMany({
            where: { id_employe: userId },
            orderBy: { createdAt: 'desc' },
            include: { employe: { select: { nom: true, prenom: true } } }
        });
    } else {
        // --- MODE RH (Tout) ---
        conges = await prisma.conge.findMany({
            include: { employe: { select: { nom: true, prenom: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    return NextResponse.json(conges);
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// POST et PUT (Code RH précédent)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const conge = await prisma.conge.create({
      data: { ...body, date_debut: new Date(body.date_debut), date_fin: new Date(body.date_fin), statut: "EN_ATTENTE" }
    });
    return NextResponse.json(conge);
  } catch (e) { return NextResponse.json({ error: "Erreur" }, { status: 500 }); }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const updated = await prisma.conge.update({ where: { id_conge: body.id_conge }, data: { statut: body.statut } });
    return NextResponse.json(updated);
  } catch (e) { return NextResponse.json({ error: "Erreur" }, { status: 500 }); }
}