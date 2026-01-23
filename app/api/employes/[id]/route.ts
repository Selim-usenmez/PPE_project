import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type Props = {
  params: Promise<{ id: string }>;
};

// 1. GET (Lecture pour le profil)
export async function GET(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    const employe = await prisma.employe.findUnique({ where: { id_employe: id } });

    if (!employe) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json(employe);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 2. PUT (Modification)
export async function PUT(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nom, prenom, email, role, mot_de_passe } = body;

    const dataToUpdate: any = { nom, prenom, email, role };
    
    if (mot_de_passe && mot_de_passe.trim() !== "") {
      dataToUpdate.mot_de_passe = await bcrypt.hash(mot_de_passe, 10);
    }

    const updated = await prisma.employe.update({
      where: { id_employe: id },
      data: dataToUpdate
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Erreur mise à jour" }, { status: 500 });
  }
}

// 3. DELETE (Suppression)
export async function DELETE(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    await prisma.employe.delete({ where: { id_employe: id } });
    return NextResponse.json({ message: "Supprimé" });
  } catch (error) {
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}