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
        if (usageCount >= 10) return NextResponse.json({ error: "Le cerveau surchauffe (Quota dépassé ☕)." }, { status: 429 });
    }

    // 2. RÉCUPÉRATION DATA
    const salles = await prisma.salle.findMany();
    const ressources = await prisma.ressource.findMany({ where: { etat: "DISPONIBLE" } });
    
    const participations = await prisma.participationProjet.findMany({
        where: { id_employe: userId }, include: { projet: true }
    });
    const projetsUser = participations.map(p => p.projet);
    
    const taches = await prisma.tache.findMany({
        where: { id_assigne_a: userId, statut: "A_FAIRE" }
    });

    // Indisponibilités
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + 45);
    const conges = await prisma.conge.findMany({
        where: { id_employe: userId, statut: "VALIDE", date_fin: { gte: new Date() } }
    });
    const occupations = await prisma.reservationSalle.findMany({
        where: { 
            date_debut: { gte: new Date(), lte: dateLimite },
            statut: { not: "ANNULEE" },
            id_salle: { not: null }
        },
        select: { date_debut: true, date_fin: true, salle: { select: { nom_salle: true } } }
    });

    // 3. CONTEXTE TEXTUEL
    const contextDate = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    const txtSalles = salles.map(s => 
        `- ${s.nom_salle} (Capacité: ${s.capacite}p, Équipements INCLUS: [${s.equipements || "Aucun"}])`
    ).join("\n");

    const txtRessources = ressources.map(r => r.nom_ressource).join(", ");
    const txtProjets = projetsUser.map(p => p.nom_projet).join(", ");
    const txtTaches = taches.map(t => t.titre).join(", ");
    const txtConges = conges.map(c => `ABSENT du ${new Date(c.date_debut).toLocaleDateString()} au ${new Date(c.date_fin).toLocaleDateString()}`).join("\n");
    const txtOccupations = occupations.map(o => `[PRIS] ${o.salle?.nom_salle} : ${new Date(o.date_debut).toLocaleTimeString()}-${new Date(o.date_fin).toLocaleTimeString()}`).join("\n");

    await prisma.aiLog.create({ data: { id_employe: userId, prompt: objet } });

    // 4. LE SUPER-PROMPT AMÉLIORÉ
    const systemPrompt = `
        Tu es NexusAI.
        DATE : ${contextDate}. Année 2026.

        === INVENTAIRE ===
        SALLES (et ce qu'elles contiennent DÉJÀ) :
        ${txtSalles}

        MATÉRIEL MOBILE (à ajouter SI MANQUANT) :
        [${txtRessources}]

        === CONTEXTE ===
        PROJETS: [${txtProjets}]
        TÂCHES: [${txtTaches}]
        CONGÉS: ${txtConges}
        OCCUPATIONS: ${txtOccupations}

        DEMANDE : "${objet}"

        === LOGIQUE DE DÉCISION STRICTE ===
        1. **CHOIX SALLE** : Trouve une salle libre adaptée à la capacité.
        2. **ANALYSE ÉQUIPEMENT (CRITIQUE)** :
           - L'utilisateur demande-t-il un équipement ? (ex: "écran", "projecteur", "visio").
           - REGARDE la salle choisie : Contient-elle cet équipement dans "Équipements INCLUS" ?
           - CAS A : OUI, elle l'a -> Ne réserve RIEN en matériel mobile.
           - CAS B : NON, elle ne l'a pas -> TU DOIS OBLIGATOIREMENT piocher dans "MATÉRIEL MOBILE" un objet correspondant et le mettre dans 'nom_materiel_exact'.
        3. **PROJET** : Associe au projet le plus pertinent par rapport aux mots clés.

        JSON STRICT :
        {
            "analysis": "Explique pourquoi tu as ajouté (ou non) du matériel mobile.",
            "suggested_title": "Titre",
            "detected_pax": 1,
            "suggested_start": "ISO 8601",
            "suggested_end": "ISO 8601",
            "nom_salle_exact": "Nom précis ou null",
            "nom_materiel_exact": "Nom précis ou null",
            "nom_projet_exact": "Nom précis ou null",
            "error": "Message erreur ou null"
        }
    `;

    // 5. APPEL IA
    const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: objet }]
    });

    const textResponse = msg.content[0].type === 'text' ? msg.content[0].text : "{}";
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    const ai = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

    if (ai.error) return NextResponse.json({ error: ai.error, analysis: ai.analysis });

    // 6. MATCHING ROBUSTE (Flou)
    
    // --- SALLE ---
    let foundRoom = null;
    if (ai.nom_salle_exact) {
        const target = ai.nom_salle_exact.toLowerCase().trim();
        foundRoom = salles.find(s => s.nom_salle.toLowerCase().includes(target) || target.includes(s.nom_salle.toLowerCase()));
    }

    // --- MATÉRIEL (Amélioré) ---
    let foundEquipment = null;
    if (ai.nom_materiel_exact) {
        const target = ai.nom_materiel_exact.toLowerCase().trim();
        foundEquipment = ressources.find(r => {
            const dbName = r.nom_ressource.toLowerCase();
            // Matching plus souple : "Ecran" matche "Ecran Mobile"
            return dbName.includes(target) || target.includes(dbName) || dbName.split(' ').some(w => target.includes(w) && w.length > 3);
        });
    }

    // --- PROJET (Amélioré) ---
    let foundProject = null;
    if (ai.nom_projet_exact) {
        const target = ai.nom_projet_exact.toLowerCase().trim();
        foundProject = projetsUser.find(p => {
            const dbName = p.nom_projet.toLowerCase();
            return dbName.includes(target) || target.includes(dbName) || dbName.split(' ').some(w => target.includes(w) && w.length > 3);
        });
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
    return NextResponse.json({ error: "Erreur IA." }, { status: 500 });
  }
}