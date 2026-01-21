"use client";
import Link from "next/link";
import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= SUBMIT HANDLER ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      return setError("Email and password are required");
    }

    try {
      setIsLoading(true);

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        { email, password }
      );

      const { token, user } = res.data; // user must contain role

      // 🔐 Store in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setSuccess("Login successful. Redirecting...");

      // 🚀 ROLE BASED REDIRECT
      setTimeout(() => {
        switch (user.role) {
          case "admin":
            router.push("/superadmin/dashboard");
            break;

          case "fitting":
            router.push("/fitting");
            break;
          case "production":
            router.push("/production");
            break;

          case "sales":
            router.push("/sales/order");
            break;

          case "warehouse":
            router.push("/inventory/full-chair");
            break;

          default:
            router.push("/dashboard"); // normal user / supervisor
        }
      }, 800);
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid credentials. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-6 border border-gray-200">
            <img
              src="/image.png"
              alt="Army Industry Logo"
              className="w-24 h-24 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account to continue</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 focus:outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-12 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 focus:outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-[#c62d23] hover:bg-[#a82419] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold flex justify-center items-center gap-2 shadow-lg shadow-[#c62d23]/20 transition-all hover:shadow-xl hover:shadow-[#c62d23]/30 mt-6"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">New to Army Industry?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            href="/signup"
            className="block w-full text-center py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:border-[#c62d23] hover:text-[#c62d23] hover:bg-red-50 transition-all"
          >
            Create an account
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-500">
          © 2026 Army Industry. All rights reserved.
        </p>
      </div>
    </div>
  );
}