import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Récupérer les 50 dernières actions classiques
    const actions = await prisma.historiqueAction.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { employe: { select: { nom: true, prenom: true, role: true } } }
    });

    // 2. Récupérer les 50 derniers usages de l'IA
    const aiLogs = await prisma.aiLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { employe: { select: { nom: true, prenom: true, role: true } } }
    });

    // 3. Récupérer les 20 dernières réservations créées
    const reservations = await prisma.reservationSalle.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { 
        employe: { select: { nom: true, prenom: true, role: true } },
        salle: { select: { nom_salle: true } },
        ressource: { select: { nom_ressource: true } }
      }
    });

    // 4. TOUT FUSIONNER ET UNIFORMISER
    const formattedActions = actions.map(a => ({
      id: a.id_action,
      type: "ACTION",
      message: `${a.action} - ${a.details || ""}`,
      user: `${a.employe?.prenom} ${a.employe?.nom}`,
      role: a.employe?.role,
      date: a.createdAt
    }));

    const formattedAi = aiLogs.map(a => ({
      id: a.id,
      type: "IA",
      message: `🤖 Demande IA : "${a.prompt?.substring(0, 50)}..."`,
      user: `${a.employe?.prenom} ${a.employe?.nom}`,
      role: a.employe?.role,
      date: a.createdAt
    }));

    const formattedResa = reservations.map(r => {
      const lieu = r.salle?.nom_salle || r.ressource?.nom_ressource || "Lieu inconnu";
      return {
        id: r.id_reservation,
        type: "RESERVATION",
        message: `📅 Réservation : ${r.objet} (${lieu})`,
        user: `${r.employe?.prenom} ${r.employe?.nom}`,
        role: r.employe?.role,
        date: r.createdAt
      };
    });

    // 5. Fusionner et Trier par date décroissante (Le plus récent en haut)
    const globalHistory = [...formattedActions, ...formattedAi, ...formattedResa]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50); // On garde les 50 derniers événements globaux

    return NextResponse.json(globalHistory);

  } catch (error) {
    console.error("Erreur historique:", error);
    return NextResponse.json({ error: "Erreur chargement historique" }, { status: 500 });
  }
}