"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Lock, User, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/auth/me`, { headers });
        setUser(res.data.user);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /* ================= CHANGE PASSWORD ================= */
  const handlePasswordChange = async () => {
    if (!password || password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      await axios.put(
        `${API}/auth/change-password`,
        { password },
        { headers }
      );
      alert("Password updated successfully");
      setPassword("");
    } catch (err) {
      alert(err?.response?.data?.message || "Password update failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
          <p className="mt-2 text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 p-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-[#c62d23] hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <User size={32} className="text-[#c62d23]" />
              <span>My Profile</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* PROFILE DETAILS */}
          {user && (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReadOnly label="Name" value={user.name} />
                <ReadOnly label="Email" value={user.email} />
                <ReadOnly label="Role" value={user.role} />
                <ReadOnly label="Mobile" value={user.mobile} />
                <ReadOnly label="User ID" value={user._id} />
              </div>
            </div>
          )}

          {/* CHANGE PASSWORD */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Lock size={20} className="text-[#c62d23]" />
              Change Password
            </h2>

            <div className="max-w-md space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-gray-900"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={!password || password.length < 6}
                className="bg-[#c62d23] hover:bg-[#a82419] text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= READ ONLY FIELD ================= */

const ReadOnly = ({ label, value }) => (
  <div>
    <label className="text-sm text-gray-700 font-semibold block mb-2">
      {label}
    </label>
    <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-gray-900">
      {value || "-"}
    </div>
  </div>
);
