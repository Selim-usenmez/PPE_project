import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';
import { cookies } from "next/headers";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    // 👇 On récupère 'rememberMe'
    const { email, password, rememberMe } = await req.json();

    console.log(`Tentative connexion pour: ${email}`);

    // 1. Récupération User
    const user = await prisma.employe.findUnique({ where: { email } });
    
    // 2. Vérification Mot de passe
    if (!user || !(await bcrypt.compare(password, user.mot_de_passe))) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    // 3. VÉRIFICATION CHANGEMENT OBLIGATOIRE
    if (user.doit_changer_mdp) {
        return NextResponse.json({ 
            requirePasswordChange: true, 
            email: user.email 
        });
    }
    
    // 4. COOKIE DE CONFIANCE (Connexion directe)
    const cookieStore = await cookies();
    const trustCookie = cookieStore.get(`trusted_device_${user.id_employe}`);

    if (trustCookie && trustCookie.value === process.env.TRUST_DEVICE_SECRET + user.id_employe) {
        
        const sessionData = {
            id_employe: user.id_employe,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role,
            email: user.email 
        };

        const response = NextResponse.json({ success: true, ...sessionData });

        // 👇 LOGIQUE 30 JOURS OU 24 HEURES
        const oneDay = 24 * 60 * 60;
        const thirtyDays = 30 * 24 * 60 * 60;
        const duration = rememberMe ? thirtyDays : oneDay;

        response.cookies.set("session_user", JSON.stringify(sessionData), { 
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", 
            sameSite: "lax",
            maxAge: duration, // 👈 Durée dynamique
            path: "/",
        });

        return response;
    }

    // 5. SINON : ENVOI CODE 2FA
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

    return NextResponse.json({ require2fa: true, email: user.email });

  } catch (error) {
    console.error("Erreur Login:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}