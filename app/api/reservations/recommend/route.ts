import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { objet, userId } = body;

    if (!objet || !userId) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

    // 1. SÉCURITÉ & QUOTAS
    const user = await prisma.employe.findUnique({ where: { id_employe: userId } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 401 });

    if (user.role !== "ADMIN") {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const usageCount = await prisma.aiLog.count({
            where: { id_employe: userId, createdAt: { gte: tenMinutesAgo } }
        });
        if (usageCount >= 5) return NextResponse.json({ error: "Quota dépassé (Pause café ? ☕)." }, { status: 429 });
    }

    // 2. RÉCUPÉRATION DATA CONTEXTUELLE
    
    // A. Salles & Ressources
    const salles = await prisma.salle.findMany();
    const ressources = await prisma.ressource.findMany({ where: { etat: "DISPONIBLE" } });
    
    // B. Projets & Tâches
    const participations = await prisma.participationProjet.findMany({
        where: { id_employe: userId }, include: { projet: true }
    });
    const projetsUser = participations.map(p => p.projet);
    
    const taches = await prisma.tache.findMany({
        where: { id_assigne_a: userId, statut: "A_FAIRE" }
    });

    // C. INDISPONIBILITÉS (Congés + Réservations Salles)
    // On regarde sur les 30 prochains jours pour limiter la charge
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + 30);

    const conges = await prisma.conge.findMany({
        where: { id_employe: userId, statut: "VALIDE", date_fin: { gte: new Date() } }
    });

    // 🔥 LE FIX EST ICI : On récupère l'occupation des salles
    const occupations = await prisma.reservationSalle.findMany({
        where: { 
            date_debut: { gte: new Date(), lte: dateLimite },
            statut: { not: "ANNULEE" },
            id_salle: { not: null }
        },
        select: { date_debut: true, date_fin: true, salle: { select: { nom_salle: true } } }
    });

    // 3. PRÉPARATION DU CONTEXTE TEXTUEL
    const contextDate = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    const txtSalles = salles.map(s => s.nom_salle).join(", ");
    const txtRessources = ressources.map(r => r.nom_ressource).join(", ");
    const txtProjets = projetsUser.map(p => p.nom_projet).join(", ");
    const txtTaches = taches.map(t => t.titre).join(", ");
    
    const txtConges = conges.map(c => `Absent du ${new Date(c.date_debut).toLocaleDateString()} au ${new Date(c.date_fin).toLocaleDateString()}`).join("\n");
    
    // On formatte les occupations pour que l'IA comprenne les créneaux pris
    const txtOccupations = occupations.map(o => 
        `⛔ ${o.salle?.nom_salle} est prise le ${new Date(o.date_debut).toLocaleDateString()} de ${new Date(o.date_debut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} à ${new Date(o.date_fin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
    ).join("\n");

    // Sauvegarde Log
    await prisma.aiLog.create({ data: { id_employe: userId, prompt: objet } });

    // 4. PROMPT SYSTÈME INTELLIGENT (Avec Occupations)
    const systemPrompt = `
        Tu es un assistant expert en planification pour NexusPharm.
        DATE ACTUELLE : ${contextDate}. Année 2026 forcée.

        === LISTES DE RÉFÉRENCE ===
        SALLES EXISTANTES : [${txtSalles}]
        MATÉRIEL DISPO : [${txtRessources}]
        PROJETS DU USER : [${txtProjets}]
        TÂCHES DU USER : [${txtTaches}]
        
        === CONTRAINTES DE TEMPS (IMPORTANT) ===
        TES CONGÉS (INTERDIT DE RÉSERVER) : 
        ${txtConges || "Aucun congé prévu."}

        SALLES DÉJÀ OCCUPÉES (CRÉNEAUX INTERDITS) :
        ${txtOccupations || "Aucune réservation gênante pour l'instant."}
        ==========================

        DEMANDE UTILISATEUR : "${objet}"

        INSTRUCTIONS STRICTES :
        1. Analyse la demande (Dates, Pax, Projet, Tâche).
        2. VÉRIFIE LES CONFLITS :
           - Si l'utilisateur demande une date où il est en congé -> Renvoie "error": "Vous êtes en congé ce jour-là !".
           - Si la salle demandée est listée comme "prise" dans SALLES DÉJÀ OCCUPÉES sur ce créneau -> Trouve un autre créneau libre proche ou une autre salle libre.
        3. SALLE/MATÉRIEL : Trouve le nom exact dans les listes.
        4. TÂCHE : Si c'est pour travailler sur une tâche, utilise son titre.

        JSON STRICT ATTENDU (Sans texte avant/après) :
        {
            "analysis": "Explique ton choix (ex: 'Salle A prise, j'ai mis Salle B')",
            "suggested_title": "Titre",
            "detected_pax": 1,
            "suggested_start": "ISO 8601 (YYYY-MM-DDTHH:mm:00)",
            "suggested_end": "ISO 8601",
            "nom_salle_exact": "Nom précis ou null",
            "nom_materiel_exact": "Nom précis ou null",
            "nom_projet_exact": "Nom précis ou null",
            "error": "Message d'erreur bloquant (congé) ou null"
        }
    `;

    // 5. APPEL CLAUDE (ANTHROPIC)
    const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: objet }]
    });

    const textResponse = msg.content[0].type === 'text' ? msg.content[0].text : "{}";
    
    // Nettoyage JSON
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    const ai = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

    if (ai.error) {
        return NextResponse.json({ error: ai.error, analysis: ai.analysis });
    }

    // 6. MATCHING INTELLIGENT
    let foundRoom = null;
    if (ai.nom_salle_exact) {
        const target = ai.nom_salle_exact.toLowerCase().trim();
        foundRoom = salles.find(s => s.nom_salle.toLowerCase().includes(target));
    }

    let foundEquipment = null;
    if (ai.nom_materiel_exact) {
        const target = ai.nom_materiel_exact.toLowerCase().trim();
        foundEquipment = ressources.find(r => r.nom_ressource.toLowerCase().includes(target));
    }

    let foundProject = null;
    if (ai.nom_projet_exact) {
        const target = ai.nom_projet_exact.toLowerCase().trim();
        foundProject = projetsUser.find(p => p.nom_projet.toLowerCase().includes(target));
    }

    return NextResponse.json({
        analysis: ai.analysis,
        suggestedTitle: ai.suggested_title,
        pax: ai.detected_pax,
        newDates: (ai.suggested_start && ai.suggested_end) ? { start: ai.suggested_start, end: ai.suggested_end } : null,
        room: foundRoom || null,
        suggestedEquipment: foundEquipment || null,
        suggestedProject: foundProject || null
    });

  } catch (error) {
    console.error("Erreur IA:", error);
    return NextResponse.json({ error: "L'assistant réfléchit trop fort... Réessayez." }, { status: 500 });
  }
}