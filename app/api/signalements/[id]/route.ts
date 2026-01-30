import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger";

type Props = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, commentaire_tech, message_reponse } = body; // 👈 Récupération des messages

    const signalement = await prisma.signalement.findUnique({
      where: { id_signalement: id },
      include: { ressource: true }
    });

    if (!signalement) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // Données communes à mettre à jour
    const updateData = {
        commentaire_tech: commentaire_tech || null,
        message_reponse: message_reponse || null,
        statut: action === "MAINTENANCE" ? "EN_COURS" : "RESOLU"
    };

    // 1. Mise à jour du Signalement
    await prisma.signalement.update({
        where: { id_signalement: id },
        data: updateData
    });

    // 2. Mise à jour de la Ressource + Logs
    if (action === "MAINTENANCE") {
      await prisma.ressource.update({
        where: { id_ressource: signalement.id_ressource },
        data: { etat: "EN_MAINTENANCE" }
      });
      await createLog("MAINTENANCE", `Maintenance : ${signalement.ressource.nom_ressource}. Note: ${commentaire_tech}`);
    } 
    else if (action === "RESOUDRE") {
      await prisma.ressource.update({
        where: { id_ressource: signalement.id_ressource },
        data: { etat: "DISPONIBLE" }
      });
      await createLog("INCIDENT_RESOLU", `Résolu : ${signalement.ressource.nom_ressource}. Feedback: ${message_reponse}`);
    }

    return NextResponse.json({ message: "Mise à jour effectuée" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}