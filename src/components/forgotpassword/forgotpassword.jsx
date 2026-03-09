"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Mail, CreditCard, Calendar, Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

const STEPS = { EMAIL: 1, VERIFY: 2, RESET: 3, DONE: 4 };

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    setError("");
    if (!email || !aadharNumber || !dateOfBirth)
      return setError("All fields are required");

    try {
      setIsLoading(true);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password/verify`,
        { email, aadharNumber, dateOfBirth }
      );
      setResetToken(res.data.resetToken);
      setStep(STEPS.RESET);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setError("");
    if (!newPassword || !confirmPassword) return setError("Both fields are required");
    if (newPassword !== confirmPassword) return setError("Passwords do not match");
    if (newPassword.length < 6) return setError("Password must be at least 6 characters");

    try {
      setIsLoading(true);
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password/reset`,
        { resetToken, newPassword }
      );
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Session may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/image.png" alt="Logo" className="w-20 h-20 object-contain mb-2" />
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Reset Password</h1>
          <p className="text-gray-500 text-sm">Verify your identity to continue</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
          {/* Step indicator */}
          {step !== STEPS.DONE && (
            <div className="flex items-center gap-2 mb-6">
              {["Identify", "Verify", "Reset"].map((label, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-[#c62d23] text-white" : "bg-gray-100 text-gray-400"}`}>
                    {step > i + 1 ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${step === i + 1 ? "text-[#c62d23]" : "text-gray-400"}`}>{label}</span>
                  {i < 2 && <div className={`h-px flex-1 ${step > i + 1 ? "bg-green-400" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* STEP 1+2: Email + Aadhar + DOB (combined for simplicity) */}
          {step === STEPS.EMAIL && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 focus:outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Aadhar Number</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" value={aadharNumber} onChange={e => setAadharNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="12-digit Aadhar number"
                    className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 focus:outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 focus:outline-none transition-all" />
                </div>
              </div>
              <button onClick={handleVerify} disabled={isLoading}
                className="w-full bg-[#c62d23] hover:bg-[#a82419] disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold flex justify-center items-center gap-2 shadow-lg shadow-[#c62d23]/20 transition-all mt-2">
                {isLoading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying...</> : <>Verify Identity <ArrowRight className="w-5 h-5" /></>}
              </button>
            </div>
          )}

          {/* STEP 3: New Password */}
          {step === STEPS.RESET && (
            <div className="space-y-5">
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                ✓ Identity verified. You have <strong>10 minutes</strong> to set your new password.
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full border border-gray-200 rounded-xl pl-12 pr-12 py-3.5 text-sm focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 focus:outline-none transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 focus:outline-none transition-all" />
                </div>
              </div>
              <button onClick={handleReset} disabled={isLoading}
                className="w-full bg-[#c62d23] hover:bg-[#a82419] disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold flex justify-center items-center gap-2 shadow-lg shadow-[#c62d23]/20 transition-all">
                {isLoading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Resetting...</> : <>Set New Password <ArrowRight className="w-5 h-5" /></>}
              </button>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === STEPS.DONE && (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Password Reset!</h2>
              <p className="text-gray-500 text-sm">Your password has been updated successfully. You can now sign in.</p>
              <button onClick={() => router.push("/login")}
                className="w-full bg-[#c62d23] hover:bg-[#a82419] text-white py-3.5 rounded-xl font-semibold flex justify-center items-center gap-2 shadow-lg shadow-[#c62d23]/20 transition-all mt-2">
                Go to Login <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {step !== STEPS.DONE && (
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-gray-500 hover:text-[#c62d23] flex items-center justify-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}