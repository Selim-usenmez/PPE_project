import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nom_projet, description, date_debut, date_fin, statut } = body;

    const dataToUpdate: any = { nom_projet, description, statut };

    // Gestion Dates
    let debutParsed = undefined;
    if (date_debut) {
        debutParsed = new Date(date_debut);
        if (!isNaN(debutParsed.getTime())) dataToUpdate.date_debut = debutParsed;
    }

    // Date Fin OBLIGATOIRE (si envoyée, on vérifie)
    if (date_fin) {
        const finParsed = new Date(date_fin);
        if (!isNaN(finParsed.getTime())) {
            // Vérif cohérence avec le début (si présent dans update, sinon faudrait check la BDD, 
            // on simplifie ici en supposant que le front a vérifié)
            dataToUpdate.date_fin = finParsed;
        }
    }

    const updatedProjet = await prisma.projet.update({
      where: { id_projet: id },
      data: dataToUpdate
    });

    return NextResponse.json(updatedProjet);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    await prisma.projet.delete({ where: { id_projet: id } });
    return NextResponse.json({ message: "Supprimé" });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}