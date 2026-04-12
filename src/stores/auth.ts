import { defineStore } from "pinia";
import api from "../lib/api";

type UserProfile = {
  id: number;
  email: string;
  displayName: string;
  roles: string[];
};

export const useAuthStore = defineStore("site-auth", {
  state: () => ({
    token: localStorage.getItem("site_token") || "",
    user: null as UserProfile | null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    async bootstrap() {
      if (!this.token) {
        return;
      }
      try {
        await this.fetchMe();
      } catch {
        this.logout();
      }
    },
    async login(email: string, password: string) {
      const { data } = await api.post("/api/auth/login", { email, password });
      this.token = data.token;
      localStorage.setItem("site_token", data.token);
      await this.fetchMe();
    },
    async register(email: string, password: string, displayName: string) {
      const { data } = await api.post("/api/auth/register", { email, password, displayName });
      this.token = data.token;
      localStorage.setItem("site_token", data.token);
      await this.fetchMe();
    },
    async fetchMe() {
      if (!this.token) {
        this.user = null;
        return;
      }
      const { data } = await api.get("/api/user/me");
      this.user = data;
    },
    logout() {
      this.token = "";
      this.user = null;
      localStorage.removeItem("site_token");
    },
  },
});
