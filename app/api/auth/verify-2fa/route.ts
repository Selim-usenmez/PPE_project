import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createLog } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const { email, code, rememberMe } = await req.json();

    const user = await prisma.employe.findUnique({ where: { email } });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // 1. Vérification du Code
    if (user.twoFactorCode !== code || !user.twoFactorExpires || new Date() > user.twoFactorExpires) {
      await createLog("CONNEXION_ECHEC", `Code 2FA invalide ou expiré pour ${email}`, user.id_employe);
      return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 });
    }

    // 2. Nettoyage
    await prisma.employe.update({
      where: { id_employe: user.id_employe },
      data: { twoFactorCode: null, twoFactorExpires: null }
    });

    // 3. Session Data
    const sessionData = {
        id_employe: user.id_employe,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        email: user.email 
    };

    const response = NextResponse.json({ success: true, ...sessionData });
    const cookieStore = await cookies();
    
    // 👇 LA CORRECTION EST ICI : Même secret
    const SECRET = process.env.TRUST_DEVICE_SECRET || "SECRET_PAR_DEFAUT";

    // 4. GESTION DU "SE SOUVENIR DE MOI"
    if (rememberMe) {
        response.cookies.set(`trusted_device_${user.id_employe}`, SECRET, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60, // 30 Jours
            path: "/",
        });
        
        await createLog("CONNEXION_2FA_SUCCESS", "Appareil ajouté aux favoris (30 jours)", user.id_employe);
    } else {
        await createLog("CONNEXION_2FA_SUCCESS", "Connexion temporaire", user.id_employe);
    }

    // 5. Cookie Session
    const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
    response.cookies.set("session_user", JSON.stringify(sessionData), { 
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        sameSite: "lax",
        maxAge: sessionDuration,
        path: "/",
    });

    return response;

  } catch (error) {
    console.error("Erreur Verify 2FA:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}