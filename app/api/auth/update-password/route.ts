import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, oldPassword, newPassword } = body;

    console.log("Tentative update MDP pour :", email); // 👇 Log serveur pour débugger

    if (!email || !oldPassword || !newPassword) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const user = await prisma.employe.findUnique({ where: { email } });
    
    if (!user) {
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 1. Vérifier l'ancien mot de passe
    const isValid = await bcrypt.compare(oldPassword, user.mot_de_passe);
    if (!isValid) {
        console.log("Ancien mot de passe incorrect");
        return NextResponse.json({ error: "L'ancien mot de passe est incorrect" }, { status: 401 }); // 401 Unauthorized mais avec message
    }

    // 2. Mettre à jour
    const newHash = await bcrypt.hash(newPassword, 10);
    
    await prisma.employe.update({
        where: { id_employe: user.id_employe },
        data: {
            mot_de_passe: newHash,
            doit_changer_mdp: false
        }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur API Update:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}