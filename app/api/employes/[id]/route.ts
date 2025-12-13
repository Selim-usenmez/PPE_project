import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Définition du type pour Next.js 15 (params est une Promise)
type Props = {
  params: Promise<{ id: string }>;
};

// PUT: Modifier un employé
export async function PUT(req: Request, { params }: Props) {
  try {
    // 1. AWAIT params (Correction Next.js 15)
    const { id } = await params;
    
    // 2. Récupérer les données
    const body = await req.json();
    const { nom, prenom, email, role, mot_de_passe } = body;

    // 3. Préparer l'objet de mise à jour pour Prisma
    const dataToUpdate: any = {
      nom,
      prenom,
      email,
      role // Prisma gère la conversion en ENUM tout seul
    };

    // 4. Si mot de passe fourni, on le hache
    if (mot_de_passe && mot_de_passe.trim() !== "") {
      dataToUpdate.mot_de_passe = await bcrypt.hash(mot_de_passe, 10);
    }

    // 5. Mise à jour via Prisma (Plus de SQL brut !)
    const updatedEmploye = await prisma.employe.update({
      where: { id_employe: id },
      data: dataToUpdate
    });

    return NextResponse.json(updatedEmploye);
  } catch (error) {
    console.error("Erreur PUT:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

// DELETE: Supprimer un employé
export async function DELETE(req: Request, { params }: Props) {
  try {
    // 1. AWAIT params (Correction Next.js 15)
    const { id } = await params;

    // 2. Suppression via Prisma
    await prisma.employe.delete({
      where: { id_employe: id }
    });

    return NextResponse.json({ message: "Employé supprimé avec succès" });
  } catch (error) {
    console.error("Erreur DELETE:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}