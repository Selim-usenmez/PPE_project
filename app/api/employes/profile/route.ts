import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, type, nom, prenom, email, currentPassword, newPassword } = body;

    // 1. Récupérer l'user pour vérifier qu'il existe
    const user = await prisma.employe.findUnique({ where: { id_employe: id } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // --- CAS 1 : MISE À JOUR INFOS (Nom, Prénom UNIQUEMENT) ---
    if (type === "info") {
        // 👇 ICI : On ne met PAS 'email' dans data. On touche seulement au nom et prénom.
        const updatedUser = await prisma.employe.update({
            where: { id_employe: id },
            data: { 
                nom: nom,
                prenom: prenom
                // ❌ J'ai supprimé la ligne "email" ici. Comme ça, la BDD ne vérifie pas l'unicité.
            }
        });

        return NextResponse.json({ 
            message: "Profil mis à jour !", 
            user: updatedUser 
        });
    }

    // --- CAS 2 : MISE À JOUR MOT DE PASSE ---
    if (type === "password") {
        // Vérifier l'ancien mot de passe
        const isMatch = await bcrypt.compare(currentPassword, user.mot_de_passe);
        if (!isMatch) {
            return NextResponse.json({ error: "Le mot de passe actuel est incorrect." }, { status: 400 });
        }

        // Hasher le nouveau
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.employe.update({
            where: { id_employe: id },
            data: { mot_de_passe: hashedPassword }
        });

        return NextResponse.json({ message: "Mot de passe modifié avec succès !" });
    }

    return NextResponse.json({ error: "Type de modification inconnu" }, { status: 400 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}