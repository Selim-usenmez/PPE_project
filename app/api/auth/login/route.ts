import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';
import { cookies } from "next/headers";
import { createLog } from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, password, rememberMe } = await req.json(); // rememberMe est reçu ici

    // 1. Récupération User
    const user = await prisma.employe.findUnique({ where: { email } });
    
    // 2. Vérification Mot de passe
    if (!user || !(await bcrypt.compare(password, user.mot_de_passe))) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    if (user.doit_changer_mdp) {
        return NextResponse.json({ requirePasswordChange: true, email: user.email });
    }
    
    // 3. VÉRIFICATION DU COOKIE DE CONFIANCE (La magie opère ici)
    const cookieStore = await cookies();
    const trustCookie = cookieStore.get(`trusted_device_${user.id_employe}`);

    // Si le cookie existe ET qu'il est valide
    if (trustCookie && trustCookie.value === process.env.TRUST_DEVICE_SECRET) {
        
        const sessionData = {
            id_employe: user.id_employe,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role,
            email: user.email 
        };

        await createLog("CONNEXION", "Connexion automatique (Appareil de confiance)", user.id_employe);

        const response = NextResponse.json({ success: true, ...sessionData });

        // Durée de la session (30 jours si coché, sinon 24h)
        const duration = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

        response.cookies.set("session_user", JSON.stringify(sessionData), { 
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", 
            sameSite: "lax",
            maxAge: duration,
            path: "/",
        });

        return response;
    }

    // 4. SINON : ON DÉCLENCHE LE 2FA
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.employe.update({
      where: { id_employe: user.id_employe },
      data: { twoFactorCode: code, twoFactorExpires: expires }
    });

    await resend.emails.send({
      from: 'securite@likeus.dev', 
      to: email,
      subject: 'Code de vérification',
      html: `<p>Votre code de connexion : <strong>${code}</strong></p>`
    });

    // IMPORTANT : On renvoie l'info au front pour qu'il sache qu'il faudra traiter le rememberMe après
    return NextResponse.json({ require2fa: true, email: user.email });

  } catch (error) {
    console.error("Erreur Login:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}