"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Package, CheckCircle, UserCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductionOrdersPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkers, setSelectedWorkers] = useState({});
  const [workerInventory, setWorkerInventory] = useState({});
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [acceptedOrders, setAcceptedOrders] = useState({});
  const [acceptQty, setAcceptQty] = useState({});

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const PRODUCTION_WORKERS = ["Mintoo", "Sajid", "Jamshed", "Ehtram"];

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "production") {
      router.push("/login");
    }
  }, [router]);

  /* ================= FETCH ORDERS ================= */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers });

      const filtered = (res.data.orders || []).filter(
        (o) =>
          o.orderType === "FULL" &&
          [
            "PRODUCTION_PENDING",
            "PRODUCTION_IN_PROGRESS",
            "PRODUCTION_COMPLETED",
          ].includes(o.progress),
      );

      setOrders(filtered);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ================= FETCH WORKER INVENTORY ================= */
  const fetchProductionInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory`, { headers });
      const all = res.data.inventory || [];

      const productionStock = all.filter((item) =>
        item.location.startsWith("PROD_"),
      );

      setWorkerInventory({
        ALL_PRODUCTION: productionStock,
      });
    } catch (err) {
      console.error("Inventory fetch failed");
    }
  };

  /* ================= ASSIGN WORKER ================= */
  const assignWorker = async (orderId) => {
    const workerName = selectedWorkers[orderId];
    if (!workerName) return;

    try {
      await axios.put(
        `${API}/orders/${orderId}/assign-production`,
        { workerName },
        { headers },
      );

      setExpandedOrder(orderId); // 🔥 auto open
      fetchOrders();
    } catch (err) {
      alert("Assign failed");
    }
  };
  const acceptOrder = async (orderId, parts) => {
  if (!parts || Object.keys(parts).length === 0) {
    return alert("Please enter quantities for parts");
  }

  try {
    await axios.post(
      `${API}/orders/${orderId}/production-accept`,
      { parts },  // 🔥 send full object
      { headers }
    );

    setAcceptedOrders((prev) => ({
      ...prev,
      [orderId]: true,
    }));

    fetchOrders();
  } catch (err) {
    alert(err.response?.data?.message || "Accept failed");
  }
};


  /* ================= MARK COMPLETED ================= */
  const markCompleted = async (orderId) => {
    try {
      await axios.patch(
        `${API}/orders/${orderId}/progress`,
        { progress: "PRODUCTION_COMPLETED" },
        { headers },
      );

      alert("Production completed");
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    }
  };

  /* ================= GROUPING ================= */
  const pending = orders.filter(
    (o) => o.progress === "PRODUCTION_PENDING" && !o.productionWorker,
  );

  const inProgress = orders.filter(
    (o) =>
      (o.progress === "PRODUCTION_PENDING" && o.productionWorker) ||
      o.progress === "PRODUCTION_IN_PROGRESS",
  );

  const completed = orders.filter((o) => o.progress === "PRODUCTION_COMPLETED");

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="text-[#c62d23]" />
          Production Dashboard
        </h1>

        <button
          onClick={() => router.push("/profile")}
          className="text-gray-600 hover:text-[#c62d23]"
        >
          <UserCircle size={32} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Clock className="animate-spin mx-auto text-[#c62d23]" />
        </div>
      ) : (
        <>
          {/* PENDING */}
          <Section
            title="Pending Assignment"
            orders={pending}
            renderAction={(order) => (
              <div className="flex gap-3 mt-3">
                <select
                  className="border px-3 py-2 rounded-xl"
                  value={selectedWorkers[order._id] || ""}
                  onChange={(e) =>
                    setSelectedWorkers({
                      ...selectedWorkers,
                      [order._id]: e.target.value,
                    })
                  }
                >
                  <option value="">Select Worker</option>
                  {PRODUCTION_WORKERS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => assignWorker(order._id)}
                  disabled={!selectedWorkers[order._id]}
                  className="bg-[#c62d23] text-white px-4 py-2 rounded-xl disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            )}
          />

          {/* IN PROGRESS */}
          <Section
            title="In Progress"
            orders={inProgress}
            renderAction={(order) => (
              <>
                {/* Expand Toggle */}
                <button
                  onClick={() =>
                    setExpandedOrder(
                      expandedOrder === order._id ? null : order._id,
                    )
                  }
                  className="mt-3 text-sm text-blue-600 underline"
                >
                  {expandedOrder === order._id ? "Hide Details" : "Open Order"}
                </button>

                {/* Expanded Panel */}
                {expandedOrder === order._id && (
                  <div className="mt-4 bg-gray-50 p-4 rounded-xl space-y-4">
                    {/* Inventory */}
                    <button
                      onClick={fetchProductionInventory}
                      className="text-sm text-blue-600 underline"
                    >
                      View Worker Inventory
                    </button>

                    {workerInventory.ALL_PRODUCTION && (
                      <div
                        className="mt-4 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
                        style={{ animation: "slideDown 0.3s ease-out" }}
                      >
                        <style>
                          {`
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 2000px; }
        }
      `}
                        </style>

                        <div className="p-6 space-y-6">
                          {/* Header */}
                          <div className="flex justify-between items-center border-b pb-4">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">
                                Production Inventory
                              </h3>
                              <p className="text-sm text-gray-500">
                                Worker:{" "}
                                <span className="font-semibold text-gray-800">
                                  {order.productionWorker}
                                </span>
                              </p>
                            </div>

                            <div className="text-sm">
                              Required Qty:{" "}
                              <span className="font-bold text-[#c62d23]">
                                {order.quantity}
                              </span>
                            </div>
                          </div>

                          {/* GROUP + SUM */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(() => {
                              const items =
                                workerInventory.ALL_PRODUCTION || [];

                             const grouped = items
  .filter(item => item.type === "SPARE")
  .reduce((acc, item) => {
    if (!acc[item.partName]) {
      acc[item.partName] = 0;
    }
    acc[item.partName] += item.quantity;
    return acc;
  }, {});


                              return Object.entries(grouped).map(
                                ([name, qty]) => (
                                 <div
  key={name}
  className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-[#c62d23] transition-all hover:shadow-md"
>
  <div className="flex justify-between items-center mb-3">
    <h4 className="font-semibold text-gray-900 capitalize">
      {name}
    </h4>

    <span className="bg-[#c62d23] text-white text-xs px-3 py-1 rounded-full font-bold">
      {qty}
    </span>
  </div>

  {/* INPUT FOR THIS PART */}
  <input
    type="number"
    min="0"
    max={qty}
    placeholder="Enter qty"
    className="w-full border px-3 py-2 rounded-lg text-sm"
    onChange={(e) =>
      setAcceptQty({
        ...acceptQty,
        [name]: Number(e.target.value),
      })
    }
  />
</div>

                                ),
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                    

                    {/* ACCEPT BUTTONS */}
                    {!acceptedOrders[order._id] && (
                      <div className="flex gap-3">
                        <button
  onClick={() =>
  acceptOrder(order._id, acceptQty)
}

  className="bg-green-600 text-white px-4 py-2 rounded-xl"
>
  Confirm Acceptance
</button>

                      </div>
                    )}

                    {/* COMPLETE ONLY AFTER ACCEPT */}
                    {acceptedOrders[order._id] && (
                      <button
                        onClick={() => markCompleted(order._id)}
                        className="bg-green-700 text-white px-4 py-2 rounded-xl flex items-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Mark Completed
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          />

          {/* COMPLETED */}
          <Section title="Completed (Waiting for Fitting)" orders={completed} />
        </>
      )}
    </div>
  );
}

/* ================= SECTION ================= */
const Section = ({ title, orders, renderAction }) => {
  if (!orders.length) return null;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {title} ({orders.length})
      </h2>

      <div className="grid gap-6">
        {orders.map((order) => (
          <div
            key={order._id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"
          >
            <p className="font-bold text-lg">{order.orderId}</p>
            <p className="text-sm text-gray-500">
              {order.chairModel} — Qty: {order.quantity}
            </p>

            {order.productionWorker && (
              <p className="text-sm mt-1">
                Worker:{" "}
                <span className="font-semibold">{order.productionWorker}</span>
              </p>
            )}

            {renderAction && renderAction(order)}
          </div>
        ))}
      </div>
    </div>
  );
};
