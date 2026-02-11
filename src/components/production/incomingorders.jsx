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
  ChevronUp,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ============ CONSTANTS ============ */
const API = process.env.NEXT_PUBLIC_API_URL;
const WORKERS = ["Mintoo", "Sajid", "Jamshed", "Ehtram"];
const ALL_TABS = ["All", "Pending", "In Progress", "Completed"];

/* ============ HELPERS ============ */
const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
const hdrs = () => ({ Authorization: `Bearer ${token()}` });

/* ============ MAIN PAGE ============ */
export default function ProductionOrdersPage() {
  const router = useRouter();

  /* ─── state ─── */
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkers, setSelectedWorkers] = useState({});
  const [workerInventory, setWorkerInventory] = useState({});
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [acceptedOrders, setAcceptedOrders] = useState({});
  const [acceptQty, setAcceptQty] = useState({});
  const [requestData, setRequestData] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [activeTab, setActiveTab] = useState("All");
  const [inventorySearch, setInventorySearch] = useState({});
  const [addedItems, setAddedItems] = useState({});

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
      const res = await axios.get(`${API}/inventory`, { headers: hdrs() });
      setWorkerInventory({
        ALL_PRODUCTION: (res.data.inventory || []).filter((i) => i.location.startsWith("PROD_")),
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

  const assignWorker = async (orderId) => {
    if (!selectedWorkers[orderId]) return;
    setLoad(orderId + "_assign", true);
    try {
      await axios.put(
        `${API}/orders/${orderId}/assign-production`,
        { workerName: selectedWorkers[orderId] },
        { headers: hdrs() }
      );
      toast.success(`Worker ${selectedWorkers[orderId]} assigned successfully`);
      setExpandedOrder(orderId);
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to assign worker. Please try again.");
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

    const invalidParts = Object.entries(partsToValidate).filter(([name, qty]) => qty !== order.quantity);

    if (invalidParts.length > 0) {
      const message = invalidParts.map(([name, qty]) => `${name}: ${qty} (required: ${order.quantity})`).join("\n");
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
      await axios.post(`${API}/orders/${orderId}/production-accept`, { parts }, { headers: hdrs() });
      setAcceptedOrders((p) => ({ ...p, [orderId]: true }));
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
      await axios.patch(`${API}/orders/${orderId}/progress`, { progress: "PRODUCTION_COMPLETED" }, { headers: hdrs() });
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

  /* ─── handle adding item to selection ─── */
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

  /* ─── remove item from selection ─── */
  const removeItemFromSelection = (orderId, partName) => {
    setAddedItems((prev) => {
      const updated = { ...prev };
      if (updated[orderId]) {
        const removedQty = updated[orderId][partName];
        delete updated[orderId][partName];
        if (Object.keys(updated[orderId]).length === 0) {
          delete updated[orderId];
        }
        if (removedQty) {
          toast.success(`Removed ${removedQty} × ${partName} from production`);
        }
      }
      return updated;
    });
  };

  /* ─── grouping ─── */
  const pending = orders.filter((o) => o.progress === "PRODUCTION_PENDING" && !o.productionWorker);
  const inProgress = orders.filter(
    (o) => (o.progress === "PRODUCTION_PENDING" && o.productionWorker) || o.progress === "PRODUCTION_IN_PROGRESS"
  );
  const completed = orders.filter((o) => o.progress === "PRODUCTION_COMPLETED");

  /* ─── filtered list (tab) ─── */
  const visibleOrders =
    activeTab === "All" ? orders : activeTab === "Pending" ? pending : activeTab === "In Progress" ? inProgress : completed;

  /* ─── status helpers per order ─── */
  const getStatus = (order) => {
    if (order.progress === "PRODUCTION_COMPLETED") return "completed";
    if (order.progress === "PRODUCTION_IN_PROGRESS" || order.productionWorker) return "inProgress";
    return "pending";
  };

  const handleRowClick = (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    const status = getStatus(order);

    if (status === "inProgress") {
      setExpandedOrder((prev) => (prev === orderId ? null : orderId));
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

  /* ═══════ RENDER ═══════ */
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #fecaca',
            },
          },
        }}
      />
      
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
          {/* Desktop Header */}
          <div className="hidden md:block p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Package size={32} className="text-[#c62d23]" />
                  <span>Production Management</span>
                </h1>
                <p className="text-sm text-gray-600 mt-1">Manage production workflow and inventory</p>
              </div>

              <button
                onClick={() => router.push("/profile")}
                title="My Profile"
                className="text-gray-600 hover:text-[#c62d23] transition"
              >
                <UserCircle size={34} />
              </button>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden p-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={24} className="text-[#c62d23]" />
                <span>Production</span>
              </h1>
              <button
                onClick={() => router.push("/profile")}
                className="text-gray-600 hover:text-[#c62d23] transition p-2"
              >
                <UserCircle size={28} />
              </button>
            </div>
            
            {/* Mobile Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-red-50 border border-red-200 p-2 rounded-lg text-center">
                <div className="text-xs text-red-600 font-medium">Pending</div>
                <div className="text-lg font-bold text-red-700">{pending.length}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg text-center">
                <div className="text-xs text-blue-600 font-medium">Progress</div>
                <div className="text-lg font-bold text-blue-700">{inProgress.length}</div>
              </div>
              <div className="bg-green-50 border border-green-200 p-2 rounded-lg text-center">
                <div className="text-xs text-green-600 font-medium">Done</div>
                <div className="text-lg font-bold text-green-700">{completed.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-4 md:p-8 space-y-4 md:space-y-8">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
              <p className="mt-2 text-gray-500">Loading orders...</p>
            </div>
          ) : (
            <>
              {/* STATS - Desktop Only */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Pending"
                  value={pending.length}
                  icon={<Clock className="text-[#c62d23]" />}
                  onClick={() => setActiveTab("Pending")}
                  active={activeTab === "Pending"}
                />

                <StatCard
                  title="In Progress"
                  value={inProgress.length}
                  icon={<TrendingUp className="text-[#c62d23]" />}
                  onClick={() => setActiveTab("In Progress")}
                  active={activeTab === "In Progress"}
                />

                <StatCard
                  title="Completed"
                  value={completed.length}
                  icon={<Scissors className="text-[#c62d23]" />}
                  onClick={() => setActiveTab("Completed")}
                  active={activeTab === "Completed"}
                />
              </div>

              {/* FILTER TABS */}
              <div className="flex gap-2 bg-white rounded-xl p-1 border border-gray-200 shadow-sm overflow-x-auto">
                {ALL_TABS.map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                        active ? "bg-[#c62d23] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* ORDERS CONTAINER */}
              {visibleOrders.length === 0 ? (
                <div className="text-center text-gray-500 py-16">
                  <Package size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No orders in this category</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleOrders.map((order, index) => {
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
                        index={index}
                        // Expanded section props
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
                        acceptedOrders={acceptedOrders}
                        onAccept={() => acceptOrder(order._id, addedItems[order._id] || {})}
                        acceptLoading={actionLoading[order._id + "_accept"]}
                        onComplete={() => markCompleted(order._id)}
                        completeLoading={actionLoading[order._id + "_complete"]}
                        getTotalAddedQty={getTotalAddedQty}
                        getMergedParts={getMergedParts}
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

/* ================= STAT CARD COMPONENT ================= */
const StatCard = ({ title, value, icon, onClick, active }) => (
  <div
    onClick={onClick}
    className={`bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full cursor-pointer ${
      active ? "ring-2 ring-[#c62d23]" : ""
    } hover:border-[#c62d23]`}
    style={{
      borderLeft: "4px solid #c62d23",
    }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
      <span>{active ? "Click to show all" : "Click to view details"}</span>
      <span className="text-[#c62d23]">→</span>
    </div>
  </div>
);

/* ================= ORDER CARD COMPONENT ================= */
const OrderCard = ({
  order,
  status,
  isOpen,
  isPending,
  isInProg,
  onToggle,
  selectedWorker,
  onWorkerChange,
  onAssign,
  assignLoading,
  index,
  workerInventory,
  addedItems,
  inventorySearch,
  onSearchChange,
  acceptQty,
  onQtyChange,
  onAddItem,
  onRemoveItem,
  requestData,
  onRequestDataChange,
  onSendRequest,
  requestLoading,
  onRefreshInventory,
  acceptedOrders,
  onAccept,
  acceptLoading,
  onComplete,
  completeLoading,
  getTotalAddedQty,
  getMergedParts,
}) => {
  return (
    <>
      {/* MOBILE CARD VIEW */}
      <div className="md:hidden bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Order ID</p>
                <p className="font-bold text-gray-900">{order.orderId}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                status === "completed" ? "bg-green-50 text-green-700 border border-green-200" :
                status === "inProgress" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {status === "completed" ? "Completed" : status === "inProgress" ? "In Progress" : "Pending"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 font-medium">Chair Model</p>
                <p className="font-medium text-gray-900 truncate">{order.chairModel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Quantity</p>
                <p className="font-bold text-gray-900">{order.quantity}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Worker</p>
              {order.productionWorker ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <UserCircle size={12} />
                  {order.productionWorker}
                </span>
              ) : (
                <span className="text-gray-400 text-xs">Not assigned</span>
              )}
            </div>

            {isPending && (
              <div className="flex gap-2">
                <select
                  value={selectedWorker || ""}
                  onChange={(e) => onWorkerChange(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
                >
                  <option value="">Select Worker</option>
                  {WORKERS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
                <button
                  onClick={onAssign}
                  disabled={!selectedWorker || assignLoading}
                  className="bg-[#c62d23] hover:bg-[#a82419] disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed"
                >
                  {assignLoading ? <Loader2 size={16} className="animate-spin" /> : "Assign"}
                </button>
              </div>
            )}

            {isInProg && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="w-full flex items-center justify-center gap-2 text-[#c62d23] hover:bg-red-50 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                {isOpen ? "Close Details" : "View Details"}
                <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* EXPANDED SECTION - MOBILE */}
        {isInProg && isOpen && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
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
              acceptedOrders={acceptedOrders}
              onAccept={onAccept}
              acceptLoading={acceptLoading}
              onComplete={onComplete}
              completeLoading={completeLoading}
              getTotalAddedQty={getTotalAddedQty}
              getMergedParts={getMergedParts}
            />
          </div>
        )}
      </div>

      {/* DESKTOP TABLE ROW - Hidden on mobile */}
      <div className="hidden md:block">
        <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden ${
          index === 0 ? "" : ""
        }`}>
          <div
            onClick={isInProg ? onToggle : undefined}
            className={`${isInProg ? "cursor-pointer hover:bg-gray-50" : ""} transition-colors`}
          >
            <div className="grid grid-cols-6 gap-4 p-4 items-center">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Order ID</p>
                <p className="font-semibold text-gray-900">{order.orderId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Chair Model</p>
                <p className="font-medium text-gray-900">{order.chairModel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Quantity</p>
                <p className="font-semibold text-gray-900">{order.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Worker</p>
                {order.productionWorker ? (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                    <UserCircle size={12} />
                    {order.productionWorker}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">Not assigned</span>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status === "completed" ? "bg-green-50 text-green-700 border border-green-200" :
                  status === "inProgress" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                  "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {status === "completed" ? "Completed" : status === "inProgress" ? "In Progress" : "Pending"}
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                {isPending && (
                  <div className="flex gap-2">
                    <select
                      value={selectedWorker || ""}
                      onChange={(e) => onWorkerChange(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
                    >
                      <option value="">Select Worker</option>
                      {WORKERS.map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                    <button
                      onClick={onAssign}
                      disabled={!selectedWorker || assignLoading}
                      className="bg-[#c62d23] hover:bg-[#a82419] disabled:bg-gray-300 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:cursor-not-allowed"
                    >
                      {assignLoading ? <Loader2 size={14} className="animate-spin" /> : "Assign"}
                    </button>
                  </div>
                )}
                {isInProg && (
                  <button
                    onClick={onToggle}
                    className="text-[#c62d23] hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1"
                  >
                    {isOpen ? "Close" : "View Details"}
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* EXPANDED SECTION - DESKTOP */}
          {isInProg && isOpen && (
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
                acceptedOrders={acceptedOrders}
                onAccept={onAccept}
                acceptLoading={acceptLoading}
                onComplete={onComplete}
                completeLoading={completeLoading}
                getTotalAddedQty={getTotalAddedQty}
                getMergedParts={getMergedParts}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* ================= EXPANDED ORDER DETAILS ================= */
const ExpandedOrderDetails = ({
  order,
  workerInventory,
  addedItems,
  inventorySearch,
  onSearchChange,
  acceptQty,
  onQtyChange,
  onAddItem,
  onRemoveItem,
  requestData,
  onRequestDataChange,
  onSendRequest,
  requestLoading,
  onRefreshInventory,
  acceptedOrders,
  onAccept,
  acceptLoading,
  onComplete,
  completeLoading,
  getTotalAddedQty,
  getMergedParts,
}) => {
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-semibold">Worker:</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
              <UserCircle size={12} />
              {order.productionWorker}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-semibold">Required:</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
              {order.quantity}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-semibold">Added:</span>
            {(() => {
              const totalAdded = getTotalAddedQty(order);
              const isComplete = totalAdded === order.quantity;
              const isOver = totalAdded > order.quantity;

              return (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isComplete
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : isOver
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                  }`}
                >
                  {totalAdded}
                </span>
              );
            })()}
          </div>
        </div>

        <button
          onClick={onRefreshInventory}
          className="bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 transition-all inline-flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <Layers size={16} className="text-[#c62d23]" />
          <span className="hidden sm:inline">Refresh Inventory</span>
          <span className="sm:hidden">Refresh</span>
        </button>
      </div>

      {/* QUANTITY PROGRESS BAR */}
      {(() => {
        const totalAdded = getTotalAddedQty(order);
        const percentage = Math.min((totalAdded / order.quantity) * 100, 100);
        const isComplete = totalAdded === order.quantity;
        const isOver = totalAdded > order.quantity;

        return (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-700">Quantity Progress</span>
              <span
                className={`text-xs font-bold ${
                  isComplete ? "text-green-600" : isOver ? "text-red-600" : "text-yellow-600"
                }`}
              >
                {totalAdded} / {order.quantity}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  isComplete ? "bg-green-500" : isOver ? "bg-red-500" : "bg-yellow-500"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {isOver && (
              <p className="text-xs text-red-600 mt-2 font-medium">
                ⚠️ Excess quantity! Remove {totalAdded - order.quantity} units.
              </p>
            )}

            {!isComplete && !isOver && totalAdded > 0 && (
              <p className="text-xs text-yellow-600 mt-2 font-medium">
                Add {order.quantity - totalAdded} more units to complete.
              </p>
            )}
          </div>
        );
      })()}

      {/* ADDED ITEMS */}
      {addedItems && Object.keys(addedItems).length > 0 && (
        <div>
          <p className="text-sm font-semibold text-green-700 mb-3 uppercase tracking-wide">
            Added to Production
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(addedItems).map(([name, qty]) => (
              <div
                key={name}
                className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-green-800 capitalize">{name}</div>
                  <div className="text-sm font-bold text-green-700">Qty: {qty}</div>
                </div>
                <button
                  onClick={() => onRemoveItem(name)}
                  className="text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-colors"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search products..."
            value={inventorySearch || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
          />
        </div>
      </div>

      {/* INVENTORY GRID */}
      {workerInventory.ALL_PRODUCTION && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Available Inventory
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(() => {
              const grouped = (workerInventory.ALL_PRODUCTION || [])
                .filter((i) => i.type === "SPARE")
                .reduce((a, i) => {
                  a[i.partName] = (a[i.partName] || 0) + i.quantity;
                  return a;
                }, {});

              const searchTerm = (inventorySearch || "").toLowerCase();
              const filtered = Object.entries(grouped)
                .map(([name, qty]) => {
                  // Calculate remaining quantity after subtracting added items
                  const addedQty = addedItems?.[name.toLowerCase()] || 0;
                  const remainingQty = qty - addedQty;
                  return [name, remainingQty];
                })
                .filter(([name, remainingQty]) => {
                  // Only show items with remaining quantity > 0 and matching search
                  if (remainingQty <= 0) return false;
                  return name.toLowerCase().includes(searchTerm);
                })
                .slice(0, 8);

              if (filtered.length === 0) {
                return (
                  <div className="col-span-full text-center py-8 text-gray-500 text-sm">
                    {searchTerm ? "No matching products" : "No products available"}
                  </div>
                );
              }

              return filtered.map(([name, remainingQty]) => (
                <div
                  key={name}
                  className="bg-white border border-gray-200 rounded-xl p-3 hover:border-[#c62d23] transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700 capitalize truncate">
                      {name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {remainingQty}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max={remainingQty}
                      placeholder="Qty"
                      value={acceptQty[name] || ""}
                      onChange={(e) => onQtyChange(name, Number(e.target.value))}
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
                    />
                    <button
                      onClick={() => onAddItem(name, remainingQty)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
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

      {/* REQUEST MORE */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
          <Plus size={14} className="text-[#c62d23]" />
          Request Additional Inventory
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={requestData?.partName || ""}
            placeholder="Part name"
            onChange={(e) =>
              onRequestDataChange({ ...requestData, partName: e.target.value })
            }
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
          />
          <input
            type="number"
            value={requestData?.quantity || ""}
            placeholder="Qty"
            onChange={(e) =>
              onRequestDataChange({ ...requestData, quantity: Number(e.target.value) })
            }
            className="w-full sm:w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
          />
          <button
            onClick={onSendRequest}
            disabled={requestLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed inline-flex items-center gap-2 justify-center"
          >
            {requestLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Send size={14} />
                Send Request
              </>
            )}
          </button>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3 pt-2">
        {!acceptedOrders[order._id] ? (
          <button
            onClick={onAccept}
            disabled={acceptLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {acceptLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <CheckCircle size={16} />
                Confirm Acceptance
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onComplete}
            disabled={completeLoading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {completeLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <CheckCircle size={16} />
                Mark Completed
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};