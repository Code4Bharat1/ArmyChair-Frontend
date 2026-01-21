"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Upload, Download, X } from "lucide-react";

import {
  Pencil,
  Trash2,
  Plus,
  Package,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import SalesSidebar from "./sidebar";

import { UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Orders() {
  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const [chairModels, setChairModels] = useState([]);
  const [spareParts, setSpareParts] = useState([]);

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
    orderType: "FULL",
    orderDate: "",
    deliveryDate: "",
    quantity: "",
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();

    return orders.filter((o) => {
      // 🔍 Search filter
      const vendorName =
  typeof o.dispatchedTo === "string"
    ? o.dispatchedTo
    : o.dispatchedTo?.name || "";

const matchesSearch =
  o.orderId?.toLowerCase().includes(q) ||
  vendorName.toLowerCase().includes(q) ||
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
  const CHAIR_MODELS = chairModels;

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

  const fetchSpareParts = async () => {
    try {
      const res = await axios.get(`${API}/inventory/spare-part-names`, {
        headers,
      });
      setSpareParts(res.data.parts || []);
    } catch (err) {
      console.error("Fetch spare parts failed", err);
    }
  };
  useEffect(() => {
    fetchOrders();
    fetchVendors();
    fetchChairModels();
    fetchSpareParts();
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
  const fetchChairModels = async () => {
    try {
      const res = await axios.get(`${API}/inventory/chair-models`, { headers });
      setChairModels(res.data.models || []);
    } catch (err) {
      console.error("Fetch chair models failed", err);
    }
  };
  useEffect(() => {
    fetchOrders();
    fetchVendors();
    fetchChairModels();
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
      orderType: order.orderType || "FULL",
    });

    setVendorSearch(order.dispatchedTo?.name || "");
    setShowForm(true);
  };

  /* ================= FORM CHANGE ================= */
  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "orderType") {
      setFormData((prev) => ({
        ...prev,
        orderType: value,
        chairModel: "",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= CREATE / UPDATE ================= */
const handleCreateOrder = async (e) => {
  e.preventDefault();

  if (!formData.dispatchedTo) {
    alert("Please select vendor from dropdown");
    return;
  }

  if (!formData.quantity || Number(formData.quantity) <= 0) {
    alert("Please enter valid quantity");
    return;
  }

  const payload = {
    dispatchedTo: formData.dispatchedTo, // ObjectId ONLY
    chairModel: formData.chairModel,
    orderType: formData.orderType,
    orderDate: formData.orderDate || new Date().toISOString().split("T")[0],
    deliveryDate: formData.deliveryDate,
    quantity: Number(formData.quantity),
    progress: "ORDER_PLACED",
  };

  console.log("FINAL PAYLOAD:", payload);

  try {
    await axios.post(`${API}/orders`, payload, { headers });

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
        { headers },
      );
      fetchOrders();
    } catch (err) {
      alert("Dispatch failed");
    }
  };

  /* ================= STATS ================= */
  const totalOrders = filteredOrders.length;

  const delayed = filteredOrders.filter(isDelayed).length;

  const readyToDispatch = filteredOrders.filter(
    (o) => o.progress === "READY_FOR_DISPATCH",
  ).length;

  const completed = filteredOrders.filter(
    (o) => o.progress === "DISPATCHED",
  ).length;

  const inProgress = filteredOrders.filter(
    (o) => !["DISPATCHED", "PARTIAL"].includes(o.progress) && !isDelayed(o),
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
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
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
        className={`px-3 py-1 rounded-full text-xs font-medium border ${
          isCompleted
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-blue-50 text-blue-700 border-blue-200"
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
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
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
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={32} className="text-[#c62d23]" />
                <span>Orders Management</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Create, track and manage all orders
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* UPLOAD ORDERS */}
              <button
                onClick={() =>
                  document.getElementById("orderUploadInput").click()
                }
                className="bg-[#c62d23] hover:bg-[#a82419] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all"
              >
                <Upload size={18} />
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
                className="bg-[#c62d23] hover:bg-[#a82419] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all"
              >
                <Plus size={18} />
                Add Order
              </button>

              {/* EXPORT CSV */}
              <button
                onClick={handleExportCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all"
              >
                <Download size={18} />
                Export CSV
              </button>

              {/* PROFILE */}
              <button
                onClick={() => router.push("/sales/profile")}
                title="My Profile"
                className="text-gray-600 hover:text-[#c62d23] transition"
              >
                <UserCircle size={34} />
              </button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <StatCard
              title="Total Orders"
              value={totalOrders}
              icon={<Package className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("ALL")}
              active={statusFilter === "ALL"}
            />

            <StatCard
              title="In Progress"
              value={inProgress}
              icon={<Clock className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("IN_PROGRESS")}
              active={statusFilter === "IN_PROGRESS"}
            />

            <StatCard
              title="Delayed"
              value={delayed}
              icon={<AlertCircle className="text-[#c62d23]" />}
              danger={delayed > 0}
              onClick={() => setStatusFilter("DELAYED")}
              active={statusFilter === "DELAYED"}
            />

            <StatCard
              title="Ready to Dispatch"
              value={readyToDispatch}
              icon={<Truck className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("READY")}
              active={statusFilter === "READY"}
            />

            <StatCard
              title="Completed"
              value={completed}
              icon={<CheckCircle className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("COMPLETED")}
              active={statusFilter === "COMPLETED"}
            />
          </div>

          {/* FILTER BADGE */}
          {statusFilter !== "ALL" && (
            <div className="flex items-center gap-3">
              <div
                className={`px-4 py-2 rounded-xl flex items-center gap-2 border ${
                  statusFilter === "DELAYED"
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <AlertCircle
                  className={
                    statusFilter === "DELAYED"
                      ? "text-red-600"
                      : "text-blue-600"
                  }
                  size={18}
                />
                <span
                  className={`text-sm font-medium ${
                    statusFilter === "DELAYED"
                      ? "text-red-800"
                      : "text-blue-800"
                  }`}
                >
                  Showing only {statusFilter.toLowerCase().replace("_", " ")}{" "}
                  orders
                </span>
              </div>
              <button
                onClick={() => setStatusFilter("ALL")}
                className="text-sm text-gray-600 hover:text-[#c62d23] font-medium"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* SEARCH */}
          <div className="mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders by ID, vendor, or product..."
              className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all shadow-sm"
            />
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500">Loading...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        "Order ID",
                        "Dispatched To",
                        "Product",
                        "Order Date",
                        "Delivery Date",
                        "Qty",
                        "Progress",
                        "Status",
                        "Actions",
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
                    {filteredOrders.map((o, index) => (
                      <React.Fragment key={o._id}>
                        {/* MAIN ROW */}
                        <tr
                          onClick={() => handleRowClick(o._id)}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="p-4 font-semibold text-gray-900">
                            {o.orderId}
                          </td>
                          <td className="p-4 text-gray-700">
                            {o.dispatchedTo?.name || o.dispatchedTo}
                          </td>

                          <td className="p-4 font-medium text-gray-900">
                            {o.chairModel}
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

                          <td className="p-4">
                            <ProgressTracker progress={o.progress} />
                          </td>

                          {/* ORDER STATUS */}
                          <td className="p-4">
                            {isDelayed(o) ? (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                Delayed
                              </span>
                            ) : o.progress === "PARTIAL" ? (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Partial / On Hold
                              </span>
                            ) : o.progress === "READY_FOR_DISPATCH" ? (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                Ready for Dispatch
                              </span>
                            ) : o.progress === "DISPATCHED" ? (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Dispatched
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                Processing
                              </span>
                            )}
                          </td>

                          {/* ACTIONS */}
                          <td
                            className="p-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex gap-2">
                              {/* EDIT */}
                              <button
                                onClick={() => handleEditOrder(o)}
                                disabled={isOrderLocked(o.progress)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isOrderLocked(o.progress)
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-blue-600 hover:bg-blue-50"
                                }`}
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>

                              {/* DELETE */}
                              <button
                                onClick={() => handleDeleteOrder(o._id)}
                                disabled={isOrderLocked(o.progress)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isOrderLocked(o.progress)
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-red-600 hover:bg-red-50"
                                }`}
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>

                              {/* DISPATCH — ONLY IF READY */}
                              {o.progress === "READY_FOR_DISPATCH" && (
                                <button
                                  onClick={() => handleDispatch(o._id)}
                                  title="Dispatch Order"
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                >
                                  <Truck size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED PROGRESS ROW */}
                        {expandedOrderId === o._id &&
                          o.progress !== "PARTIAL" && (
                            <tr className="bg-gray-50">
                              <td colSpan={9} className="p-6">
                                {(() => {
                                  const currentIndex = ORDER_STEPS.findIndex(
                                    (s) => s.key === o.progress,
                                  );

                                  const safeIndex =
                                    currentIndex === -1
                                      ? ORDER_STEPS.length - 1
                                      : currentIndex;

                                  const percent =
                                    ((safeIndex + 1) / ORDER_STEPS.length) *
                                    100;

                                  return (
                                    <div className="w-full space-y-6">
                                      <p className="text-sm text-gray-700 font-semibold">
                                        Order Progress
                                      </p>

                                      <div className="flex justify-between text-xs text-gray-600">
                                        {ORDER_STEPS.map((step, index) => (
                                          <span
                                            key={step.key}
                                            className={
                                              index <= safeIndex
                                                ? "text-gray-900 font-semibold"
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
                                        <div className="absolute left-0 right-0 h-[4px] bg-gray-300 rounded-full" />

                                        {/* PROGRESS LINE */}
                                        <div
                                          className="absolute left-0 h-[4px] rounded-full transition-all duration-500"
                                          style={{
                                            width: `${percent}%`,
                                            background:
                                              percent === 100
                                                ? "#22c55e"
                                                : "linear-gradient(90deg,#22c55e,#c62d23)",
                                          }}
                                        />

                                        {/* MOVING NUMBER */}
                                        <div
                                          className="absolute w-7 h-7 rounded-full border-2 border-white shadow-md
               flex items-center justify-center text-xs font-bold text-white"
                                          style={{
                                            left: `calc(${percent}% - 14px)`,
                                            backgroundColor:
                                              safeIndex ===
                                              ORDER_STEPS.length - 1
                                                ? "#22c55e"
                                                : "#c62d23",
                                          }}
                                        >
                                          {safeIndex + 1}
                                        </div>
                                      </div>

                                      <p className="text-sm">
                                        <span className="text-gray-600">
                                          Current Stage:
                                        </span>{" "}
                                        <span className="text-[#c62d23] font-semibold">
                                          {
                                            ORDER_STEPS.find(
                                              (s) => s.key === o.progress,
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl w-full max-w-[520px] 
  max-h-[90vh] flex flex-col border border-gray-200 shadow-2xl"
          >
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-gray-200">

              <h2 className="text-2xl font-bold text-gray-900">
                {editingOrderId ? "Update Order" : "Create Order"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingOrderId(null);
                  setFormData(initialFormData);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">
                  Dispatched To
                </label>

                <input
                  placeholder="Search or type vendor name"
                  value={vendorSearch}
                  onFocus={() => setShowVendorDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowVendorDropdown(false), 200)
                  }
                  onChange={(e) => {
  setVendorSearch(e.target.value);
  // ✅ DO NOT update dispatchedTo here
}}

                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none
      focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
                />

                {showVendorDropdown && (
                  <div className="bg-white border border-gray-200 mt-1 rounded-xl max-h-48 overflow-auto shadow-lg">
                    {/* EXISTING VENDORS */}
                    {vendors
                      .filter((v) =>
                        v.name
                          .toLowerCase()
                          .includes(vendorSearch.toLowerCase()),
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
                            setShowVendorDropdown(false);
                          }}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          {v.name}
                        </div>
                      ))}

                    {/* ADD NEW VENDOR */}
                    
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">
                  Order Type
                </label>
                <select
                  name="orderType"
                  value={formData.orderType}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
                >
                  <option value="FULL">Full Chair</option>
                  <option value="SPARE">Spare Part</option>
                </select>
              </div>

              <div>
                {formData.orderType === "FULL" && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-2 font-semibold">
                      Chair Model
                    </label>
                    <select
                      name="chairModel"
                      value={formData.chairModel}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
                      required
                    >
                      <option value="">Select Chair Model</option>
                      {chairModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.orderType === "SPARE" && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-2 font-semibold">
                      Spare Part
                    </label>
                    <select
                      name="chairModel"
                      value={formData.chairModel}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
                      required
                    >
                      <option value="">Select Spare Part</option>
                      {spareParts.map((part) => (
                        <option key={part} value={part}>
                          {part}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">
                  Order Date
                </label>

                <div
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200
                  rounded-xl text-gray-600 cursor-not-allowed select-none"
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
            </div>

            <div className="flex justify-end gap-3 px-8 py-4 border-t border-gray-200 bg-white">

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingOrderId(null);
                  setFormData(initialFormData);
                }}
                className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all font-medium border border-gray-200"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateOrder}
                className="bg-[#c62d23] hover:bg-[#a82419] text-white px-6 py-2.5 rounded-xl transition-all font-semibold shadow-sm"
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
    className={`bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full cursor-pointer ${
      danger ? "border-red-300 bg-red-50" : "border-gray-200"
    } ${active ? "ring-2 ring-[#c62d23]" : ""} hover:border-[#c62d23]`}
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

const Input = ({ label, name, value, onChange, type = "text" }) => (
  <div>
    <label className="text-sm text-gray-700 font-semibold block mb-2">
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-gray-900"
    />
  </div>
);
