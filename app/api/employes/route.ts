import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';
import { genererMotDePasseFort } from "@/lib/security";

const resend = new Resend(process.env.RESEND_API_KEY);

// --- GET : Lister les employés ---
export async function GET() {
  try {
    const employes = await prisma.employe.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    // On nettoie les objets pour ne jamais renvoyer le hash du mot de passe
    const safeEmployes = employes.map(({ mot_de_passe, ...rest }) => rest);
    
    return NextResponse.json(safeEmployes);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- POST : Créer un employé (Mot de passe auto + Email) ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nom, prenom, email, role, dateDebut, dateFin } = body;

    // 1. Validation basique
    if (!email || !nom || !prenom) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // 2. Vérif email unique
    const exist = await prisma.employe.findUnique({ where: { email } });
    if (exist) return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });

    // 3. Génération MDP sécurisé
    const tempPassword = genererMotDePasseFort(); 
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 4. Création BDD
    const newEmploye = await prisma.employe.create({
      data: {
        nom,
        prenom,
        email,
        mot_de_passe: hashedPassword, 
        role: role || "EMPLOYE",
        doit_changer_mdp: true, //
        date_debut_validite: dateDebut ? new Date(dateDebut) : null,
        date_fin_validite: dateFin ? new Date(dateFin) : null,
      },
    });

    // 5. Envoi Email
    await resend.emails.send({
        from: 'admin@likeus.dev', // Ton domaine Resend validé
        to: email,
        subject: 'Bienvenue - Vos identifiants PPE',
        html: `
            <h3>Bienvenue chez PPE, ${prenom} !</h3>
            <p>Votre compte a été créé.</p>
            <p><strong>Identifiant :</strong> ${email}</p>
            <p><strong>Mot de passe temporaire :</strong></p>
            <p style="font-size: 20px; font-weight: bold; background: #eee; padding: 10px; display: inline-block;">${tempPassword}</p>
            <p>⚠️ Vous devrez changer ce mot de passe dès votre première connexion.</p>
        `
    });

    const { mot_de_passe, ...safeData } = newEmploye;
    return NextResponse.json(safeData, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur création employé" }, { status: 500 });
  }
}

// --- PUT : Modifier un employé (Infos uniquement) ---
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, nom, prenom, email, role, dateDebut, dateFin } = body;

    if (!id_employe) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    // ⚠️ Note importante : On NE met PAS à jour le mot de passe ici.
    // La gestion du mot de passe se fait via le bouton "Réinitialiser" dédié.
    
    const updated = await prisma.employe.update({
        where: { id_employe },
        data: {
            nom,
            prenom,
            email,
            role,
            date_debut_validite: dateDebut ? new Date(dateDebut) : null,
            date_fin_validite: dateFin ? new Date(dateFin) : null,
        }
    });

    const { mot_de_passe, ...safeData } = updated;
    return NextResponse.json(safeData);

  } catch (error) {
    console.error("Erreur PUT:", error);
    return NextResponse.json({ error: "Erreur lors de la modification" }, { status: 500 });
  }
}

// --- DELETE : Supprimer un employé ---
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    await prisma.employe.delete({
      where: { id_employe: id },
    });

    return NextResponse.json({ success: true, message: "Employé supprimé" });
  } catch (error: any) {
    // Erreur de clé étrangère (ex: il a des projets liés)
    if (error.code === 'P2003') {
        return NextResponse.json({ error: "Impossible de supprimer : cet employé est lié à des données importantes." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}