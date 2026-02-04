"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { ArrowRightLeft, Clock, MapPin, User, Loader2, UserCircle, Package } from "lucide-react";
import { useRouter } from "next/navigation";

/* ============ GLOBAL CSS (identical to Orders page) ============ */
const GLOBAL_CSS = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .fade-in { animation: fadeIn 0.3s ease-out both; }

  ::-webkit-scrollbar        { width: 5px; }
  ::-webkit-scrollbar-track  { background: transparent; }
  ::-webkit-scrollbar-thumb  { background: #ddd; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #c62d23; }
`;

/* ============ HELPERS ============ */
const API   = process.env.NEXT_PUBLIC_API_URL;
const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
const hdrs  = () => ({ Authorization: `Bearer ${token()}` });

/* ============ SHARED MICRO-COMPONENTS ============ */
const Pill = ({ bg, color, children, style = {} }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    background: bg, color, fontSize: 13, fontWeight: 700,
    padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap", ...style
  }}>
    {children}
  </span>
);

const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, sub }) => (
  <div style={{
    background: "#fff", borderRadius: 14, padding: "20px 22px",
    border: "1.5px solid #eeeeee", flex: "1 1 180px", minWidth: 180,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={22} color={iconColor} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13, color: "#8a8a8a", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 700, color: "#1a1a1a" }}>{value}</p>
      </div>
    </div>
    {sub && <p style={{ margin: "10px 0 0 62px", fontSize: 13, color: "#aaa" }}>{sub}</p>}
  </div>
);

/* ============ MAIN PAGE ============ */
export default function ProductionTransfersPage() {
  const router = useRouter();

  const [movements, setMovements] = useState([]);
  const [loading, setLoading]     = useState(true);

  /* ─── auth ─── */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user || user.role !== "production") router.push("/login");
  }, [router]);

  /* ─── fetch ─── */
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/transfer/stock-movement`, { headers: hdrs() });
        setMovements(res.data.movements || []);
      } catch (e) { console.error("Fetch transfers failed", e); }
      finally     { setLoading(false); }
    };
    fetch();
  }, []);

  /* ─── filter to production only ─── */
  const transfers = useMemo(
    () => movements.filter((m) => m.toLocation?.startsWith("PROD_")),
    [movements]
  );

  /* ─── derived stats ─── */
  const totalQty = useMemo(() => transfers.reduce((s, m) => s + (m.quantity || 0), 0), [transfers]);

  const uniqueParts = useMemo(() => {
    const set = new Set();
    transfers.forEach((m) => { if (m.partName) set.add(m.partName); });
    return set.size;
  }, [transfers]);

  /* ─── format helpers ─── */
  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
         + "  " +
           d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  /* ═══════ RENDER ═══════ */
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight: "100vh", background: "#f1f3f6", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

        {/* ═══ STICKY TOP BAR ═══ */}
        <div style={{
          background: "#fff", borderBottom: "1px solid #eee",
          padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "#c62d23", borderRadius: 10, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowRightLeft color="#fff" size={20} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Transfer Records</h1>
              <p style={{ margin: 0, fontSize: 14, color: "#999" }}>{transfers.length} transfer{transfers.length !== 1 ? "s" : ""} to production</p>
            </div>
          </div>

          <button
            onClick={() => router.push("/profile")}
            style={{ background: "#f4f5f7", border: "none", borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <UserCircle size={20} color="#555" />
          </button>
        </div>

        {/* ═══ BODY ═══ */}
        <div style={{ padding: "28px 32px" }}>

          {loading ? (
            <div style={{ textAlign: "center", paddingTop: 100 }}>
              <Loader2 size={32} color="#c62d23" style={{ animation: "spin .7s linear infinite", margin: "0 auto" }} />
              <p style={{ color: "#999", marginTop: 12, fontSize: 14 }}>Loading transfers…</p>
            </div>
          ) : (
            <>
              {/* ── Stat cards ── */}
              <div className="fade-in" style={{ display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
                <StatCard icon={ArrowRightLeft} iconBg="#fef2f2"  iconColor="#c62d23" label="Total Transfers" value={transfers.length} sub="to production" />
                <StatCard icon={Package}        iconBg="#eff6ff"  iconColor="#3b82f6" label="Total Qty"       value={totalQty}         sub="units moved"    />
                <StatCard icon={Package}        iconBg="#f0fdf4"  iconColor="#16a34a" label="Unique Parts"    value={uniqueParts}      sub="distinct items" />
              </div>

              {/* ── empty ── */}
              {transfers.length === 0 && (
                <div className="fade-in" style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #eee", padding: "56px 24px", textAlign: "center" }}>
                  <ArrowRightLeft size={32} color="#ddd" style={{ margin: "0 auto 12px" }} />
                  <p style={{ margin: 0, color: "#aaa", fontSize: 15 }}>No transfers found for production</p>
                </div>
              )}

              {/* ── row list ── */}
              {transfers.length > 0 && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                  {/* column headers */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 80px 1.4fr 1.4fr 1.2fr 1.6fr",
                    gap: 12, alignItems: "center",
                    padding: "0 22px 8px",
                  }}>
                    {["Part", "Qty", "From", "To", "Moved By", "Time"].map((h) => (
                      <span key={h} style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.6px" }}>{h}</span>
                    ))}
                  </div>

                  {/* rows */}
                  {transfers.map((m, idx) => (
                    <div
                      key={m._id}
                      className="fade-in"
                      style={{
                        animationDelay: `${idx * 0.04}s`,
                        background: "#fff", borderRadius: 14, border: "1.5px solid #eee",
                        overflow: "hidden", transition: "box-shadow .2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.07)")}
                      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                    >
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 80px 1.4fr 1.4fr 1.2fr 1.6fr",
                        gap: 12, alignItems: "center",
                        padding: "16px 22px",
                      }}>

                        {/* Part — has the left accent bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 4, height: 40, borderRadius: 2, background: "#c62d23", flexShrink: 0 }} />
                          <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", textTransform: "capitalize" }}>
                            {m.partName || m.chairType || "—"}
                          </span>
                        </div>

                        {/* Qty */}
                        <Pill bg="#fef2f2" color="#c62d23">{m.quantity}</Pill>

                        {/* From */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <MapPin size={15} color="#999" />
                          <span style={{ fontSize: 14, color: "#555" }}>{m.fromLocation || "—"}</span>
                        </div>

                        {/* To */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <MapPin size={15} color="#c62d23" />
                          <span style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 600 }}>{m.toLocation || "—"}</span>
                        </div>

                        {/* Moved By */}
                        <Pill bg="#f3f3f3" color="#555" style={{ gap: 5 }}>
                          <User size={13} color="#c62d23" />
                          {m.movedBy?.name || "Unknown"}
                        </Pill>

                        {/* Time */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Clock size={15} color="#999" />
                          <span style={{ fontSize: 13, color: "#7a7a7a" }}>{fmtDate(m.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}