import { createContext } from "react";
import type { AuthContextType } from "@/providers/auth-provider.tsx";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
