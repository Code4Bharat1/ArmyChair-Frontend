"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Package,
  CheckCircle,
  UserCircle,
  Plus,
  Layers,
  Loader2,
  Clock,
  TrendingUp,
  Scissors,
  Search,
  X,
  Send,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ============ CONSTANTS ============ */
const API = process.env.NEXT_PUBLIC_API_URL;
const WORKERS = ["Mintoo", "Sajid", "Jamshed", "Ehtram"];
const ALL_TABS = ["All", "Pending", "In Progress", "Completed"];

/* ============ HELPERS ============ */
const token = () =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null;
const hdrs = () => ({ Authorization: `Bearer ${token()}` });

const getOrderItemLabel = (order) => {
  if (order.items && order.items.length > 1) return `${order.items.length} items`;
  if (order.items && order.items.length === 1) return order.items[0].name;
  return order.chairModel;
};

const getOrderTotalQty = (order) => {
  if (order.items && order.items.length > 0)
    return order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  return order.quantity;
};

/* ============ MAIN PAGE ============ */
export default function ProductionOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkers, setSelectedWorkers] = useState({});
  const [workerInventory, setWorkerInventory] = useState({});
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [acceptQty, setAcceptQty] = useState({});
  const [requestData, setRequestData] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [activeTab, setActiveTab] = useState("All");
  const [inventorySearch, setInventorySearch] = useState({});
  const [addedItems, setAddedItems] = useState({});
  const [itemWorkers, setItemWorkers] = useState({});

  /* ─── auth ─── */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user || user.role !== "production") router.push("/login");
  }, [router]);

  /* ─── fetch ─── */
  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers: hdrs() });
      const activeInProduction = ["PRODUCTION_PENDING", "PRODUCTION_IN_PROGRESS"];
      const productionDone = [
        "PRODUCTION_COMPLETED",
        "FITTING_IN_PROGRESS",
        "FITTING_COMPLETED",
        "DISPATCHED",
        "DELIVERED",
      ];
      setOrders(
        (res.data.orders || []).filter(
          (o) =>
            o.orderType === "FULL" &&
            (activeInProduction.includes(o.progress) || productionDone.includes(o.progress))
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ─── inventory ─── */
 const fetchProductionInventory = async () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    // ✅ Use the dedicated production endpoint
    const res = await axios.get(
      `${API}/inventory/production-stock?location=PROD_${user.name}`,
      { headers: hdrs() }
    );
    setWorkerInventory({
      ALL_PRODUCTION: res.data.inventory || [],
    });
  } catch (e) {
    console.error(e);
  }
};

  /* ─── actions ─── */
  const setLoad = (key, val) => setActionLoading((p) => ({ ...p, [key]: val }));

  const sendInventoryRequest = async (orderId) => {
    const d = requestData[orderId];
    if (!d?.partName || !d?.quantity || d.quantity <= 0) {
      toast.error("Please enter a valid part name and quantity");
      return;
    }
    setLoad(orderId + "_req", true);
    try {
      await axios.post(
        `${API}/production/inward`,
        {
          partName: d.partName,
          quantity: d.quantity,
          location: `PROD_${selectedWorkers[orderId] || "Mintoo"}`,
        },
        { headers: hdrs() }
      );
      toast.success("Material request sent to warehouse successfully");
      setRequestData((p) => ({ ...p, [orderId]: { partName: "", quantity: "" } }));
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to send request. Please try again.");
    } finally {
      setLoad(orderId + "_req", false);
    }
  };

  /* ─── 🔥 FIXED: assignWorker — no throw inside, proper try/catch ─── */
  const assignWorker = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    const map = itemWorkers[orderId];

    if (!order) {
      toast.error("Order not found");
      return;
    }

    // Validate all items have a worker selected
    if (!order.items || order.items.length === 0) {
      toast.error("No items found in this order");
      return;
    }

    const missingWorkers = order.items.filter((item) => !map?.[item.name]);
    if (missingWorkers.length > 0) {
      toast.error(
        `Please assign workers to: ${missingWorkers.map((i) => i.name).join(", ")}`
      );
      return;
    }

    const assignments = order.items.map((item) => ({
      product: item.name,
      quantity: item.quantity,
      worker: map[item.name],
    }));

    setLoad(orderId + "_assign", true);
    try {
      await axios.post(
        `${API}/orders/${orderId}/assign-production-items`,
        { assignments },
        { headers: hdrs() }
      );
      toast.success("Workers assigned successfully!");
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.message || "Assignment failed. Please try again.");
    } finally {
      setLoad(orderId + "_assign", false);
    }
  };

  const acceptOrder = async (orderId, parts) => {
    const order = orders.find((o) => o._id === orderId);
    if (!parts || !Object.keys(parts).length) {
      toast.error("Please add parts before accepting the order");
      return;
    }

    const partsToValidate = getMergedParts(order);

    if (Object.keys(partsToValidate).length === 0) {
      toast.error("Please add parts before accepting the order");
      return;
    }

    const invalidParts = Object.entries(partsToValidate).filter(
      ([name, qty]) => qty !== order.quantity
    );

    if (invalidParts.length > 0) {
      toast.error(
        <div>
          <p className="font-semibold mb-1">Quantity mismatch detected</p>
          <p className="text-xs">Each product must be exactly {order.quantity}</p>
          <div className="mt-2 text-xs space-y-1">
            {invalidParts.map(([name, qty]) => (
              <div key={name}>
                • {name}: {qty} (need {order.quantity})
              </div>
            ))}
          </div>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    setLoad(orderId + "_accept", true);
    try {
      await axios.post(
        `${API}/orders/${orderId}/production-accept`,
        { parts },
        { headers: hdrs() }
      );
      setAddedItems((prev) => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
      toast.success("Order accepted successfully!");
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to accept order. Please try again.");
    } finally {
      setLoad(orderId + "_accept", false);
    }
  };

  const markCompleted = async (orderId) => {
    setLoad(orderId + "_complete", true);
    try {
      await axios.patch(
        `${API}/orders/${orderId}/progress`,
        { progress: "PRODUCTION_COMPLETED" },
        { headers: hdrs() }
      );
      toast.success("Production completed successfully!");
      setAddedItems((prev) => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update status. Please try again.");
    } finally {
      setLoad(orderId + "_complete", false);
    }
  };

  const addItemToSelection = (orderId, partName, totalQty) => {
    const qty = acceptQty[partName] || 0;
    const order = orders.find((o) => o._id === orderId);

    if (qty <= 0 || qty > totalQty) {
      toast.error(`Please enter a quantity between 1 and ${totalQty}`);
      return;
    }

    if (qty > order.quantity) {
      toast.error(`Cannot add more than ${order.quantity} for this product`);
      return;
    }

    const normalized = partName.trim().toLowerCase();

    setAddedItems((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [normalized]: (prev[orderId]?.[normalized] || 0) + qty,
      },
    }));

    setAcceptQty((prev) => {
      const updated = { ...prev };
      delete updated[partName];
      return updated;
    });

    toast.success(`Added ${qty} × ${partName} to production`);
  };

  const removeItemFromSelection = (orderId, partName) => {
    setAddedItems((prev) => {
      const updated = { ...prev };
      if (updated[orderId]) {
        const removedQty = updated[orderId][partName];
        delete updated[orderId][partName];
        if (Object.keys(updated[orderId]).length === 0) delete updated[orderId];
        if (removedQty) toast.success(`Removed ${removedQty} × ${partName}`);
      }
      return updated;
    });
  };

  /* ─── grouping ─── */
  const PRODUCTION_DONE = [
    "PRODUCTION_COMPLETED",
    "FITTING_IN_PROGRESS",
    "FITTING_COMPLETED",
    "DISPATCHED",
    "DELIVERED",
  ];

  const hasAssignment = (o) => o.productionAssignments?.length || o.productionWorker;

  const pending = orders.filter(
    (o) => o.progress === "PRODUCTION_PENDING" && !hasAssignment(o)
  );
  const inProgress = orders.filter(
    (o) =>
      (o.progress === "PRODUCTION_PENDING" && hasAssignment(o)) ||
      o.progress === "PRODUCTION_IN_PROGRESS"
  );
  const completed = orders.filter((o) => PRODUCTION_DONE.includes(o.progress));

  const visibleOrders =
    activeTab === "All"
      ? orders
      : activeTab === "Pending"
      ? pending
      : activeTab === "In Progress"
      ? inProgress
      : completed;

  const getStatus = (order) => {
    if (PRODUCTION_DONE.includes(order.progress)) return "completed";
    if (order.progress === "PRODUCTION_IN_PROGRESS" || hasAssignment(order)) return "inProgress";
    return "pending";
  };

  const handleRowClick = (orderId) => {
  const order = orders.find((o) => o._id === orderId);
  if (order?.items && order.items.length > 0) {
    setExpandedOrder((prev) => {
      const isOpening = prev !== orderId;
      if (isOpening) {
        fetchProductionInventory(); // ✅ auto-fetch on expand
      }
      return isOpening ? orderId : null;
    });
  }
};

  const getMergedParts = (order) => {
    const backendParts = order.productionParts || {};
    const localParts = addedItems[order._id] || {};
    const merged = { ...backendParts };
    Object.entries(localParts).forEach(([key, val]) => {
      merged[key] = (merged[key] || 0) + val;
    });
    return merged;
  };

  const getTotalAddedQty = (order) => {
    const merged = getMergedParts(order);
    const quantities = Object.values(merged);
    if (!quantities.length) return 0;
    return Math.min(...quantities);
  };

  const isOrderAccepted = (order) =>
    order.progress === "PRODUCTION_IN_PROGRESS" || PRODUCTION_DONE.includes(order.progress);

  return (
    <div className="flex min-h-screen bg-[#f5f5f5] text-gray-900">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#1f2937",
            border: "1px solid #e5e7eb",
            padding: "12px 16px",
            borderRadius: "12px",
            fontSize: "14px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          },
          success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#fff" },
            style: { border: "1px solid #fecaca" },
          },
        }}
      />

      <div className="flex-1 overflow-auto">
        {/* ═══════════════ HEADER ═══════════════ */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          {/* Desktop */}
          <div className="hidden md:block px-8 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#c62d23] rounded-xl flex items-center justify-center">
                  <Package size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">
                    Production Management
                  </h1>
                  <p className="text-xs text-gray-500">Manage workflow and inventory</p>
                </div>
              </div>
              <button
                onClick={() => router.push("/profile")}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-[#c62d23] transition"
              >
                <UserCircle size={20} />
              </button>
            </div>
          </div>

          {/* ─── Mobile Header ─── */}
          <div className="md:hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#c62d23] rounded-lg flex items-center justify-center">
                  <Package size={15} className="text-white" />
                </div>
                <span className="text-base font-bold text-gray-900 tracking-tight">
                  Production
                </span>
              </div>
              <button
                onClick={() => router.push("/profile")}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <UserCircle size={17} />
              </button>
            </div>

            {/* Stat chips */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
              {[
                { label: "Pending", count: pending.length, color: "red", tab: "Pending" },
                { label: "In Progress", count: inProgress.length, color: "blue", tab: "In Progress" },
                { label: "Completed", count: completed.length, color: "green", tab: "Completed" },
              ].map(({ label, count, color, tab }) => {
                const colorMap = {
                  red: activeTab === tab
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-700 border border-red-200",
                  blue: activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-700 border border-blue-200",
                  green: activeTab === tab
                    ? "bg-green-600 text-white"
                    : "bg-green-50 text-green-700 border border-green-200",
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${colorMap[color]}`}
                  >
                    <span className="font-bold">{count}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════════ BODY ═══════════════ */}
        <div className="p-4 md:p-8 space-y-4 md:space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-2 border-[#c62d23] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 font-medium">Loading orders...</p>
            </div>
          ) : (
            <>
              {/* Desktop Stats */}
              <div className="hidden md:grid grid-cols-3 gap-4">
                {[
                  { title: "Pending", value: pending.length, icon: <Clock size={18} />, tab: "Pending", color: "#ef4444" },
                  { title: "In Progress", value: inProgress.length, icon: <TrendingUp size={18} />, tab: "In Progress", color: "#3b82f6" },
                  { title: "Completed", value: completed.length, icon: <Scissors size={18} />, tab: "Completed", color: "#10b981" },
                ].map(({ title, value, icon, tab, color }) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`bg-white border rounded-2xl p-5 text-left transition-all hover:shadow-md ${
                      activeTab === tab ? "ring-2 ring-[#c62d23] border-transparent" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-600">{title}</span>
                      <span style={{ color }}>{icon}</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                  </button>
                ))}
              </div>

              {/* Tab Bar */}
              <div className="flex gap-1.5 bg-white rounded-xl p-1 border border-gray-200 shadow-sm overflow-x-auto">
                {ALL_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab
                        ? "bg-[#c62d23] text-white shadow-sm"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Orders */}
              {visibleOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <Package size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">No orders in this category</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleOrders.map((order) => {
                    const status = getStatus(order);
                    const isOpen = expandedOrder === order._id;
                    const isPending = status === "pending";
                    const isInProg = status === "inProgress";

                    return (
                      <OrderCard
                        key={order._id}
                        order={order}
                        status={status}
                        isOpen={isOpen}
                        isPending={isPending}
                        isInProg={isInProg}
                        onToggle={() => handleRowClick(order._id)}
                        selectedWorker={selectedWorkers[order._id]}
                        onWorkerChange={(worker) =>
                          setSelectedWorkers((p) => ({ ...p, [order._id]: worker }))
                        }
                        onAssign={() => assignWorker(order._id)}
                        assignLoading={actionLoading[order._id + "_assign"]}
                        workerInventory={workerInventory}
                        addedItems={addedItems[order._id]}
                        inventorySearch={inventorySearch[order._id]}
                        onSearchChange={(val) =>
                          setInventorySearch((p) => ({ ...p, [order._id]: val }))
                        }
                        acceptQty={acceptQty}
                        onQtyChange={(name, val) =>
                          setAcceptQty((p) => ({ ...p, [name]: val }))
                        }
                        onAddItem={(name, qty) => addItemToSelection(order._id, name, qty)}
                        onRemoveItem={(name) => removeItemFromSelection(order._id, name)}
                        requestData={requestData[order._id]}
                        onRequestDataChange={(data) =>
                          setRequestData((p) => ({ ...p, [order._id]: data }))
                        }
                        onSendRequest={() => sendInventoryRequest(order._id)}
                        requestLoading={actionLoading[order._id + "_req"]}
                        onRefreshInventory={fetchProductionInventory}
                        isOrderAccepted={isOrderAccepted(order)}
                        onAccept={() => acceptOrder(order._id, addedItems[order._id] || {})}
                        acceptLoading={actionLoading[order._id + "_accept"]}
                        onComplete={() => markCompleted(order._id)}
                        completeLoading={actionLoading[order._id + "_complete"]}
                        getTotalAddedQty={getTotalAddedQty}
                        getMergedParts={getMergedParts}
                        itemWorkers={itemWorkers}
                        setItemWorkers={setItemWorkers}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STATUS BADGE
═══════════════════════════════════════════ */
const StatusBadge = ({ status }) => {
  const styles = {
    completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    inProgress: "bg-blue-50 text-blue-700 border border-blue-200",
    pending: "bg-orange-50 text-orange-700 border border-orange-200",
  };
  const labels = {
    completed: "Completed",
    inProgress: "In Progress",
    pending: "Pending",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

/* ═══════════════════════════════════════════
   ORDER CARD
═══════════════════════════════════════════ */
const OrderCard = ({
  order, status, isOpen, isPending, isInProg, onToggle,
  selectedWorker, onWorkerChange, onAssign, assignLoading,
  workerInventory, addedItems, inventorySearch, onSearchChange,
  acceptQty, onQtyChange, onAddItem, onRemoveItem,
  requestData, onRequestDataChange, onSendRequest, requestLoading,
  onRefreshInventory, isOrderAccepted, onAccept, acceptLoading,
  onComplete, completeLoading, getTotalAddedQty, getMergedParts,
  itemWorkers, setItemWorkers,
}) => {
  const workerDisplay = order.productionAssignments?.length
    ? [...new Set(order.productionAssignments.map((a) => a.worker))].join(", ")
    : order.productionWorker || null;

  return (
    <>
      {/* ─── MOBILE ─── */}
      <div className="md:hidden bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* Row 1: Order ID + Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
                Order ID
              </p>
              <p className="text-sm font-bold text-gray-900">{order.orderId}</p>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Row 2: Product + Qty */}
          <div className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
                Product
              </p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {getOrderItemLabel(order)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
                Qty
              </p>
              <p className="text-sm font-bold text-[#c62d23]">
                {getOrderTotalQty(order)}
              </p>
            </div>
          </div>

          {/* Row 3: Worker */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
                Worker
              </p>
              {workerDisplay ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                  <UserCircle size={12} />
                  {workerDisplay}
                </span>
              ) : (
                <span className="text-xs text-gray-400 italic">Not assigned</span>
              )}
            </div>
            {order.remark && (
              <div className="text-right max-w-[55%]">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
                  Remark
                </p>
                <p className="text-xs text-gray-600 truncate">{order.remark}</p>
              </div>
            )}
          </div>

          {/* ─── Pending: assign workers per item ─── */}
          {isPending && order.items?.length > 0 && (
            <div className="border border-orange-200 bg-orange-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-orange-800 uppercase tracking-wide flex items-center gap-1.5">
                <AlertCircle size={12} />
                Assign Workers to Each Product
              </p>
              {order.items.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <select
                    value={itemWorkers?.[order._id]?.[item.name] || ""}
                    onChange={(e) =>
                      setItemWorkers((prev) => ({
                        ...prev,
                        [order._id]: {
                          ...(prev[order._id] || {}),
                          [item.name]: e.target.value,
                        },
                      }))
                    }
                    className="w-28 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:border-[#c62d23] outline-none"
                  >
                    <option value="">Worker</option>
                    {WORKERS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                onClick={onAssign}
                disabled={assignLoading}
                className="w-full mt-1 bg-[#c62d23] hover:bg-[#a82419] disabled:bg-gray-300 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                {assignLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    <CheckCircle size={13} />
                    Confirm Assignment
                  </>
                )}
              </button>
            </div>
          )}

          {/* View Items Button */}
          {order.items?.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="w-full flex items-center justify-center gap-1.5 text-[#c62d23] bg-red-50 hover:bg-red-100 py-2 rounded-xl text-xs font-bold transition-all"
            >
              {isOpen ? "Hide Details" : "View Details"}
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {/* Expanded Panel */}
        {isOpen && (
          <div className="border-t border-gray-100 p-4 bg-gray-50">
            <ExpandedOrderDetails
              order={order}
              workerInventory={workerInventory}
              addedItems={addedItems}
              inventorySearch={inventorySearch}
              onSearchChange={onSearchChange}
              acceptQty={acceptQty}
              onQtyChange={onQtyChange}
              onAddItem={onAddItem}
              onRemoveItem={onRemoveItem}
              requestData={requestData}
              onRequestDataChange={onRequestDataChange}
              onSendRequest={onSendRequest}
              requestLoading={requestLoading}
              onRefreshInventory={onRefreshInventory}
              isOrderAccepted={isOrderAccepted}
              onAccept={onAccept}
              acceptLoading={acceptLoading}
              onComplete={onComplete}
              completeLoading={completeLoading}
              getTotalAddedQty={getTotalAddedQty}
              getMergedParts={getMergedParts}
              itemWorkers={itemWorkers}
              setItemWorkers={setItemWorkers}
            />
          </div>
        )}
      </div>

      {/* ─── DESKTOP ─── */}
      <div className="hidden md:block bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div
          onClick={order.items?.length > 0 ? onToggle : undefined}
          className={`grid grid-cols-8 gap-4 p-4 items-center transition-colors ${
            order.items?.length > 0 ? "cursor-pointer hover:bg-gray-50" : ""
          }`}
        >
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Order ID</p>
            <p className="text-sm font-semibold text-gray-900">{order.orderId}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Chair Model</p>
            <p className="text-sm font-medium text-gray-900">{getOrderItemLabel(order)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Remark</p>
            <p className="text-sm text-gray-700 truncate max-w-[160px]">{order.remark || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Quantity</p>
            <p className="text-sm font-bold text-gray-900">{getOrderTotalQty(order)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Worker</p>
            {workerDisplay ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <UserCircle size={11} />
                {workerDisplay}
              </span>
            ) : (
              <span className="text-gray-400 text-xs italic">Not assigned</span>
            )}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Status</p>
            <StatusBadge status={status} />
          </div>

          <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
            {isPending && order.items?.length > 0 && (
              <div className="space-y-2 border border-orange-200 bg-orange-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">
                  Assign Workers
                </p>
                {order.items.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="text-xs text-gray-700 truncate flex-1">{item.name}</span>
                    <select
                      value={itemWorkers?.[order._id]?.[item.name] || ""}
                      onChange={(e) =>
                        setItemWorkers((prev) => ({
                          ...prev,
                          [order._id]: {
                            ...(prev[order._id] || {}),
                            [item.name]: e.target.value,
                          },
                        }))
                      }
                      className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-[#c62d23] outline-none"
                    >
                      <option value="">Worker</option>
                      {WORKERS.map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <button
                  onClick={onAssign}
                  disabled={assignLoading}
                  className="w-full bg-[#c62d23] hover:bg-[#a82419] disabled:bg-gray-300 text-white py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  {assignLoading ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Assign All"}
                </button>
              </div>
            )}
            {order.items?.length > 0 && (
              <button
                onClick={onToggle}
                className="mt-2 w-full text-[#c62d23] hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center justify-center gap-1"
              >
                {isOpen ? "Close" : "View Items"}
                <ChevronDown size={13} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <ExpandedOrderDetails
              order={order}
              workerInventory={workerInventory}
              addedItems={addedItems}
              inventorySearch={inventorySearch}
              onSearchChange={onSearchChange}
              acceptQty={acceptQty}
              onQtyChange={onQtyChange}
              onAddItem={onAddItem}
              onRemoveItem={onRemoveItem}
              requestData={requestData}
              onRequestDataChange={onRequestDataChange}
              onSendRequest={onSendRequest}
              requestLoading={requestLoading}
              onRefreshInventory={onRefreshInventory}
              isOrderAccepted={isOrderAccepted}
              onAccept={onAccept}
              acceptLoading={acceptLoading}
              onComplete={onComplete}
              completeLoading={completeLoading}
              getTotalAddedQty={getTotalAddedQty}
              getMergedParts={getMergedParts}
              itemWorkers={itemWorkers}
              setItemWorkers={setItemWorkers}
            />
          </div>
        )}
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════
   EXPANDED ORDER DETAILS
═══════════════════════════════════════════ */
const ExpandedOrderDetails = ({
  order, workerInventory, addedItems, inventorySearch, onSearchChange,
  acceptQty, onQtyChange, onAddItem, onRemoveItem,
  requestData, onRequestDataChange, onSendRequest, requestLoading,
  onRefreshInventory, isOrderAccepted, onAccept, acceptLoading,
  onComplete, completeLoading, getTotalAddedQty, getMergedParts,
  itemWorkers, setItemWorkers,
}) => {

  const PRODUCTION_DONE = [
    "PRODUCTION_COMPLETED", "FITTING_IN_PROGRESS", "FITTING_COMPLETED",
    "DISPATCHED", "DELIVERED",
  ];
  const isFullyDone = PRODUCTION_DONE.includes(order.progress);

  return (
    <div className="space-y-5">
      {/* Order Items Summary — always visible */}
      {order.items?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
            Order Items
          </p>
          <div className="space-y-2">
            {order.items.map((item) => {
              const assignedWorker = order.productionAssignments?.find(
                (a) => a.product?.toLowerCase() === item.name?.toLowerCase()
              )?.worker;
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                    {assignedWorker && (
                      <p className="text-[10px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                        <UserCircle size={10} /> {assignedWorker}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-700">× {item.quantity}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ✅ COMPLETED: show only a done banner, nothing else */}
      {isFullyDone ? (
        <div className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-green-50 border border-green-200 text-green-700 font-bold">
          <CheckCircle size={18} />
          Production Completed ✓
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Worker", value: order.productionWorker || "—", style: "bg-blue-50 text-blue-700 border-blue-200" },
              { label: "Required", value: order.quantity, style: "bg-red-50 text-red-700 border-red-200" },
              {
                label: "Added",
                value: getTotalAddedQty(order),
                style: getTotalAddedQty(order) === order.quantity
                  ? "bg-green-50 text-green-700 border-green-200"
                  : getTotalAddedQty(order) > order.quantity
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200",
              },
            ].map(({ label, value, style }) => (
              <div key={label} className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${style}`}>
                <span className="opacity-70">{label}: </span>{value}
              </div>
            ))}
            <button
              onClick={onRefreshInventory}
              className="ml-auto bg-white hover:bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 transition-all inline-flex items-center gap-1.5"
            >
              <Layers size={13} className="text-[#c62d23]" />
              Load Inventory
            </button>
          </div>

          {/* Progress Bar */}
          {(() => {
            const total = getTotalAddedQty(order);
            const pct = Math.min((total / order.quantity) * 100, 100);
            const isOk = total === order.quantity;
            const isOver = total > order.quantity;
            return (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-gray-600">Quantity Progress</span>
                  <span className={`text-xs font-bold ${isOk ? "text-green-600" : isOver ? "text-red-600" : "text-yellow-600"}`}>
                    {total} / {order.quantity}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${isOk ? "bg-green-500" : isOver ? "bg-red-500" : "bg-yellow-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {isOver && <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Remove {total - order.quantity} excess units</p>}
                {!isOk && !isOver && total > 0 && <p className="text-xs text-yellow-600 mt-2 font-medium">Add {order.quantity - total} more to complete</p>}
              </div>
            );
          })()}

          {/* Added Items */}
          {addedItems && Object.keys(addedItems).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-2">Added to Production</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(addedItems).map(([name, qty]) => (
                  <div key={name} className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-green-800 capitalize leading-tight">{name}</p>
                      <p className="text-xs text-green-600 font-bold">{qty} pcs</p>
                    </div>
                    <button onClick={() => onRemoveItem(name)} className="text-red-500 hover:bg-red-100 p-1 rounded-lg transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={inventorySearch || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
            />
          </div>

          {/* Inventory Grid */}
          {workerInventory.ALL_PRODUCTION && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Available Inventory</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {(() => {
                  const grouped = (workerInventory.ALL_PRODUCTION || [])
                    .filter((i) => i.type === "SPARE")
                    .reduce((a, i) => { a[i.partName] = (a[i.partName] || 0) + i.quantity; return a; }, {});
                  const searchTerm = (inventorySearch || "").toLowerCase();
                  const filtered = Object.entries(grouped)
                    .map(([name, qty]) => [name, qty - (addedItems?.[name.toLowerCase()] || 0)])
                    .filter(([name, rem]) => rem > 0 && name.toLowerCase().includes(searchTerm))
                    .slice(0, 8);
                  if (!filtered.length)
                    return <div className="col-span-full text-center py-6 text-gray-400 text-sm">{inventorySearch ? "No matching items" : "No inventory available"}</div>;
                  return filtered.map(([name, rem]) => (
                    <div key={name} className="bg-white border border-gray-200 rounded-xl p-3 hover:border-[#c62d23] transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700 capitalize truncate">{name}</span>
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">{rem}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <input type="number" min="0" max={rem} placeholder="Qty" value={acceptQty[name] || ""} onChange={(e) => onQtyChange(name, Number(e.target.value))} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-[#c62d23] outline-none" />
                        <button onClick={() => onAddItem(name, rem)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all">Add</button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Request More */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus size={12} className="text-[#c62d23]" />
              Request Additional Inventory
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" value={requestData?.partName || ""} placeholder="Part name" onChange={(e) => onRequestDataChange({ ...requestData, partName: e.target.value })} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#c62d23] outline-none" />
              <input type="number" value={requestData?.quantity || ""} placeholder="Qty" onChange={(e) => onRequestDataChange({ ...requestData, quantity: Number(e.target.value) })} className="w-full sm:w-20 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#c62d23] outline-none" />
              <button onClick={onSendRequest} disabled={requestLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all inline-flex items-center gap-1.5 justify-center">
                {requestLoading ? <Loader2 size={14} className="animate-spin" /> : <><Send size={13} /> Send</>}
              </button>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-3 pt-1">
            {!isOrderAccepted ? (
              <button onClick={onAccept} disabled={acceptLoading} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-3.5 rounded-xl font-bold transition-all disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                {acceptLoading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Confirm Acceptance</>}
              </button>
            ) : (
              <button onClick={onComplete} disabled={completeLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-6 py-3.5 rounded-xl font-bold transition-all disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                {completeLoading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Mark Completed</>}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   COMPLETED ORDER ITEMS
═══════════════════════════════════════════ */
const CompletedOrderItems = ({ order }) => (
  <div className="space-y-3">
    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
      <CheckCircle size={12} className="text-green-600" />
      Completed Items
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {order.items.map((item, idx) => (
        <div
          key={idx}
          className="flex justify-between items-center bg-white border border-green-200 rounded-xl px-4 py-3"
        >
          <span className="text-sm font-semibold text-gray-800">{item.name}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
            × {item.quantity}
          </span>
        </div>
      ))}
    </div>
    {order.productionWorker && (
      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
        <UserCircle size={11} />
        Produced by <span className="font-semibold text-gray-700 ml-1">{order.productionWorker}</span>
      </p>
    )}
  </div>
);