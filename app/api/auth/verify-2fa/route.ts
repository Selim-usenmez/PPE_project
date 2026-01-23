import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, code, rememberMe } = await req.json(); // 👈 On récupère rememberMe

    // 1. Trouver l'utilisateur
    const user = await prisma.employe.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 2. Vérifier le code et l'expiration
    if (user.twoFactorCode !== code || !user.twoFactorExpires || new Date() > user.twoFactorExpires) {
      return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 401 });
    }

    // 3. NETTOYAGE : On efface le code utilisé
    await prisma.employe.update({
      where: { id_employe: user.id_employe },
      data: { twoFactorCode: null, twoFactorExpires: null }
    });

    // 4. CRÉATION DE LA SESSION (C'est ça qui manquait !)
    const sessionData = {
        id_employe: user.id_employe,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        email: user.email 
    };

    const response = NextResponse.json({ success: true, user: sessionData });

    // Durée du cookie : 30 jours (rememberMe) ou 24h
    const oneDay = 24 * 60 * 60;
    const thirtyDays = 30 * 24 * 60 * 60;
    const duration = rememberMe ? thirtyDays : oneDay;

    // A. Cookie de Session (Indispensable pour naviguer)
    response.cookies.set("session_user", JSON.stringify(sessionData), { 
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        sameSite: "lax",
        maxAge: duration,
        path: "/",
    });

    // B. Cookie "Appareil de Confiance" (Pour ne plus demander le code la prochaine fois)
    // On le met toujours à 30 jours car c'est lié à la machine, pas à la session
    if (process.env.TRUST_DEVICE_SECRET) {
        response.cookies.set(`trusted_device_${user.id_employe}`, process.env.TRUST_DEVICE_SECRET + user.id_employe, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: thirtyDays, 
            path: "/",
        });
    }

    return response;

  } catch (error) {
    console.error("Erreur Verify 2FA:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}