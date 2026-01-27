// --- TYPES & ENUMS ---
export type Role = "ADMIN" | "CHEF_DE_PROJET" | "RH" | "DEVELOPPEUR" | "STAGIAIRE" | "EMPLOYE";
export type Resource = "RESERVATION" | "PROJET" | "INCIDENT" | "UTILISATEUR" | "RESSOURCE" | "TACHE" | "RH_OFFRE" | "RH_CONGE";
export type Action = "CREATE" | "READ" | "UPDATE" | "DELETE" | "ASSIGN";

export const ROLES = {
  ADMIN: "ADMIN",
  CHEF_DE_PROJET: "CHEF_DE_PROJET",
  RH: "RH",
  DEVELOPPEUR: "DEVELOPPEUR",
  STAGIAIRE: "STAGIAIRE",
  EMPLOYE: "EMPLOYE"
};

// --- FONCTION PRINCIPALE ---
export function can(role: string, resource: Resource, action: Action, isOwner: boolean = false): boolean {
  
  // 1. ADMIN : Dieu Suprême
  if (role === ROLES.ADMIN) return true;

  switch (resource) {
    case "RESERVATION":
      if (action === "READ" || action === "CREATE") return true;
      if (action === "DELETE") return isOwner || role === ROLES.CHEF_DE_PROJET;
      if (action === "UPDATE") return isOwner;
      return false;

    case "PROJET":
      if (role === ROLES.CHEF_DE_PROJET) return true;
      if (action === "READ") return true;
      return false;

    case "UTILISATEUR":
      // RH : Gère les employés
      if (role === ROLES.RH) return true; 
      if (role === ROLES.CHEF_DE_PROJET && action === "READ") return true;
      return false;

    case "TACHE":
      if (role === ROLES.CHEF_DE_PROJET) return true;
      if (isOwner && (action === "UPDATE" || action === "READ")) return true;
      return false;

    case "INCIDENT":
      if (action === "CREATE") return true;
      if ([ROLES.RH, ROLES.CHEF_DE_PROJET].includes(role)) return true;
      return false;

    case "RH_OFFRE": // RECRUTEMENT
        if (role === ROLES.RH) return true;
        if (action === "READ") return true;
        return false;

    case "RH_CONGE": // CONGES
        if (role === ROLES.RH) return true;
        if (isOwner) return true;
        return false;

    default:
      return false;
  }
}

// --- HELPERS SÉCURISÉS ---
export const canAccessAdminPanel = (role: string) => role === ROLES.ADMIN;
export const canManageEmployees = (role: string) => [ROLES.ADMIN, ROLES.RH].includes(role);
export const canManageRessources = (role: string) => [ROLES.ADMIN, ROLES.RH].includes(role);
export const canManageProjects = (role: string) => [ROLES.ADMIN, ROLES.CHEF_DE_PROJET].includes(role);
export const canAssignTasks = (role: string) => [ROLES.ADMIN, ROLES.CHEF_DE_PROJET].includes(role);