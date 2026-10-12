import { jwtDecode } from "jwt-decode";

export const getPreferredUsername = (token) => {
  try {
    const decoded = jwtDecode(token);
    return decoded.preferred_username || null;
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
};

export const getUserRoles = (token) => {
  try {
    const decoded = jwtDecode(token);

    const realmRoles = decoded?.realm_access?.roles || [];
    const resourceRoles = Object.values(decoded?.resource_access || {}).flatMap(
      (resource) => resource.roles
    );

    return [...realmRoles, ...resourceRoles];
  } catch (error) {
    console.error("Invalid token:", error);
    return [];
  }
};