import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createLog } from "@/lib/logger";

export async function POST() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session_user");

  if (session) {
      try {
          const user = JSON.parse(session.value);
          // ✅ AJOUT DU LOG
          // On passe explicitement l'ID pour être sûr
          await createLog("DÉCONNEXION", "Déconnexion manuelle utilisateur", user.id_employe);
      } catch(e) {
          console.error("Erreur lecture session logout", e);
      }
  }

  cookieStore.delete("session_user");
  return NextResponse.json({ success: true });
}