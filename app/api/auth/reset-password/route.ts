import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createLog } from "@/lib/logger";
import { validatePassword } from "@/lib/security"; // On importe notre validateur

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

    // 1. VÉRIFICATION SÉCURITÉ MOT DE PASSE
    const errorMsg = validatePassword(password);
    if (errorMsg) {
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // 2. Vérification du token
    const demande = await prisma.demandeMdp.findUnique({
      where: { token },
      include: { employe: true }
    });

    if (!demande) {
      return NextResponse.json({ error: "Lien invalide ou déjà utilisé." }, { status: 400 });
    }

    if (demande.expiresAt && new Date() > demande.expiresAt) {
      return NextResponse.json({ error: "Ce lien a expiré. Veuillez refaire une demande." }, { status: 400 });
    }

    // 3. Hachage et Mise à jour
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.employe.update({
      where: { id_employe: demande.id_employe },
      data: { mot_de_passe: hashedPassword }
    });

    // 4. Suppression de la demande (Token à usage unique)
    await prisma.demandeMdp.delete({
      where: { id_demande: demande.id_demande }
    });

    // 5. Log Admin
    await createLog(
      "MODIFICATION_MDP", 
      `L'employé ${demande.employe.nom} a défini un nouveau mot de passe sécurisé.`
    );

    return NextResponse.json({ message: "Succès" });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}