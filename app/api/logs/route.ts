import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // On récupère les 100 derniers logs
    const logs = await prisma.historiqueAction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100 
    });

    // ✅ Formatter chaque log : convertir les IDs en emails et noms
    const formattedLogs = await Promise.all(
      logs.map(async (log) => {
        let auteur = log.auteur;
        let details = log.details;

        // 1️⃣ Convertir l'auteur s'il ressemble à un ID
        if (!auteur.includes("@") && auteur.length > 15 && !auteur.includes("(")) {
          try {
            const employe = await prisma.employe.findUnique({
              where: { id_employe: auteur }
            });
            if (employe) {
              auteur = employe.email;
            }
          } catch (e) {
            // Garder l'ID si erreur
          }
        }

        // 2️⃣ Convertir les IDs dans les détails
        if (details) {
          // Chercher tous les CUIDs possibles (format: ~20 caractères alphanumériques)
          const idPattern = /[a-z0-9]{15,}/gi;
          const matches = details.match(idPattern) || [];

          for (const id of matches) {
            try {
              // Essayer de trouver un projet
              const projet = await prisma.projet.findUnique({
                where: { id_projet: id }
              });
              if (projet) {
                details = details.replace(
                  new RegExp(id, 'g'),
                  `${projet.nom_projet}`
                );
                continue;
              }

              // Essayer de trouver un employé
              const employe = await prisma.employe.findUnique({
                where: { id_employe: id }
              });
              if (employe) {
                details = details.replace(
                  new RegExp(id, 'g'),
                  `${employe.email}`
                );
                continue;
              }

              // Essayer de trouver une salle
              const salle = await prisma.salle.findUnique({
                where: { id_salle: id }
              });
              if (salle) {
                details = details.replace(
                  new RegExp(id, 'g'),
                  `${salle.nom_salle}`
                );
                continue;
              }

              // Essayer de trouver une ressource
              const ressource = await prisma.ressource.findUnique({
                where: { id_ressource: id }
              });
              if (ressource) {
                details = details.replace(
                  new RegExp(id, 'g'),
                  `${ressource.nom_ressource}`
                );
              }
            } catch (e) {
              // Continuer si erreur
            }
          }
        }

        return {
          ...log,
          auteur,
          details
        };
      })
    );

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error("Erreur logs:", error);
    return NextResponse.json({ error: "Erreur chargement logs" }, { status: 500 });
  }
}