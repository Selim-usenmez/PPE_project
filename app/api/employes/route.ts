import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET : Récupérer la liste des employés
export async function GET() {
  try {
    const employes = await prisma.employe.findMany({
      orderBy: { nom: 'asc' },
      // On exclut le mot de passe de la réponse pour la sécurité
      select: {
        id_employe: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        date_debut_validite: true,
        date_fin_validite: true,
        // Pas de mot_de_passe ici !
      }
    });
    return NextResponse.json(employes);
  } catch (error) {
    return NextResponse.json({ error: "Erreur chargement employés" }, { status: 500 });
  }
}

// POST : Créer un nouvel employé (AVEC HACHAGE)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nom, prenom, email, role, password, dateDebut, dateFin } = body;

    // Vérification basique
    if (!email || !password || !nom || !prenom) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // Vérifier si l'email existe déjà
    const existing = await prisma.employe.findUnique({ where: { email } });
    if (existing) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    // 🔒 HACHAGE DU MOT DE PASSE
    const hashedPassword = await bcrypt.hash(password, 10);

    const newEmploye = await prisma.employe.create({
      data: {
        nom,
        prenom,
        email,
        role: role || "DEVELOPPEUR",
        mot_de_passe: hashedPassword, // 👈 On stocke le hash crypté
        date_debut_validite: dateDebut ? new Date(dateDebut) : null,
        date_fin_validite: dateFin ? new Date(dateFin) : null
      }
    });

    return NextResponse.json(newEmploye);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}

// PUT : Modifier un employé
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, nom, prenom, email, role, password, dateDebut, dateFin } = body;

    if (!id_employe) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    // On prépare l'objet de mise à jour
    const dataToUpdate: any = {
      nom, 
      prenom, 
      email, 
      role,
      date_debut_validite: dateDebut ? new Date(dateDebut) : null,
      date_fin_validite: dateFin ? new Date(dateFin) : null
    };

    // 🔒 Si un mot de passe est fourni (non vide), on le hache et on l'ajoute
    // Sinon, on ne touche pas à l'ancien mot de passe
    if (password && password.trim() !== "") {
        dataToUpdate.mot_de_passe = await bcrypt.hash(password, 10);
    }

    const updatedEmploye = await prisma.employe.update({
      where: { id_employe },
      data: dataToUpdate
    });

    return NextResponse.json(updatedEmploye);
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la modification" }, { status: 500 });
  }
}

// DELETE : Supprimer un employé
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    await prisma.employe.delete({
      where: { id_employe: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Erreur fréquente : impossible de supprimer si l'employé est lié à des projets/réservations
    return NextResponse.json({ error: "Impossible de supprimer (lié à des données)" }, { status: 500 });
  }
}