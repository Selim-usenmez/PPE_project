import { NextResponse } from "next/server";
import { cookies } from "next/headers"; // <-- La méthode moderne Next.js
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Récupérer le cookie proprement via Next.js
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session_user");

    if (!sessionCookie) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    // 2. Décoder le cookie
    const sessionData = JSON.parse(sessionCookie.value);

    // 3. (Sécurité) Vérifier que l'user existe toujours en BDD
    const user = await prisma.employe.findUnique({
      where: { id_employe: sessionData.id },
      select: {
        id_employe: true,
        nom: true,
        prenom: true,
        email: true,
        role: true
        // Pas de mot de passe !
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 401 });
    }

    // 4. Renvoyer les données "à plat" pour le frontend
    return NextResponse.json(user);

  } catch (error) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }
}