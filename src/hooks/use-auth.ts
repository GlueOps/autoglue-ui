import { useContext } from "react";
import { type AuthContextType } from "@/providers/auth-provider.tsx";
import { AuthContext } from "@/context/auth.ts";

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
