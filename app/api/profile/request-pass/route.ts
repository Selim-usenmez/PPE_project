import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_employe } = body;

    // 1. On vérifie si une demande est déjà en attente (Anti-spam)
    const existeDeja = await prisma.demandeMdp.findFirst({
      where: {
        id_employe,
        statut: "EN_ATTENTE"
      }
    });

    if (existeDeja) {
      return NextResponse.json({ error: "Une demande est déjà en cours de traitement." }, { status: 400 });
    }

    // 2. Création de la demande
    await prisma.demandeMdp.create({
      data: {
        id_employe
      }
    });

    return NextResponse.json({ message: "Demande envoyée à l'administrateur." });

  } catch (error: any) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}