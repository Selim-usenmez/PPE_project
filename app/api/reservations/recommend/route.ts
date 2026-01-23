import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    // 👇 ON RÉCUPÈRE L'ID EMPLOYE MAINTENANT
    const { start, end, objet, userId } = await req.json();

    if (!objet || !userId) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

    // 1. VÉRIFICATION DES QUOTAS (SÉCURITÉ SERVEUR)
    const user = await prisma.employe.findUnique({ where: { id_employe: userId } });
    
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 401 });

    // Si pas Admin, on vérifie la limite
    if (user.role !== "ADMIN") {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        
        const usageCount = await prisma.aiLog.count({
            where: {
                id_employe: userId,
                createdAt: { gte: tenMinutesAgo } // Logs datant de moins de 10min
            }
        });

        if (usageCount >= 2) {
            return NextResponse.json(
                { error: "Quota dépassé (2 essais / 10min). Attendez un peu." }, 
                { status: 429 } // Code HTTP "Too Many Requests"
            );
        }
    }

    // 2. RÉCUPÉRATION DATA
    const salles = await prisma.salle.findMany();
    const ressources = await prisma.ressource.findMany({ where: { etat: "DISPONIBLE" } });
    const now = new Date();
    const contextDate = now.toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json(null);

    // 3. APPEL CLAUDE
    const systemPrompt = `
        Tu es un assistant de planification. Date: ${contextDate}.
        SALLES: ${JSON.stringify(salles.map(s => ({ id: s.id_salle, nom: s.nom_salle, cap: s.capacite, equip: s.equipements })))}
        MATÉRIEL: ${JSON.stringify(ressources.map(r => ({ id: r.id_ressource, nom: r.nom_ressource })))}
        DEMANDE: "${objet}"
        
        RÈGLES:
        1. Extrais dates (null si absent).
        2. Estime nb personnes.
        3. Choisis salle + matériel.
        
        JSON STRICT:
        {"analysis": "...", "detected_pax": int/null, "suggested_start": "ISO"/null, "suggested_end": "ISO"/null, "id_salle": "ID"/null, "id_materiel": "ID"/null, "criteria": []}
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

    // 4. LOGUER L'UTILISATION (C'est ici qu'on sauvegarde)
    await prisma.aiLog.create({
        data: {
            id_employe: userId,
            prompt: objet // On garde une trace de ce qu'il a demandé
        }
    });

    const room = salles.find(s => s.id_salle === ai.id_salle);
    const equipment = ressources.find(r => r.id_ressource === ai.id_materiel);

    return NextResponse.json({
        analysis: ai.analysis,
        pax: ai.detected_pax,
        newDates: (ai.suggested_start && ai.suggested_end) ? { start: ai.suggested_start, end: ai.suggested_end } : null,
        room: room || null,
        suggestedEquipment: equipment || null,
        criteria: ai.criteria || []
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}