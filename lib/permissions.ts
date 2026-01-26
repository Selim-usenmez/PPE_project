// --- TYPES & ENUMS ---
export type Role = "ADMIN" | "CHEF_DE_PROJET" | "RH" | "DEVELOPPEUR" | "STAGIAIRE" | "EMPLOYE";
export type Resource = "RESERVATION" | "PROJET" | "INCIDENT" | "UTILISATEUR" | "RESSOURCE" | "TACHE";
export type Action = "CREATE" | "READ" | "UPDATE" | "DELETE" | "ASSIGN";

// --- CONSTANTES ---
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
      // SUPPRESSION : Proprio ou Chef de Projet (pour gérer les conflits)
      if (action === "DELETE") return isOwner || role === ROLES.CHEF_DE_PROJET;
      // MODIF : Uniquement proprio
      if (action === "UPDATE") return isOwner;
      return false;

    case "PROJET":
      // Chef de projet : Gère TOUT
      if (role === ROLES.CHEF_DE_PROJET) return true;
      // RH/Devs : Lecture seule
      if (action === "READ") return true;
      return false;

    case "UTILISATEUR":
      // RH : Gère les employés (Contrats, Infos)
      if (role === ROLES.RH) return true; 
      // Chef Projet : Lecture seule pour voir son équipe
      if (role === ROLES.CHEF_DE_PROJET && action === "READ") return true;
      return false;

    case "TACHE":
      // Chef de projet : Peut ASSIGNER et CRÉER
      if (role === ROLES.CHEF_DE_PROJET) return true;
      // Dev : Peut mettre à jour (statut) ses propres tâches
      if (isOwner && (action === "UPDATE" || action === "READ")) return true;
      return false;

    case "INCIDENT":
      if (action === "CREATE") return true;
      if ([ROLES.RH, ROLES.CHEF_DE_PROJET].includes(role)) return true;
      return false;

    default:
      return false;
  }
}

// --- HELPERS (Pour l'interface) ---
export const canAccessAdminPanel = (role: string) => [ROLES.ADMIN, ROLES.RH, ROLES.CHEF_DE_PROJET].includes(role);
export const canManageEmployees = (role: string) => [ROLES.ADMIN, ROLES.RH].includes(role);
export const canManageProjects = (role: string) => [ROLES.ADMIN, ROLES.CHEF_DE_PROJET].includes(role);
export const canManageRessources = (role: string) => [ROLES.ADMIN, ROLES.RH, ROLES.CHEF_DE_PROJET].includes(role);
export const canAssignTasks = (role: string) => [ROLES.ADMIN, ROLES.CHEF_DE_PROJET].includes(role);