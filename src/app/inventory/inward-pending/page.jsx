"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  FileCheck, Package, Clock, AlertCircle, Menu, UserCircle,
  RotateCcw, ArrowRightLeft, PlusCircle, MessageSquare,
} from "lucide-react";
import InventorySidebar from "@/components/Inventory/sidebar";

export default function WarehousePendingInwardPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [activeTab, setActiveTab]                     = useState("pending");
  const [pendingData, setPendingData]                 = useState([]);
  const [loadingPending, setLoadingPending]           = useState(true);
  const [processingId, setProcessingId]               = useState(null);
  const [returnsData, setReturnsData]                 = useState([]);
  const [loadingReturns, setLoadingReturns]           = useState(true);
  const [addingToInventoryId, setAddingToInventoryId] = useState(null);
  const [vendors, setVendors]                         = useState([]);
  const [mounted, setMounted]                         = useState(false);
  const [sidebarOpen, setSidebarOpen]                 = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "warehouse") router.push("/login");
  }, [mounted, router]);

  const getToken = () => localStorage.getItem("token");

  /* ── Vendor id → name map ── */
  const vendorMap = useMemo(() => {
    const map = {};
    vendors.forEach((v) => { map[v._id] = v.name; });
    return map;
  }, [vendors]);

  /**
   * Resolve returnedFrom to a human-readable name.
   * Handles: populated object { name }, raw vendor _id string, plain string name.
   */
  const resolveFrom = (val) => {
    if (!val) return "—";
    if (typeof val === "object" && val.name) return val.name;
    if (typeof val === "string") return vendorMap[val] || val;
    return String(val);
  };

  /* ── Fetch vendors so we can resolve IDs → names ── */
  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API}/vendors`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setVendors(res.data.vendors || res.data || []);
    } catch (err) {
      console.error("Fetch vendors failed:", err);
    }
  };

  /* ── Fetch pending production/fitting inward requests ── */
  const fetchPending = async () => {
    setLoadingPending(true);
    try {
      const res = await axios.get(`${API}/warehouse/production/inward/pending`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setPendingData(res.data?.data || []);
    } catch (err) {
      console.error("Fetch pending failed:", err);
      setPendingData([]);
    } finally {
      setLoadingPending(false);
    }
  };

  /* ── Fetch Accepted returns (GOOD fitting decision, waiting to be stocked) ── */
  const fetchReturns = async () => {
    setLoadingReturns(true);
    try {
      const res = await axios.get(`${API}/returns?status=Accepted`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setReturnsData(res.data?.data || []);
    } catch (err) {
      console.error("Fetch returns failed:", err);
      setReturnsData([]);
    } finally {
      setLoadingReturns(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    fetchVendors();
    fetchPending();
    fetchReturns();
  }, [mounted]);

  /* ─────────────────────────────────────────────────────────────
     GROUP returns by orderId — one order = one row
  ───────────────────────────────────────────────────────────────*/
  const returnGroups = useMemo(() => {
    const map = {};
    returnsData.forEach((r) => {
      if (!map[r.orderId]) {
        map[r.orderId] = {
          orderId:      r.orderId,
          returnedFrom: r.returnedFrom,
          returnDate:   r.returnDate || r.createdAt,
          returns:      [],
          allItems:     [],
          totalQty:     0,
        };
      }
      const g = map[r.orderId];
      g.returns.push(r);
      (r.items?.length
        ? r.items
        : [{ name: r.chairType, quantity: r.quantity, fittingStatus: "GOOD" }]
      ).forEach((item) => {
        g.allItems.push({ ...item, category: r.category, returnId: r._id });
        g.totalQty += item.quantity;
      });
      if (new Date(r.returnDate || r.createdAt) < new Date(g.returnDate)) {
        g.returnDate = r.returnDate || r.createdAt;
      }
    });
    return Object.values(map);
  }, [returnsData]);

  /* ── Add ALL returns in a group to inventory ── */
  const addGroupToInventory = async (group) => {
    const names = group.allItems.map((i) => `${i.name} ×${i.quantity}`).join(", ");
    if (!confirm(`Add ${names} from order ${group.orderId} to warehouse inventory?`)) return;

    setAddingToInventoryId(group.orderId);
    try {
      await Promise.all(
        group.returns.map((r) =>
          axios.post(
            `${API}/returns/${r._id}/move-to-inventory`,
            {},
            { headers: { Authorization: `Bearer ${getToken()}` } }
          )
        )
      );
      alert("Items added to inventory successfully");
      fetchReturns();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add to inventory");
    } finally {
      setAddingToInventoryId(null);
    }
  };

  /* ── Accept production/fitting inward request ── */
  const acceptInward = async (item) => {
    if (!confirm(`Transfer this stock to ${item.createdBy?.name}?`)) return;
    try {
      setProcessingId(item._id);
      await axios.put(
        `${API}/warehouse/production/inward/${item._id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      alert("Stock transferred to production successfully");
      fetchPending();
    } catch (err) {
      alert(err.response?.data?.message || "Accept failed");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date) => (date ? new Date(date).toLocaleDateString("en-GB") : "-");

  const totalPending    = pendingData.length;
  const totalPendingQty = pendingData.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalReturns    = returnGroups.length;
  const totalReturnsQty = returnGroups.reduce((s, g) => s + g.totalQty, 0);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <InventorySidebar />
      </div>

      <div className="flex-1 overflow-auto w-full">

        {/* ── HEADER ── */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-3 sm:p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-600 hover:text-[#c62d23] transition p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
                <Menu size={24} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 truncate">
                  <ArrowRightLeft size={20} className="text-[#c62d23] sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />
                  <span className="truncate">Warehouse Inward</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">
                  Manage stock transfers and return items
                </p>
              </div>
            </div>
            <button onClick={() => router.push("/profile")} className="text-gray-600 hover:text-[#c62d23] transition p-1 sm:p-0 flex-shrink-0">
              <UserCircle size={28} className="sm:w-8 sm:h-8 md:w-9 md:h-9" />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveTab("pending")}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "pending" ? "bg-[#c62d23] text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              <FileCheck size={16} />
              Pending Requests
              {totalPending > 0 && (
                <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === "pending" ? "bg-white text-[#c62d23]" : "bg-[#c62d23] text-white"}`}>
                  {totalPending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("returns")}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "returns" ? "bg-[#c62d23] text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              <RotateCcw size={16} />
              Returns to Inventory
              {totalReturns > 0 && (
                <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === "returns" ? "bg-white text-[#c62d23]" : "bg-[#c62d23] text-white"}`}>
                  {totalReturns}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">

          {/* ════════════════════════════════════════════
              PENDING REQUESTS TAB
              Stock transfer requests from Fitting / Production.
              Nothing to do with customer returns.
          ════════════════════════════════════════════ */}
          {activeTab === "pending" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <StatCard title="Pending Requests" value={totalPending}    icon={<Clock className="text-[#c62d23]" />} />
                <StatCard title="Total Quantity"   value={totalPendingQty} icon={<Package className="text-[#c62d23]" />} />
              </div>

              {totalPending > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-3 sm:p-4 flex gap-2 sm:gap-3 rounded-lg sm:rounded-xl">
                  <AlertCircle className="text-amber-600 flex-shrink-0" size={18} />
                  <span className="text-xs sm:text-sm text-amber-800 font-medium">
                    You have {totalPending} material request(s) from production / fitting
                  </span>
                </div>
              )}

              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-xl lg:rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                {loadingPending ? <LoadingSpinner /> : pendingData.length === 0 ? (
                  <EmptyState icon={<FileCheck size={40} className="mx-auto mb-4 text-gray-300" />} title="No pending inward approvals" sub="All caught up!" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {["Date", "Material", "Quantity", "Remark", "Requested By", "Action"].map((h) => (
                            <th key={h} className="p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs lg:text-sm">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pendingData.map((i, idx) => (
                          <tr key={i._id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                            <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">
                              <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" />{formatDate(i.createdAt)}</div>
                            </td>
                            <td className="p-3 lg:p-4 font-medium text-gray-900 text-xs lg:text-sm">
                              <div className="flex items-center gap-2"><Package size={14} className="text-gray-400" />{i.partName}</div>
                            </td>
                            <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs lg:text-sm">{i.quantity}</td>
                            <td className="p-3 lg:p-4 text-xs lg:text-sm max-w-[200px]">
                              {i.remark ? (
                                <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                  <MessageSquare size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                  <span className="text-amber-800 italic leading-tight">{i.remark}</span>
                                </div>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">{i.createdBy?.name || "-"}</td>
                            <td className="p-3 lg:p-4">
                              <button
                                disabled={processingId === i._id}
                                onClick={() => acceptInward(i)}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm ${processingId === i._id ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white hover:shadow-md"}`}
                              >
                                {processingId === i._id ? "Processing..." : "Transfer Stock"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {loadingPending ? <MobileLoadingSpinner /> : pendingData.length === 0 ? (
                  <MobileEmptyState icon={<FileCheck size={40} className="mx-auto mb-3 text-gray-300" />} title="No pending inward approvals" sub="All caught up!" />
                ) : (
                  pendingData.map((i) => (
                    <div key={i._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2"><Package size={14} className="text-gray-400 flex-shrink-0" /><h3 className="font-semibold text-gray-900 text-sm truncate">{i.partName}</h3></div>
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1"><Clock size={12} className="text-gray-400" />{formatDate(i.createdAt)}</div>
                          <div className="text-xs text-gray-600 mb-1">By: {i.createdBy?.name || "-"}</div>
                          {i.remark && (
                            <div className="flex items-start gap-1.5 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                              <MessageSquare size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-amber-800 italic leading-tight">{i.remark}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          <div className="bg-[#c62d23] text-white text-xs font-bold px-2.5 py-1 rounded-full">Qty: {i.quantity}</div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-gray-100">
                        <button
                          disabled={processingId === i._id}
                          onClick={() => acceptInward(i)}
                          className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm ${processingId === i._id ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white hover:shadow-md"}`}
                        >
                          {processingId === i._id ? "Processing..." : "Approve & Transfer"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════
              RETURNS TO INVENTORY TAB
              Returns that passed fitting (Accepted status).
              Grouped by orderId. Warehouse adds them to stock.
          ════════════════════════════════════════════ */}
          {activeTab === "returns" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <StatCard title="Pending Returns" value={totalReturns}    icon={<RotateCcw className="text-[#c62d23]" />} />
                <StatCard title="Total Quantity"  value={totalReturnsQty} icon={<Package className="text-[#c62d23]" />} />
              </div>

              {totalReturns > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-3 sm:p-4 flex gap-2 sm:gap-3 rounded-lg sm:rounded-xl">
                  <AlertCircle className="text-blue-600 flex-shrink-0" size={18} />
                  <span className="text-xs sm:text-sm text-blue-800 font-medium">
                    {totalReturns} return order(s) passed fitting inspection and are ready to be added back to inventory
                  </span>
                </div>
              )}

              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-xl lg:rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                {loadingReturns ? <LoadingSpinner /> : returnGroups.length === 0 ? (
                  <EmptyState icon={<RotateCcw size={40} className="mx-auto mb-4 text-gray-300" />} title="No returns pending" sub="No items waiting to be added to inventory" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {["Date", "Order ID", "Items", "Total Qty", "Returned From", "Action"].map((h) => (
                            <th key={h} className="p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs lg:text-sm">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {returnGroups.map((grp, idx) => (
                          <tr key={grp.orderId} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>

                            <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm whitespace-nowrap">
                              <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" />{formatDate(grp.returnDate)}</div>
                            </td>

                            <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs lg:text-sm whitespace-nowrap">
                              {grp.orderId}
                            </td>

                            {/* All items as colour-coded pills */}
                            <td className="p-3 lg:p-4">
                              <div className="flex flex-wrap gap-1.5">
                                {grp.allItems.map((item, i) => (
                                  <span
                                    key={i}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                      item.category === "Functional"
                                        ? "bg-green-50 border-green-200 text-green-800"
                                        : "bg-orange-50 border-orange-200 text-orange-800"
                                    }`}
                                  >
                                    {item.name}
                                    <span className="font-bold">×{item.quantity}</span>
                                    <span className="text-[10px] opacity-60">
                                      {item.category === "Functional" ? "F" : "NF"}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs lg:text-sm">
                              {grp.totalQty}
                            </td>

                            {/* Resolved vendor name — no more raw IDs */}
                            <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">
                              {resolveFrom(grp.returnedFrom)}
                            </td>

                            <td className="p-3 lg:p-4">
                              <button
                                disabled={addingToInventoryId === grp.orderId}
                                onClick={() => addGroupToInventory(grp)}
                                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm whitespace-nowrap ${
                                  addingToInventoryId === grp.orderId
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-[#c62d23] hover:bg-[#a82520] text-white hover:shadow-md"
                                }`}
                              >
                                <PlusCircle size={14} />
                                {addingToInventoryId === grp.orderId ? "Adding..." : "Add to Inventory"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {loadingReturns ? <MobileLoadingSpinner /> : returnGroups.length === 0 ? (
                  <MobileEmptyState icon={<RotateCcw size={40} className="mx-auto mb-3 text-gray-300" />} title="No returns pending" sub="No items waiting to be added to inventory" />
                ) : (
                  returnGroups.map((grp) => (
                    <div key={grp.orderId} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-500 mb-1">Order: {grp.orderId}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1"><Clock size={12} className="text-gray-400" />{formatDate(grp.returnDate)}</div>
                          <div className="text-xs text-gray-600 mb-2">From: {resolveFrom(grp.returnedFrom)}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {grp.allItems.map((item, i) => (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                  item.category === "Functional"
                                    ? "bg-green-50 border-green-200 text-green-800"
                                    : "bg-orange-50 border-orange-200 text-orange-800"
                                }`}
                              >
                                {item.name} ×{item.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          <div className="bg-[#c62d23] text-white text-xs font-bold px-2.5 py-1 rounded-full">Qty: {grp.totalQty}</div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-gray-100">
                        <button
                          disabled={addingToInventoryId === grp.orderId}
                          onClick={() => addGroupToInventory(grp)}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm ${
                            addingToInventoryId === grp.orderId
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-[#c62d23] hover:bg-[#a82520] text-white hover:shadow-md"
                          }`}
                        >
                          <PlusCircle size={16} />
                          {addingToInventoryId === grp.orderId ? "Adding..." : "Add to Inventory"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ SUB COMPONENTS ══════════════════════════ */
const StatCard = ({ title, value, icon }) => (
  <div className="bg-white border rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full border-gray-200" style={{ borderLeft: "4px solid #c62d23" }}>
    <div className="flex justify-between items-start mb-3 sm:mb-4">
      <p className="text-xs sm:text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 20, className: `sm:w-6 sm:h-6 ${icon.props.className}` })}
    </div>
    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

const LoadingSpinner = () => (
  <div className="p-6 sm:p-8 text-center">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]" />
    <p className="mt-2 text-gray-500 text-sm">Loading...</p>
  </div>
);

const MobileLoadingSpinner = () => (
  <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]" />
    <p className="mt-2 text-gray-500 text-sm">Loading...</p>
  </div>
);

const EmptyState = ({ icon, title, sub }) => (
  <div className="text-center text-gray-500 py-12 sm:py-16">
    {icon}
    <p className="text-base sm:text-lg font-medium">{title}</p>
    <p className="text-sm text-gray-400 mt-1">{sub}</p>
  </div>
);

const MobileEmptyState = ({ icon, title, sub }) => (
  <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200">
    {icon}
    <p className="text-base font-medium">{title}</p>
    <p className="text-sm text-gray-400 mt-1">{sub}</p>
  </div>
);