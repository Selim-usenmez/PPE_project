import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function createLog(action: string, details: string, auteurForce?: string) {
  try {
    let auteur = "Système / Inconnu";

    // CAS 1 : On force l'auteur (ex: Login échoué, on a juste l'email)
    if (auteurForce) {
        auteur = auteurForce;
    } 
    // CAS 2 : On essaie de deviner via le cookie (Utilisateur connecté)
    else {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session_user");

        if (sessionCookie) {
          try {
            const user = JSON.parse(sessionCookie.value);
            auteur = `${user.prenom || ''} ${user.nom || ''}`.trim();
            if (user.role) auteur += ` (${user.role})`;
          } catch (e) {
            auteur = "Utilisateur (Erreur lecture cookie)";
          }
        }
    }

    await prisma.historiqueAction.create({
      data: {
        action: action.toUpperCase(),
        details,
        auteur
      }
    });

  } catch (error) {
    console.error("❌ Erreur Logger:", error);
  }
}