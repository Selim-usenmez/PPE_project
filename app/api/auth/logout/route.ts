import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Déconnecté" });

  // On écrase le cookie avec une expiration immédiate
  response.cookies.set("session_user", "", {
    httpOnly: true,
    expires: new Date(0), // Date dans le passé = suppression immédiate
    path: "/",
  });

  return response;
}