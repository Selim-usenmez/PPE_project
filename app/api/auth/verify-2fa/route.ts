import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger"; // Gardons cette ligne si elle est nécessaire pour votre projet

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    const user = await prisma.employe.findUnique({ where: { email } });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // 1. Vérifier le code
    if (user.twoFactorCode !== code) {
        return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    }

    // 2. Vérifier l'expiration (Ajout de la vérification de non-nullité pour TypeScript)
    if (!user.twoFactorExpires || new Date() > user.twoFactorExpires) {
        return NextResponse.json({ error: "Code expiré" }, { status: 400 });
    }

    // 3. Code OK ! On nettoie la BDD (on supprime le code utilisé)
    await prisma.employe.update({
        where: { id_employe: user.id_employe },
        data: { twoFactorCode: null, twoFactorExpires: null }
    });

    // 4. PRÉPARER L'OBJET UTILISATEUR COMPLET pour le Frontend et le Cookie
    const userDataToSend = {
        id_employe: user.id_employe, // CORRECTION : Utiliser le nom de clé attendu par le Frontend
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        email: user.email // Ajout de l'email pour être complet
    };

    // 5. Création de la réponse (pour le Frontend)
    const response = NextResponse.json({ 
        message: "Connexion réussie", 
        // CORRECTION MAJEURE : On envoie l'objet utilisateur directement à la racine de la réponse
        ...userDataToSend
    });

    // 6. Création du cookie (pour la sécurité côté serveur)
    response.cookies.set("session_user", JSON.stringify(userDataToSend), { // Utiliser l'objet complet
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 jours
        path: "/",
    });

    if (createLog) { // Seulement si la fonction est importée et nécessaire
        await createLog("CONNEXION", `Connexion réussie via 2FA pour ${user.email}`);
    }
    
    return response;

  } catch (error) {
    console.error("Erreur 2FA:", error); // Afficher l'erreur serveur
    return NextResponse.json({ error: "Erreur serveur lors de la connexion" }, { status: 500 });
    
  }
}