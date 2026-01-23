"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, Download, Plus, X, TrendingUp } from "lucide-react";
import Sidebar from "@/components/Superadmin/sidebar";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const Return = () => {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({
    orderId: "",
    chairType: "",
    description: "",
    quantity: 1,
    returnDate: "",
    category: "Functional",
    vendor: "",
    location: "",
    returnedFrom: "",
    reason: "",
  });

  /* ================= FETCH ORDER BY ORDER ID ================= */
  const fetchOrderDetails = async (orderId) => {
    if (!orderId) return;

    try {
      const res = await axios.get(`${API}/orders/by-order-id/${orderId}`, {
        headers: getAuthHeaders(),
      });

      const order = res.data.order;

      setForm((prev) => ({
        ...prev,
        chairType: order.chairModel,
        quantity: order.quantity,
        vendor: order.salesPerson?.name || "Sales",
        location: order.dispatchedTo,
        returnedFrom: order.dispatchedTo?.name,
        deliveryDate: order.deliveryDate,
      }));
    } catch (error) {
      console.error("Order not found");
    }
  };

  /* ================= FETCH RETURNS ================= */
  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/returns`, {
        headers: getAuthHeaders(),
      });
      setReturns(res.data.data);
    } catch (error) {
      console.error(
        "Failed to add return:",
        error.response?.data || error.message,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  /* ================= CALCULATE STATS ================= */
  const stats = useMemo(() => {
    const totalReturns = returns.length;
    const functionalCount = returns.filter(
      (r) => r.category === "Functional",
    ).length;
    const nonFunctionalCount = returns.filter(
      (r) => r.category === "Non-Functional",
    ).length;
    const pendingCount = returns.filter((r) => r.status === "Pending").length;
    const inFittingCount = returns.filter(
      (r) => r.status === "In-Fitting",
    ).length;

    // Find most returned product
    const productCounts = {};
    returns.forEach((r) => {
      if (r.chairType) {
        productCounts[r.chairType] = (productCounts[r.chairType] || 0) + 1;
      }
    });

    const mostReturnedProduct = Object.entries(productCounts).sort(
      (a, b) => b[1] - a[1],
    )[0];

    return {
      totalReturns,
      functionalCount,
      nonFunctionalCount,
      pendingCount,
      inFittingCount,
      mostReturnedProduct: mostReturnedProduct
        ? {
            name: mostReturnedProduct[0],
            count: mostReturnedProduct[1],
          }
        : null,
    };
  }, [returns]);

  /* ================= FILTER ================= */
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchSearch =
        r.orderId?.toLowerCase().includes(search.toLowerCase()) ||
        r.chairType?.toLowerCase().includes(search.toLowerCase());

      const matchType = selectedType === "All" || r.category === selectedType;

      const matchStatus =
        selectedStatus === "All" ||
        (selectedStatus === "Pending" && r.status === "Pending") ||
        (selectedStatus === "In-Fitting" && r.status === "In-Fitting");

      return matchSearch && matchType && matchStatus;
    });
  }, [search, selectedType, selectedStatus, returns]);

  /* ================= MOVE TO INVENTORY ================= */
  const moveToFitting = async (id) => {
    try {
      await axios.post(
        `${API}/returns/${id}/move-to-fitting`,
        {},
        { headers: getAuthHeaders() },
      );
      fetchReturns();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to move to fitting");
    }
  };

  /* ================= ADD RETURN ================= */
  const submitReturn = async () => {
    try {
      const payload = {
        orderId: form.orderId,
        returnDate: form.returnDate,
        category: form.category,
        description: form.reason,
      };

      await axios.post(`${API}/returns`, payload, {
        headers: getAuthHeaders(),
      });

      setOpenModal(false);
      setForm({
        orderId: "",
        chairType: "",
        description: "",
        quantity: 1,
        returnDate: "",
        category: "Functional",
        vendor: "",
        location: "",
        returnedFrom: "",
        reason: "",
      });

      fetchReturns();
    } catch (error) {
      console.log("FULL ERROR:", error);
      console.log("STATUS:", error.response?.status);
      console.log("DATA:", error.response?.data);
    }
  };

  /* ================= EXPORT ================= */
  const exportCSV = () => {
    if (returns.length === 0) return;

    const headers = ["Order ID", "Product", "Return Date", "Category"].join(
      ",",
    );

    const rows = filteredReturns
      .map(
        (r) =>
          `${r.orderId},${r.chairType},${new Date(
            r.returnDate,
          ).toLocaleDateString()},${r.category}`,
      )
      .join("\n");

    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "returns-report.csv";
    a.click();
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* ================= HEADER ================= */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <span>Returns Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Track returned orders and route functional items to inventory and
              non-functional items to defects.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpenModal(true)}
              className="bg-[#c62d23] text-white px-5 py-3 rounded-xl border-2 border-gray-200 shadow-sm hover:bg-[#a8241c] hover:shadow-md transition-all duration-200 cursor-pointer group flex items-center gap-2 font-medium"
            >
              <Plus
                size={18}
                className=" group-hover:scale-110 transition-transform"
              />
              Add Returns
            </button>

            <button
              onClick={exportCSV}
              className="bg-white px-5 py-3 rounded-xl border-2 border-gray-200 shadow-sm hover:border-[#c62d23] hover:shadow-md transition-all duration-200 cursor-pointer group flex items-center gap-2 font-medium"
            >
              <Download
                size={18}
                className="text-[#c62d23] group-hover:scale-110 transition-transform"
              />
              Export Report
            </button>
          </div>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="p-8 space-y-8">
          {/* ================= STATS CARDS ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard
              title="Total Returns"
              value={stats.totalReturns}
              onClick={() => {
                setSelectedType("All");
                setSelectedStatus("All");
              }}
              active={selectedType === "All" && selectedStatus === "All"}
            />
            <StatCard
              title="Functional"
              value={stats.functionalCount}
              onClick={() => {
                setSelectedType("Functional");
                setSelectedStatus("All");
              }}
              active={selectedType === "Functional"}
            />
            <StatCard
              title="Non-Functional"
              value={stats.nonFunctionalCount}
              onClick={() => {
                setSelectedType("Non-Functional");
                setSelectedStatus("All");
              }}
              active={selectedType === "Non-Functional"}
            />
            <StatCard
              title="Pending"
              value={stats.pendingCount}
              onClick={() => {
                setSelectedType("All");
                setSelectedStatus("Pending");
              }}
              active={selectedStatus === "Pending"}
            />
            {stats.mostReturnedProduct && (
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-[#c62d23]" />
                  <p className="text-sm text-gray-600 font-medium">
                    Most Returned
                  </p>
                </div>
                <p
                  className="text-2xl font-bold text-gray-900 mb-1 truncate"
                  title={stats.mostReturnedProduct.name}
                >
                  {stats.mostReturnedProduct.name}
                </p>
                <p className="text-sm text-[#c62d23] font-semibold">
                  {stats.mostReturnedProduct.count} return
                  {stats.mostReturnedProduct.count !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          {/* ================= FILTERS ================= */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-wrap items-end gap-6 mb-6">
              <div className="flex-1 min-w-[280px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search return by ID or product..."
                    className="w-full p-3 pl-10 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col min-w-[200px]">
                <label className="mb-2 text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                >
                  <option value="All">All</option>
                  <option value="Functional">Functional</option>
                  <option value="Non-Functional">Non-Functional</option>
                </select>
              </div>

              <div className="flex flex-col min-w-[200px]">
                <label className="mb-2 text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                >
                  <option value="All">All</option>
                  <option value="Pending">Pending</option>
                  <option value="In-Fitting">In-Fitting</option>
                </select>
              </div>
            </div>

            {/* ================= TABLE ================= */}
            <div className="overflow-auto rounded-lg border border-gray-200">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredReturns.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No returns found
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {[
                        "Order ID",
                        "Returned From",
                        "Chair",
                        "Delivery Date",
                        "Qty",
                        "Return Date",
                        "Category",
                        "Status",
                        "Action",
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
                    {filteredReturns.map((r, index) => (
                      <tr
                        key={r._id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="p-4 font-medium text-gray-900">
                          {r.orderId}
                        </td>
                        <td className="p-4 text-gray-700">{r.returnedFrom}</td>
                        <td className="p-4 text-gray-700">{r.chairType}</td>
                        <td className="p-4 text-gray-700">
                          {new Date(r.deliveryDate).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-semibold text-gray-900">
                          {r.quantity}
                        </td>
                        <td className="p-4 text-gray-700">
                          {new Date(r.returnDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                              r.category === "Functional"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {r.category}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                              r.status === "Pending"
                                ? "bg-amber-100 text-amber-800"
                                : r.status === "In-Fitting"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {r.status === "Pending" && (
                            <button
                              onClick={() => moveToFitting(r._id)}
                              className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                            >
                              Move to Fitting
                            </button>
                          )}

                          {r.status === "In-Fitting" && (
                            <span className="text-amber-600 font-medium">
                              In Fitting
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL ================= */}
      {openModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  Add Return Order
                </h2>
                <button
                  onClick={() => setOpenModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order ID
                </label>
                <input
                  placeholder="Enter Order ID"
                  value={form.orderId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm({ ...form, orderId: value });
                    if (value.length >= 10) fetchOrderDetails(value);
                  }}
                  className="w-full p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Reason
                </label>
                <select
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                >
                  <option value="">Select Return Reason</option>
                  <option>Damaged</option>
                  <option>Wrong Product</option>
                  <option>Manufacturing Defect</option>
                  <option>Transport Damage</option>
                  <option>Customer Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Date
                </label>
                <input
                  type="date"
                  value={form.returnDate}
                  onChange={(e) =>
                    setForm({ ...form, returnDate: e.target.value })
                  }
                  className="w-full p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all"
                >
                  <option>Functional</option>
                  <option>Non-Functional</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setOpenModal(false)}
                  className="px-5 py-2.5 text-gray-700 font-medium rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReturn}
                  className="bg-[#c62d23] hover:bg-[#a8241c] text-white px-5 py-2.5 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                >
                  Add Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, onClick, active }) => {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer bg-white border-2 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md hover:scale-[1.02] ${
        active
          ? "border-[#c62d23] bg-red-50 ring-2 ring-[#c62d23]"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <p className="text-sm text-gray-600 font-medium mb-2">{title}</p>
      <p
        className={`text-3xl font-bold transition-colors ${
          active ? "text-[#c62d23]" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
};

export default Return;
