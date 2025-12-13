import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, nom, prenom, couleur_fond } = body;

    // Validation simple
    if (!id_employe || !nom || !prenom) {
      return NextResponse.json({ error: "Nom et Prénom sont obligatoires" }, { status: 400 });
    }

    // Mise à jour dans la BDD
    const updatedUser = await prisma.employe.update({
      where: { id_employe },
      data: {
        nom,
        prenom,
        couleur_fond // On enregistre la couleur choisie
      }
    });

    return NextResponse.json(updatedUser);

  } catch (error: any) {
    console.error("Erreur update profil:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}