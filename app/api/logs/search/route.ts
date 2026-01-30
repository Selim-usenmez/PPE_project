import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q"); // L'email de l'employé cible

  if (!query) return NextResponse.json([]);

  try {
    // On cherche tous les logs qui contiennent l'email dans les détails
    // Ex: "Modification du profil de Jean (jean@test.com)"
    const logs = await prisma.historiqueAction.findMany({
      where: {
        details: {
          contains: query, 
          mode: 'insensitive'
        }
      },
      include: {
        employe: { // L'admin qui a fait l'action
          select: { nom: true, prenom: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}