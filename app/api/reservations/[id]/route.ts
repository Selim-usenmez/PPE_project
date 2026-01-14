import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

// DELETE : Annuler/Supprimer une réservation
export async function DELETE(req: Request, { params }: Props) {
  try {
    const { id } = await params;

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    await prisma.reservationSalle.delete({ 
        where: { id_reservation: id } 
    });

    return NextResponse.json({ message: "Réservation supprimée avec succès" });
  } catch (error: any) {
    console.error("Erreur DELETE:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}