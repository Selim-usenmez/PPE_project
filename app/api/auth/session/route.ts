import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Force le non-cache pour être sûr de vérifier la BDD à chaque appel
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Lire le cookie de session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session_user");

    // Si pas de cookie, on est pas connecté
    if (!sessionCookie) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    let sessionData;
    try {
        sessionData = JSON.parse(sessionCookie.value);
    } catch (e) {
        // Cookie corrompu
        return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // 2. VÉRIFICATION EN TEMPS RÉEL (Base de données)
    // C'est ici qu'on vérifie si l'admin a bloqué le compte ou changé les dates
    const user = await prisma.employe.findUnique({
      where: { id_employe: sessionData.id_employe },
      select: {
        id_employe: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        date_debut_validite: true, // 👈 On récupère les dates
        date_fin_validite: true,
        // On ne récupère PAS le mot de passe pour la sécurité
      }
    });

    // Si l'utilisateur a été supprimé de la base
    if (!user) {
      return NextResponse.json({ error: "Compte introuvable" }, { status: 401 });
    }

    // 3. VÉRIFICATION DES DATES
    const now = new Date();

    // Cas 1 : Le compte n'est pas encore actif
    if (user.date_debut_validite && now < user.date_debut_validite) {
        return NextResponse.json({ error: "Votre compte n'est pas encore actif." }, { status: 403 });
    }
    
    // Cas 2 : Le compte a expiré
    if (user.date_fin_validite && now > user.date_fin_validite) {
        return NextResponse.json({ error: "Votre compte a expiré." }, { status: 403 });
    }

    // 4. Tout est bon, on renvoie les infos à jour
    // Cela permet au frontend de mettre à jour le nom/rôle si ça a changé en BDD
    return NextResponse.json(user);

  } catch (error) {
    console.error("Erreur Session Check:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}