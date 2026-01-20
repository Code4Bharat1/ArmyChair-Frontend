"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  PackageCheck,
  CheckCircle,
  Truck,
  Package,
  Clock,
  TrendingUp,
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

  // 🔥 NEW — do NOT remove anything else
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

      // 👇 Merge previously picked parts into locations
      if (order.partialParts?.length) {
        parts.forEach((p) => {
          p.locations.forEach((l) => {
            const found = order.partialParts.find(
              (x) => x.inventoryId === l.inventoryId,
            );
            if (found) l.picked = found.qty; // 👈 THIS IS THE MAGIC
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

    // 🔥 CARD FILTERS
    if (activeFilter === "DELAYED") {
      data = data.filter((o) => isDelayed(o));
    }

    if (activeFilter === "READY") {
      data = data.filter((o) => o.progress === "READY_FOR_DISPATCH");
    }

    // 🔍 SEARCH
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
        color: "bg-amber-900 text-amber-300",
      },
      WAREHOUSE_COLLECTED: {
        label: "Sent to Fitting",
        color: "bg-blue-900 text-blue-300",
      },
      FITTING_IN_PROGRESS: {
        label: "Fitting In Progress",
        color: "bg-blue-900 text-blue-300",
      },
      FITTING_COMPLETED: {
        label: "Returned from Fitting",
        color: "bg-emerald-900 text-emerald-300",
      },
      READY_FOR_DISPATCH: {
        label: "Ready for Dispatch",
        color: "bg-green-900 text-green-300",
      },
      DISPATCHED: { label: "Dispatched", color: "bg-green-900 text-green-300" },
      PARTIAL: {
        label: "Partial / Issue",
        color: "bg-amber-900 text-amber-300",
      },
      COMPLETED: { label: "Completed", color: "bg-green-900 text-green-300" },
    };

    const status = statusMap[progress] || {
      label: "Processing",
      color: "bg-neutral-700 text-neutral-300",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}
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

      // 🔥 HARD BLOCK
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
    const parts = inventoryPreview[orderId];
    if (!parts) return alert("No parts selected");

    const order = orders.find((o) => o._id === orderId);
    if (!order) return alert("Order not found");

    let buildable;

    try {
      buildable = Math.min(...parts.map((p) => sumPartQty(parts, p.partName)));
    } catch (e) {
      return alert(e.message);
    }

    // ❌ OVER PICK BLOCK
    if (buildable > order.quantity) {
      return alert(
        `You selected parts for ${buildable} chairs but order requires only ${order.quantity}.
Please reduce picks to exactly ${order.quantity}.`,
      );
    }

    // 🔥 FULL ORDER CASE
    if (buildable >= order.quantity) {
      if (!confirm("All parts available. Send full order to fitting?")) return;

      await axios.post(
        `${API}/warehouse/order/dispatch`,
        {
          orderId,
          items: parts.flatMap((p) =>
            p.locations
              .filter((l) => l.picked > 0)
              .map((l) => ({ inventoryId: l.inventoryId, qty: l.picked })),
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

    // 🔥 PARTIAL CASE
    if (buildable === 0) return alert("Not enough parts to build even 1 chair");

    if (
      !confirm(
        `Only ${buildable} chairs can be built. Save partial acceptance?`,
      )
    )
      return;

    const items = [];
    parts.forEach((p) => {
      p.locations.forEach((l) => {
        if (l.picked > 0)
          items.push({ inventoryId: l.inventoryId, qty: l.picked });
      });
    });

    try {
      await axios.post(
        `${API}/warehouse/order/partial-accept`,
        { orderId, buildable, items },
        { headers },
      );

      alert(`Partial accepted for ${buildable} chairs`);
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
          {/* <button onClick={() => router.push(`/inventory/order/${o._id}`)}>
            Pick Parts
          </button> */}

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
          >
            Check Inventory
          </button>
        </div>
      );
    }

    if (o.progress === "WAREHOUSE_COLLECTED") {
      return <span className="text-blue-400 text-sm">Sent to Fitting</span>;
    }

    if (o.progress === "FITTING_COMPLETED") {
      return (
        <div className="flex gap-2">
          <button
            disabled={isLoading}
            onClick={() => handleMarkReady(o._id)}
            className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {isLoading ? "Processing..." : "Mark Complete"}
          </button>
        </div>
      );
    }

    if (o.progress === "READY_FOR_DISPATCH") {
      return (
        <span className="text-green-400 text-sm flex items-center gap-1">
          <CheckCircle size={14} /> Waiting for Sales Dispatch
        </span>
      );
    }

    if (o.progress === "DISPATCHED" || o.progress === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1 text-green-400 text-sm">
          <CheckCircle size={14} />
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
              } // same API as ORDER_PLACED
            }}
            className="bg-amber-600 px-3 py-1 rounded text-black text-sm"
          >
            Recheck Inventory
          </button>

          <button
            onClick={() => router.push(`/inventory/order/${o._id}`)}
            className="bg-emerald-600 px-3 py-1 rounded text-white text-sm"
          >
            Pick Parts
          </button>
        </div>
      );
    }

    return <span className="text-neutral-400 text-sm">In Progress</span>;
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <InventorySidebar />

      <div className="flex-1 overflow-auto">
        <div className="bg-neutral-800 border-b border-neutral-700 p-4">
          <h1 className="text-2xl font-bold">Warehouse Orders</h1>
          <p className="text-sm text-neutral-400">
            Manual picking & fitting workflow
          </p>
        </div>
        <div className="px-6 lg:px-10 py-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="Total Orders"
              value={totalOrders}
              icon={<Package />}
              active={activeFilter === "ALL"}
              onClick={() => setActiveFilter("ALL")}
            />

            <StatCard
              title="Delayed Orders"
              value={delayedOrders}
              icon={<Clock />}
              danger={delayedOrders > 0}
              active={activeFilter === "DELAYED"}
              onClick={() => setActiveFilter("DELAYED")}
            />

            <StatCard
              title="Ready for Dispatch"
              value={readyForDispatch}
              icon={<TrendingUp />}
              active={activeFilter === "READY"}
              onClick={() => setActiveFilter("READY")}
            />
          </div>

          <div className="mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="w-full bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg outline-none focus:border-amber-600"
            />
          </div>
          {/* TABS */}
          <div className="flex gap-6 mb-4 border-b border-neutral-700">
            <button
              onClick={() => setActiveTab("FULL")}
              className={`pb-2 font-medium ${
                activeTab === "FULL"
                  ? "border-b-2 border-amber-500 text-amber-400"
                  : "text-neutral-400"
              }`}
            >
              Full Chair Orders ({fullChairOrders.length})
            </button>

            <button
              onClick={() => setActiveTab("SPARE")}
              className={`pb-2 font-medium ${
                activeTab === "SPARE"
                  ? "border-b-2 border-amber-500 text-amber-400"
                  : "text-neutral-400"
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
          />

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex justify-end items-center gap-2 mt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 rounded bg-neutral-700 disabled:opacity-40"
              >
                Prev
              </button>

              <span className="text-sm text-neutral-400">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-neutral-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>{" "}
        {/* closes px wrapper */}
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENT ================= */
const OrdersTable = ({
  orders,
  renderAction,
  getStatusBadge,
  expandedOrderId,
  showDecisionPanel,
  inventoryPreview,
  setInventoryPreview,   // ✅ MUST BE HERE
  handlePartialAccepted,
  setExpandedOrderId,
  setShowDecisionPanel,
}) => {

  if (!orders.length)
    return (
      <div className="text-center text-neutral-400 py-10">No orders found</div>
    );

  return (
    <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700">
      <table className="w-full">
        <thead className="bg-neutral-850 border-b border-neutral-700">
          <tr>
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
                className="p-4 text-left text-xs text-neutral-400 uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {orders.map((o) => (
            <React.Fragment key={`order-row-${o._id}`}>
              {/* MAIN ROW */}
              <tr className="border-b border-neutral-700 hover:bg-neutral-850">
                <td className="p-4 font-medium">{o.orderId}</td>
                <td className="p-4">{o.dispatchedTo?.name}</td>
                <td className="p-4">{o.chairModel || "Spare Parts"}</td>
                <td className="p-4">
                  {new Date(o.orderDate).toLocaleDateString()}
                </td>
                <td className="p-4">
                  {o.deliveryDate
                    ? new Date(o.deliveryDate).toLocaleDateString()
                    : "-"}
                </td>
                <td className="p-4">{o.quantity}</td>
                <td className="p-4">{getStatusBadge(o.progress)}</td>
                <td className="p-4">{renderAction(o)}</td>
              </tr>

              {/* 🔥 EXPANDED INVENTORY ROW */}
          {expandedOrderId === o._id &&
 showDecisionPanel &&
 ["ORDER_PLACED", "PARTIAL"].includes(o.progress) && (
  <tr>
    <td colSpan={8} className="p-0">
      <div className="bg-neutral-900 p-6 border-t border-neutral-700">

        {/* ORDER INFO */}
        <div className="mb-4 text-sm text-neutral-300">
          <p><b>Chair:</b> {o.chairModel}</p>
          <p><b>Required Qty:</b> {o.quantity}</p>
        </div>

        {/* INVENTORY GRID */}
        <div className="bg-neutral-800 p-5 rounded mb-4">
          <p className="text-amber-400 font-semibold mb-4 text-lg">
            Parts Availability
          </p>

          {!Array.isArray(inventoryPreview[o._id]) ? (
            <p className="text-neutral-400">Loading inventory…</p>
          ) : inventoryPreview[o._id].length === 0 ? (
            <p className="text-neutral-400">No spare parts available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {inventoryPreview[o._id].map((part) => (
                <div
                  key={`${o._id}-${part.partName}`}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl p-5"
                >
                  <h3 className="font-semibold mb-4 text-amber-400 text-lg">
                    {part.partName}
                  </h3>

                  <div className="space-y-3">
                    {part.locations.map((loc) => (
                      <div
                        key={loc.inventoryId}
                        className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            Location: {loc.location}
                          </p>
                          <p className="text-neutral-400 text-xs">
                            Available: {loc.available}
                          </p>
                        </div>

                        <input
                          type="number"
                          min="0"
                          max={loc.available}
                          value={loc.picked || ""}
                          className="w-24 bg-neutral-800 border border-neutral-700 px-3 py-1 rounded"
                          onChange={(e) => {
                            let qty = Number(e.target.value);
                            if (qty < 0) qty = 0;
                            if (qty > loc.available) qty = loc.available;

                            setInventoryPreview(prev => {
                              const parts = prev[o._id].map(p => {
                                if (p.partName !== part.partName) return p;

                                let remaining = o.quantity;

                                const locations = p.locations.map(l => {
                                  if (l.inventoryId === loc.inventoryId) {
                                    remaining -= qty;
                                    return { ...l, picked: qty };
                                  }

                                  const safe = Math.min(l.picked || 0, remaining);
                                  remaining -= safe;
                                  return { ...l, picked: safe };
                                });

                                return { ...p, locations };
                              });

                              return { ...prev, [o._id]: parts };
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button
            onClick={() => handlePartialAccepted(o._id)}
            className="bg-amber-600 px-4 py-2 rounded text-black"
          >
            Partial Accepted
          </button>

          <button
            onClick={() => {
              setExpandedOrderId(null);
              setShowDecisionPanel(false);
            }}
            className="bg-neutral-700 px-4 py-2 rounded"
          >
            Cancel
          </button>
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
  );
};

const StatCard = ({ title, value, icon, danger, active, onClick }) => (
  <div
    onClick={onClick}
    className={`p-5 rounded-xl border cursor-pointer transition
      ${active ? "ring-2 ring-amber-500" : ""}
      ${
        danger
          ? "bg-amber-950/40 border-amber-800"
          : "bg-neutral-800 border-neutral-700"
      }
    `}
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-neutral-400">{title}</p>
      <span className="text-neutral-400">{icon}</span>
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);
