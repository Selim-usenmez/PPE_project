import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageEmployees } from "@/lib/permissions";

// --- GET : Lister les employés ---
export async function GET(req: Request) {
  try {
    const employes = await prisma.employe.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id_employe: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        date_debut_validite: true,
        date_fin_validite: true,
        // On ne renvoie JAMAIS le mot de passe !
      }
    });
    return NextResponse.json(employes);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- POST : Créer un employé ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Vérification basique des champs
    if (!body.email || !body.password || !body.nom || !body.prenom) {
        return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    // Vérifier si l'email existe déjà
    const existing = await prisma.employe.findUnique({ where: { email: body.email } });
    if (existing) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
    }

    // Création
    const newEmploye = await prisma.employe.create({
      data: {
        nom: body.nom,
        prenom: body.prenom,
        email: body.email,
        mot_de_passe: body.password, // Pense à hasher ce mot de passe avec bcrypt !
        role: body.role || "DEVELOPPEUR",
        date_debut_validite: body.dateDebut ? new Date(body.dateDebut) : null,
        date_fin_validite: body.dateFin ? new Date(body.dateFin) : null,
      },
    });

    // Log pour l'historique (optionnel)
    await prisma.historiqueAction.create({
        data: {
            action: "CRÉATION_EMPLOYE",
            details: `Création de ${body.prenom} ${body.nom} (${body.role})`,
            auteur: "Admin Système" // Idéalement, récupérer l'ID de l'admin connecté
        }
    });

    return NextResponse.json(newEmploye, { status: 201 });
  } catch (error) {
    console.error("Erreur POST Employé:", error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}

// --- PUT : Modifier un employé ---
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, ...updates } = body;

    if (!id_employe) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    // Préparation des données à mettre à jour
    const dataToUpdate: any = {
        nom: updates.nom,
        prenom: updates.prenom,
        email: updates.email,
        role: updates.role,
        date_debut_validite: updates.dateDebut ? new Date(updates.dateDebut) : null,
        date_fin_validite: updates.dateFin ? new Date(updates.dateFin) : null,
    };

    // On ne met à jour le mot de passe que s'il est fourni
    if (updates.password && updates.password.length > 0) {
        dataToUpdate.mot_de_passe = updates.password;
    }

    const updatedEmploye = await prisma.employe.update({
      where: { id_employe },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedEmploye);
  } catch (error) {
    console.error("Erreur PUT Employé:", error);
    return NextResponse.json({ error: "Erreur modification" }, { status: 500 });
  }
}

// --- DELETE : Supprimer un employé ---
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    // Suppression
    await prisma.employe.delete({
      where: { id_employe: id },
    });

    return NextResponse.json({ message: "Employé supprimé avec succès" });
  } catch (error: any) {
    console.error("Erreur DELETE Employé:", error);
    
    // Gestion spécifique des erreurs Prisma
    if (error.code === 'P2003') {
        return NextResponse.json({ error: "Impossible de supprimer : cet employé est lié à d'autres données (Projets, etc.)" }, { status: 409 });
    }

    return NextResponse.json({ error: "Erreur serveur lors de la suppression" }, { status: 500 });
  }
}