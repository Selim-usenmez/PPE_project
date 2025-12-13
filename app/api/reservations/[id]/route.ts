import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

// DELETE : Annuler/Supprimer
export async function DELETE(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    await prisma.reservationSalle.delete({ where: { id_reservation: id } });
    return NextResponse.json({ message: "Réservation supprimée" });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}