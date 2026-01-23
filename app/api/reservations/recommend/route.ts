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
    const { start, end, objet, userId } = body;

    if (!objet || !userId) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

    // 1. SÉCURITÉ & QUOTAS
    const user = await prisma.employe.findUnique({ where: { id_employe: userId } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 401 });

    if (user.role !== "ADMIN") {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const usageCount = await prisma.aiLog.count({
            where: { id_employe: userId, createdAt: { gte: tenMinutesAgo } }
        });
        if (usageCount >= 2) return NextResponse.json({ error: "Quota dépassé (2 essais / 10min)." }, { status: 429 });
    }

    // 2. RÉCUPÉRATION DATA (Salles + Ressources + PROJETS DU USER)
    const salles = await prisma.salle.findMany();
    const ressources = await prisma.ressource.findMany({ where: { etat: "DISPONIBLE" } });
    
    // On récupère uniquement les projets où l'utilisateur est assigné
    const participations = await prisma.participationProjet.findMany({
        where: { id_employe: userId },
        include: { projet: true }
    });
    const projetsUser = participations.map(p => p.projet);

    // Préparation des listes pour l'IA
    const nomsSalles = salles.map(s => s.nom_salle).join(", ");
    const nomsRessources = ressources.map(r => r.nom_ressource).join(", ");
    const nomsProjets = projetsUser.map(p => p.nom_projet).join(", ");

    const now = new Date();
    const contextDate = now.toLocaleString("fr-FR", { 
        timeZone: "Europe/Paris", weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json(null);

    await prisma.aiLog.create({ data: { id_employe: userId, prompt: objet } });

    // 3. PROMPT AMÉLIORÉ AVEC PROJETS
    const systemPrompt = `
        Tu es un assistant expert en planification.
        DATE ACTUELLE : ${contextDate}. Année 2026 forcée.

        === CONTEXTE ===
        SALLES : [${nomsSalles}]
        MATÉRIEL : [${nomsRessources}]
        PROJETS DE L'UTILISATEUR : [${nomsProjets}]
        ================

        DEMANDE UTILISATEUR : "${objet}"

        INSTRUCTIONS :
        1. Analyse la demande (Dates, Pax).
        2. SALLE : Choisis la salle la plus logique dans la liste.
        3. MATÉRIEL : Choisis l'équipement si demandé (copie exacte du nom).
        4. PROJET : Si l'utilisateur mentionne un projet de sa liste, copie EXACTEMENT son nom. Sinon, laisse null.

        JSON STRICT ATTENDU :
        {
            "analysis": "Justification",
            "suggested_title": "Titre",
            "detected_pax": 2,
            "suggested_start": "ISO",
            "suggested_end": "ISO",
            "nom_salle_exact": "Nom précis ou null",
            "nom_materiel_exact": "Nom précis ou null",
            "nom_projet_exact": "Nom précis ou null"
        }
    `;

    const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: objet }]
    });

    const textResponse = msg.content[0].type === 'text' ? msg.content[0].text : "{}";
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    const ai = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

    // 4. RECHERCHE INTELLIGENTE
    let foundRoom = null;
    if (ai.nom_salle_exact) {
        const target = ai.nom_salle_exact.toLowerCase().trim();
        foundRoom = salles.find(s => {
            const source = s.nom_salle.toLowerCase();
            return source.includes(target) || target.includes(source);
        });
    }

    let foundEquipment = null;
    if (ai.nom_materiel_exact) {
        const target = ai.nom_materiel_exact.toLowerCase().trim();
        foundEquipment = ressources.find(r => {
            const source = r.nom_ressource.toLowerCase();
            return source.includes(target) || target.includes(source);
        });
    }

    let foundProject = null;
    if (ai.nom_projet_exact) {
        const target = ai.nom_projet_exact.toLowerCase().trim();
        foundProject = projetsUser.find(p => {
            const source = p.nom_projet.toLowerCase();
            return source.includes(target) || target.includes(source);
        });
    }

    return NextResponse.json({
        analysis: ai.analysis,
        suggestedTitle: ai.suggested_title,
        pax: ai.detected_pax,
        newDates: (ai.suggested_start && ai.suggested_end) ? { start: ai.suggested_start, end: ai.suggested_end } : null,
        room: foundRoom || null,
        suggestedEquipment: foundEquipment || null,
        suggestedProject: foundProject || null, // 👈 On renvoie le projet trouvé
        criteria: ai.criteria || []
    });

  } catch (error) {
    console.error("Erreur IA:", error);
    return NextResponse.json({ error: "L'assistant intelligent est indisponible." }, { status: 500 });
  }
}