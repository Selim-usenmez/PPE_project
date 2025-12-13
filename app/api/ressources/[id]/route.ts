import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

// PUT : Modifier une ressource spécifique
export async function PUT(req: Request, { params }: Props) {
  try {
    const { id } = await params; // On attend que les params soient chargés
    const body = await req.json();
    const { nom_ressource, type, etat, localisation, numero_serie, description } = body;

    const updatedRessource = await prisma.ressource.update({
      where: { id_ressource: id },
      data: {
        nom_ressource,
        type,
        etat,
        localisation,
        numero_serie,
        description
      }
    });

    return NextResponse.json(updatedRessource);
  } catch (error: any) {
    // Si le numéro de série existe déjà (Code erreur Prisma P2002)
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Ce numéro de série est déjà utilisé." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur lors de la modification" }, { status: 500 });
  }
}

// DELETE : Supprimer une ressource spécifique
export async function DELETE(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    
    await prisma.ressource.delete({ where: { id_ressource: id } });
    
    return NextResponse.json({ message: "Supprimé avec succès" });
  } catch (error: any) {
    // Souvent l'erreur vient du fait que l'objet est lié à un emprunt ou un signalement
    return NextResponse.json({ error: "Impossible de supprimer (peut-être lié à un historique ?)" }, { status: 500 });
  }
}