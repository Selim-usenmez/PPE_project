import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';
import { cookies } from "next/headers";
import { createLog } from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, password, rememberMe } = await req.json();

    // 1. Récupération User
    const user = await prisma.employe.findUnique({ where: { email } });
    
    // 2. Vérification Mot de passe
    if (!user || !(await bcrypt.compare(password, user.mot_de_passe))) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    // 🛑 3. SÉCURITÉ CRITIQUE : VÉRIFICATION DES DATES
    const now = new Date();
    
    // Cas A : Compte pas encore actif
    if (user.date_debut_validite && now < user.date_debut_validite) {
        await createLog("CONNEXION_REFUSEE", `Tentative avant date début (${user.date_debut_validite})`, user.id_employe);
        return NextResponse.json({ error: "Votre compte n'est pas encore actif." }, { status: 403 });
    }

    // Cas B : Compte expiré
    if (user.date_fin_validite && now > user.date_fin_validite) {
        await createLog("CONNEXION_REFUSEE", `Tentative après date fin (${user.date_fin_validite})`, user.id_employe);
        return NextResponse.json({ error: "Votre compte a expiré. Contactez l'admin." }, { status: 403 });
    }

    // 4. Changement MDP obligatoire
    if (user.doit_changer_mdp) {
        return NextResponse.json({ requirePasswordChange: true, email: user.email });
    }
    
    // 5. COOKIE DE CONFIANCE (Trusted Device)
    const cookieStore = await cookies();
    const trustCookie = cookieStore.get(`trusted_device_${user.id_employe}`);
    const SECRET = process.env.TRUST_DEVICE_SECRET || "SECRET_PAR_DEFAUT";

    if (trustCookie && trustCookie.value === SECRET) {
        const sessionData = {
            id_employe: user.id_employe,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role,
            email: user.email 
        };

        await createLog("CONNEXION", "Connexion auto (Appareil de confiance)", user.id_employe);

        const response = NextResponse.json({ success: true, ...sessionData });
        const duration = 30 * 24 * 60 * 60; 

        response.cookies.set("session_user", JSON.stringify(sessionData), { 
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", 
            sameSite: "lax",
            maxAge: duration,
            path: "/",
        });

        return response;
    }

    // ============================================================
    // 6. GESTION 2FA (AVEC BACKDOOR POUR LE JURY)
    // ============================================================
    
    let code;
    
    // 👉 SI c'est un compte de test (pour les profs), on force le code 000000
    if (email.endsWith("@nexus.test")) {
        code = "000000";
    } else {
        // 👉 SINON, on génère un vrai code aléatoire
        code = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const expires = new Date(Date.now() + 10 * 60 * 1000); // Valide 10 min

    // On enregistre le code en base (même pour le test, il faut qu'il soit en base pour être validé après)
    await prisma.employe.update({
      where: { id_employe: user.id_employe },
      data: { twoFactorCode: code, twoFactorExpires: expires }
    });

    // 👉 ENVOI DE L'EMAIL (Seulement si ce n'est PAS un test)
    if (!email.endsWith("@nexus.test")) {
        try {
            await resend.emails.send({
                from: 'securite@likeus.dev', 
                to: email,
                subject: 'Code de vérification',
                html: `<p>Votre code de connexion : <strong>${code}</strong></p>`
            });
        } catch (emailError) {
            console.error("Erreur envoi email Resend:", emailError);
            // On ne bloque pas l'erreur ici, l'utilisateur verra l'écran de saisie du code
            // mais ne recevra rien (cas rare en prod, mais géré).
        }
    }

    return NextResponse.json({ require2fa: true, email: user.email });

  } catch (error) {
    console.error("Erreur Login:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}