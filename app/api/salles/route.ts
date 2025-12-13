import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET : Lister les salles
export async function GET() {
  try {
    const salles = await prisma.salle.findMany({
      orderBy: { nom_salle: 'asc' }, // Tri par nom alphabétique
      include: {
        _count: { select: { reservations: true } } // On compte les réservations futures (optionnel)
      }
    });
    return NextResponse.json(salles);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

// POST : Créer une salle
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nom_salle, capacite, equipements, localisation } = body;

    // 1. Validation
    if (!nom_salle || !capacite) {
      return NextResponse.json({ error: "Nom et Capacité sont obligatoires" }, { status: 400 });
    }

    // 2. Vérification unicité du nom
    const existant = await prisma.salle.findUnique({
      where: { nom_salle }
    });
    if (existant) {
      return NextResponse.json({ error: "Une salle porte déjà ce nom" }, { status: 409 });
    }

    // 3. Création
    const newSalle = await prisma.salle.create({
      data: {
        nom_salle,
        capacite: parseInt(capacite), // On s'assure que c'est un entier
        equipements: equipements || "",
        localisation: localisation || ""
      }
    });

    return NextResponse.json(newSalle, { status: 201 });

  } catch (error: any) {
    console.error("Erreur POST Salle:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}