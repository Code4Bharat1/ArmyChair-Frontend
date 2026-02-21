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
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
} from "lucide-react";
import axios from "axios";
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
  const [orderTypeTab, setOrderTypeTab] = useState("ALL"); // "ALL" | "FULL" | "SPARE"
  const [currentPage, setCurrentPage] = useState(1);
  const [itemSearches, setItemSearches] = useState([""]);
  const [showItemDropdowns, setShowItemDropdowns] = useState([false]);
  const PAGE_SIZE = 10;

  const initialFormData = {
    dispatchedTo: "",
    remark: "",
    orderType: "FULL",
    orderDate: "",
    deliveryDate: "",
    items: [{ chairModel: "", quantity: "" }],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isDelayed(order) {
    if (!order.deliveryDate) return false;
    const delivery = new Date(order.deliveryDate);
    delivery.setHours(0, 0, 0, 0);
    return (
      delivery < today && !["DISPATCHED", "PARTIAL"].includes(order.progress)
    );
  }

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const vendorName =
        typeof o.dispatchedTo === "string"
          ? o.dispatchedTo
          : o.dispatchedTo?.name || "";
      const matchesSearch =
        o.orderId?.toLowerCase().includes(q) ||
        vendorName.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      // 🔀 Type tab filter
      if (orderTypeTab !== "ALL" && o.orderType !== orderTypeTab) return false;

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
  }, [orders, search, statusFilter, orderTypeTab]);

  const [formData, setFormData] = useState(initialFormData);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

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

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API}/vendors`, { headers });
      setVendors(res.data.vendors || res.data);
    } catch (err) {
      console.error("Fetch vendors failed", err);
    }
  };

  const fetchChairModels = async () => {
    try {
      const res = await axios.get(`${API}/inventory/chair-models`, { headers });
      setChairModels(res.data.models || []);
    } catch (err) {
      console.error("Fetch chair models failed", err);
    }
  };

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

  const handleEditOrder = (order) => {
  setEditingOrderId(order._id);

  const items =
    order.items && order.items.length > 0
      ? order.items.map((i) => ({
          chairModel: i.name,
          quantity: i.quantity,
        }))
      : [
          {
            chairModel: order.chairModel,
            quantity: order.quantity,
          },
        ];

  setFormData({
    dispatchedTo: order.dispatchedTo?._id || order.dispatchedTo,
    remark: order.remark || "",
    orderDate: order.orderDate?.split("T")[0],
    deliveryDate: order.deliveryDate?.split("T")[0] || "",
    orderType: order.orderType || "FULL",
    items,
  });

  setVendorSearch(order.dispatchedTo?.name || "");
  setItemSearches(items.map((i) => i.chairModel));
  setShowItemDropdowns(items.map(() => false));
  setShowForm(true);
};

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "orderType") {
      setFormData((prev) => ({
        ...prev,
        orderType: value,
        items: [{ chairModel: "", quantity: "" }], // reset items on type change
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { chairModel: "", quantity: "" }],
    }));
    setItemSearches((prev) => [...prev, ""]);
    setShowItemDropdowns((prev) => [...prev, false]);
  };

  const removeItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    setItemSearches((prev) => prev.filter((_, i) => i !== index));
    setShowItemDropdowns((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!formData.dispatchedTo) {
      alert("Please select vendor from dropdown");
      return;
    }

    const validItems = formData.items.filter(
      (item) => item.chairModel && Number(item.quantity) > 0,
    );

    if (!validItems.length) {
      alert("Add at least one valid item with chair model and quantity");
      return;
    }

    const basePayload = {
      dispatchedTo: formData.dispatchedTo,
      remark: formData.remark || "",
      orderType: formData.orderType,
      orderDate: formData.orderDate || new Date().toISOString().split("T")[0],
      deliveryDate: formData.deliveryDate,
    };

    try {
      if (editingOrderId) {
  await axios.put(
    `${API}/orders/${editingOrderId}`,
    {
      ...basePayload,
      items: validItems.map((item) => ({
        name: item.chairModel,
        quantity: Number(item.quantity),
      })),
    },
    { headers },
  );
}else {
  await axios.post(
    `${API}/orders`,
    {
      ...basePayload,
      items: validItems.map((item) => ({
        name: item.chairModel,
        quantity: Number(item.quantity),
      })),
    },
    { headers },
  );
}

      setShowForm(false);
      setEditingOrderId(null);
      setFormData(initialFormData);
      setItemSearches([""]);
      setShowItemDropdowns([false]);
      fetchOrders();
      fetchChairModels();
      fetchSpareParts();
      fetchVendors();
    } catch (err) {
      console.error("Save failed", err?.response?.data || err);
      alert(err?.response?.data?.message || "Failed to save order");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await axios.delete(`${API}/orders/${orderId}`, { headers });
      fetchOrders();
    } catch (err) {
      alert("Delete failed");
    }
  };

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

  // Counts for toggle tabs (not affected by tab filter, so use raw orders)
  const allOrdersCount = orders.length;
  const fullChairCount = orders.filter((o) => o.orderType === "FULL").length;
  const sparePartCount = orders.filter((o) => o.orderType === "SPARE").length;

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, orderTypeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const FULL_ORDER_STEPS = [
    { key: "PRODUCTION_PENDING", label: "Production Pending" },
    { key: "PRODUCTION_IN_PROGRESS", label: "Production In Progress" },
    { key: "PRODUCTION_COMPLETED", label: "Production Completed" },
    { key: "FITTING_IN_PROGRESS", label: "Fitting In Progress" },
    { key: "FITTING_COMPLETED", label: "Fitting Completed" },
    { key: "READY_FOR_DISPATCH", label: "Ready For Dispatch" },
    { key: "DISPATCHED", label: "Dispatched" },
  ];

  const SPARE_ORDER_STEPS = [
    { key: "ORDER_PLACED", label: "Order Placed" },
    { key: "WAREHOUSE_COLLECTED", label: "Warehouse Collected" },
    { key: "READY_FOR_DISPATCH", label: "Ready For Dispatch" },
    { key: "DISPATCHED", label: "Dispatched" },
  ];

  const ProgressBadge = ({ progress, orderType }) => {
    const steps = orderType === "FULL" ? FULL_ORDER_STEPS : SPARE_ORDER_STEPS;
    if (progress === "PARTIAL") {
      return <StatusPill variant="warning" label="Partial / On Hold" />;
    }
    const currentIndex = steps.findIndex((s) => s.key === progress);
    const safeIndex = currentIndex === -1 ? steps.length - 1 : currentIndex;
    const isCompleted = progress === "DISPATCHED";
    return (
      <StatusPill
        variant={isCompleted ? "success" : "info"}
        label={steps[safeIndex]?.label}
      />
    );
  };

  const handleRowClick = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const handleUploadOrders = async (files) => {
    try {
      setUploading(true);
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append("files", file));
      await axios.post(`${API}/orders/upload`, fd, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      alert("Orders uploaded successfully");
      fetchOrders();
    } catch (err) {
      alert(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleExportCSV = () => {
  if (!orders.length) {
    alert("No orders to export");
    return;
  }

  const headers = [
    "Order ID",
    "Vendor",
    "Product",
    "Remarks",
    "Order Type",
    "Quantity",
    "Order Date",
    "Delivery Date",
    "Status",
  ];

  const rows = [];

  orders.forEach((o) => {
    const vendorName =
      typeof o.dispatchedTo === "string"
        ? o.dispatchedTo
        : o.dispatchedTo?.name || "";

    const orderDate = o.orderDate
      ? new Date(o.orderDate).toLocaleDateString()
      : "";

    const deliveryDate = o.deliveryDate
      ? new Date(o.deliveryDate).toLocaleDateString()
      : "";

    // 🔥 MULTI ITEM SUPPORT
    if (o.items && o.items.length > 0) {
      o.items.forEach((item) => {
        rows.push([
          o.orderId,
          vendorName,
          item.name,
          o.remark || "",
          o.orderType,
          item.quantity,
          orderDate,
          deliveryDate,
          o.progress,
        ]);
      });
    } else {
      // fallback for legacy single-item orders
      rows.push([
        o.orderId,
        vendorName,
        o.chairModel,
        o.remark || "",
        o.orderType,
        o.quantity,
        orderDate,
        deliveryDate,
        o.progress,
      ]);
    }
  });

  const csvContent =
    headers.join(",") +
    "\n" +
    rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

  const getOrderStatus = (o) => {
    if (isDelayed(o)) return { variant: "danger", label: "Delayed" };
    if (o.progress === "PARTIAL")
      return { variant: "warning", label: "On Hold" };
    if (o.progress === "READY_FOR_DISPATCH")
      return { variant: "ready", label: "Ready" };
    if (o.progress === "DISPATCHED")
      return { variant: "success", label: "Dispatched" };
    return { variant: "info", label: "Processing" };
  };

  return (
    <div className="flex min-h-screen bg-[#f8f7f5] text-gray-900">
      {/* Hidden Upload */}
      <input
        type="file"
        id="orderUploadInput"
        accept=".csv,.xlsx"
        hidden
        onChange={(e) => handleUploadOrders(e.target.files)}
      />

      <div className="flex-1 overflow-auto">
        {/* ── HEADER ── */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#c62d23]/10 rounded-xl">
                  <Package size={24} className="text-[#c62d23]" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                    Orders Management
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    Create, track and manage all orders
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <ActionButton
                  icon={<Upload size={15} />}
                  label={uploading ? "Uploading…" : "Upload"}
                  onClick={() =>
                    document.getElementById("orderUploadInput").click()
                  }
                  variant="primary"
                />
                <ActionButton
                  icon={<Plus size={15} />}
                  label="New Order"
                  onClick={() => {
                    setVendorSearch("");
                    setFormData(initialFormData);
                    setEditingOrderId(null);
                    setShowForm(true);
                    setItemSearches([""]);
                    setShowItemDropdowns([false]);
                    fetchChairModels(); // ✅ refresh models list
                    fetchSpareParts(); // ✅ refresh spare parts list
                  }}
                  variant="primary"
                />
                <ActionButton
                  icon={<Download size={15} />}
                  label="Export"
                  onClick={handleExportCSV}
                  variant="success"
                />
                <button
                  onClick={() => router.push("/profile")}
                  className="ml-1 text-gray-400 hover:text-[#c62d23] transition-colors"
                  title="My Profile"
                >
                  <UserCircle size={32} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* ── STAT CARDS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard
              title="Total"
              value={totalOrders}
              icon={<Package />}
              onClick={() => setStatusFilter("ALL")}
              active={statusFilter === "ALL"}
              accentColor="#c62d23"
            />
            <StatCard
              title="In Progress"
              value={inProgress}
              icon={<Clock />}
              onClick={() => setStatusFilter("IN_PROGRESS")}
              active={statusFilter === "IN_PROGRESS"}
              accentColor="#3b82f6"
            />
            <StatCard
              title="Delayed"
              value={delayed}
              icon={<AlertCircle />}
              onClick={() => setStatusFilter("DELAYED")}
              active={statusFilter === "DELAYED"}
              accentColor="#ef4444"
              danger={delayed > 0}
            />
            <StatCard
              title="Ready"
              value={readyToDispatch}
              icon={<Truck />}
              onClick={() => setStatusFilter("READY")}
              active={statusFilter === "READY"}
              accentColor="#f59e0b"
            />
            <StatCard
              title="Completed"
              value={completed}
              icon={<CheckCircle />}
              onClick={() => setStatusFilter("COMPLETED")}
              active={statusFilter === "COMPLETED"}
              accentColor="#22c55e"
            />
          </div>

          {/* ── TOOLBAR ── */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order ID, vendor, or product…"
                className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all shadow-sm"
              />
            </div>

            {/* Active filter pill */}
            {statusFilter !== "ALL" && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                <Filter size={14} className="text-[#c62d23]" />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {statusFilter.toLowerCase().replace("_", " ")}
                </span>
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className="ml-1 text-gray-400 hover:text-[#c62d23] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* ── ORDER TYPE TABS ── */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm w-full">
            {/* All Orders */}
            <button
              onClick={() => {
                setOrderTypeTab("ALL");
                setExpandedOrderId(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 sm:px-4 text-sm font-semibold transition-all duration-200 ${
                orderTypeTab === "ALL"
                  ? "bg-[#c62d23] text-white shadow-inner"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Package size={15} className="shrink-0" />
              <span className="hidden sm:inline">All Orders</span>
              <span className="sm:hidden">All</span>
              <span
                className={`ml-0.5 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                  orderTypeTab === "ALL"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {allOrdersCount}
              </span>
            </button>

            <div className="w-px bg-gray-200" />

            {/* Full Chair */}
            <button
              onClick={() => {
                setOrderTypeTab("FULL");
                setExpandedOrderId(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 sm:px-4 text-sm font-semibold transition-all duration-200 ${
                orderTypeTab === "FULL"
                  ? "bg-[#c62d23] text-white shadow-inner"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Package size={15} className="shrink-0" />
              <span className="hidden sm:inline">Full Chair Orders</span>
              <span className="sm:hidden">Full</span>
              <span
                className={`ml-0.5 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                  orderTypeTab === "FULL"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {fullChairCount}
              </span>
            </button>

            <div className="w-px bg-gray-200" />

            {/* Spare Part */}
            <button
              onClick={() => {
                setOrderTypeTab("SPARE");
                setExpandedOrderId(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 sm:px-4 text-sm font-semibold transition-all duration-200 ${
                orderTypeTab === "SPARE"
                  ? "bg-[#c62d23] text-white shadow-inner"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Truck size={15} className="shrink-0" />
              <span className="hidden sm:inline">Spare Part Orders</span>
              <span className="sm:hidden">Spare</span>
              <span
                className={`ml-0.5 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                  orderTypeTab === "SPARE"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {sparePartCount}
              </span>
            </button>
          </div>

          {/* ── TABLE ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-gray-100 border-t-[#c62d23] animate-spin" />
                <p className="text-sm text-gray-400">Loading orders…</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                <Package size={44} className="text-gray-200" />
                <p className="text-base font-medium">No orders found</p>
                <p className="text-sm">Try adjusting your search or filter</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {[
                          "Order ID",
                          "Dispatched To",
                          "Chair / Part",
                          "Remark",
                          "Order Date",
                          "Delivery Date",
                          "Qty",
                          "Stage",
                          "Status",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {paginatedOrders.map((o) => {
                        const status = getOrderStatus(o);
                        const isExpanded = expandedOrderId === o._id;

                        return (
                          <React.Fragment key={o._id}>
                            <tr
                              onClick={() => handleRowClick(o._id)}
                              className="hover:bg-gray-50 transition-colors cursor-pointer group"
                            >
                              {/* Order ID */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-semibold text-gray-900 text-xs bg-gray-100 px-2 py-1 rounded-md">
                                    {o.orderId}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp
                                      size={12}
                                      className="text-gray-400 shrink-0"
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={12}
                                      className="text-gray-300 group-hover:text-gray-400 shrink-0"
                                    />
                                  )}
                                </div>
                              </td>

                              {/* Dispatched To */}
                              <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-gray-800">
                                {o.dispatchedTo?.name || o.dispatchedTo}
                              </td>

                              {/* Chair / Part */}
                              {/* Chair / Part */}
<td className="px-4 py-3.5 text-sm font-medium text-gray-900">
  {/* MULTI ITEM */}
  {o.items && o.items.length > 1 ? (
    <details
      onClick={(e) => e.stopPropagation()}
      className="relative cursor-pointer"
    >
      <summary className="list-none flex items-center gap-1 text-[#c62d23] font-semibold">
        {o.items.length} items
        <ChevronDown size={12} />
      </summary>

      <div className="absolute z-20 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1">
        {o.items.map((item, idx) => (
          <div
            key={idx}
            className="flex justify-between text-sm px-2 py-1 rounded hover:bg-gray-50"
          >
            <span>{item.name}</span>
            <span className="font-semibold">× {item.quantity}</span>
          </div>
        ))}
      </div>
    </details>
  ) : (
    /* SINGLE ITEM */
    <span>
      {(o.items && o.items[0]?.name) || o.chairModel}
    </span>
  )}
</td>
                              {/* Remark */}
                              <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[220px] truncate">
                                {o.remark ? o.remark : "—"}
                              </td>

                              {/* Order Date */}
                              <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-600">
                                {new Date(o.orderDate).toLocaleDateString()}
                              </td>

                              {/* Delivery Date */}
                              <td
                                className={`px-4 py-3.5 whitespace-nowrap text-sm ${isDelayed(o) ? "text-red-500 font-semibold" : "text-gray-600"}`}
                              >
                                {o.deliveryDate
                                  ? new Date(
                                      o.deliveryDate,
                                    ).toLocaleDateString()
                                  : "—"}
                              </td>

                              {/* Qty */}
                              {/* Qty */}
<td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-gray-900">
  {o.items
    ? o.items.reduce((sum, i) => sum + i.quantity, 0)
    : o.quantity}
</td>

                              {/* Stage */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <ProgressBadge
                                  progress={o.progress}
                                  orderType={o.orderType}
                                />
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <StatusPill
                                  variant={status.variant}
                                  label={status.label}
                                />
                              </td>

                              {/* Actions */}
                              <td
                                className="px-4 py-3.5 whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditOrder(o)}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil
                                      size={15}
                                      className="text-gray-500 hover:text-[#c62d23]"
                                    />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(o._id)}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2
                                      size={15}
                                      className="text-gray-500 hover:text-red-600"
                                    />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Progress */}
                            {isExpanded && o.progress !== "PARTIAL" && (
                              <tr>
                                <td
                                  colSpan={10}
                                  className="px-4 py-0 bg-gray-50"
                                >
                                  <div className="my-3 p-5 bg-white rounded-xl border border-gray-100">
                                    <ExpandedProgress
                                      order={o}
                                      FULL_ORDER_STEPS={FULL_ORDER_STEPS}
                                      SPARE_ORDER_STEPS={SPARE_ORDER_STEPS}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── PAGINATION FOOTER ── */}
                <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-gray-400 order-2 sm:order-1">
                    Showing{" "}
                    <span className="font-semibold text-gray-600">
                      {Math.min(
                        (currentPage - 1) * PAGE_SIZE + 1,
                        filteredOrders.length,
                      )}
                      –
                      {Math.min(currentPage * PAGE_SIZE, filteredOrders.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-600">
                      {filteredOrders.length}
                    </span>{" "}
                    orders
                  </p>

                  <div className="flex items-center gap-1 order-1 sm:order-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c62d23] hover:text-[#c62d23]"
                    >
                      ← Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - currentPage) <= 1,
                      )
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "..." ? (
                          <span
                            key={`e-${idx}`}
                            className="px-2 text-xs text-gray-400"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`w-8 h-8 text-xs rounded-lg border font-semibold transition-colors ${
                              currentPage === p
                                ? "bg-[#c62d23] text-white border-[#c62d23]"
                                : "border-gray-200 text-gray-600 hover:border-[#c62d23] hover:text-[#c62d23]"
                            }`}
                          >
                            {p}
                          </button>
                        ),
                      )}

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c62d23] hover:text-[#c62d23]"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#c62d23]/10 rounded-lg">
                  <Package size={18} className="text-[#c62d23]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingOrderId ? "Update Order" : "Create New Order"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingOrderId(null);
                  setFormData(initialFormData);
                  setItemSearches([""]);
                  setShowItemDropdowns([false]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
              {/* Vendor */}
              <FormField label="Dispatched To">
                <div className="relative">
                  <input
                    placeholder="Search or type vendor name"
                    value={vendorSearch}
                    onFocus={() => setShowVendorDropdown(true)}
                    onBlur={() =>
                      setTimeout(() => setShowVendorDropdown(false), 150)
                    }
                    onChange={(e) => {
                      setVendorSearch(e.target.value);
                      setShowVendorDropdown(true);
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all"
                  />
                  {showVendorDropdown && (
                    <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 mt-1 rounded-xl max-h-44 overflow-auto shadow-xl">
                      {vendors
                        .filter((v) =>
                          v.name
                            .toLowerCase()
                            .includes(vendorSearch.toLowerCase()),
                        )
                        .map((v) => (
                          <div
                            key={v._id}
                            onMouseDown={() => {
                              setFormData({ ...formData, dispatchedTo: v._id });
                              setVendorSearch(v.name);
                              setShowVendorDropdown(false);
                            }}
                            className="px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                          >
                            {v.name}
                          </div>
                        ))}
                      {vendorSearch &&
                        !vendors.some(
                          (v) =>
                            v.name.toLowerCase() === vendorSearch.toLowerCase(),
                        ) && (
                          <div
                            onMouseDown={() => {
                              const newName = vendorSearch.trim();
                              setFormData({
                                ...formData,
                                dispatchedTo: newName,
                              });
                              setVendorSearch(newName);
                              setVendors((prev) => [
                                ...prev,
                                { _id: newName, name: newName.toUpperCase() },
                              ]);
                              setShowVendorDropdown(false);
                            }}
                            className="px-4 py-2.5 bg-gray-50 hover:bg-green-50 cursor-pointer text-green-700 font-medium text-sm transition-colors"
                          >
                            ➕ Add "{vendorSearch}" as new vendor
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </FormField>

              {/* Order Type */}
              <FormField label="Order Type">
                <div className="grid grid-cols-2 gap-2">
                  {["FULL", "SPARE"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          orderType: type,
                          chairModel: "",
                        }))
                      }
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        formData.orderType === type
                          ? "bg-[#c62d23] text-white border-[#c62d23] shadow-sm"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {type === "FULL" ? "Full Chair" : "Spare Part"}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Remark */}
              <FormField label="Remark (Optional)">
                <textarea
                  name="remark"
                  value={formData.remark}
                  onChange={handleFormChange}
                  placeholder="Any special instructions or client changes…"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all resize-none"
                />
              </FormField>

              {/* Dynamic Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {formData.orderType === "FULL"
                      ? "Chair Models"
                      : "Spare Parts"}
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-xs font-semibold text-[#c62d23] hover:underline"
                  >
                    <Plus size={12} /> Add Row
                  </button>
                </div>

                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    {/* Searchable model/part input */}
                    <div className="relative flex-1">
                      <input
                        placeholder={
                          formData.orderType === "FULL"
                            ? "Search chair model…"
                            : "Search spare part…"
                        }
                        value={itemSearches[index] || ""}
                        onFocus={() => {
                          const updated = [...showItemDropdowns];
                          updated[index] = true;
                          setShowItemDropdowns(updated);
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            const updated = [...showItemDropdowns];
                            updated[index] = false;
                            setShowItemDropdowns(updated);
                          }, 150);
                        }}
                        onChange={(e) => {
                          const updated = [...itemSearches];
                          updated[index] = e.target.value;
                          setItemSearches(updated);
                          updateItem(index, "chairModel", e.target.value); // allow free text too
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all"
                      />
                      {showItemDropdowns[index] && (
                        <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 mt-1 rounded-xl max-h-44 overflow-auto shadow-xl">
                          {(formData.orderType === "FULL"
                            ? chairModels
                            : spareParts
                          )
                            .filter((m) =>
                              m
                                .toLowerCase()
                                .includes(
                                  (itemSearches[index] || "").toLowerCase(),
                                ),
                            )
                            .map((m) => (
                              <div
                                key={m}
                                onMouseDown={() => {
                                  updateItem(index, "chairModel", m);
                                  const searches = [...itemSearches];
                                  searches[index] = m;
                                  setItemSearches(searches);
                                  const dropdowns = [...showItemDropdowns];
                                  dropdowns[index] = false;
                                  setShowItemDropdowns(dropdowns);
                                }}
                                className="px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                              >
                                {m}
                              </div>
                            ))}
                          {/* Add new option */}
                          {itemSearches[index] &&
                            !(
                              formData.orderType === "FULL"
                                ? chairModels
                                : spareParts
                            ).some(
                              (m) =>
                                m.toLowerCase() ===
                                (itemSearches[index] || "").toLowerCase(),
                            ) && (
                              <div
                                onMouseDown={async () => {
                                  const newName = itemSearches[index].trim();
                                  // Save to backend
                                  try {
                                    if (formData.orderType === "FULL") {
                                      await axios.post(
                                        `${API}/inventory/chair-models`,
                                        { name: newName },
                                        { headers },
                                      );
                                      setChairModels((prev) => [
                                        ...prev,
                                        newName,
                                      ]);
                                    } else {
                                      await axios.post(
                                        `${API}/inventory/spare-part-names`,
                                        { name: newName },
                                        { headers },
                                      );
                                      setSpareParts((prev) => [
                                        ...prev,
                                        newName,
                                      ]);
                                    }
                                  } catch {
                                    // Even if save fails, allow it locally
                                  }
                                  updateItem(index, "chairModel", newName);
                                  const dropdowns = [...showItemDropdowns];
                                  dropdowns[index] = false;
                                  setShowItemDropdowns(dropdowns);
                                }}
                                className="px-4 py-2.5 bg-gray-50 hover:bg-green-50 cursor-pointer text-green-700 font-medium text-sm"
                              >
                                ➕ Add "{itemSearches[index]}" as new{" "}
                                {formData.orderType === "FULL"
                                  ? "model"
                                  : "part"}
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                      className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all"
                    />

                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          removeItem(index);
                          setItemSearches((prev) =>
                            prev.filter((_, i) => i !== index),
                          );
                          setShowItemDropdowns((prev) =>
                            prev.filter((_, i) => i !== index),
                          );
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* Order Date (readonly) */}
              <FormField label="Order Date">
                <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-500 select-none">
                  {formData.orderDate || new Date().toISOString().split("T")[0]}
                </div>
              </FormField>

              {/* Delivery Date */}
              <FormField label="Delivery Date">
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all"
                />
              </FormField>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingOrderId(null);
                  setFormData(initialFormData);
                  setItemSearches([""]);
                  setShowItemDropdowns([false]);
                }}
                className="px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all font-medium border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                className="bg-[#c62d23] hover:bg-[#b02620] text-white px-5 py-2.5 rounded-xl text-sm transition-all font-semibold shadow-sm active:scale-95"
              >
                {editingOrderId ? "Save Changes" : "Create Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════ */

function ExpandedProgress({ order, FULL_ORDER_STEPS, SPARE_ORDER_STEPS }) {
  const steps =
    order.orderType === "FULL" ? FULL_ORDER_STEPS : SPARE_ORDER_STEPS;
  const currentIndex = steps.findIndex((s) => s.key === order.progress);
  const safeIndex = currentIndex === -1 ? steps.length - 1 : currentIndex;
  const percent = ((safeIndex + 1) / steps.length) * 100;
  const isCompleted = order.progress === "DISPATCHED";

  return (
    <div className="space-y-4">
      {order.items && order.items.length > 0 && (
  <div className="mb-5">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
      Items
    </p>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {order.items.map((item, idx) => (
        <div
          key={idx}
          className="flex justify-between items-center px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm"
        >
          <span className="font-medium text-gray-800">
            {item.name}
          </span>
          <span className="font-semibold text-gray-900">
            × {item.quantity}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
      <div className="flex items-center justify-between">
        {/* ── ITEMS SECTION ── */}

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Order Progress
        </p>
        <span className="text-xs text-gray-500">
          Step {safeIndex + 1} of {steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-1.5 bg-gray-100 rounded-full w-full" />
        <div
          className="absolute top-0 left-0 h-1.5 rounded-full transition-all duration-700"
          style={{
            width: `${percent}%`,
            background: isCompleted
              ? "#22c55e"
              : "linear-gradient(90deg, #22c55e, #c62d23)",
          }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between relative">
        {steps.map((step, index) => {
          const done = index < safeIndex;
          const active = index === safeIndex;
          return (
            <div
              key={step.key}
              className="flex flex-col items-center gap-1.5 flex-1"
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                  done
                    ? "bg-green-500 border-green-500 text-white"
                    : active
                      ? "bg-[#c62d23] border-[#c62d23] text-white scale-110 shadow-sm"
                      : "bg-white border-gray-200 text-gray-300"
                }`}
              >
                {done ? "✓" : index + 1}
              </div>
              <span
                className={`text-[9px] text-center leading-tight max-w-[56px] ${
                  active
                    ? "text-[#c62d23] font-semibold"
                    : done
                      ? "text-green-600"
                      : "text-gray-300"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_VARIANTS = {
  danger: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  ready: "bg-violet-50 text-violet-700 border-violet-200",
  success: "bg-green-50 text-green-700 border-green-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

function StatusPill({ variant, label }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_VARIANTS[variant] || STATUS_VARIANTS.info}`}
    >
      {label}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon,
  danger,
  onClick,
  active,
  accentColor,
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-xl p-4 sm:p-5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md group ${
        danger ? "border-red-200" : "border-gray-100"
      } ${active ? "ring-2 ring-offset-1" : "hover:border-gray-200"}`}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: accentColor,
        ...(active ? { "--tw-ring-color": accentColor } : {}),
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </p>
        <div
          className="p-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          {React.cloneElement(icon, { size: 14 })}
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1.5 group-hover:text-gray-500 transition-colors">
        {active ? "Showing filtered" : "Click to filter"}
      </p>
    </div>
  );
}

function ActionButton({ icon, label, onClick, variant = "primary" }) {
  const base =
    "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95";
  const variants = {
    primary: "bg-[#c62d23] hover:bg-[#b02620] text-white",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white",
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]}`}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function FormField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}
