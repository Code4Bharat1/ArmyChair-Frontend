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
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import SalesSidebar from "./sidebar";
import { UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Orders() {
  const [salesUsers, setSalesUsers] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [chairModels, setChairModels] = useState([]);
  const [chairSearch, setChairSearch] = useState("");
  const [showChairDropdown, setShowChairDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);

 const initialFormData = {
  dispatchedTo: "",
  chairModel: "",
  partname: "",
  orderType: "FULL",
  orderDate: "",
  deliveryDate: "",
  quantity: "",
  salesPerson: "",
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

  const fetchMe = async () => {
    const res = await axios.get(`${API}/auth/me`, { headers });
    setUser(res.data.user || res.data);
  };
  useEffect(() => {
    fetchMe();
  }, []);

  /* ================= FETCH SALES USERS ================= */
  const fetchSalesUsers = async () => {
    const res = await axios.get(`${API}/auth/staff`, { headers });
    const all = res.data.users || res.data;
    setSalesUsers(all.filter((u) => u.role === "sales"));
  };
  useEffect(() => {
    fetchSalesUsers();
  }, []);

  /* ================= FETCH VENDORS ================= */
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
  const res = await axios.get(`${API}/inventory`, { headers });

  const inventory = res.data.inventory || [];

  const fullChairs = inventory
    .filter((i) => i.type === "FULL")
    .map((i) => i.chairType);

  const spare = inventory
    .filter((i) => i.type === "SPARE")
    .map((i) => i.partName);

  setChairModels([...new Set(fullChairs)]);
  setSpareParts([...new Set(spare)]);
};


  useEffect(() => {
    fetchOrders();
    fetchVendors();
    fetchChairModels(); // 👈 add this
  }, []);

  /* ================= EDIT ================= */
  const handleEditOrder = (order) => {
    setEditingOrderId(order._id);
    setFormData({
      dispatchedTo: order.dispatchedTo?._id || order.dispatchedTo,
      chairModel: order.chairModel,
      orderType: order.orderType || "FULL",
      orderDate: order.orderDate?.split("T")[0],
      deliveryDate: order.deliveryDate?.split("T")[0] || "",
      quantity: order.quantity,
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
    if (!formData.dispatchedTo) {
      alert("Please select or create a vendor");
      return;
    }

    if (user?.role === "admin" && !formData.salesPerson) {
      alert("Please assign a sales person");
      return;
    }

    e.preventDefault();

    try {
      const payload = {
  dispatchedTo: formData.dispatchedTo,
  chairModel:
    formData.orderType === "FULL"
      ? formData.chairModel
      : formData.partname,
  orderType: formData.orderType,
  orderDate: formData.orderDate || new Date().toISOString().split("T")[0],
  deliveryDate: formData.deliveryDate,
  quantity: Number(formData.quantity),
  salesPerson: formData.salesPerson,
  progress: "ORDER_PLACED",
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

      await fetchOrders(); // refresh orders
      await fetchVendors(); // 🔥 refresh vendors automatically
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
        <span className="text-sm font-medium text-amber-600">
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
        className={`text-sm font-medium ${isCompleted ? "text-green-600" : "text-amber-600"
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
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <SalesSidebar />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
            <p className="text-gray-600 mt-2">
              Create, track and manage all orders
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* UPLOAD ORDERS */}
            <button
              onClick={() =>
                document.getElementById("orderUploadInput").click()
              }
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 border border-gray-300"
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
              className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Plus size={18} />
              Add Order
            </button>

            {/* EXPORT CSV */}
            <button
              onClick={handleExportCSV}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 border border-gray-300"
            >
              <Download size={18} />
              Export CSV
            </button>

            {/* PROFILE */}
            <button
              onClick={() => router.push("/sales/profile")}
              title="My Profile"
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <UserCircle size={32} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-8 space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <KpiCard
              title="Total Orders"
              value={totalOrders}
              icon={<Package className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("ALL")}
              active={statusFilter === "ALL"}
            />

            <KpiCard
              title="In Progress"
              value={inProgress}
              icon={<Clock className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("IN_PROGRESS")}
              active={statusFilter === "IN_PROGRESS"}
            />

            <KpiCard
              title="Delayed"
              value={delayed}
              icon={<Clock className="text-[#c62d23]" />}
              danger={delayed > 0}
              onClick={() => setStatusFilter("DELAYED")}
              active={statusFilter === "DELAYED"}
            />

            <KpiCard
              title="Ready to Dispatch"
              value={readyToDispatch}
              icon={<Truck className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("READY")}
              active={statusFilter === "READY"}
            />

            <KpiCard
              title="Completed"
              value={completed}
              icon={<CheckCircle className="text-[#c62d23]" />}
              onClick={() => setStatusFilter("COMPLETED")}
              active={statusFilter === "COMPLETED"}
            />
          </div>

          {/* DELAYED ALERT */}
          {delayed > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-center">
              <AlertCircle className="text-red-500" />
              <span className="text-red-700 font-medium">
                {delayed} {delayed > 1 ? "orders are" : "order is"} delayed
              </span>
            </div>
          )}

          {/* SEARCH */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders by ID, customer, or product..."
                className="w-full p-3 bg-white rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
              />
            </div>

            {/* TABLE */}
            <div className="overflow-auto rounded-lg border border-gray-200">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No orders found
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {[
                        "Order ID",
                        "Dispatched To",
                        "Chair",
                        "Order Date",
                        "Delivery Date",
                        "Qty",
                        "Progress",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left p-4 font-semibold text-gray-700"
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
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                        >
                          <td className="p-4 font-medium text-gray-900">
                            {o.orderId}
                          </td>
                          <td className="p-4 text-gray-700">
                            {o.dispatchedTo?.name || o.dispatchedTo}
                          </td>
                          <td className="p-4 text-gray-700">{o.chairModel}</td>
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
                          <td className="p-4 flex gap-2">
                            {/* EDIT BUTTON - Always visible but disabled when locked */}
                            <button
                              onClick={(e) => {
                                if (isOrderLocked(o.progress)) return;
                                e.stopPropagation();
                                handleEditOrder(o);
                              }}
                              className={`p-2 rounded-lg transition-colors ${isOrderLocked(o.progress)
                                  ? "cursor-not-allowed opacity-50"
                                  : "hover:bg-gray-100"
                                }`}
                              title={isOrderLocked(o.progress) ? "Cannot edit in current status" : "Edit"}
                              disabled={isOrderLocked(o.progress)}
                            >
                              <Pencil
                                size={16}
                                className={
                                  isOrderLocked(o.progress)
                                    ? "text-gray-400"
                                    : "text-gray-600 hover:text-[#c62d23]"
                                }
                              />
                            </button>

                            {/* DELETE BUTTON */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrder(o._id);
                              }}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
                            </button>

                            {/* DISPATCH BUTTON - Only for READY_FOR_DISPATCH orders */}
                            {o.progress === "READY_FOR_DISPATCH" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDispatch(o._id);
                                }}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                title="Dispatch"
                              >
                                <Truck size={16} className="text-gray-600 hover:text-green-600" />
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* EXPANDED PROGRESS ROW */}
                        {expandedOrderId === o._id &&
                          o.progress !== "PARTIAL" && (
                            <tr className="bg-gray-50">
                              <td colSpan={8} className="p-6">
                                <div className="w-full space-y-6">
                                  <p className="text-sm text-gray-700 font-medium">
                                    Order Progress
                                  </p>

                                  <div className="flex justify-between text-xs text-gray-500">
                                    {ORDER_STEPS.map((step, index) => (
                                      <span
                                        key={step.key}
                                        className={
                                          index <= ORDER_STEPS.findIndex((s) => s.key === o.progress)
                                            ? "text-gray-900 font-medium"
                                            : ""
                                        }
                                      >
                                        {step.label}
                                      </span>
                                    ))}
                                  </div>

                                  {/* PROGRESS TRACKER */}
                                  <div className="relative w-full h-10 flex items-center mt-6">
                                    {/* BASE LINE */}
                                    <div className="absolute left-0 right-0 h-[4px] bg-gray-300 rounded-full" />

                                    {/* PROGRESS LINE */}
                                    <div
                                      className="absolute left-0 h-[4px] rounded-full transition-all duration-500"
                                      style={{
                                        width: `${((ORDER_STEPS.findIndex((s) => s.key === o.progress) + 1) / ORDER_STEPS.length) * 100}%`,
                                        background:
                                          o.progress === "DISPATCHED"
                                            ? "#16a34a"
                                            : "linear-gradient(90deg,#16a34a,#c62d23)",
                                      }}
                                    />

                                    {/* MOVING NUMBER */}
                                    <div
                                      className="absolute w-7 h-7 rounded-full border-2 border-white shadow
                                        flex items-center justify-center text-xs font-bold text-white"
                                      style={{
                                        left: `calc(${((ORDER_STEPS.findIndex((s) => s.key === o.progress) + 1) / ORDER_STEPS.length) * 100}% - 14px)`,
                                        backgroundColor:
                                          o.progress === "DISPATCHED"
                                            ? "#16a34a"
                                            : "#c62d23",
                                      }}
                                    >
                                      {ORDER_STEPS.findIndex((s) => s.key === o.progress) + 1}
                                    </div>
                                  </div>

                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">Current Stage:</span>{" "}
                                    <span className="text-[#c62d23] font-semibold">
                                      {
                                        ORDER_STEPS.find(
                                          (s) => s.key === o.progress,
                                        )?.label
                                      }
                                    </span>
                                  </p>
                                </div>
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
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[520px] border border-gray-200 shadow-lg max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingOrderId ? "Update Order" : "Create Order"}
              </h2>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 py-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  }}
                  className="w-full p-3 bg-white rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                />

                {showVendorDropdown && (
                  <div className="bg-white border border-gray-200 mt-1 rounded-xl shadow-lg max-h-48 overflow-auto">
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
                            setFormData({ ...formData, dispatchedTo: v._id });
                            setVendorSearch(v.name);
                            setShowVendorDropdown(false);
                          }}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
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
                          onClick={() => {
                            setFormData({
                              ...formData,
                              dispatchedTo: vendorSearch.trim(),
                            });
                            setVendorSearch(vendorSearch.trim());
                            setShowVendorDropdown(false);
                          }}
                          className="px-4 py-3 bg-gray-50 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-0 text-green-700 font-medium"
                        >
                          ➕ Add "{vendorSearch}" as new vendor
                        </div>
                      )}
                  </div>
                )}
              </div>

              {user?.role === "admin" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Sales Person
                  </label>

                  <select
                    value={formData.salesPerson || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, salesPerson: e.target.value })
                    }
                    className="w-full p-3 bg-white rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                  >
                    <option value="">Select Sales Person</option>
                    {salesUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Type
                </label>

                <select
                  value={formData.orderType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      orderType: e.target.value,
                      chairModel: "",
                    })
                  }
                  className="w-full p-3 bg-white rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                >
                  <option value="FULL">Full Chair</option>
                  <option value="SPARE">Spare Part</option>
                </select>
              </div>

              {/* FULL CHAIR */}
              {formData.orderType === "FULL" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chair Model
                  </label>

                  <select
                    value={formData.chairModel}
                    onChange={(e) =>
                      setFormData({ ...formData, chairModel: e.target.value })
                    }
                    className="w-full p-3 bg-white rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                    required
                  >
                    <option value="">Select Chair Model</option>
                    {chairModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* SPARE PART */}
              {formData.orderType === "SPARE" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spare Part
                  </label>

                  <select
                    value={formData.partname}
                    onChange={(e) =>
                      setFormData({ ...formData, partname: e.target.value })
                    }
                    className="w-full p-3 bg-white rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                    required
                  >
                    <option value="">Select Spare Part</option>
                    {spareParts.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Date
                </label>

                <div
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-300 text-gray-700"
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

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingOrderId(null);
                  setFormData(initialFormData);
                }}
                className="px-5 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateOrder}
                className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-2.5 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
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

const KpiCard = ({ title, value, icon, danger = false, onClick, active }) => (
  <div
    onClick={onClick}
    className={`bg-white border border-gray-200 rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full cursor-pointer ${active ? "border-[#c62d23] ring-2 ring-[#c62d23]/20" : ""
      }`}
    style={{
      borderLeft: '4px solid #c62d23'
    }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <p className={`text-3xl font-bold mb-1 ${danger ? 'text-red-600' : 'text-gray-900'}`}>
      {value}
    </p>
  </div>
);

const Input = ({ label, name, value, onChange, type = "text" }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full p-3 bg-white rounded-xl border border-gray-300 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
    />
  </div>
);