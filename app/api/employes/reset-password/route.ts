import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';
import { genererMotDePasseFort } from "@/lib/security";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { id_employe } = await req.json();

    if (!id_employe) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    // 1. Récupérer l'employé
    const employe = await prisma.employe.findUnique({ where: { id_employe } });
    if (!employe) return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });

    // 2. Générer nouveau MDP
    const tempPassword = genererMotDePasseFort();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 3. Mise à jour BDD (On force le changement au prochain login)
    await prisma.employe.update({
        where: { id_employe },
        data: {
            mot_de_passe: hashedPassword,
            doit_changer_mdp: true //
        }
    });

    // 4. Envoi Email
    await resend.emails.send({
        from: 'admin@likeus.dev',
        to: employe.email,
        subject: 'Réinitialisation de votre mot de passe - PPE',
        html: `
            <h3>Bonjour ${employe.prenom},</h3>
            <p>L'administrateur a réinitialisé votre mot de passe.</p>
            <p>Voici votre nouveau code temporaire :</p>
            <p style="font-size: 20px; font-weight: bold; background: #eee; padding: 10px;">${tempPassword}</p>
            <p>⚠️ Vous devrez le changer à votre prochaine connexion.</p>
        `
    });

    return NextResponse.json({ success: true, message: "Nouveau mot de passe envoyé par email !" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}