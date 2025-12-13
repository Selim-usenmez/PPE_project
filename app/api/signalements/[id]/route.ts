import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger";

type Props = {
  params: Promise<{ id: string }>;
};

// PUT : Mettre à jour le signalement (Résoudre ou Maintenance)
export async function PUT(req: Request, { params }: Props) {
  try {
    const { id } = await params; // ID du signalement
    const body = await req.json();
    const { action } = body; // "RESOLUDRE" ou "MAINTENANCE"

    // 1. Récupérer le signalement pour avoir l'ID de la ressource
    const signalement = await prisma.signalement.findUnique({
      where: { id_signalement: id },
      include: { ressource: true }
    });

    if (!signalement) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    if (action === "MAINTENANCE") {
      // Action : On passe la ressource en panne
      await prisma.ressource.update({
        where: { id_ressource: signalement.id_ressource },
        data: { etat: "EN_MAINTENANCE" }
      });
      await createLog("MAINTENANCE", `Ressource ${signalement.ressource.nom_ressource} passée en maintenance suite incident.`);
    } 
    else if (action === "RESOUDRE") {
      // Action : On clôture l'incident + On remet la ressource en disponible
      await prisma.signalement.update({
        where: { id_signalement: id },
        data: { statut: "RESOLU" }
      });
      // Optionnel : remettre la ressource en dispo si elle était en maintenance
      await prisma.ressource.update({
        where: { id_ressource: signalement.id_ressource },
        data: { etat: "DISPONIBLE" }
      });
      await createLog("INCIDENT_RESOLU", `Incident clos pour ${signalement.ressource.nom_ressource}`);
    }

    return NextResponse.json({ message: "Mise à jour effectuée" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}