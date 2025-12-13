import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET : Lister les ressources
export async function GET() {
  try {
    const ressources = await prisma.ressource.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(ressources);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

// POST : Créer une ressource
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nom_ressource, type, etat, localisation, numero_serie, description } = body;

    // 1. Validation
    if (!nom_ressource || !type) {
      return NextResponse.json({ error: "Nom et Type sont obligatoires" }, { status: 400 });
    }

    // 2. Vérificationunicité Numéro de série (s'il est renseigné)
    if (numero_serie) {
      const existant = await prisma.ressource.findUnique({
        where: { numero_serie }
      });
      if (existant) {
        return NextResponse.json({ error: "Ce numéro de série existe déjà" }, { status: 409 });
      }
    }

    // 3. Création
    const newRessource = await prisma.ressource.create({
      data: {
        nom_ressource,
        type, // Prisma validera que c'est bien dans l'Enum TypeRessource
        etat: etat || "DISPONIBLE",
        localisation,
        numero_serie,
        description
      }
    });

    return NextResponse.json(newRessource, { status: 201 });

  } catch (error: any) {
    console.error("Erreur POST Ressource:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}