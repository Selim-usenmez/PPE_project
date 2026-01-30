import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';
import { Role } from "@prisma/client"; 

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
    }

    const text = await file.text();
    // Nettoyage des lignes vides
    const rows = text.split("\n").map(row => row.trim()).filter(row => row.length > 0);
    
    // On retire l'en-tête si présent
    const dataRows = rows[0].toLowerCase().includes("email") ? rows.slice(1) : rows;

    // 📋 TABLEAU DE RÉSULTATS POUR LE RAPPORT
    const results = [];

    // 🔒 REGEX STRICTE POUR L'EMAIL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const row of dataRows) {
      const cols = row.split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, ''));
      const [nom, prenom, email, roleInput, dateDebut, dateFin] = cols;

      // Identité pour le rapport
      const identity = `${prenom || '?'} ${nom || '?'}`;

      // 1. Vérification des champs obligatoires
      if (!email || !nom || !prenom) {
          results.push({ 
              status: "ERROR", 
              name: identity, 
              email: email || "Inconnu", 
              reason: "Données manquantes (Nom, Prénom ou Email)" 
          });
          continue;
      }

      // 🛑 2. SÉCURITÉ : FORMAT EMAIL
      if (!emailRegex.test(email)) {
          results.push({ 
              status: "ERROR", 
              name: identity, 
              email: email, 
              reason: "Format email invalide" 
          });
          continue;
      }

      // 3. Vérification Doublon
      const exists = await prisma.employe.findUnique({ where: { email } });
      if (exists) {
        results.push({ 
            status: "ERROR", 
            name: identity, 
            email: email, 
            reason: "Email déjà utilisé" 
        });
        continue;
      }

      // 4. Préparation des données (MDP + Rôle)
      const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const inputRoleUpper = roleInput?.toUpperCase();
      const role: Role = Object.values(Role).includes(inputRoleUpper as Role) 
          ? (inputRoleUpper as Role) 
          : Role.EMPLOYE;

      try {
          // 5. Création en base
          await prisma.employe.create({
            data: {
                nom, 
                prenom, 
                email, 
                role,
                mot_de_passe: hashedPassword,
                doit_changer_mdp: true,
                date_debut_validite: dateDebut ? new Date(dateDebut) : null,
                date_fin_validite: dateFin ? new Date(dateFin) : null,
                couleur_fond: "#" + Math.floor(Math.random()*16777215).toString(16)
            }
          });

          // 6. Envoi Email
          await resend.emails.send({
            from: 'securite@likeus.dev',
            to: email,
            subject: 'Bienvenue chez PPE - Vos accès',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #2563EB;">Bienvenue, ${prenom} !</h2>
                    <p>Votre compte a été créé via importation. Voici vos accès :</p>
                    <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="font-weight:bold;">${email}</p>
                        <p style="font-size:20px; font-weight:bold; font-family: monospace;">${tempPassword}</p>
                    </div>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/login">Se connecter</a>
                </div>
            `
          });
          
          // ✅ SUCCÈS : On ajoute au rapport
          results.push({ 
              status: "SUCCESS", 
              name: identity, 
              email: email, 
              reason: "Compte créé + Email envoyé" 
          });

      } catch (err) {
          // ❌ ERREUR TECHNIQUE
          console.error(err);
          results.push({ 
              status: "ERROR", 
              name: identity, 
              email: email, 
              reason: "Erreur technique BDD/Email" 
          });
      }
    }

    // On renvoie le tableau complet des résultats pour le rapport frontend
    return NextResponse.json({ results });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur critique lors de l'import" }, { status: 500 });
  }
}