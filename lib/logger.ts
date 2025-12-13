import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function createLog(action: string, details: string) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session_user");

    let auteur = "Système / Inconnu";

    if (sessionCookie) {
      try {
        const user = JSON.parse(sessionCookie.value);
        // On construit un nom lisible : "Jean Dupont (ADMIN)"
        auteur = `${user.prenom || ''} ${user.nom || ''}`.trim();
        if (user.role) auteur += ` (${user.role})`;
      } catch (e) {
        auteur = "Utilisateur (Erreur cookie)";
      }
    }

    await prisma.historiqueAction.create({
      data: {
        action: action.toUpperCase(), // On met en majuscule pour le style (ex: CONNEXION)
        details,
        auteur
      }
    });

  } catch (error) {
    console.error("❌ Erreur Logger:", error);
  }
}