"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  PackageCheck,
  CheckCircle,
  Truck,
  Package,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  UserCircle,
  Plus,
  Trash2,
  Pencil,
  Boxes,
  TrendingDown,
  Warehouse,
  MapPin,
  Building2,
  ArrowLeftRight,
  X,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";
import { useRouter } from "next/navigation";

export default function WarehouseOrders() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("FULL");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [partialPicks, setPartialPicks] = useState({});

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [inventoryPreview, setInventoryPreview] = useState({});

  const [showDecisionPanel, setShowDecisionPanel] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDelayed = (order) => {
    if (!order.deliveryDate) return false;

    const delivery = new Date(order.deliveryDate);
    delivery.setHours(0, 0, 0, 0);

    return (
      delivery < today && !["DISPATCHED", "COMPLETED"].includes(order.progress)
    );
  };

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers });

      const warehouseOrders = (res.data.orders || res.data).filter((o) =>
        [
          "ORDER_PLACED",
          "WAREHOUSE_COLLECTED",
          "FITTING_IN_PROGRESS",
          "FITTING_COMPLETED",
          "READY_FOR_DISPATCH",
          "DISPATCHED",
          "PARTIAL",
          "COMPLETED",
        ].includes(o.progress),
      );

      setOrders(warehouseOrders);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, activeFilter]);

  /* ================= STATUS UPDATES ================= */

  const fittingStarted = async (id) => {
    if (!window.confirm("Confirm fitting has started?")) return;

    try {
      setProcessingId(id);
      await axios.patch(
        `${API}/orders/${id}/progress`,
        { progress: "FITTING_IN_PROGRESS" },
        { headers },
      );
      fetchOrders();
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkReady = async (id) => {
    try {
      setProcessingId(id);
      await axios.patch(
        `${API}/orders/${id}/progress`,
        { progress: "READY_FOR_DISPATCH" },
        { headers },
      );
      fetchOrders();
    } catch (err) {
      alert("Failed to mark ready");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPartial = async (id) => {
    if (!window.confirm("Mark this order as PARTIAL?")) return;

    try {
      setProcessingId(id);
      await axios.patch(
        `${API}/orders/${id}/progress`,
        { progress: "PARTIAL" },
        { headers },
      );
      fetchOrders();
    } catch (err) {
      alert("Failed to mark partial");
    } finally {
      setProcessingId(null);
    }
  };

  const updatePartialPick = (inventoryId, value) => {
    const qty = Number(value);
    setPartialPicks((prev) => ({
      ...prev,
      [inventoryId]: qty > 0 ? qty : 0,
    }));
  };

  const handleDispatch = async (id) => {
    if (!window.confirm("Confirm dispatch of this order?")) return;

    try {
      setProcessingId(id);
      await axios.patch(
        `${API}/orders/${id}/progress`,
        { progress: "DISPATCHED" },
        { headers },
      );
      fetchOrders();
    } catch (err) {
      alert("Failed to dispatch order");
    } finally {
      setProcessingId(null);
    }
  };

  const fetchPickPreview = async (orderId) => {
    try {
      const res = await axios.get(
        `${API}/warehouse/order/${orderId}/pick-data`,
        { headers },
      );

      const parts = res.data.parts || [];
      const order = res.data.order;

      if (order.partialParts?.length) {
        parts.forEach((p) => {
          p.locations.forEach((l) => {
            const found = order.partialParts.find(
              (x) => x.inventoryId === l.inventoryId,
            );
            if (found) l.picked = found.qty;
          });
        });
      }

      setInventoryPreview((prev) => ({
        ...prev,
        [orderId]: parts,
      }));
    } catch (err) {
      console.error("Failed to fetch pick preview", err);
    }
  };

  /* ================= FILTER ================= */
  const filteredOrders = useMemo(() => {
    let data = [...orders];

    if (activeFilter === "DELAYED") {
      data = data.filter((o) => isDelayed(o));
    }

    if (activeFilter === "READY") {
      data = data.filter((o) => o.progress === "READY_FOR_DISPATCH");
    }

    const q = (search || "").toLowerCase();
    if (q) {
      data = data.filter(
        (o) =>
          o.orderId?.toLowerCase().includes(q) ||
          o.dispatchedTo?.toLowerCase().includes(q) ||
          o.chairModel?.toLowerCase().includes(q),
      );
    }

    return data;
  }, [orders, search, activeFilter]);

  const fullChairOrders = filteredOrders.filter((o) => o.orderType === "FULL");

  const sparePartOrders = filteredOrders.filter((o) => o.orderType === "SPARE");

  const activeOrders = activeTab === "FULL" ? fullChairOrders : sparePartOrders;

  const totalPages = Math.ceil(activeOrders.length / ITEMS_PER_PAGE);

  const paginatedOrders = activeOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  /* ================= STATS ================= */
  const totalOrders = orders.length;

  const delayedOrders = orders.filter((o) => isDelayed(o)).length;

  const readyForDispatch = orders.filter(
    (o) => o.progress === "READY_FOR_DISPATCH",
  ).length;

  /* ================= STATUS BADGE ================= */
  const getStatusBadge = (progress) => {
    const statusMap = {
      ORDER_PLACED: {
        label: "Pending Picking",
        color: "bg-amber-50 text-amber-700 border-amber-200",
      },
      WAREHOUSE_COLLECTED: {
        label: "Sent to Fitting",
        color: "bg-blue-50 text-blue-700 border-blue-200",
      },
      FITTING_IN_PROGRESS: {
        label: "Fitting In Progress",
        color: "bg-blue-50 text-blue-700 border-blue-200",
      },
      FITTING_COMPLETED: {
        label: "Returned from Fitting",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      },
      READY_FOR_DISPATCH: {
        label: "Ready for Dispatch",
        color: "bg-green-50 text-green-700 border-green-200",
      },
      DISPATCHED: {
        label: "Dispatched",
        color: "bg-green-50 text-green-700 border-green-200",
      },
      PARTIAL: {
        label: "Partial / Issue",
        color: "bg-amber-50 text-amber-700 border-amber-200",
      },
      COMPLETED: {
        label: "Completed",
        color: "bg-green-50 text-green-700 border-green-200",
      },
    };

    const status = statusMap[progress] || {
      label: "Processing",
      color: "bg-gray-50 text-gray-700 border-gray-200",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}
      >
        {status.label}
      </span>
    );
  };

  const sumPartQty = (parts, partName) => {
    if (!parts) return 0;

    const part = parts.find((p) => p.partName === partName);
    if (!part) return 0;

    let total = 0;

    for (const l of part.locations) {
      const picked = Number(l.picked || 0);

      if (picked > l.available) {
        throw new Error(
          `Picked quantity for ${partName} at ${l.location} exceeds available stock`,
        );
      }

      total += picked;
    }

    return total;
  };

  const getBuildableChairs = (parts) => {
    const seats = sumPartQty(parts, "seats");
    const back = sumPartQty(parts, "back");
    const wheels = sumPartQty(parts, "wheels");

    return Math.min(seats, back, wheels);
  };

  const handlePartialAccepted = async (orderId) => {
    let parts = inventoryPreview[orderId];
    if (!parts) return alert("No parts selected");

    const order = orders.find((o) => o._id === orderId);
    if (!order) return alert("Order not found");

    // 🔥 FILTER FOR SPARE
    if (order.orderType === "SPARE") {
      parts = parts.filter(
        (p) =>
          p.partName?.toLowerCase().trim() ===
          order.chairModel?.toLowerCase().trim(),
      );
    }

    let buildable;

    try {
      buildable = Math.min(...parts.map((p) => sumPartQty(parts, p.partName)));
    } catch (e) {
      return alert(e.message);
    }

    if (buildable > order.quantity) {
      return alert(
        `You selected parts for ${buildable} but order requires only ${order.quantity}.
Please reduce picks to exactly ${order.quantity}.`,
      );
    }

    if (buildable >= order.quantity) {
      // 🔥 SPARE ORDER → DIRECT DISPATCH
      if (order.orderType === "SPARE") {
        if (!confirm("All spare parts available. Mark as Ready for Dispatch?"))
          return;

        await axios.patch(
          `${API}/orders/${orderId}/progress`,
          { progress: "READY_FOR_DISPATCH" },
          { headers },
        );

        alert("Spare order marked Ready for Dispatch");
        fetchOrders();
        setExpandedOrderId(null);
        setShowDecisionPanel(false);
        return;
      }

      // 🔥 FULL ORDER → SEND TO FITTING
      if (!confirm("All parts available. Send full order to fitting?")) return;

      await axios.post(
        `${API}/warehouse/order/dispatch`,
        {
          orderId,
          items: parts.flatMap((p) =>
            p.locations
              .filter((l) => l.picked > 0)
              .map((l) => ({
                inventoryId: l.inventoryId,
                qty: l.picked,
              })),
          ),
        },
        { headers },
      );

      alert("Order sent to fitting successfully");
      fetchOrders();
      setExpandedOrderId(null);
      setShowDecisionPanel(false);
      return;
    }

    if (buildable === 0) return alert("Not enough parts selected");

    if (
      !confirm(`Only ${buildable} can be fulfilled. Save partial acceptance?`)
    )
      return;

    const items = [];
    parts.forEach((p) => {
      p.locations.forEach((l) => {
        if (l.picked > 0)
          items.push({
            inventoryId: l.inventoryId,
            qty: l.picked,
          });
      });
    });

    try {
      await axios.post(
        `${API}/warehouse/order/partial-accept`,
        { orderId, buildable, items },
        { headers },
      );

      alert(`Partial accepted for ${buildable}`);
      setExpandedOrderId(null);
      setShowDecisionPanel(false);
      fetchOrders();
    } catch (err) {
      alert("Partial accept failed");
    }
  };

  /* ================= ACTION BUTTON ================= */
  const renderAction = (o) => {
    const isLoading = processingId === o._id;

    if (o.progress === "ORDER_PLACED") {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (expandedOrderId === o._id) {
                setExpandedOrderId(null);
                setShowDecisionPanel(false);
              } else {
                setExpandedOrderId(o._id);
                setShowDecisionPanel(true);
                fetchPickPreview(o._id);
              }
            }}
            className="bg-[#c62d23] hover:bg-[#a82419] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            {expandedOrderId === o._id ? (
              <>
                <ChevronUp size={16} />
                Hide Inventory
              </>
            ) : (
              <>
                <Package size={16} />
                Check Inventory
              </>
            )}
          </button>
        </div>
      );
    }

    if (o.progress === "WAREHOUSE_COLLECTED") {
      return (
        <span className="text-blue-600 text-sm font-medium">
          Sent to Fitting
        </span>
      );
    }

    if (o.progress === "FITTING_COMPLETED") {
      return (
        <div className="flex gap-2">
          <button
            disabled={isLoading}
            onClick={() => handleMarkReady(o._id)}
            className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 text-white transition-all shadow-sm hover:shadow-md"
          >
            {isLoading ? "Processing..." : "Mark Complete"}
          </button>
        </div>
      );
    }

    if (o.progress === "READY_FOR_DISPATCH") {
  return (
    <div className="flex gap-2">
      <button
        disabled={processingId === o._id}
        onClick={() => handleDispatch(o._id)}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50"
      >
        {processingId === o._id ? "Dispatching..." : "Dispatch Order"}
      </button>
    </div>
  );
}


    if (o.progress === "DISPATCHED" || o.progress === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
          <CheckCircle size={16} />
          Completed
        </span>
      );
    }

    if (o.progress === "PARTIAL") {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (expandedOrderId === o._id) {
                setExpandedOrderId(null);
                setShowDecisionPanel(false);
              } else {
                setExpandedOrderId(o._id);
                setShowDecisionPanel(true);
                fetchPickPreview(o._id);
              }
            }}
            className="bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-all shadow-sm hover:shadow-md"
          >
            Recheck Inventory
          </button>
        </div>
      );
    }

    return (
      <span className="text-gray-500 text-sm font-medium">In Progress</span>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <InventorySidebar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pr-5">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Truck size={32} className="text-[#c62d23]" />
                <span>Warehouse Orders</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manual picking & fitting workflow
              </p>
            </div>
            {/* PROFILE */}
            <button
              onClick={() => router.push("/profile")}
              title="My Profile"
              className="text-gray-600 hover:text-[#c62d23] transition"
            >
              <UserCircle size={34} />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Orders"
              value={totalOrders}
              icon={<Package className="text-[#c62d23]" />}
              clickable={true}
              active={activeFilter === "ALL"}
              onClick={() => setActiveFilter("ALL")}
            />

            <StatCard
              title="Delayed Orders"
              value={delayedOrders}
              icon={<Clock className="text-[#c62d23]" />}
              danger={delayedOrders > 0}
              clickable={true}
              active={activeFilter === "DELAYED"}
              onClick={() => setActiveFilter("DELAYED")}
            />

            <StatCard
              title="Ready for Dispatch"
              value={readyForDispatch}
              icon={<TrendingUp className="text-[#c62d23]" />}
              clickable={true}
              active={activeFilter === "READY"}
              onClick={() => setActiveFilter("READY")}
            />
          </div>

          {/* FILTER BADGE */}
          {activeFilter !== "ALL" && (
            <div className="flex items-center gap-3">
              <div
                className={`${activeFilter === "DELAYED" ? "bg-amber-100 border-amber-300" : "bg-green-100 border-green-300"} px-4 py-2 rounded-xl flex items-center gap-2 border`}
              >
                <AlertCircle
                  className={
                    activeFilter === "DELAYED"
                      ? "text-amber-700"
                      : "text-green-700"
                  }
                  size={18}
                />
                <span
                  className={`text-sm font-medium ${activeFilter === "DELAYED" ? "text-amber-800" : "text-green-800"}`}
                >
                  {activeFilter === "DELAYED"
                    ? "Showing only delayed orders"
                    : "Showing only ready for dispatch"}
                </span>
              </div>
              <button
                onClick={() => setActiveFilter("ALL")}
                className="text-sm text-gray-600 hover:text-[#c62d23] font-medium"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* ALERT */}
          {delayedOrders > 0 && activeFilter !== "DELAYED" && (
            <div className="bg-amber-50 border border-amber-200 p-4 flex gap-3 rounded-xl">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
              <div className="flex-1">
                <span className="text-sm text-amber-800 font-medium">
                  {delayedOrders} orders are delayed
                </span>
                <button
                  onClick={() => setActiveFilter("DELAYED")}
                  className="ml-3 text-sm text-amber-700 hover:text-amber-900 font-semibold underline"
                >
                  View orders
                </button>
              </div>
            </div>
          )}

          <div className="mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders by ID, client, or chair model..."
              className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all shadow-sm"
            />
          </div>

          <div className="flex gap-6 mb-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <button
              onClick={() => setActiveTab("FULL")}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${
                activeTab === "FULL"
                  ? "bg-[#c62d23] text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Full Chair Orders ({fullChairOrders.length})
            </button>

            <button
              onClick={() => setActiveTab("SPARE")}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${
                activeTab === "SPARE"
                  ? "bg-[#c62d23] text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Spare Part Orders ({sparePartOrders.length})
            </button>
          </div>

          <OrdersTable
            orders={paginatedOrders}
            renderAction={renderAction}
            getStatusBadge={getStatusBadge}
            expandedOrderId={expandedOrderId}
            showDecisionPanel={showDecisionPanel}
            inventoryPreview={inventoryPreview}
            handlePartialAccepted={handlePartialAccepted}
            setExpandedOrderId={setExpandedOrderId}
            setInventoryPreview={setInventoryPreview}
            setShowDecisionPanel={setShowDecisionPanel}
            loading={loading}
            orders_data={orders}
          />

          {totalPages > 1 && (
            <div className="flex justify-end items-center gap-3 mt-6">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm font-medium"
              >
                Previous
              </button>

              <span className="text-sm text-gray-700 font-medium px-3">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm font-medium"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= ORDERS TABLE COMPONENT ================= */
const OrdersTable = ({
  orders,
  renderAction,
  getStatusBadge,
  expandedOrderId,
  showDecisionPanel,
  inventoryPreview,
  setInventoryPreview,
  handlePartialAccepted,
  setExpandedOrderId,
  setShowDecisionPanel,
  loading,
  orders_data,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
        <p className="mt-2 text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="text-center text-gray-500 py-16 bg-white rounded-xl border border-gray-200">
        <Package size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">No orders found</p>
      </div>
    );
  }
  const getLiveBuildable = (orderId, order) => {
    const parts = inventoryPreview[orderId];
    if (!parts || parts.length === 0) return 0;

    let filteredParts = parts;

    if (order.orderType === "SPARE") {
      filteredParts = parts.filter(
        (p) =>
          p.partName?.toLowerCase().trim() ===
          order.chairModel?.toLowerCase().trim(),
      );
    }

    if (!filteredParts || filteredParts.length === 0) return 0;

    const totals = filteredParts.map((p) =>
      p.locations.reduce((sum, l) => sum + Number(l.picked || 0), 0),
    );

    return Math.min(...totals);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {[
                "Order ID",
                "Dispatched To",
                "Chair / Part",
                "Order Date",
                "Delivery Date",
                "Qty",
                "Status",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="p-4 text-left font-semibold text-gray-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {orders.map((o, index) => (
              <React.Fragment key={`order-row-${o._id}`}>
                <tr
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="p-4 font-semibold text-gray-900">
                    {o.orderId}
                  </td>
                  <td className="p-4 text-gray-700">{o.dispatchedTo?.name}</td>
                  <td className="p-4 font-medium text-gray-900">
                    {o.chairModel || "Spare Parts"}
                  </td>
                  <td className="p-4 text-gray-700">
                    {new Date(o.orderDate).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-gray-700">
                    {o.deliveryDate
                      ? new Date(o.deliveryDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="p-4 font-semibold text-gray-900">
                    {o.quantity}
                  </td>
                  <td className="p-4">{getStatusBadge(o.progress)}</td>
                  <td className="p-4">{renderAction(o)}</td>
                </tr>

                {expandedOrderId === o._id &&
                  showDecisionPanel &&
                  ["ORDER_PLACED", "PARTIAL"].includes(o.progress) && (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <div
                          className="bg-gradient-to-br from-gray-50 to-white border-t border-gray-200 overflow-hidden"
                          style={{
                            animation: "slideDown 0.3s ease-out",
                          }}
                        >
                          <style>
                            {`
                              @keyframes slideDown {
                                from {
                                  opacity: 0;
                                  max-height: 0;
                                }
                                to {
                                  opacity: 1;
                                  max-height: 2000px;
                                }
                              }
                              @keyframes fadeIn {
                                from { opacity: 0; transform: translateY(-10px); }
                                to { opacity: 1; transform: translateY(0); }
                              }
                            `}
                          </style>

                          <div className="p-8">
                            {/* Header Section */}
                            <div
                              className="mb-6 pb-6 border-b border-gray-200"
                              style={{ animation: "fadeIn 0.4s ease-out" }}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                    Inventory Check
                                  </h3>
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500 font-medium">
                                        Chair Model:
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {o.chairModel}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500 font-medium">
                                        Required Quantity:
                                      </span>
                                      <span className="font-semibold text-[#c62d23] text-lg">
                                        {o.quantity}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {o.progress === "PARTIAL" && (
                                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">
                                    <AlertCircle
                                      size={18}
                                      className="text-amber-600"
                                    />
                                    <span className="text-sm font-semibold text-amber-800">
                                      Partial Order
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Inventory Grid */}
                            <div
                              className="mb-6"
                              style={{ animation: "fadeIn 0.5s ease-out" }}
                            >
                              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Package size={20} className="text-[#c62d23]" />
                                Parts Availability
                              </h4>

                              {!Array.isArray(inventoryPreview[o._id]) ? (
                                <div className="flex items-center justify-center py-12">
                                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#c62d23]"></div>
                                </div>
                              ) : inventoryPreview[o._id].length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                                  <Package
                                    size={48}
                                    className="mx-auto mb-4 text-gray-300"
                                  />
                                  <p className="text-gray-600 font-medium">
                                    No spare parts available
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {inventoryPreview[o._id]
                                    ?.filter((part) => {
                                      if (o.orderType === "FULL") return true;

                                      if (o.orderType === "SPARE") {
                                        return (
                                          part.partName?.toLowerCase() ===
                                          o.chairModel?.toLowerCase()
                                        );
                                      }

                                      return false;
                                    })
                                    .map((part, idx) => (
                                      <div
                                        key={`${o._id}-${part.partName}`}
                                        className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-[#c62d23] transition-all hover:shadow-md"
                                        style={{
                                          animation: `fadeIn ${0.6 + idx * 0.1}s ease-out`,
                                        }}
                                      >
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                                          <h5 className="font-bold text-gray-900 text-lg capitalize">
                                            {part.partName}
                                          </h5>
                                          <div className="bg-[#c62d23] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                            {part.locations.reduce(
                                              (sum, l) => sum + (l.picked || 0),
                                              0,
                                            )}{" "}
                                            picked
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          {part.locations.map((loc) => (
                                            <div
                                              key={loc.inventoryId}
                                              className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                                            >
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex-1">
                                                  <p className="font-semibold text-sm text-gray-900">
                                                    {loc.location}
                                                  </p>
                                                  <p className="text-xs text-gray-600 mt-0.5">
                                                    Available:{" "}
                                                    <span className="font-semibold text-gray-900">
                                                      {loc.available}
                                                    </span>
                                                  </p>
                                                </div>

                                                <input
                                                  type="number"
                                                  min="0"
                                                  max={loc.available}
                                                  value={loc.picked || ""}
                                                  placeholder="0"
                                                  className="w-20 bg-white border-2 border-gray-300 px-3 py-2 rounded-lg text-center font-bold focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
                                                  onChange={(e) => {
                                                    let qty = Number(
                                                      e.target.value,
                                                    );
                                                    if (qty < 0) qty = 0;
                                                    if (qty > loc.available)
                                                      qty = loc.available;

                                                    setInventoryPreview(
                                                      (prev) => {
                                                        const parts = prev[
                                                          o._id
                                                        ].map((p) => {
                                                          if (
                                                            p.partName !==
                                                            part.partName
                                                          )
                                                            return p;

                                                          let remaining =
                                                            o.quantity;

                                                          const locations =
                                                            p.locations.map(
                                                              (l) => {
                                                                if (
                                                                  l.inventoryId ===
                                                                  loc.inventoryId
                                                                ) {
                                                                  remaining -=
                                                                    qty;
                                                                  return {
                                                                    ...l,
                                                                    picked: qty,
                                                                  };
                                                                }

                                                                const safe =
                                                                  Math.min(
                                                                    l.picked ||
                                                                      0,
                                                                    remaining,
                                                                  );
                                                                remaining -=
                                                                  safe;
                                                                return {
                                                                  ...l,
                                                                  picked: safe,
                                                                };
                                                              },
                                                            );

                                                          return {
                                                            ...p,
                                                            locations,
                                                          };
                                                        });

                                                        return {
                                                          ...prev,
                                                          [o._id]: parts,
                                                        };
                                                      },
                                                    );
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-6 border-t border-gray-200">
                              {(() => {
                                const liveBuildable = getLiveBuildable(
                                  o._id,
                                  o,
                                );
                                const isOver = liveBuildable > o.quantity;
                                const isExact = liveBuildable === o.quantity;

                                return (
                                  <>
                                    <button
                                      onClick={() =>
                                        handlePartialAccepted(o._id)
                                      }
                                      disabled={liveBuildable === 0 || isOver}
                                      className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2
    ${
      liveBuildable === 0 || isOver
        ? "bg-gray-300 cursor-not-allowed text-gray-600"
        : "bg-[#c62d23] hover:bg-[#a82419] text-white"
    }`}
                                    >
                                      <CheckCircle size={18} />
                                      {isExact
                                        ? "Accept Order"
                                        : "Partial Accept"}
                                    </button>

                                    <button
                                      onClick={() => {
                                        setExpandedOrderId(null);
                                        setShowDecisionPanel(false);
                                      }}
                                      className="bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all hover:bg-gray-50"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ================= STAT CARD COMPONENT ================= */
const StatCard = ({
  title,
  value,
  icon,
  danger,
  clickable,
  onClick,
  active,
}) => (
  <div
    onClick={clickable ? onClick : undefined}
    className={`bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full ${
      danger ? "border-amber-300 bg-amber-50" : "border-gray-200"
    } ${clickable ? "cursor-pointer hover:bg-gray-50 hover:border-[#c62d23]" : ""} ${
      active ? "ring-2 ring-[#c62d23]" : ""
    }`}
    style={{
      borderLeft: "4px solid #c62d23",
    }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    {clickable && (
      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
        <span>{active ? "Click to show all" : "Click to view details"}</span>
        <span className="text-[#c62d23]">→</span>
      </div>
    )}
  </div>
);
