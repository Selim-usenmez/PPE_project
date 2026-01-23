import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function createLog(action: string, details: string, auteurForce?: string) {
  try {
    let auteur = "Système / Inconnu";

    // CAS 1 : On force l'auteur
    if (auteurForce) {
        // ✅ Vérifier si c'est un ID (CUID) ou un email
        if (auteurForce.includes("@")) {
          // C'est déjà un email
          auteur = auteurForce;
        } else {
          // C'est probablement un ID, aller chercher l'email en base
          try {
            const employe = await prisma.employe.findUnique({
              where: { id_employe: auteurForce }
            });
            if (employe) {
              auteur = employe.email;
            } else {
              auteur = auteurForce; // Fallback à l'ID si pas trouvé
            }
          } catch (e) {
            auteur = auteurForce;
          }
        }
    } 
    // CAS 2 : On essaie de deviner via le cookie (Utilisateur connecté)
    else {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session_user");

        if (sessionCookie) {
          try {
            const user = JSON.parse(sessionCookie.value);
            
            if (user.id_employe) {
              const employe = await prisma.employe.findUnique({
                where: { id_employe: user.id_employe }
              });
              
              if (employe) {
                auteur = employe.email;
              }
            } 
            else if (user.email) {
              auteur = user.email;
            }
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