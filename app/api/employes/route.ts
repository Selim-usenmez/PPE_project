import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// --- GET : Lister les employés ---
export async function GET() {
  try {
    const employes = await prisma.employe.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // On retire le hash du mot de passe
    const safeEmployes = employes.map(({ mot_de_passe, ...rest }) => rest);
    return NextResponse.json(safeEmployes);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- POST : CRÉATION + ENVOI AUTOMATIQUE EMAIL ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nom, prenom, email, role, dateDebut, dateFin } = body;

    // 1. Validation
    if (!email || !nom || !prenom) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // 2. Vérif email unique
    const exist = await prisma.employe.findUnique({ where: { email } });
    if (exist) return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });

    // 3. GÉNÉRATION MDP "SAFE" 🔒
    // On évite les caractères spéciaux complexes qui cassent dans les emails HTML
    // On génère 8 caractères alphanumériques + "Aa1!" pour garantir la complexité (Majuscule, Min, Chiffre, Spécial)
    const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";
    
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 4. Création BDD
    const newEmploye = await prisma.employe.create({
      data: {
        nom,
        prenom,
        email,
        mot_de_passe: hashedPassword, 
        role: role || "EMPLOYE",
        doit_changer_mdp: true, // 👈 OBLIGATOIRE pour la première connexion
        date_debut_validite: dateDebut ? new Date(dateDebut) : null,
        date_fin_validite: dateFin ? new Date(dateFin) : null,
        couleur_fond: "#" + Math.floor(Math.random()*16777215).toString(16)
      },
    });

    // 5. ENVOI EMAIL 📧
    try {
        await resend.emails.send({
            from: 'securite@likeus.dev', // Vérifie que ce domaine est bon sur Resend
            to: email,
            subject: 'Bienvenue chez PPE - Vos accès',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #2563EB;">Bienvenue, ${prenom} !</h2>
                    <p>Votre compte a été créé. Voici vos accès temporaires :</p>
                    
                    <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin:0; font-size:12px; color:#666;">Identifiant :</p>
                        <p style="margin:0 0 10px 0; font-weight:bold;">${email}</p>
                        
                        <p style="margin:0; font-size:12px; color:#666;">Mot de passe temporaire :</p>
                        <p style="margin:0; font-size:20px; font-weight:bold; font-family: monospace; letter-spacing: 1px;">${tempPassword}</p>
                    </div>

                    <p>⚠️ Vous devrez changer ce mot de passe dès votre connexion.</p>
                    
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display:inline-block; background:#2563EB; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">Se connecter</a>
                </div>
            `
        });
    } catch (emailError) {
        console.error("Erreur envoi email:", emailError);
    }

    const { mot_de_passe, ...safeData } = newEmploye;
    return NextResponse.json({ 
        success: true, 
        message: "Compte créé et email envoyé !", 
        employe: safeData 
    }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur création employé" }, { status: 500 });
  }
}

// --- PUT : Modifier ---
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, nom, prenom, email, role, dateDebut, dateFin } = body;
    if (!id_employe) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const updated = await prisma.employe.update({
        where: { id_employe },
        data: {
            nom, prenom, email, role,
            date_debut_validite: dateDebut ? new Date(dateDebut) : null,
            date_fin_validite: dateFin ? new Date(dateFin) : null,
        }
    });
    const { mot_de_passe, ...safeData } = updated;
    return NextResponse.json(safeData);
  } catch (error) {
    return NextResponse.json({ error: "Erreur modification" }, { status: 500 });
  }
}

// --- DELETE : Supprimer ---
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    await prisma.employe.delete({ where: { id_employe: id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2003') return NextResponse.json({ error: "Impossible de supprimer (lié à des données)." }, { status: 409 });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}