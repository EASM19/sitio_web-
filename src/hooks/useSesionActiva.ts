"use client";

import { useEffect } from "react";
import { signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useSesionActiva(user: User | null) {
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      user
        .getIdToken(true)
        .catch((err: { code?: string }) => {
          const codigo = err?.code || "";
          if (codigo && codigo !== "auth/network-request-failed") {
            signOut(auth).catch(() => {});
          }
        });
    }, 60_000);
    return () => clearInterval(interval);
  }, [user]);
}
