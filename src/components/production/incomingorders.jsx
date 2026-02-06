"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Package,
  CheckCircle,
  UserCircle,
  ChevronDown,
  Plus,
  Layers,
  Loader2,
  Clock,
  TrendingUp,
  Scissors,
  Search,
  X,
  Menu,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ============ GLOBAL CSS ============ */
const GLOBAL_CSS = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes expandDown {
    from { opacity: 0; max-height: 0; }
    to   { opacity: 1; max-height: 1400px; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .fade-in      { animation: fadeIn 0.3s ease-out both; }
  .expand-down  { animation: expandDown 0.35s cubic-bezier(.4,0,.2,1) both; overflow: hidden; }

  /* scrollbar */
  ::-webkit-scrollbar        { width: 5px; }
  ::-webkit-scrollbar-track  { background: transparent; }
  ::-webkit-scrollbar-thumb  { background: #ddd; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #c62d23; }

  /* focus ring */
  input:focus, select:focus, button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2.5px rgba(198,45,35,0.22);
  }

  /* number input arrows hide */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
`;

/* ============ CONSTANTS ============ */
const API              = process.env.NEXT_PUBLIC_API_URL;
const WORKERS          = ["Mintoo", "Sajid", "Jamshed", "Ehtram"];
const ALL_TABS         = ["All", "Pending", "In Progress", "Completed"];

/* ============ HELPERS ============ */
const token   = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
const hdrs    = () => ({ Authorization: `Bearer ${token()}` });

/* ============ SMALL REUSABLE COMPONENTS ============ */

// Pill badge
const Pill = ({ bg, color, children, style = {} }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    background: bg, color, fontSize: 13, fontWeight: 700,
    padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap", ...style
  }}>
    {children}
  </span>
);

// Stat card in the top summary row - now responsive
const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, sub }) => (
  <div style={{
    background: "#fff", borderRadius: 14, padding: "16px 18px",
    border: "1.5px solid #eeeeee", flex: "1 1 160px", minWidth: 140,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={20} color={iconColor} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: "#8a8a8a", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>{value}</p>
      </div>
    </div>
    {sub && <p style={{ margin: "8px 0 0 52px", fontSize: 11, color: "#aaa" }}>{sub}</p>}
  </div>
);

/* ============ MAIN PAGE ============ */
export default function ProductionOrdersPage() {
  const router = useRouter();

  /* ─── state ─── */
  const [orders, setOrders]                   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedWorkers, setSelectedWorkers] = useState({});
  const [workerInventory, setWorkerInventory] = useState({});
  const [expandedOrder, setExpandedOrder]     = useState(null);
  const [acceptedOrders, setAcceptedOrders]   = useState({});
  const [acceptQty, setAcceptQty]             = useState({});
  const [requestData, setRequestData]         = useState({});
  const [actionLoading, setActionLoading]     = useState({});
  const [activeTab, setActiveTab]             = useState("All");
  const [inventorySearch, setInventorySearch] = useState({});
  const [addedItems, setAddedItems]           = useState(() => {
    // Load from localStorage on mount
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("production_added_items");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [sidebarOpen, setSidebarOpen]         = useState(false);

  /* ─── auth ─── */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user || user.role !== "production") router.push("/login");
  }, [router]);

  /* ─── fetch ─── */
  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers: hdrs() });
      const valid = ["PRODUCTION_PENDING", "PRODUCTION_IN_PROGRESS", "PRODUCTION_COMPLETED"];
      setOrders((res.data.orders || []).filter((o) => o.orderType === "FULL" && valid.includes(o.progress)));
    } catch (e) { console.error(e); }
    finally     { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ─── persist added items to localStorage ─── */
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("production_added_items", JSON.stringify(addedItems));
    }
  }, [addedItems]);

  /* ─── inventory ─── */
  const fetchProductionInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory`, { headers: hdrs() });
      setWorkerInventory({ ALL_PRODUCTION: (res.data.inventory || []).filter((i) => i.location.startsWith("PROD_")) });
    } catch (e) { console.error(e); }
  };

  /* ─── actions ─── */
  const setLoad = (key, val) => setActionLoading((p) => ({ ...p, [key]: val }));

  const sendInventoryRequest = async (orderId) => {
    const d = requestData[orderId];
    if (!d?.partName || !d?.quantity || d.quantity <= 0) return alert("Enter valid part name and quantity");
    setLoad(orderId + "_req", true);
    try {
      await axios.post(`${API}/production/inward`, {
        partName: d.partName, quantity: d.quantity,
        location: `PROD_${selectedWorkers[orderId] || "Mintoo"}`,
      }, { headers: hdrs() });
      alert("Material request sent to warehouse");
      setRequestData((p) => ({ ...p, [orderId]: { partName: "", quantity: "" } }));
    } catch (e) { alert(e.response?.data?.message || "Request failed"); }
    finally     { setLoad(orderId + "_req", false); }
  };

  const assignWorker = async (orderId) => {
    if (!selectedWorkers[orderId]) return;
    setLoad(orderId + "_assign", true);
    try {
      await axios.put(`${API}/orders/${orderId}/assign-production`, { workerName: selectedWorkers[orderId] }, { headers: hdrs() });
      setExpandedOrder(orderId);
      fetchOrders();
    } catch (e) { alert("Assign failed"); }
    finally     { setLoad(orderId + "_assign", false); }
  };

  const  acceptOrder = async (orderId, parts) => {
    if (!parts || !Object.keys(parts).length) return alert("Please enter quantities for parts");
    setLoad(orderId + "_accept", true);
    try {
      await axios.post(`${API}/orders/${orderId}/production-accept`, { parts }, { headers: hdrs() });
      setAcceptedOrders((p) => ({ ...p, [orderId]: true }));
      
      // Clear added items for this order from state and localStorage
      setAddedItems((prev) => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
      
      fetchOrders();
    } catch (e) { alert(e.response?.data?.message || "Accept failed"); }
    finally     { setLoad(orderId + "_accept", false); }
  };

  const markCompleted = async (orderId) => {
    setLoad(orderId + "_complete", true);
    try {
      await axios.patch(`${API}/orders/${orderId}/progress`, { progress: "PRODUCTION_COMPLETED" }, { headers: hdrs() });
      alert("Production completed");
      
      // Clear added items for this order from state and localStorage
      setAddedItems((prev) => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
      
      fetchOrders();
    } catch (e) { alert(e.response?.data?.message || "Update failed"); }
    finally     { setLoad(orderId + "_complete", false); }
  };

  /* ─── handle adding item to selection ─── */
  const addItemToSelection = (orderId, partName, totalQty) => {
    const qty = acceptQty[partName] || 0;
    if (qty <= 0 || qty > totalQty) {
      alert(`Please enter a valid quantity (1-${totalQty})`);
      return;
    }

    setAddedItems((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [partName]: qty,
      },
    }));

    // Clear the input for this part
    setAcceptQty((prev) => {
      const updated = { ...prev };
      delete updated[partName];
      return updated;
    });
  };

  /* ─── remove item from selection ─── */
  const removeItemFromSelection = (orderId, partName) => {
    setAddedItems((prev) => {
      const updated = { ...prev };
      if (updated[orderId]) {
        delete updated[orderId][partName];
        if (Object.keys(updated[orderId]).length === 0) {
          delete updated[orderId];
        }
      }
      return updated;
    });
  };

  /* ─── grouping ─── */
  const pending    = orders.filter((o) => o.progress === "PRODUCTION_PENDING" && !o.productionWorker);
  const inProgress = orders.filter((o) => (o.progress === "PRODUCTION_PENDING" && o.productionWorker) || o.progress === "PRODUCTION_IN_PROGRESS");
  const completed  = orders.filter((o) => o.progress === "PRODUCTION_COMPLETED");

  /* ─── filtered list (tab) ─── */
  const visibleOrders = activeTab === "All"           ? orders
                      : activeTab === "Pending"       ? pending
                      : activeTab === "In Progress"   ? inProgress
                      :                                 completed;

  /* ─── status helpers per order ─── */
  const getStatus = (order) => {
    if (order.progress === "PRODUCTION_COMPLETED")                              return "completed";
    if (order.progress === "PRODUCTION_IN_PROGRESS" || order.productionWorker)  return "inProgress";
    return "pending";
  };

  const STATUS_CFG = {
    pending:    { label: "Pending",     dot: "#c62d23", bg: "#fef2f2",  textColor: "#c62d23" },
    inProgress: { label: "In Progress", dot: "#3b82f6", bg: "#eff6ff",  textColor: "#2563eb" },
    completed:  { label: "Completed",   dot: "#16a34a", bg: "#f0fdf4",  textColor: "#16a34a" },
  };

  /* ═══════ RENDER ═══════ */
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight: "100vh", background: "#f1f3f6", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

        {/* ═══ TOP BAR ═══ */}
        <div style={{ 
          background: "#fff", 
          borderBottom: "1px solid #eee", 
          padding: "12px 16px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          position: "sticky", 
          top: 0, 
          zIndex: 10 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ 
              background: "#c62d23", 
              borderRadius: 10, 
              width: 38, 
              height: 38, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}>
              <Package color="#fff" size={20} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>
                Production
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "#999", display: window.innerWidth < 640 ? "none" : "block" }}>
                {orders.length} order{orders.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/profile")}
            style={{ 
              background: "#f4f5f7", 
              border: "none", 
              borderRadius: 10, 
              width: 36, 
              height: 36, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              cursor: "pointer" 
            }}
          >
            <UserCircle size={18} color="#555" />
          </button>
        </div>

        {/* ═══ BODY ═══ */}
        <div style={{ padding: "16px" }}>

          {loading ? (
            <div style={{ textAlign: "center", paddingTop: 100 }}>
              <Loader2 size={32} color="#c62d23" style={{ animation: "spin .7s linear infinite", margin: "0 auto" }} />
              <p style={{ color: "#999", marginTop: 12, fontSize: 14 }}>Loading orders…</p>
            </div>
          ) : (
            <>
              {/* ── Stat cards row - RESPONSIVE ── */}
              <div className="fade-in" style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10, 
                marginBottom: 16
              }}>
                <StatCard icon={Clock}       iconBg="#fef2f2" iconColor="#c62d23" label="Pending"     value={pending.length}    sub="awaiting" />
                <StatCard icon={TrendingUp}  iconBg="#eff6ff" iconColor="#3b82f6" label="Progress" value={inProgress.length}  sub="producing" />
                <StatCard icon={Scissors}    iconBg="#f0fdf4" iconColor="#16a34a" label="Done"   value={completed.length}  sub="complete" />
              </div>

              {/* ── Tab bar - RESPONSIVE ── */}
              <div className="fade-in" style={{ 
                display: "flex", 
                gap: 4, 
                marginBottom: 14, 
                background: "#fff", 
                borderRadius: 10, 
                border: "1.5px solid #eee", 
                padding: 4, 
                overflowX: "auto",
                WebkitOverflowScrolling: "touch"
              }}>
                {ALL_TABS.map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        background: active ? "#c62d23" : "transparent",
                        color: active ? "#fff" : "#666",
                        border: "none", 
                        borderRadius: 7,
                        padding: "7px 16px", 
                        fontSize: 13, 
                        fontWeight: 600,
                        cursor: "pointer", 
                        transition: "background .2s, color .2s",
                        whiteSpace: "nowrap",
                        flexShrink: 0
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* ── Order list ── */}
              <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {visibleOrders.length === 0 && (
                  <div style={{ 
                    background: "#fff", 
                    borderRadius: 12, 
                    border: "1.5px solid #eee", 
                    padding: "32px 20px", 
                    textAlign: "center" 
                  }}>
                    <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>No orders in this category</p>
                  </div>
                )}

                {visibleOrders.map((order, idx) => {
                  const status   = getStatus(order);
                  const cfg      = STATUS_CFG[status];
                  const isOpen   = expandedOrder === order._id;
                  const isPending    = status === "pending";
                  const isInProg     = status === "inProgress";
                  const isCompleted  = status === "completed";

                  return (
                    <div
                      key={order._id}
                      className="fade-in"
                      style={{ 
                        animationDelay: `${idx * 0.04}s`, 
                        background: "#fff", 
                        borderRadius: 12, 
                        border: "1.5px solid #eee", 
                        overflow: "hidden", 
                        transition: "box-shadow .2s" 
                      }}
                    >
                      {/* ── main row - MOBILE OPTIMIZED ── */}
                      <div style={{ 
                        display: "flex", 
                        alignItems: "flex-start", 
                        padding: "12px 14px", 
                        gap: 10, 
                        flexWrap: "wrap" 
                      }}>

                        {/* left accent bar */}
                        <div style={{ 
                          width: 4, 
                          height: 36, 
                          borderRadius: 2, 
                          background: cfg.dot, 
                          flexShrink: 0,
                          marginTop: 2
                        }} />

                        {/* order info */}
                        <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{order.orderId}</span>
                            <Pill bg={cfg.bg} color={cfg.textColor} style={{ fontSize: 11, padding: "3px 10px" }}>
                              {cfg.label}
                            </Pill>
                          </div>
                          <p style={{ margin: "0 0 4px", fontSize: 12, color: "#7a7a7a" }}>
                            {order.chairModel}
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: "#7a7a7a" }}>
                            Qty: <strong style={{ color: "#333" }}>{order.quantity}</strong>
                          </p>
                          
                          {/* worker badge - mobile */}
                          {order.productionWorker && (
                            <div style={{ marginTop: 6 }}>
                              <Pill bg="#f3f3f3" color="#555" style={{ gap: 4, fontSize: 11, padding: "3px 10px" }}>
                                <UserCircle size={12} color="#c62d23" />
                                {order.productionWorker}
                              </Pill>
                            </div>
                          )}
                        </div>

                        {/* ── PENDING: select + assign - MOBILE STACKED ── */}
                        {isPending && (
                          <div style={{ 
                            display: "flex", 
                            flexDirection: "column",
                            gap: 6, 
                            width: "100%",
                            marginTop: 8
                          }}>
                            <select
                              value={selectedWorkers[order._id] || ""}
                              onChange={(e) => setSelectedWorkers((p) => ({ ...p, [order._id]: e.target.value }))}
                              style={{ 
                                border: "1.5px solid #e0e0e0", 
                                borderRadius: 8, 
                                padding: "8px 10px", 
                                fontSize: 13, 
                                background: "#fff", 
                                color: "#444", 
                                cursor: "pointer",
                                width: "100%"
                              }}
                            >
                              <option value="">Assign Worker</option>
                              {WORKERS.map((w) => <option key={w} value={w}>{w}</option>)}
                            </select>
                            <button
                              onClick={() => assignWorker(order._id)}
                              disabled={!selectedWorkers[order._id] || actionLoading[order._id + "_assign"]}
                              style={{
                                background: selectedWorkers[order._id] ? "#c62d23" : "#ddd",
                                color: "#fff", 
                                border: "none", 
                                borderRadius: 8,
                                padding: "9px 18px", 
                                fontSize: 13, 
                                fontWeight: 600,
                                cursor: selectedWorkers[order._id] ? "pointer" : "not-allowed",
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                gap: 5,
                                width: "100%",
                                transition: "background .2s",
                              }}
                            >
                              {actionLoading[order._id + "_assign"]
                                ? <Loader2 size={14} style={{ animation: "spin .6s linear infinite" }} />
                                : "Assign Worker"}
                            </button>
                          </div>
                        )}

                        {/* ── IN PROGRESS: expand button - FULL WIDTH ON MOBILE ── */}
                        {isInProg && (
                          <button
                            onClick={() => setExpandedOrder(isOpen ? null : order._id)}
                            style={{
                              width: "100%",
                              marginTop: 8,
                              background: isOpen ? "#fef2f2" : "#f4f5f7",
                              border: "1.5px solid " + (isOpen ? "#f0c0bb" : "#eee"),
                              borderRadius: 8, 
                              padding: "9px 14px", 
                              cursor: "pointer",
                              display: "flex", 
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 5,
                              fontSize: 13, 
                              fontWeight: 600, 
                              color: isOpen ? "#c62d23" : "#555",
                              transition: "background .2s, border-color .2s, color .2s",
                            }}
                          >
                            <span style={{ 
                              display: "inline-block", 
                              transition: "transform .25s", 
                              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" 
                            }}>
                              <ChevronDown size={14} />
                            </span>
                            {isOpen ? "Close Details" : "View Details"}
                          </button>
                        )}
                      </div>

                      {/* ═══ EXPANDED DRAWER (In Progress only) - MOBILE OPTIMIZED ═══ */}
                      {isInProg && isOpen && (
                        <div className="expand-down" style={{ 
                          borderTop: "1px solid #f0f0f0", 
                          background: "#fafbfc", 
                          padding: "16px 14px" 
                        }}>

                          {/* ── top toolbar - MOBILE STACKED ── */}
                          <div style={{ 
                            display: "flex", 
                            flexDirection: "column",
                            gap: 10, 
                            marginBottom: 16
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>Worker:</span>
                              <Pill bg="#f3f3f3" color="#555" style={{ gap: 4, fontSize: 11 }}>
                                <UserCircle size={12} color="#c62d23" />
                                {order.productionWorker}
                              </Pill>
                              <Pill bg="#fef2f2" color="#c62d23" style={{ fontSize: 11 }}>
                                Qty: {order.quantity}
                              </Pill>
                            </div>

                            <button
                              onClick={fetchProductionInventory}
                              style={{
                                display: "flex", 
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 5,
                                background: "#fff", 
                                border: "1.5px solid #e0e0e0", 
                                borderRadius: 8,
                                padding: "8px 14px", 
                                cursor: "pointer", 
                                fontSize: 12, 
                                fontWeight: 600, 
                                color: "#555",
                                transition: "border-color .2s, background .2s",
                                width: "100%"
                              }}
                            >
                              <Layers size={13} color="#c62d23" /> Refresh Inventory
                            </button>
                          </div>

                          {/* ── Added Items Display - MOBILE GRID ── */}
                          {addedItems[order._id] && Object.keys(addedItems[order._id]).length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <p style={{ 
                                margin: "0 0 8px", 
                                fontSize: 11, 
                                fontWeight: 700, 
                                color: "#16a34a", 
                                textTransform: "uppercase", 
                                letterSpacing: "0.6px" 
                              }}>
                                Added to Production
                              </p>
                              <div style={{ 
                                display: "grid", 
                                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", 
                                gap: 8 
                              }}>
                                {Object.entries(addedItems[order._id]).map(([name, qty]) => (
                                  <div key={name} style={{ 
                                    background: "#f0fdf4", 
                                    border: "1.5px solid #bbf7d0", 
                                    borderRadius: 8, 
                                    padding: "10px", 
                                    display: "flex", 
                                    justifyContent: "space-between", 
                                    alignItems: "center" 
                                  }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        fontSize: 11, 
                                        fontWeight: 600, 
                                        color: "#15803d", 
                                        textTransform: "capitalize", 
                                        marginBottom: 3,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap"
                                      }}>
                                        {name}
                                      </div>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                                        Qty: {qty}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => removeItemFromSelection(order._id, name)}
                                      style={{ 
                                        background: "transparent", 
                                        border: "none", 
                                        cursor: "pointer", 
                                        padding: 4, 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center",
                                        marginLeft: 4
                                      }}
                                      title="Remove"
                                    >
                                      <X size={14} color="#dc2626" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── Search Bar ── */}
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ position: "relative" }}>
                              <Search size={14} color="#999" style={{ 
                                position: "absolute", 
                                left: 10, 
                                top: "50%", 
                                transform: "translateY(-50%)" 
                              }} />
                              <input
                                type="text"
                                placeholder="Search products..."
                                value={inventorySearch[order._id] || ""}
                                onChange={(e) => setInventorySearch((p) => ({ ...p, [order._id]: e.target.value }))}
                                style={{
                                  width: "100%", 
                                  border: "1.5px solid #e0e0e0", 
                                  borderRadius: 8,
                                  padding: "8px 10px 8px 32px", 
                                  fontSize: 12, 
                                  boxSizing: "border-box",
                                  transition: "border-color .2s", 
                                  background: "#fff"
                                }}
                              />
                            </div>
                          </div>

                          {/* ── inventory grid - MOBILE OPTIMIZED ── */}
                          {workerInventory.ALL_PRODUCTION && (
                            <div style={{ marginBottom: 16 }}>
                              <p style={{ 
                                margin: "0 0 8px", 
                                fontSize: 11, 
                                fontWeight: 700, 
                                color: "#888", 
                                textTransform: "uppercase", 
                                letterSpacing: "0.6px" 
                              }}>
                                Available Inventory
                              </p>
                              <div style={{ 
                                display: "grid", 
                                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", 
                                gap: 8 
                              }}>
                                {(() => {
                                  const grouped = (workerInventory.ALL_PRODUCTION || [])
                                    .filter((i) => i.type === "SPARE")
                                    .reduce((a, i) => { a[i.partName] = (a[i.partName] || 0) + i.quantity; return a; }, {});

                                  const searchTerm = (inventorySearch[order._id] || "").toLowerCase();
                                  const filtered = Object.entries(grouped)
                                    .filter(([name]) => {
                                      if (addedItems[order._id]?.[name]) return false;
                                      return name.toLowerCase().includes(searchTerm);
                                    })
                                    .slice(0, 6);

                                  if (filtered.length === 0) {
                                    return (
                                      <div style={{ 
                                        gridColumn: "1 / -1", 
                                        padding: "16px", 
                                        textAlign: "center", 
                                        color: "#999", 
                                        fontSize: 12 
                                      }}>
                                        {searchTerm ? "No matching products" : "No products available"}
                                      </div>
                                    );
                                  }

                                  return filtered.map(([name, qty]) => (
                                    <div key={name} style={{ 
                                      background: "#fff", 
                                      border: "1.5px solid #e8e8e8", 
                                      borderRadius: 8, 
                                      padding: "10px", 
                                      transition: "border-color .2s, box-shadow .2s" 
                                    }}>
                                      <div style={{ 
                                        display: "flex", 
                                        justifyContent: "space-between", 
                                        alignItems: "center", 
                                        marginBottom: 6 
                                      }}>
                                        <span style={{ 
                                          fontSize: 11, 
                                          fontWeight: 600, 
                                          color: "#333", 
                                          textTransform: "capitalize",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          flex: 1,
                                          marginRight: 4
                                        }}>
                                          {name}
                                        </span>
                                        <Pill bg="#e8e8e8" color="#555" style={{ fontSize: 10, padding: "2px 8px" }}>
                                          {qty}
                                        </Pill>
                                      </div>
                                      <div style={{ display: "flex", gap: 4 }}>
                                        <input
                                          type="number" 
                                          min="0" 
                                          max={qty} 
                                          placeholder="Qty"
                                          value={acceptQty[name] || ""}
                                          onChange={(e) => setAcceptQty((p) => ({ ...p, [name]: Number(e.target.value) }))}
                                          style={{ 
                                            flex: 1, 
                                            border: "1.5px solid #e0e0e0", 
                                            borderRadius: 6, 
                                            padding: "6px 8px", 
                                            fontSize: 12, 
                                            boxSizing: "border-box", 
                                            transition: "border-color .2s" 
                                          }}
                                        />
                                        <button
                                          onClick={() => addItemToSelection(order._id, name, qty)}
                                          style={{
                                            background: "#16a34a", 
                                            color: "#fff", 
                                            border: "none",
                                            borderRadius: 6, 
                                            padding: "6px 10px", 
                                            cursor: "pointer",
                                            fontSize: 11, 
                                            fontWeight: 600, 
                                            transition: "background .2s",
                                            flexShrink: 0
                                          }}
                                        >
                                          Add
                                        </button>
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}

                          {/* ── Request Additional Inventory - MOBILE STACKED ── */}
                          <div style={{ 
                            background: "#fff", 
                            border: "1.5px solid #eee", 
                            borderRadius: 8, 
                            padding: "12px", 
                            marginBottom: 14 
                          }}>
                            <p style={{ 
                              margin: "0 0 8px", 
                              fontSize: 11, 
                              fontWeight: 700, 
                              color: "#888", 
                              textTransform: "uppercase", 
                              letterSpacing: "0.6px", 
                              display: "flex", 
                              alignItems: "center", 
                              gap: 4 
                            }}>
                              <Plus size={11} color="#c62d23" /> Request More
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <input
                                type="text"
                                value={requestData[order._id]?.partName || ""}
                                placeholder="Part name"
                                onChange={(e) => setRequestData((p) => ({ 
                                  ...p, 
                                  [order._id]: { ...p[order._id], partName: e.target.value } 
                                }))}
                                style={{ 
                                  width: "100%",
                                  border: "1.5px solid #e0e0e0", 
                                  borderRadius: 7, 
                                  padding: "8px 10px", 
                                  fontSize: 12, 
                                  transition: "border-color .2s",
                                  boxSizing: "border-box"
                                }}
                              />
                              <div style={{ display: "flex", gap: 6 }}>
                                <input
                                  type="number"
                                  value={requestData[order._id]?.quantity || ""}
                                  placeholder="Qty"
                                  onChange={(e) => setRequestData((p) => ({ 
                                    ...p, 
                                    [order._id]: { ...p[order._id], quantity: Number(e.target.value) } 
                                  }))}
                                  style={{ 
                                    flex: 1,
                                    border: "1.5px solid #e0e0e0", 
                                    borderRadius: 7, 
                                    padding: "8px 10px", 
                                    fontSize: 12, 
                                    transition: "border-color .2s" 
                                  }}
                                />
                                <button
                                  onClick={() => sendInventoryRequest(order._id)}
                                  disabled={actionLoading[order._id + "_req"]}
                                  style={{
                                    background: "#2563eb", 
                                    color: "#fff", 
                                    border: "none", 
                                    borderRadius: 7,
                                    padding: "8px 16px", 
                                    fontSize: 12, 
                                    fontWeight: 600, 
                                    cursor: "pointer",
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 4,
                                    justifyContent: "center",
                                    transition: "background .2s",
                                    flexShrink: 0
                                  }}
                                >
                                  {actionLoading[order._id + "_req"]
                                    ? <Loader2 size={12} style={{ animation: "spin .6s linear infinite" }} />
                                    : <><Plus size={12} /> Send</>}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ── Action buttons - MOBILE FULL WIDTH ── */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
                            {!acceptedOrders[order._id] ? (
                              <button
                                onClick={() => acceptOrder(order._id, addedItems[order._id] || {})}
                                disabled={actionLoading[order._id + "_accept"]}
                                style={{
                                  background: "#16a34a", 
                                  color: "#fff", 
                                  border: "none", 
                                  borderRadius: 8,
                                  padding: "10px 20px", 
                                  fontSize: 13, 
                                  fontWeight: 600, 
                                  cursor: "pointer",
                                  display: "flex", 
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 5,
                                  width: "100%",
                                  transition: "background .2s",
                                }}
                              >
                                {actionLoading[order._id + "_accept"]
                                  ? <Loader2 size={14} style={{ animation: "spin .6s linear infinite" }} />
                                  : <><CheckCircle size={14} /> Confirm Acceptance</>}
                              </button>
                            ) : (
                              <button
                                onClick={() => markCompleted(order._id)}
                                disabled={actionLoading[order._id + "_complete"]}
                                style={{
                                  background: "#15803d", 
                                  color: "#fff", 
                                  border: "none", 
                                  borderRadius: 8,
                                  padding: "10px 20px", 
                                  fontSize: 13, 
                                  fontWeight: 600, 
                                  cursor: "pointer",
                                  display: "flex", 
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 5,
                                  width: "100%",
                                  transition: "background .2s",
                                }}
                              >
                                {actionLoading[order._id + "_complete"]
                                  ? <Loader2 size={14} style={{ animation: "spin .6s linear infinite" }} />
                                  : <><CheckCircle size={14} /> Mark Completed</>}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}