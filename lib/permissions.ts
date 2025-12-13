export const ROLES = {
    ADMIN: "ADMIN",
    CHEF_DE_PROJET: "CHEF_DE_PROJET",
    RH: "RH",
    DEVELOPPEUR: "DEVELOPPEUR",
    STAGIAIRE: "STAGIAIRE",
  };
  
  export const canAccessAdminPanel = (role: string) => {
    return [ROLES.ADMIN, ROLES.CHEF_DE_PROJET, ROLES.RH].includes(role);
  };
  
  export const canManageEmployees = (role: string) => {
    return [ROLES.ADMIN, ROLES.RH].includes(role); // Chef de projet n'a pas forcément accès RH
  };
  
  export const canManageProjects = (role: string) => {
    return [ROLES.ADMIN, ROLES.CHEF_DE_PROJET].includes(role);
  };