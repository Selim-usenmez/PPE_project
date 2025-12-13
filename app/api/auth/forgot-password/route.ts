import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // ... (Tes vérifications user, user.email, etc. restent pareilles) ...
    // Je remets juste la partie importante ci-dessous :

    const user = await prisma.employe.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Aucun compte associé." }, { status: 404 });

    // 1. Génération du Token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // +1h

    // 2. Sauvegarde en BDD (IMPORTANT : On utilise create ou update)
    // On nettoie d'abord les vieilles demandes s'il y en a
    await prisma.demandeMdp.deleteMany({ where: { id_employe: user.id_employe } });

    await prisma.demandeMdp.create({
      data: {
        id_employe: user.id_employe,
        token: token,
        expiresAt: expiresAt,
        statut: "EN_ATTENTE"
      }
    });

    // 3. CRÉATION DU LIEN (C'est ici que ça bloquait probablement)
    // 👇 Vérifie bien que tu as "?token=" à la fin
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    console.log("Lien généré :", resetLink); // Ajoute ça pour voir le lien dans ton terminal !

    // 4. Envoi de l'email
    await resend.emails.send({
      from: 'securite@likeus.dev', 
      to: email, 
      subject: 'Réinitialisez votre mot de passe',
      html: `
        <h1>Mot de passe oublié</h1>
        <p>Cliquez sur le bouton ci-dessous :</p>
        <a href="${resetLink}" style="padding: 10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px;">
           Réinitialiser mon mot de passe
        </a>
        <p style="font-size:12px; margin-top:20px;">Ou copiez ce lien : ${resetLink}</p>
      `
    });

    return NextResponse.json({ message: "Email envoyé" });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}