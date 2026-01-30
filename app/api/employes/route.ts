import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';
import { createLog } from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

// --- GET : Lister les employés ---
export async function GET() {
  try {
    const employes = await prisma.employe.findMany({
      orderBy: { nom: 'asc' },
      include: {
        participations: {
          where: { projet: { statut: "EN_COURS" } },
          include: { projet: { select: { nom_projet: true } } }
        }
      }
    });

    const safeEmployes = employes.map(({ mot_de_passe, ...rest }) => rest);
    return NextResponse.json(safeEmployes);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- POST : CRÉATION ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nom, prenom, email, role, dateDebut, dateFin, adminId } = body;

    if (!email || !nom || !prenom) return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

    const exist = await prisma.employe.findUnique({ where: { email } });
    if (exist) return NextResponse.json({ error: "Email déjà pris" }, { status: 400 });

    const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newEmploye = await prisma.employe.create({
      data: {
        nom, prenom, email, 
        mot_de_passe: hashedPassword, 
        role: role || "EMPLOYE",
        doit_changer_mdp: true,
        date_debut_validite: dateDebut ? new Date(dateDebut) : null,
        date_fin_validite: dateFin ? new Date(dateFin) : null,
        couleur_fond: "#" + Math.floor(Math.random()*16777215).toString(16)
      },
    });

    try {
        await resend.emails.send({
            from: 'securite@likeus.dev',
            to: email,
            subject: 'Bienvenue chez PPE - Vos accès',
            html: `<p>Bonjour ${prenom}, mot de passe : <strong>${tempPassword}</strong></p>`
        });
    } catch (e) { console.error(e); }

    // ✅ LOG OK (L'email était déjà là)
    await createLog(
        "CREATION_COMPTE", 
        `Création du compte pour ${prenom} ${nom} (${email})`, 
        adminId 
    );

    const { mot_de_passe, ...safeData } = newEmploye;
    return NextResponse.json({ success: true, employe: safeData }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- PUT : MODIFICATION ---
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id_employe, nom, prenom, email, role, dateDebut, dateFin, adminId } = body;
    
    if (!id_employe) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const updated = await prisma.employe.update({
        where: { id_employe },
        data: {
            nom, prenom, email, role,
            date_debut_validite: dateDebut ? new Date(dateDebut) : null,
            date_fin_validite: dateFin ? new Date(dateFin) : null,
        }
    });

    // 👇 CORRECTION IMPORTANTE ICI : J'ai ajouté "(${email})"
    await createLog(
        "MODIFICATION_COMPTE", 
        `Mise à jour du profil de ${prenom} ${nom} (${email})`, 
        adminId
    );

    const { mot_de_passe, ...safeData } = updated;
    return NextResponse.json(safeData);
  } catch (error) {
    return NextResponse.json({ error: "Erreur modification" }, { status: 500 });
  }
}

// --- DELETE : SUPPRESSION ---
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const adminId = searchParams.get("adminId");

    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const target = await prisma.employe.findUnique({ where: { id_employe: id }});

    await prisma.employe.delete({ where: { id_employe: id } });

    if(target) {
        // 👇 CORRECTION IMPORTANTE ICI : J'ai ajouté "(${target.email})"
        await createLog(
            "SUPPRESSION_COMPTE", 
            `Suppression du compte de ${target.prenom} ${target.nom} (${target.email})`, 
            adminId || undefined
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2003') return NextResponse.json({ error: "Impossible : données liées." }, { status: 409 });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}