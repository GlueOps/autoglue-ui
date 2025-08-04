import { type FC, type ReactNode } from "react";
import { AuthContext } from "@/context/auth.ts";
import { api } from "@/lib/api.ts";

/*
interface User {
  id: string;
  email: string;
}
*/
export interface AuthContextType {
  //user: User | null;
  login: (email: string, password: string) => Promise<void>;
  //logout: () => Promise<void>;
  //handleError: (error: unknown) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({
  children,
}: {
  children: ReactNode;
}) => {
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/v1/authentication/login", {
        email,
        password,
      });

      const { access_token, refresh_token } = response.data;
      localStorage.setItem("access_token", JSON.stringify(access_token));
      localStorage.setItem("refresh_token", JSON.stringify(refresh_token));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  return <AuthContext value={{ login }}>{children}</AuthContext>;
};
