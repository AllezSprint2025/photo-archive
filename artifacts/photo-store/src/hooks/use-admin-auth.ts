import { useState, useEffect, createContext, useContext } from "react";

interface AdminAuthContextType {
  isAdmin: boolean;
  login: (secret: string) => void;
  logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextType>({
  isAdmin: false,
  login: () => {},
  logout: () => {},
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
