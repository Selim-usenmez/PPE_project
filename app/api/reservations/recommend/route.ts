import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { start, end, objet } = await req.json();

    if (!objet) return NextResponse.json(null);

    // 1. DATA CONTEXT
    const salles = await prisma.salle.findMany();
    // On récupère SEULEMENT le matériel libre
    const ressources = await prisma.ressource.findMany({ where: { etat: "DISPONIBLE" } });
    
    const now = new Date();
    const contextDate = now.toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json(null);

    // 2. PROMPT EXPERT (Focus Matériel)
    const systemPrompt = `
        Tu es un assistant de planification intelligent.
        Nous sommes le : ${contextDate}.
        
        SALLES DISPO (JSON): ${JSON.stringify(salles.map(s => ({ id: s.id_salle, nom: s.nom_salle, cap: s.capacite, equip: s.equipements })))}
        MATÉRIEL DISPO (JSON): ${JSON.stringify(ressources.map(r => ({ id: r.id_ressource, nom: r.nom_ressource, type: r.type })))}

        DEMANDE UTILISATEUR : "${objet}"

        RÈGLES DE DÉCISION :
        1. DATES : Extrais les dates si mentionnées.
        2. CAPACITÉ : Déduis le nombre de personnes.
        3. SALLE : Choisis la salle la plus adaptée.
        4. MATÉRIEL (PRIORITAIRE) : 
           - Si l'utilisateur demande EXPLICITEMENT un objet (ex: "besoin d'une voiture", "il me faut un mac", "avec projecteur"), cherche l'ID correspondant dans la liste MATÉRIEL DISPO.
           - Si l'utilisateur ne demande rien, mais que la salle choisie manque d'équipement vital pour le motif (ex: visio sans écran), propose le matériel adéquat.
           - Si rien de tout ça, renvoie null.

        RÉPONSE JSON STRICT :
        {
            "analysis": "Analyse du besoin (mentionne si matériel détecté)",
            "detected_pax": "Nombre estimé (entier) ou null",
            "suggested_start": "ISO_DATE ou null",
            "suggested_end": "ISO_DATE ou null",
            "id_salle": "ID ou null",
            "id_materiel": "ID ou null",
            "criteria": ["Critère 1", "Critère 2"]
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
    return NextResponse.json(null);
  }
}