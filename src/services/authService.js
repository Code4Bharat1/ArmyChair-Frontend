// src/services/authService.js
import axiosInstance from "@/lib/axios";

class AuthService {
  /* ---------------- LOGIN ---------------- */
  async login(credentials) {
    const res = await axiosInstance.post("/auth/login", credentials);

    const { tokenToken, user } = res.data;

    if (tokenToken) {
      localStorage.setItem("tokenToken", tokenToken);
      localStorage.setItem("user", JSON.stringify(user));
    }

    return { tokenToken, user };
  }

  /* ---------------- LOGOUT ---------------- */
  async logout() {
    try {
      // Clears refresh token cookie on backend
      await axiosInstance.post("/auth/logout");
    } catch (err) {
      // Even if API fails, client state must be cleared
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("tokenToken");
      localStorage.removeItem("user");
    }
  }
}

export default new AuthService();
