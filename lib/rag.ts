import { prisma } from "@/lib/prisma";

export async function getContextData(userId: string) {
  
  // 1. Récupérer l'utilisateur
  const user = await prisma.employe.findUnique({
    where: { id_employe: userId },
    select: { id_employe: true, nom: true, prenom: true, role: true, email: true }
  });

  if (!user) return null;

  // 2. Récupérer ses réservations (Futures)
  const reservations = await prisma.reservationSalle.findMany({
    where: { 
        id_employe: userId, 
        date_debut: { gte: new Date() } 
    },
    include: { salle: true, ressource: true },
    take: 5
  });

  // 3. Récupérer ses tâches (À faire)
  const taches = await prisma.tache.findMany({
      where: { id_assigne_a: userId, statut: "A_FAIRE" },
      take: 5
  });

  // 4. Récupérer ses congés (Futurs)
  const congés = await prisma.conge.findMany({
      where: { id_employe: userId, date_debut: { gte: new Date() } },
      select: { type: true, date_debut: true, date_fin: true, statut: true }
  });

  // 5. SI C'EST UN RH : Récupérer des stats globales
  let rhStats = null;
  if (user.role === 'RH' || user.role === 'ADMIN') {
      const pendingConges = await prisma.conge.count({ where: { statut: 'EN_ATTENTE' } });
      const activeOffers = await prisma.offreEmploi.count({ where: { statut: 'OUVERTE' } });
      rhStats = { pendingConges, activeOffers };
  }

  // --- CONSTRUCTION DU TEXTE DE CONTEXTE ---
  let contextText = `
  Utilisateur: ${user.prenom} ${user.nom} (${user.role}).
  Date actuelle: ${new Date().toLocaleString('fr-FR')}.

  --- SES RÉSERVATIONS À VENIR ---
  ${reservations.length > 0 ? reservations.map(r => `- ${r.objet} (${r.salle?.nom_salle || r.ressource?.nom_ressource}) le ${new Date(r.date_debut).toLocaleString()}`).join("\n") : "Aucune réservation."}

  --- SES TÂCHES À FAIRE ---
  ${taches.length > 0 ? taches.map(t => `- ${t.titre}`).join("\n") : "Aucune tâche en attente."}

  --- SES CONGÉS FUTURS ---
  ${congés.length > 0 ? congés.map(c => `- ${c.type} du ${new Date(c.date_debut).toLocaleDateString()} au ${new Date(c.date_fin).toLocaleDateString()} (${c.statut})`).join("\n") : "Aucun congé posé."}
  `;

  if (rhStats) {
      contextText += `
      --- INFO RH ---
      - Demandes de congés en attente : ${rhStats.pendingConges}
      - Offres d'emploi ouvertes : ${rhStats.activeOffers}
      `;
  }

  return contextText;
}