import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // 👈 AWAIT ICI
  
  try {
    const participations = await prisma.participationProjet.findMany({
      where: { id_projet: id },
      include: {
        employe: {
          select: { id_employe: true, nom: true, prenom: true, email: true, role: true }
        }
      }
    });
    return NextResponse.json(participations);
  } catch (error) {
    return NextResponse.json({ error: "Erreur chargement équipe" }, { status: 500 });
  }
}

// POST
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // 👈 AWAIT ICI

  try {
    const body = await req.json();
    const { id_employe, role_dans_projet } = body;

    if (!id_employe) return NextResponse.json({ error: "Employé manquant" }, { status: 400 });

    const existing = await prisma.participationProjet.findUnique({
      where: {
        id_employe_id_projet: {
          id_employe,
          id_projet: id
        }
      }
    });

    if (existing) return NextResponse.json({ error: "Cet employé est déjà dans le projet !" }, { status: 409 });

    const participation = await prisma.participationProjet.create({
      data: {
        id_projet: id,
        id_employe,
        role_dans_projet: role_dans_projet || "Membre"
      }
    });

    return NextResponse.json(participation);
  } catch (error) {
    return NextResponse.json({ error: "Erreur ajout membre" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Même si on n'utilise pas 'id' ici, TypeScript vérifie la signature
  // On peut laisser params tel quel ou juste mettre await params pour être safe
  await params; 
  
  try {
    const { searchParams } = new URL(req.url);
    const id_participation = searchParams.get("id_participation");

    if (!id_participation) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    await prisma.participationProjet.delete({
      where: { id_participation }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}