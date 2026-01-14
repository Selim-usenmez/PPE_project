import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1. Récupération de l'utilisateur
    const user = await prisma.employe.findUnique({ where: { email } });
    
    // 2. Vérification Identifiants
    if (!user || !(await bcrypt.compare(password, user.mot_de_passe))) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    // 3. 🚩 VÉRIFICATION PÉRIODE DE VALIDITÉ (Je l'ai remise ici !)
    const now = new Date();

    // Si la date de début est dans le futur
    if (user.date_debut_validite && now < user.date_debut_validite) {
        return NextResponse.json({ 
            error: `Compte inactif. Accès autorisé à partir du ${new Date(user.date_debut_validite).toLocaleDateString()}.` 
        }, { status: 403 });
    }

    // Si la date de fin est passée
    if (user.date_fin_validite && now > user.date_fin_validite) {
        return NextResponse.json({ 
            error: "Votre compte a expiré. Contactez l'administrateur." 
        }, { status: 403 });
    }

    // 4. VÉRIFICATION CHANGEMENT MDP FORCÉ
    // On le fait APRÈS la vérif de date, car inutile de changer le MDP si le compte n'est pas actif
    if (user.doit_changer_mdp) {
        return NextResponse.json({ 
            requirePasswordChange: true, 
            email: user.email 
        });
    }

    // 5. ENVOI DU CODE 2FA (Si tout est OK)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.employe.update({
      where: { id_employe: user.id_employe },
      data: { twoFactorCode: code, twoFactorExpires: expires }
    });

    await resend.emails.send({
      from: 'securite@likeus.dev', // Ton domaine Resend
      to: email,
      subject: 'Code de vérification',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Connexion Sécurisée</h2>
            <p>Bonjour ${user.prenom},</p>
            <p>Voici votre code de vérification à usage unique :</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563EB;">${code}</p>
            <p>Ce code expire dans 10 minutes.</p>
        </div>
      `
    });

    return NextResponse.json({ 
        require2fa: true, 
        email: user.email,
        id_employe: user.id_employe 
    });

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}