"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Upload, Download } from "lucide-react";

import {
  Pencil,
  Trash2,
  Plus,
  Package,
  Clock,
  CheckCircle,
  Truck,
} from "lucide-react";
import axios from "axios";
import SalesSidebar from "./sidebar";

import { UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Orders() {
  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");

  const router = useRouter();

  const [uploading, setUploading] = useState(false);

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const initialFormData = {
    dispatchedTo: "",
    chairModel: "",
    orderDate: "",
    deliveryDate: "",
    quantity: "",
    isPartial: false,
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();

    return orders.filter((o) => {
      // 🔍 Search filter
      const matchesSearch =
        o.orderId?.toLowerCase().includes(q) ||
        o.dispatchedTo?.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // 📊 Stat filter
      switch (statusFilter) {
        case "IN_PROGRESS":
          return (
            !["DISPATCHED", "PARTIAL"].includes(o.progress) && !isDelayed(o)
          );

        case "DELAYED":
          return isDelayed(o);

        case "READY":
          return o.progress === "READY_FOR_DISPATCH";

        case "COMPLETED":
          return o.progress === "DISPATCHED";

        case "ALL":
        default:
          return true;
      }
    });
  }, [orders, search, statusFilter]);

  function isDelayed(order) {
    if (!order.deliveryDate) return false;

    const delivery = new Date(order.deliveryDate);
    delivery.setHours(0, 0, 0, 0);

    return (
      delivery < today && !["DISPATCHED", "PARTIAL"].includes(order.progress)
    );
  }
  const CHAIR_MODELS = [
    "Army Chair - Basic",
    "Army Chair - Premium",
    "Office Chair",
    "Folding Chair",
    "Plastic Chair",
    "Metal Chair",
  ];

  const [formData, setFormData] = useState(initialFormData);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers });
      setOrders(res.data.orders || res.data);
    } catch (err) {
      console.error("Fetch orders failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);
  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API}/vendors`, { headers });
      console.log("VENDORS:", res.data.vendors || res.data);
      setVendors(res.data.vendors || res.data);
    } catch (err) {
      console.error("Fetch vendors failed", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchVendors();
  }, []);

  /* ================= EDIT ================= */
  const handleEditOrder = (order) => {
    setEditingOrderId(order._id);
    setFormData({
      dispatchedTo: order.dispatchedTo?._id || order.dispatchedTo,
      chairModel: order.chairModel,
      orderDate: order.orderDate?.split("T")[0],
      deliveryDate: order.deliveryDate?.split("T")[0] || "",
      quantity: order.quantity,
      isPartial: order.progress === "PARTIAL",
    });

    setVendorSearch(order.dispatchedTo?.name || "");
    setShowForm(true);
  };

  /* ================= FORM CHANGE ================= */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= CREATE / UPDATE ================= */
  const handleCreateOrder = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        dispatchedTo: formData.dispatchedTo,
        chairModel: formData.chairModel,
        orderDate: formData.orderDate || new Date().toISOString().split("T")[0],
        deliveryDate: formData.deliveryDate,
        quantity: Number(formData.quantity),
        progress: formData.isPartial,
      };

      if (editingOrderId) {
        await axios.put(`${API}/orders/${editingOrderId}`, payload, {
          headers,
        });
      } else {
        await axios.post(`${API}/orders`, payload, { headers });
      }

      setShowForm(false);
      setEditingOrderId(null);
      setFormData(initialFormData);
      fetchOrders();
    } catch (err) {
      console.error("Save failed", err?.response?.data || err);
      alert(err?.response?.data?.message || "Failed to save order");
    }
  };

  /* ================= DELETE ================= */
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;

    try {
      await axios.delete(`${API}/orders/${orderId}`, { headers });
      fetchOrders();
    } catch (err) {
      alert("Delete failed");
    }
  };

  /* ================= DISPATCH ================= */
  const handleDispatch = async (orderId) => {
    if (!window.confirm("Confirm dispatch of this order?")) return;

    try {
      await axios.patch(
        `${API}/orders/${orderId}/progress`,
        { progress: "DISPATCHED" },
        { headers }
      );
      fetchOrders();
    } catch (err) {
      alert("Dispatch failed");
    }
  };

  /* ================= FILTER ================= */
  // const filteredOrders = useMemo(() => {
  //   const q = search.toLowerCase();
  //   return orders.filter(
  //     (o) =>
  //       o.orderId?.toLowerCase().includes(q) ||
  //       o.dispatchedTo?.name?.toLowerCase().includes(q) ||
  //       o.chairModel?.toLowerCase().includes(q)
  //   );
  // }, [orders, search]);

  // const today = new Date();
  // today.setHours(0, 0, 0, 0);

  // const isDelayed = (order) => {
  //   if (!order.deliveryDate) return false;

  //   const delivery = new Date(order.deliveryDate);
  //   delivery.setHours(0, 0, 0, 0);

  //   return (
  //     delivery < today && !["DISPATCHED", "PARTIAL"].includes(order.progress)
  //   );
  // };
  /* ================= STATS ================= */
  const totalOrders = filteredOrders.length;

  const delayed = filteredOrders.filter(isDelayed).length;

  const readyToDispatch = filteredOrders.filter(
    (o) => o.progress === "READY_FOR_DISPATCH"
  ).length;

  const completed = filteredOrders.filter(
    (o) => o.progress === "DISPATCHED"
  ).length;

  const inProgress = filteredOrders.filter(
    (o) => !["DISPATCHED", "PARTIAL"].includes(o.progress) && !isDelayed(o)
  ).length;

  /* ================= ORDER STEPS ================= */
  const ORDER_STEPS = [
    { key: "ORDER_PLACED", label: "Order Placed" },
    { key: "WAREHOUSE_COLLECTED", label: "Warehouse Collected" },
    { key: "FITTING_IN_PROGRESS", label: "Fitting In Progress" },
    { key: "FITTING_COMPLETED", label: "Fitting Completed" },
    { key: "READY_FOR_DISPATCH", label: "Ready For Dispatch" },
    { key: "DISPATCHED", label: "Dispatched" },
  ];

  const isOrderLocked = (progress) => {
    return [
      "WAREHOUSE_COLLECTED",
      "FITTING_IN_PROGRESS",
      "FITTING_COMPLETED",
      "READY_FOR_DISPATCH",
      "DISPATCHED",
      "PARTIAL",
    ].includes(progress);
  };

  /* ================= PROGRESS ================= */
  const ProgressTracker = ({ progress }) => {
    if (progress === "PARTIAL") {
      return (
        <span className="text-sm font-medium text-amber-400">
          Partial / On Hold
        </span>
      );
    }

    const currentIndex = ORDER_STEPS.findIndex((s) => s.key === progress);
    const safeIndex =
      currentIndex === -1 ? ORDER_STEPS.length - 1 : currentIndex;

    const isCompleted = progress === "DISPATCHED";

    return (
      <span
        className={`text-sm font-medium ${
          isCompleted ? "text-green-400" : "text-amber-400"
        }`}
      >
        {ORDER_STEPS[safeIndex]?.label}
      </span>
    );
  };

  const handleRowClick = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  /* ================= CSV / FOLDER UPLOAD ================= */
  const handleUploadOrders = async (files) => {
    try {
      setUploading(true);

      const formData = new FormData();

      // supports single csv OR entire folder
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      await axios.post(`${API}/orders/upload`, formData, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Orders uploaded successfully");
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ================= EXPORT CSV ================= */
  const handleExportCSV = async () => {
    try {
      const res = await axios.get(`${API}/orders/export`, {
        headers,
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Export failed");
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <SalesSidebar />
      <div className="flex-1 overflow-auto">
        {/* ================= HIDDEN UPLOAD INPUT ================= */}
        <input
          type="file"
          id="orderUploadInput"
          webkitdirectory="true"
          directory=""
          multiple
          hidden
          onChange={(e) => handleUploadOrders(e.target.files)}
        />

        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Orders Management</h1>
            <p className="text-sm mb-1 text-neutral-400">
              Create, track and manage all orders
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* UPLOAD ORDERS */}
            <button
              onClick={() =>
                document.getElementById("orderUploadInput").click()
              }
              className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow"
            >
              <Upload size={16} />
              {uploading ? "Uploading..." : "Upload Orders"}
            </button>

            {/* ADD ORDER */}
            <button
              onClick={() => {
                setVendorSearch("");
                setFormData(initialFormData);
                setEditingOrderId(null);
                setShowForm(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow"
            >
              <Plus size={16} />
              Add Order
            </button>

            {/* EXPORT CSV */}
            <button
              onClick={handleExportCSV}
              className="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded-lg flex items-center gap-2 border border-emerald-600"
            >
              <Download size={16} />
              Export CSV
            </button>

            {/* PROFILE */}
            <button
              onClick={() => router.push("/sales/profile")}
              title="My Profile"
              className="text-neutral-300 hover:text-amber-400 transition"
            >
              <UserCircle size={34} />
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <StatCard
              title="Total Orders"
              value={totalOrders}
              icon={<Package />}
              onClick={() => setStatusFilter("ALL")}
              active={statusFilter === "ALL"}
            />

            <StatCard
              title="In Progress"
              value={inProgress}
              icon={<Clock />}
              onClick={() => setStatusFilter("IN_PROGRESS")}
              active={statusFilter === "IN_PROGRESS"}
            />

            <StatCard
              title="Delayed"
              value={delayed}
              icon={<Clock />}
              danger={delayed > 0}
              onClick={() => setStatusFilter("DELAYED")}
              active={statusFilter === "DELAYED"}
            />

            <StatCard
              title="Ready to Dispatch"
              value={readyToDispatch}
              icon={<Truck />}
              onClick={() => setStatusFilter("READY")}
              active={statusFilter === "READY"}
            />

            <StatCard
              title="Completed"
              value={completed}
              icon={<CheckCircle />}
              onClick={() => setStatusFilter("COMPLETED")}
              active={statusFilter === "COMPLETED"}
            />
          </div>

          {/* SEARCH */}
          <div className="mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="w-full bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg outline-none focus:border-amber-600"
            />
          </div>

          {/* TABLE */}
          <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700">
            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center text-neutral-400 py-10">
                No orders found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-850 border-b border-neutral-700">
                  <tr>
                    {[
                      "Order ID",
                      "Dispatched To",
                      "Chair",
                      "Order Date",
                      "Delivery Date",
                      "Qty",
                      "Progress",
                      "Order Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="p-4 text-left text-xs text-neutral-400 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((o) => (
                    <React.Fragment key={o._id}>
                      {/* MAIN ROW */}
                      <tr
                        onClick={() => handleRowClick(o._id)}
                        className="border-b border-neutral-700 hover:bg-neutral-850 transition cursor-pointer"
                      >
                        <td className="p-4 font-medium">{o.orderId}</td>
                        <td className="p-4">
                          {o.dispatchedTo?.name || o.dispatchedTo}
                        </td>

                        <td className="p-4">{o.chairModel}</td>
                        <td className="p-4">
                          {new Date(o.orderDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          {o.deliveryDate
                            ? new Date(o.deliveryDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="p-4">{o.quantity}</td>

                        <td className="p-4">
                          <ProgressTracker progress={o.progress} />
                        </td>

                        {/* ORDER STATUS */}
                        <td className="p-4">
                          {isDelayed(o) ? (
                            <span className="px-3 py-1 rounded-full text-xs bg-red-900/40 text-red-400 border border-red-700">
                              Delayed
                            </span>
                          ) : o.progress === "PARTIAL" ? (
                            <span className="px-3 py-1 rounded-full text-xs bg-amber-900/40 text-amber-400 border border-amber-700">
                              Partial / On Hold
                            </span>
                          ) : o.progress === "READY_FOR_DISPATCH" ? (
                            <span className="px-3 py-1 rounded-full text-xs bg-green-900/40 text-green-400 border border-green-700">
                              Ready for Dispatch
                            </span>
                          ) : o.progress === "DISPATCHED" ? (
                            <span className="px-3 py-1 rounded-full text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-700">
                              Dispatched
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs bg-blue-900/40 text-blue-400 border border-blue-700">
                              Processing
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td
                          className="p-4 flex gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* EDIT */}
                          <button
                            onClick={() => handleEditOrder(o)}
                            disabled={isOrderLocked(o.progress)}
                            className={`text-amber-400 hover:text-amber-300 ${
                              isOrderLocked(o.progress)
                                ? "opacity-40 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <Pencil size={16} />
                          </button>

                          {/* DELETE */}
                          <button
                            onClick={() => handleDeleteOrder(o._id)}
                            disabled={isOrderLocked(o.progress)}
                            className={`text-red-400 hover:text-red-300 ${
                              isOrderLocked(o.progress)
                                ? "opacity-40 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>

                          {/* DISPATCH — ONLY IF READY */}
                          {o.progress === "READY_FOR_DISPATCH" && (
                            <button
                              onClick={() => handleDispatch(o._id)}
                              title="Dispatch Order"
                              className="text-green-400 hover:text-green-300 transition"
                            >
                              <Truck size={18} />
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* EXPANDED PROGRESS ROW */}
                      {expandedOrderId === o._id &&
                        o.progress !== "PARTIAL" && (
                          <tr className="bg-neutral-850">
                            <td colSpan={9} className="p-6">
                              {(() => {
                                const currentIndex = ORDER_STEPS.findIndex(
                                  (s) => s.key === o.progress
                                );

                                const safeIndex =
                                  currentIndex === -1
                                    ? ORDER_STEPS.length - 1
                                    : currentIndex;

                                const percent =
                                  ((safeIndex + 1) / ORDER_STEPS.length) * 100;

                                return (
                                  <div className="w-full space-y-6">
                                    <p className="text-sm text-neutral-300 font-medium">
                                      Order Progress
                                    </p>

                                    <div className="flex justify-between text-xs text-neutral-400">
                                      {ORDER_STEPS.map((step, index) => (
                                        <span
                                          key={step.key}
                                          className={
                                            index <= safeIndex
                                              ? "text-neutral-200 font-medium"
                                              : ""
                                          }
                                        >
                                          {step.label}
                                        </span>
                                      ))}
                                    </div>

                                    {/* TRACK */}
                                    <div className="relative w-full h-10 flex items-center mt-6">
                                      {/* BASE LINE */}
                                      <div className="absolute left-0 right-0 h-[4px] bg-neutral-600 rounded-full" />

                                      {/* PROGRESS LINE */}
                                      <div
                                        className="absolute left-0 h-[4px] rounded-full transition-all duration-500"
                                        style={{
                                          width: `${percent}%`,
                                          background:
                                            percent === 100
                                              ? "#22c55e"
                                              : "linear-gradient(90deg,#22c55e,#f59e0b)",
                                        }}
                                      />

                                      {/* MOVING NUMBER (REPLACES DOT) */}
                                      <div
                                        className="absolute w-7 h-7 rounded-full border-2 border-black shadow
               flex items-center justify-center text-xs font-bold text-black"
                                        style={{
                                          left: `calc(${percent}% - 14px)`,
                                          backgroundColor:
                                            safeIndex === ORDER_STEPS.length - 1
                                              ? "#22c55e"
                                              : "#f59e0b",
                                        }}
                                      >
                                        {safeIndex + 1}
                                      </div>
                                    </div>

                                    <p className="text-sm">
                                      <span className="text-neutral-400">
                                        Current Stage:
                                      </span>{" "}
                                      <span className="text-amber-400 font-medium">
                                        {
                                          ORDER_STEPS.find(
                                            (s) => s.key === o.progress
                                          )?.label
                                        }
                                      </span>
                                    </p>
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 p-8 rounded-2xl w-full max-w-[520px] border-2 border-amber-600 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-amber-400">
              {editingOrderId ? "Update Order" : "Create Order"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-base text-neutral-300 font-semibold block mb-2">
                  Dispatched To
                </label>

                <input
                  placeholder="Search or type vendor name"
                  value={vendorSearch}
                  onChange={(e) => {
                    setVendorSearch(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      dispatchedTo: e.target.value,
                    }));
                  }}
                  className="w-full px-4 py-3 bg-neutral-800 rounded-lg outline-none border-2 border-neutral-600 focus:border-amber-600"
                />

                {vendorSearch && (
                  <div className="bg-neutral-800 border border-neutral-700 mt-1 rounded-lg max-h-48 overflow-auto">
                    {vendors
                      .filter((v) =>
                        v.name
                          .toLowerCase()
                          .includes(vendorSearch.toLowerCase())
                      )
                      .map((v) => (
                        <div
                          key={v._id}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              dispatchedTo: v._id,
                            }));
                            setVendorSearch(v.name);
                          }}
                          className="px-4 py-2 hover:bg-amber-600 cursor-pointer"
                        >
                          {v.name}
                        </div>
                      ))}

                    <div
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          dispatchedTo: vendorSearch,
                        }));
                      }}
                      className="px-4 py-2 bg-neutral-900 hover:bg-emerald-700 cursor-pointer text-emerald-400"
                    >
                      ➕ Add "{vendorSearch}" as new vendor
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-base text-neutral-300 mb-2 font-semibold">
                  Chair Model
                </label>
                <select
                  name="chairModel"
                  value={formData.chairModel}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 bg-neutral-800 border-2 border-neutral-600 rounded-lg text-base text-neutral-100 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/50 outline-none"
                  required
                >
                  <option value="" className="bg-neutral-800">
                    Select Chair Model
                  </option>
                  {CHAIR_MODELS.map((model) => (
                    <option
                      key={model}
                      value={model}
                      className="bg-neutral-800"
                    >
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-base text-neutral-300 font-semibold block mb-2">
                  Order Date
                </label>

                <div
                  className="w-full px-4 py-3 bg-neutral-700 border-2 border-neutral-600
                  rounded-lg text-neutral-300 cursor-not-allowed select-none"
                >
                  {formData.orderDate || new Date().toISOString().split("T")[0]}
                </div>
              </div>

              <Input
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleFormChange}
              />

              <Input
                label="Delivery Date"
                name="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={handleFormChange}
              />

              {/* PARTIAL */}
              <div className="flex items-center gap-3 mt-2 bg-neutral-800 p-4 rounded-lg border-2 border-neutral-700">
                <input
                  type="checkbox"
                  id="isPartial"
                  checked={formData.isPartial}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isPartial: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 accent-amber-600"
                />

                <label
                  htmlFor="isPartial"
                  className="text-base text-neutral-200 cursor-pointer font-semibold"
                >
                  Mark as Partial (On Hold)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingOrderId(null);
                  setFormData(initialFormData);
                }}
                className="px-6 py-2.5 text-base text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition font-medium border-2 border-neutral-700"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateOrder}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-lg transition font-semibold shadow-lg text-base border-2 border-amber-500"
              >
                {editingOrderId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon, danger, onClick, active }) => (
  <div
    onClick={onClick}
    className={`p-5 rounded-xl border cursor-pointer transition
      ${
        active
          ? "border-amber-500 bg-amber-900/30"
          : danger
          ? "bg-amber-950/40 border-amber-800"
          : "bg-neutral-800 border-neutral-700"
      }
      hover:border-amber-500 hover:bg-neutral-750
    `}
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-neutral-400">{title}</p>
      <span className="text-neutral-400">{icon}</span>
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

const Input = ({ label, name, value, onChange, type = "text" }) => (
  <div>
    <label className="text-base text-neutral-300 font-semibold block mb-2">
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 bg-neutral-800 rounded-lg outline-none border-2 border-neutral-600 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/50 text-base text-neutral-100"
    />
  </div>
);
