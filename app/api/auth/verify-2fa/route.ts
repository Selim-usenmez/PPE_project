import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger";


export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    const user = await prisma.employe.findUnique({ where: { email } });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // 1. Vérifier le code
    if (user.twoFactorCode !== code) {
        return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    }

    // 2. Vérifier l'expiration
    if (!user.twoFactorExpires || new Date() > user.twoFactorExpires) {
        return NextResponse.json({ error: "Code expiré" }, { status: 400 });
    }

    // 3. Code OK ! On nettoie la BDD (on supprime le code utilisé)
    await prisma.employe.update({
        where: { id_employe: user.id_employe },
        data: { twoFactorCode: null, twoFactorExpires: null }
    });

   

    const response = NextResponse.json({ 
        message: "Connexion réussie", 
        user: { 
            id: user.id_employe, 
            nom: user.nom, 
            prenom: user.prenom, 
            role: user.role 
        } 
    });

    response.cookies.set("session_user", JSON.stringify({
        id: user.id_employe,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        email: user.email
    }), {
        httpOnly: true,
        
        // 👇 C'EST ICI LE SECRET : IL FAUT secure: false EN LOCAL
        secure: process.env.NODE_ENV === "production", 
        
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 jours
        path: "/", // Important pour que le cookie marche sur tout le site
    });

    await createLog("CONNEXION", `Connexion réussie via 2FA pour ${user.email}`);

    return response;

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    
  }

  
}