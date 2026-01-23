import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const { email, code, rememberMe } = await req.json();

    const user = await prisma.employe.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // Vérification du code...
    if (user.twoFactorCode !== code || !user.twoFactorExpires || new Date() > user.twoFactorExpires) {
        return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 });
    }

    // Nettoyage code
    await prisma.employe.update({
        where: { id_employe: user.id_employe },
        data: { twoFactorCode: null, twoFactorExpires: null }
    });

    const userDataToSend = {
        id_employe: user.id_employe,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        email: user.email 
    };

    const response = NextResponse.json({ message: "Connexion réussie", ...userDataToSend });

    // 1. Cookie de Session (Classique)
    response.cookies.set("session_user", JSON.stringify(userDataToSend), { 
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // Session active 24h
        path: "/",
    });

    // 2. ⚡️ SI "SE SOUVENIR DE MOI" : CRÉATION DU COOKIE DE CONFIANCE (30 JOURS) ⚡️
    if (rememberMe) {
        response.cookies.set(`trusted_device_${user.id_employe}`, process.env.TRUST_DEVICE_SECRET + user.id_employe, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 jours
            path: "/",
        });
    }

    if (createLog) await createLog("CONNEXION", user.id_employe, "Connexion 2FA réussie");
    
    return response;

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}