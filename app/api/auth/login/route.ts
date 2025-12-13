import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) return NextResponse.json({ error: "Champs requis" }, { status: 400 });

    const user = await prisma.employe.findUnique({ where: { email } });
    
    // Vérification mot de passe
    if (!user || !(await bcrypt.compare(password, user.mot_de_passe))) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    // 👇 --- NOUVEAU : VÉRIFICATION PÉRIODE DE VALIDITÉ ---
    const now = new Date();

    // 1. Si une date de début existe et qu'on est AVANT
    if (user.date_debut_validite && now < user.date_debut_validite) {
        return NextResponse.json({ 
            error: `Votre compte ne sera actif qu'à partir du ${new Date(user.date_debut_validite).toLocaleDateString()}.` 
        }, { status: 403 });
    }

    // 2. Si une date de fin existe et qu'on est APRÈS
    if (user.date_fin_validite && now > user.date_fin_validite) {
        return NextResponse.json({ 
            error: "Votre compte a expiré. Contactez l'administrateur." 
        }, { status: 403 });
    }

    // --- DÉBUT 2FA ---
    
    // 1. Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Valide 10 minutes

    // 2. Sauvegarder dans la BDD
    await prisma.employe.update({
        where: { id_employe: user.id_employe },
        data: { 
            twoFactorCode: code,
            twoFactorExpires: expiresAt
        }
    });

    // 3. Envoyer l'email
    await resend.emails.send({
        from: 'securite@likeus.dev',
        to: email,
        subject: 'Votre code de connexion - PPE',
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

    // 4. Dire au Frontend : "C'est bon, mais demande le code maintenant"
    return NextResponse.json({ 
        require2fa: true, 
        email: user.email // On renvoie l'email pour que le frontend sache qui vérifier
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}