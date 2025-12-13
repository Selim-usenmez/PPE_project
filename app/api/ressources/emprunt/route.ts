import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger"; // 👈 AJOUT DE L'IMPORT

// 1. EMPRUNTER UN MATÉRIEL (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_ressource, id_employe } = body;

    // Vérifier si le matériel est toujours dispo
    const ressource = await prisma.ressource.findUnique({ where: { id_ressource } });
    if (!ressource || ressource.etat !== "DISPONIBLE") {
      return NextResponse.json({ error: "Ce matériel n'est plus disponible." }, { status: 400 });
    }

    // Mise à jour
    const updated = await prisma.ressource.update({
      where: { id_ressource },
      data: {
        id_emprunteur: id_employe,
        etat: "EN_UTILISATION"
      }
    });

    // 👇 LOG DE L'ACTION
    await createLog(
        "EMPRUNT MATÉRIEL", 
        `Matériel "${updated.nom_ressource}" (S/N: ${updated.numero_serie || 'N/A'}) emprunté.`
    );

    return NextResponse.json(updated);

  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de l'emprunt" }, { status: 500 });
  }
}

// 2. RENDRE UN MATÉRIEL (PUT)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id_ressource } = body;

    // On remet à zéro
    const updated = await prisma.ressource.update({
      where: { id_ressource },
      data: {
        id_emprunteur: null,
        etat: "DISPONIBLE"
      }
    });

    // 👇 LOG DE L'ACTION
    await createLog(
        "RETOUR MATÉRIEL", 
        `Matériel "${updated.nom_ressource}" a été rendu et est à nouveau disponible.`
    );

    return NextResponse.json(updated);

  } catch (error) {
    return NextResponse.json({ error: "Erreur lors du retour" }, { status: 500 });
  }
}