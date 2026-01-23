import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';
import { cookies } from "next/headers";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    console.log(`Tentative connexion pour: ${email}`); // Log pour débug

    // 1. Récupération User
    const user = await prisma.employe.findUnique({ where: { email } });
    
    // 2. Vérification Mot de passe
    if (!user || !(await bcrypt.compare(password, user.mot_de_passe))) {
      console.log("❌ Échec : Mot de passe incorrect ou user inconnu");
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    // 🔴 3. VÉRIFICATION CHANGEMENT OBLIGATOIRE (Le point critique)
    if (user.doit_changer_mdp) {
        console.log("⚠️ Changement de MDP requis -> Redirection Step 3");
        return NextResponse.json({ 
            requirePasswordChange: true, 
            email: user.email 
        });
    }

    // (Vérifications dates validité ici si nécessaire...)
    
    // 4. COOKIE DE CONFIANCE (Connexion directe sans code)
    const cookieStore = await cookies();
    const trustCookie = cookieStore.get(`trusted_device_${user.id_employe}`);

    if (trustCookie && trustCookie.value === process.env.TRUST_DEVICE_SECRET + user.id_employe) {
        console.log("✅ Device de confiance reconnu -> Connexion directe");
        
        const sessionData = {
            id_employe: user.id_employe,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role,
            email: user.email 
        };

        const response = NextResponse.json({ success: true, ...sessionData });

        response.cookies.set("session_user", JSON.stringify(sessionData), { 
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", 
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24h
            path: "/",
        });

        return response;
    }

    // 5. SINON : ENVOI CODE 2FA
    console.log("🔒 Envoi Code 2FA requis");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

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