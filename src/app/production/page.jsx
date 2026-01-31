"use client";
import React from "react"
import { useEffect, useState } from "react";
import axios from "axios";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Plus, Package, Clock, CheckCircle, UserCircle, LogOut, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductionPage() {
  useAuthGuard(["production"]);
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [showForm, setShowForm] = useState(false);
  const [warehouseUsers, setWarehouseUsers] = useState([]);
  const [inwards, setInwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    partName: "",
    quantity: "",
    assignedTo: "",
  });

  /* ================= AUTH ================= */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "production") {
      router.push("/login");
    }
  }, [router]);

  /* ================= FETCH WAREHOUSE STAFF ================= */
  useEffect(() => {
    const fetchWarehouseUsers = async () => {
      try {
        const res = await axios.get(`${API}/auth/staff`);
        setWarehouseUsers(res.data.filter((u) => u.role === "warehouse"));
      } catch (err) {
        console.error(err);
      }
    };
    fetchWarehouseUsers();
  }, [API]);

  /* ================= FETCH PRODUCTION INWARD ================= */
  const fetchInwards = async () => {
    try {
      const res = await axios.get(`${API}/production/inward`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setInwards(res.data.data || []);
    } catch (err) {
      console.error("Fetch inwards failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInwards();
  }, []);

  /* ================= FORM HANDLER ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const submitInward = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/production/inward`, form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      alert("Inventory submitted for warehouse approval");

      setForm({
        partName: "",
        quantity: "",
        assignedTo: "",
      });

      setShowForm(false);
      fetchInwards();
    } catch (err) {
      alert(err.response?.data?.message || "Submit failed");
    }
  };

  /* ================= FILTERED DATA ================= */
  const filteredInwards = inwards.filter((i) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "PENDING") return i.status === "PENDING";
    if (statusFilter === "ACCEPTED") return i.status === "ACCEPTED";
    return true;
  });

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredInwards.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInwards = filteredInwards.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  /* ================= STATS ================= */
  const totalInwards = inwards.length;
  const pendingApproval = inwards.filter((i) => i.status === "PENDING").length;
  const accepted = inwards.filter((i) => i.status === "ACCEPTED").length;

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            {/* LEFT SIDE */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={24} className="text-[#c62d23] flex-shrink-0 sm:w-8 sm:h-8" />
                <span className="truncate">Production</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">
                Create and track inward materials
              </p>
            </div>

            {/* DESKTOP ACTIONS */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#c62d23] text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm hover:bg-[#a82419]"
              >
                <Plus size={16} />
                Add Inventory
              </button>

              <button
                onClick={() => router.push("/profile")}
                title="My Profile"
                className="text-gray-600 hover:text-[#c62d23] transition"
              >
                <UserCircle size={34} />
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.href = "/login";
                }}
                title="Logout"
                className="text-gray-600 hover:text-[#c62d23] transition"
              >
                <LogOut size={30} />
              </button>
            </div>

            {/* MOBILE MENU BUTTON */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-600 hover:text-[#c62d23] transition p-2"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* MOBILE MENU */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-gray-200 space-y-2">
              <button
                onClick={() => {
                  setShowForm(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#c62d23] text-white rounded-xl shadow-sm font-medium text-sm hover:bg-[#a82419]"
              >
                <Plus size={16} />
                Add Inventory
              </button>
              <button
                onClick={() => {
                  router.push("/profile");
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200"
              >
                <UserCircle size={18} />
                My Profile
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.href = "/login";
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* STATS - RESPONSIVE GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          <StatCard
            title="Total Inwards"
            value={totalInwards}
            icon={<Package className="text-[#c62d23]" />}
            onClick={() => setStatusFilter("ALL")}
            active={statusFilter === "ALL"}
          />
          <StatCard
            title="Pending Approval"
            value={pendingApproval}
            icon={<Clock className="text-[#c62d23]" />}
            onClick={() => setStatusFilter("PENDING")}
            active={statusFilter === "PENDING"}
          />
          <StatCard
            title="Accepted"
            value={accepted}
            icon={<CheckCircle className="text-[#c62d23]" />}
            onClick={() => setStatusFilter("ACCEPTED")}
            active={statusFilter === "ACCEPTED"}
          />
        </div>

        {/* FORM - MOBILE RESPONSIVE */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-[540px] shadow-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-900">
                Add Inward Inventory
              </h2>

              <form onSubmit={submitInward} className="space-y-4 md:space-y-5">
                <div>
                  <label className="text-sm text-gray-700 font-medium block mb-2">
                    Date
                  </label>
                  <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 cursor-not-allowed text-sm md:text-base">
                    {today}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-700 font-medium block mb-2">
                    Part Name
                  </label>
                  <input
                    name="partName"
                    placeholder="Part Name (Seat, Wheel, Gas Lift...)"
                    value={form.partName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] transition-all text-gray-900 shadow-sm text-sm md:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 font-medium block mb-2">
                    Quantity
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    placeholder="Quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] transition-all text-gray-900 shadow-sm text-sm md:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 font-medium block mb-2">
                    Assign Warehouse Staff
                  </label>
                  <select
                    name="assignedTo"
                    value={form.assignedTo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] text-gray-900 shadow-sm text-sm md:text-base"
                    required
                  >
                    <option value="">Assign Warehouse Staff</option>
                    {warehouseUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-full sm:w-auto px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium border-2 border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#c62d23] text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium hover:bg-[#a82419]"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TABLE - RESPONSIVE */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-12 md:p-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#c62d23] border-r-transparent"></div>
              <p className="mt-4 text-gray-500 text-sm md:text-base">Loading...</p>
            </div>
          ) : filteredInwards.length === 0 ? (
            <div className="text-center text-gray-400 py-12 md:py-20 px-4">
              <Package size={48} className="mx-auto mb-4 text-gray-300 md:w-14 md:h-14" />
              <p className="text-base md:text-lg font-medium text-gray-500">
                No inward records found
              </p>
              <p className="text-xs md:text-sm text-gray-400 mt-1">
                {statusFilter === "ALL" 
                  ? "Click 'Add Inventory' to create your first record"
                  : `No ${statusFilter.toLowerCase()} records found`
                }
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {["Date", "Part Name", "Qty", "Assigned To", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            className="p-4 text-left text-xs uppercase text-gray-700 font-semibold tracking-wider"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {paginatedInwards.map((i) => (
                      <tr
                        key={i._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-4 text-gray-600 text-sm">
                          {new Date(i.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-semibold text-gray-900 text-sm">
                          {i.partName}
                        </td>
                        <td className="p-4 text-gray-700 text-sm font-medium">
                          {i.quantity}
                        </td>
                        <td className="p-4 text-gray-700 text-sm">
                          {i.assignedTo?.name}
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              i.status === "ACCEPTED"
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {i.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="md:hidden divide-y divide-gray-100">
                {paginatedInwards.map((i) => (
                  <div key={i._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">
                          {i.partName}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {new Date(i.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          i.status === "ACCEPTED"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {i.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">Quantity</span>
                        <p className="font-medium text-gray-900">{i.quantity}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Assigned To</span>
                        <p className="font-medium text-gray-900">{i.assignedTo?.name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PAGINATION */}
              {filteredInwards.length > itemsPerPage && (
                <div className="border-t border-gray-200 px-4 py-4 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Results Info */}
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(endIndex, filteredInwards.length)}</span> of{" "}
                      <span className="font-medium">{filteredInwards.length}</span> results
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center gap-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          currentPage === 1
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Previous
                      </button>

                      {/* Page Numbers */}
                      <div className="hidden sm:flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          const showPage =
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1);

                          // Show ellipsis
                          const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                          const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                          if (showEllipsisBefore || showEllipsisAfter) {
                            return (
                              <span key={page} className="px-2 text-gray-400">
                                ...
                              </span>
                            );
                          }

                          if (!showPage) return null;

                          return (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                                currentPage === page
                                  ? "bg-[#c62d23] text-white shadow-sm"
                                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      {/* Mobile Page Indicator */}
                      <div className="sm:hidden px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                        {currentPage} / {totalPages}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          currentPage === totalPages
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD - MOBILE RESPONSIVE ================= */
const StatCard = ({ title, value, icon, onClick, active }) => (
  <div
    onClick={onClick}
    className={`rounded-xl md:rounded-2xl p-4 md:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full cursor-pointer ${
      active
        ? "bg-white border-2 border-[#c62d23]"
        : "bg-white border border-gray-200 hover:border-[#c62d23]"
    }`}
    style={{ borderLeft: '4px solid #c62d23' }}
  >
    <div className="flex justify-between items-start mb-3 md:mb-4">
      <p className="text-xs md:text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 20, className: "md:w-6 md:h-6 text-[#c62d23]" })}
    </div>
    <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{value}</p>
    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
      <span>Click to filter</span>
      <span className="text-[#c62d23]">→</span>
    </div>
  </div>
);