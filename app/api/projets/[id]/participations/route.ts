import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

// GET : Récupérer l'équipe
export async function GET(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    
    const participations = await prisma.participationProjet.findMany({
      where: { id_projet: id },
      include: {
        employe: {
          select: { id_employe: true, nom: true, prenom: true, email: true }
        }
      },
      orderBy: { date_assignation: 'desc' }
    });

    return NextResponse.json(participations);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

// POST : Ajouter un employé (MULTI-PROJETS AUTORISÉ)
export async function POST(req: Request, { params }: Props) {
  try {
    const { id } = await params; // ID du Projet actuel
    const body = await req.json();
    const { id_employe, role_dans_projet } = body;

    if (!id_employe) {
      return NextResponse.json({ error: "Employé obligatoire" }, { status: 400 });
    }

    // On essaie de créer directement
    const participation = await prisma.participationProjet.create({
      data: {
        id_projet: id,
        id_employe: id_employe,
        role_dans_projet: role_dans_projet || "Membre"
      }
    });

    return NextResponse.json(participation, { status: 201 });

  } catch (error: any) {
    // Code P2002 = Violation de contrainte unique (Composite key)
    // Cela veut dire : "Il est déjà dans CE projet là"
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Cet employé fait déjà partie de ce projet." }, { status: 409 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE : Retirer un membre
export async function DELETE(req: Request, { params }: Props) {
  try {
    const { searchParams } = new URL(req.url);
    const id_participation = searchParams.get("id_participation");

    if (!id_participation) {
        return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    await prisma.participationProjet.delete({
      where: { id_participation: id_participation }
    });

    return NextResponse.json({ message: "Retiré de l'équipe" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}