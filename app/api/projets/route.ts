import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projets = await prisma.projet.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { participations: true } } }
    });
    return NextResponse.json(projets);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nom_projet, description, date_debut, date_fin, statut } = body;

    // 1. Validations Obligatoires
    if (!nom_projet || !date_debut || !date_fin) {
      return NextResponse.json({ error: "Nom, Date Début et Date Fin sont obligatoires" }, { status: 400 });
    }

    const debut = new Date(date_debut);
    const fin = new Date(date_fin);

    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
      return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
    }

    // 2. Vérif Logique (Fin > Début)
    if (fin.getTime() <= debut.getTime()) {
      return NextResponse.json({ error: "La date de fin doit être après la date de début" }, { status: 400 });
    }

    // 3. Statut
    const statutsValides = ["EN_COURS", "TERMINE", "EN_ATTENTE", "ANNULE"];
    const statutFinal = statutsValides.includes(statut) ? statut : "EN_COURS";

    // 4. Création
    const newProjet = await prisma.projet.create({
      data: {
        nom_projet,
        description: description || "",
        date_debut: debut,
        date_fin: fin, // Obligatoire maintenant
        statut: statutFinal as any,
      },
    });

    return NextResponse.json(newProjet, { status: 201 });

  } catch (error: any) {
    console.error("Erreur POST:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}