import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session_user");
  const url = request.nextUrl.pathname;

  // 1. FICHIERS STATIQUES
  if (url.startsWith("/_next") || url.startsWith("/favicon.ico") || url.includes(".")) {
    return NextResponse.next();
  }

  // 2. ROUTES PUBLIQUES
  const publicPaths = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/api/auth/login",
    "/api/auth/verify-2fa",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    
    // 👇 AJOUTE CETTE LIGNE OBLIGATOIREMENT 👇
    "/api/auth/update-password" 
  ];

  // Si l'URL est publique, on laisse passer
  if (publicPaths.some(path => url.startsWith(path))) {
    return NextResponse.next();
  }

  // 3. VÉRIFICATION DE CONNEXION
  if (!sessionCookie) {
    if (url.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. GESTION UTILISATEURS CONNECTÉS
  if (sessionCookie) {
    try {
      const user = JSON.parse(sessionCookie.value);

      if (url === "/" || url === "/login") {
         const target = user.role === "ADMIN" ? "/admin/dashboard" : "/employe/dashboard";
         return NextResponse.redirect(new URL(target, request.url));
      }

      if (url.startsWith("/admin") && user.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/employe/dashboard", request.url));
      }

    } catch (e) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session_user");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};