import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dateDebut, dateFin } = body;

    // 1. Récupération des logs sur la période
    const logs = await prisma.historiqueAction.findMany({
      where: {
        createdAt: {
          gte: new Date(dateDebut),
          lte: new Date(dateFin),
        }
      },
      include: {
        employe: { select: { nom: true, prenom: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (logs.length === 0) {
        return NextResponse.json({ error: "Aucune donnée sur cette période" }, { status: 404 });
    }

    // 2. Conversion en CSV
    const headers = ["ID_LOG", "DATE", "HEURE", "ACTEUR", "ACTION", "DETAILS"];
    
    const csvRows = logs.map(log => {
      const date = new Date(log.createdAt);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString();
      const acteur = log.employe ? `${log.employe.nom} ${log.employe.prenom}` : "Système/Inconnu";
      
      const cleanDetails = log.details ? log.details.replace(/(\r\n|\n|\r|,)/gm, " ") : "";

      return [
        log.id_action, // 👈 CORRECTION ICI (c'était id_historique avant)
        formattedDate,
        formattedTime,
        acteur,
        log.action,
        `"${cleanDetails}"`
      ].join(",");
    });

    const csvString = [headers.join(","), ...csvRows].join("\n");

    // 3. Renvoi du fichier
    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=archive_ppe_${dateDebut}_${dateFin}.csv`,
      },
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la génération de l'archive" }, { status: 500 });
  }
}