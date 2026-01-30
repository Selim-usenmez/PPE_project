import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. On compte les signalements par ressource
    const groupData = await prisma.signalement.groupBy({
      by: ['id_ressource'],
      _count: {
        id_signalement: true,
      },
      orderBy: {
        _count: {
          id_signalement: 'desc',
        },
      },
      take: 5, // Top 5
    });

    // 2. On récupère les noms des ressources
    const stats = await Promise.all(groupData.map(async (item) => {
      const ressource = await prisma.ressource.findUnique({
        where: { id_ressource: item.id_ressource },
        select: { nom_ressource: true, numero_serie: true }
      });
      
      return {
        id: item.id_ressource,
        nom: ressource?.nom_ressource || "Inconnu",
        serie: ressource?.numero_serie,
        count: item._count.id_signalement
      };
    }));

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}