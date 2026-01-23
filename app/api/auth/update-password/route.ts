import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createLog } from "@/lib/logger"; 

export async function POST(req: Request) {
  try {
    const { email, oldPassword, newPassword } = await req.json();

    // 1. Trouver l'utilisateur
    const user = await prisma.employe.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // 2. Vérifier l'ANCIEN mot de passe (le temporaire ou l'ancien)
    const isMatch = await bcrypt.compare(oldPassword, user.mot_de_passe);
    if (!isMatch) {
      return NextResponse.json({ error: "Le mot de passe actuel/temporaire est incorrect." }, { status: 400 });
    }

    // 3. Hasher le NOUVEAU mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. MISE À JOUR CRITIQUE ⚡️
    // On change le mot de passe ET on désactive l'obligation de changement
    await prisma.employe.update({
      where: { id_employe: user.id_employe },
      data: { 
        mot_de_passe: hashedPassword,
        doit_changer_mdp: false, // 👈 C'est ICI que ça se joue !
        twoFactorCode: null      // On nettoie les codes 2FA par sécurité
      }
    });

    // 5. Log de sécurité
    if (createLog) {
        await createLog("SÉCURITÉ", user.id_employe, "Mot de passe changé (Procédure obligatoire)");
    }

    return NextResponse.json({ success: true, message: "Mot de passe mis à jour avec succès." });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}