import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * Enregistre une action dans l'historique.
 * @param action Nom de l'action (ex: "CONNEXION", "RESERVATION_CREATION")
 * @param details Détails textuels ou objet JSON
 * @param userId (Optionnel) ID de l'employé. Si absent, tente de le lire dans le cookie.
 */
export async function createLog(action: string, details: string | object, userId?: string) {
  try {
    let authorId = userId;

    // Si pas d'ID fourni, on essaie de le trouver dans le cookie de session
    if (!authorId) {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session_user");
        if (sessionCookie) {
            try {
                const user = JSON.parse(sessionCookie.value);
                authorId = user.id_employe;
            } catch (e) {
                // Cookie invalide
            }
        }
    }

    // Si on a toujours pas d'ID, on ne peut pas lier à la table Employe (contrainte FK).
    // On annule le log pour ne pas faire crasher l'appli, ou on loggue juste en console.
    if (!authorId) {
        console.warn(`⚠️ [LOG NON SAUVEGARDÉ] Pas d'ID utilisateur pour l'action : ${action}`);
        return;
    }

    // Formatage des détails
    const detailsString = typeof details === 'object' ? JSON.stringify(details) : details;

    await prisma.historiqueAction.create({
      data: {
        action: action.toUpperCase(),
        details: detailsString,
        auteur: authorId // On stocke l'ID (CUID) pour la relation
      }
    });

    console.log(`📝 [LOG BDD] ${action} | User: ${authorId}`);

  } catch (error) {
    console.error("❌ Erreur Logger:", error);
  }
}