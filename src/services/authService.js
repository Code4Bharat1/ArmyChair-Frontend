// src/services/authService.js
import axiosInstance from "@/lib/axios";

class AuthService {
  /* ---------------- LOGIN ---------------- */
  async login(credentials) {
    const res = await axiosInstance.post("/auth/login", credentials);

    const { accessToken, user } = res.data;

    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(user));
    }

    return { accessToken, user };
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
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    }
  }
}

export default new AuthService();
