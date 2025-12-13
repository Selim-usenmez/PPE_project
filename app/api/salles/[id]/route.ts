import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

// PUT : Modifier
export async function PUT(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nom_salle, capacite, equipements, localisation } = body;

    const dataToUpdate: any = {
        nom_salle,
        equipements,
        localisation
    };

    if (capacite) {
        dataToUpdate.capacite = parseInt(capacite);
    }

    const updatedSalle = await prisma.salle.update({
      where: { id_salle: id },
      data: dataToUpdate
    });

    return NextResponse.json(updatedSalle);
  } catch (error: any) {
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Ce nom de salle est déjà pris" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE : Supprimer
export async function DELETE(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    await prisma.salle.delete({ where: { id_salle: id } });
    return NextResponse.json({ message: "Salle supprimée" });
  } catch (error: any) {
    // P2003 = Erreur de clé étrangère (si la salle a des réservations)
    if (error.code === 'P2003') {
        return NextResponse.json({ error: "Impossible de supprimer cette salle car elle contient des réservations." }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}