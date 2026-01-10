"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Lock } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH USER ================= */
  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/me`, { headers });
      setUser(res.data.user);
    } catch (err) {
      console.error(
        "Failed to load profile",
        err?.response?.data || err.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  /* ================= CHANGE PASSWORD ================= */
  const handlePasswordChange = async () => {
    if (!password || password.length < 6) {
      return alert("Password must be at least 6 characters");
    }

    try {
      await axios.put(`${API}/change-password`, { password }, { headers });

      alert("Password updated successfully");
      setPassword("");
    } catch (err) {
      alert(err?.response?.data?.message || "Password update failed");
    }
  };

  if (loading) {
    return <div className="p-10 text-neutral-300">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100 p-8">
      <div className="max-w-3xl mx-auto bg-neutral-900 border border-neutral-700 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold mb-6 text-amber-400">My Profile</h1>

        {/* READ-ONLY DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {user && (
            <>
              <ReadOnly label="Name" value={user.name} />
              <ReadOnly label="Email" value={user.email} />
              <ReadOnly label="Role" value={user.role} />
              <ReadOnly label="Mobile" value={user.mobile} />
              <ReadOnly label="User ID" value={user._id} />
            </>
          )}
        </div>

        {/* CHANGE PASSWORD */}
        <div className="border-t border-neutral-700 pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock size={18} />
            Change Password
          </h2>

          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-800 border-2 border-neutral-600 rounded-lg outline-none focus:border-amber-600 mb-4"
          />

          <button
            onClick={handlePasswordChange}
            className="bg-amber-600 hover:bg-amber-700 px-6 py-2 rounded-lg font-semibold shadow"
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENT ================= */

const ReadOnly = ({ label, value }) => (
  <div>
    <label className="text-xs text-neutral-400 uppercase tracking-wide">
      {label}
    </label>
    <p className="mt-1 bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg">
      {value || "-"}
    </p>
  </div>
);
