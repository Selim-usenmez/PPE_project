import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/conges/stats?date=YYYY-MM-DD&projetId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const projetId = searchParams.get("projetId");

  const date = dateParam ? new Date(dateParam) : new Date();
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  try {
    let idsEmployes: string[];
    let totalEmployes: number;

    if (projetId) {
      const participations = await prisma.participationProjet.findMany({
        where: { id_projet: projetId },
        select: { id_employe: true },
      });
      idsEmployes = participations.map((p) => p.id_employe);
      totalEmployes = idsEmployes.length;
    } else {
      const allEmployes = await prisma.employe.findMany({ select: { id_employe: true } });
      idsEmployes = allEmployes.map((e) => e.id_employe);
      totalEmployes = idsEmployes.length;
    }

    const congesJour = await prisma.conge.findMany({
      where: {
        id_employe: { in: idsEmployes },
        statut: "VALIDE",
        date_debut: { lte: dateEnd },
        date_fin: { gte: dateStart },
      },
      select: { id_employe: true },
    });

    const uniquesEnConge = new Set(congesJour.map((c) => c.id_employe));
    const enConge = uniquesEnConge.size;
    const pourcentage = totalEmployes > 0 ? Math.round((enConge / totalEmployes) * 100) : 0;

    return NextResponse.json({
      totalEmployes,
      enConge,
      pourcentage,
      alerte50pct: pourcentage >= 50,
    });
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
