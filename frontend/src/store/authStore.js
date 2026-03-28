"use client";
import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,

  login: (user, token) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },

  isAuthenticated: () => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("token");
  },

  isSuperAdmin: () => {
    if (typeof window === "undefined") return false;
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.role === "SUPER_ADMIN";
  },
}));

export default useAuthStore;
