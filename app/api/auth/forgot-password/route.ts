import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from 'resend';
import bcrypt from "bcryptjs";
import { createLog } from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const user = await prisma.employe.findUnique({ where: { email } });
    if (!user) {
        // On répond OK même si l'user n'existe pas pour éviter le "user enumeration" (sécurité)
        return NextResponse.json({ message: "Si cet email existe, un mot de passe temporaire a été envoyé." });
    }

    // 1. Générer un mot de passe temporaire (8 caractères alphanumériques)
    const tempPassword = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 100);
    
    // 2. Hacher ce mot de passe
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 3. Mettre à jour l'utilisateur
    // On change son mot de passe et on active l'obligation de le changer
    await prisma.employe.update({
      where: { id_employe: user.id_employe },
      data: {
        mot_de_passe: hashedPassword,
        doit_changer_mdp: true, // 👈 C'est ça qui déclenchera l'étape 3 du Login
        twoFactorCode: null // On nettoie les anciens codes
      }
    });

    // 4. Envoyer l'email
    await resend.emails.send({
      from: 'securite@likeus.dev',
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Réinitialisation demandée</h2>
          <p>Voici votre mot de passe temporaire :</p>
          <p style="font-size: 24px; font-weight: bold; background: #f3f4f6; padding: 10px; display: inline-block; border-radius: 8px;">
            ${tempPassword}
          </p>
          <p>Connectez-vous avec ce mot de passe. Il vous sera demandé de le modifier immédiatement.</p>
        </div>
      `
    });

    // 5. Log
    if (createLog) await createLog("SÉCURITÉ", user.id_employe, "Mot de passe temporaire généré");

    return NextResponse.json({ message: "Mot de passe envoyé !" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}