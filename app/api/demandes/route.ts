import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createLog } from "@/lib/logger"; // ✅ Bon chemin (universel)

// GET : Lister les demandes en attente
export async function GET() {
  try {
    const demandes = await prisma.demandeMdp.findMany({
      where: { statut: "EN_ATTENTE" },
      include: {
        employe: { select: { id_employe: true, nom: true, prenom: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(demandes);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

// POST : Réinitialiser le mot de passe
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_demande, id_employe } = body;

    // 1. Générer le nouveau mot de passe par défaut
    const defaultPass = "123456";
    const hashedPassword = await bcrypt.hash(defaultPass, 10);

    // 2. Mettre à jour l'employé
    await prisma.employe.update({
      where: { id_employe },
      data: { mot_de_passe: hashedPassword }
    });

    // 3. Marquer la demande comme TRAITEE (ou la supprimer)
    await prisma.demandeMdp.delete({
      where: { id_demande }
    });

    // 4. Log
    await createLog("RÉINITIALISATION_MDP", `Mot de passe réinitialisé pour l'employé ID: ${id_employe}`);

    return NextResponse.json({ message: "Mot de passe réinitialisé à '123456'" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}