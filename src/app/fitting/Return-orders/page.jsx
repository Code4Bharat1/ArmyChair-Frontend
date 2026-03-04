"use client";
import React, { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Fitting/sidebar";
import axios from "axios";
import {
  RotateCcw, X, CheckCircle, XCircle, AlertCircle,
  Package, TrendingUp, ChevronUp, ChevronDown, Search, AlertTriangle
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

/* ─────────────────────────────────────────────────────────────────
   DECISION MODAL — unchanged
───────────────────────────────────────────────────────────────────*/
const DecisionModal = ({ group, warehouseUsers, onClose, onSave }) => {
  const [decisions, setDecisions] = useState(() => {
    const map = {};
    group.returns.forEach((r) => {
      map[r._id] = {
        returnId: r._id,
        category: r.category,
        items: (r.items || []).map((i) => ({
          name:     i.name,
          quantity: i.quantity,
          current:  i.fittingStatus,
          decision: i.fittingStatus !== "PENDING" ? i.fittingStatus : "",
          remarks:  i.fittingRemarks || "",
        })),
      };
    });
    return map;
  });

  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const setItem = (returnId, itemIdx, field, val) =>
    setDecisions((prev) => ({
      ...prev,
      [returnId]: {
        ...prev[returnId],
        items: prev[returnId].items.map((it, i) =>
          i === itemIdx ? { ...it, [field]: val } : it
        ),
      },
    }));

  const allItems          = Object.values(decisions).flatMap((d) => d.items);
  const hasAnyGood        = allItems.some((it) => it.decision === "GOOD");
  const hasAnyNewDecision = allItems.some((it) => it.decision && it.current === "PENDING");

  const handleSave = async () => {
    if (!hasAnyNewDecision) return setError("Make at least one decision");
    if (hasAnyGood && !assignedTo) return setError("Assign warehouse staff for GOOD items");
    setError("");
    setSaving(true);
    try {
      await onSave(decisions, assignedTo);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save decisions");
    } finally {
      setSaving(false);
    }
  };

  const catStyle = (cat) =>
    cat === "Functional" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Fitting Decision</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Order: <span className="font-semibold text-gray-800">{group.orderId}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {Object.values(decisions).map((retDoc, secIdx) => (
            <div key={retDoc.returnId}>
              {secIdx > 0 && <hr className="border-gray-200 mb-5" />}
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${catStyle(retDoc.category)}`}>
                  {retDoc.category}
                </span>
                <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Items</span>
              </div>
              <div className="space-y-3">
                {retDoc.items.map((d, idx) => (
                  <div
                    key={d.name}
                    className={`border-2 rounded-xl p-4 transition-colors ${
                      d.current !== "PENDING"
                        ? "bg-gray-50 border-gray-200 opacity-60"
                        : d.decision === "GOOD" ? "bg-green-50 border-green-300"
                        : d.decision === "BAD"  ? "bg-red-50 border-red-300"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Qty: <span className="font-bold">{d.quantity}</span></p>
                      </div>
                      {d.current !== "PENDING" ? (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          d.current === "GOOD" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {d.current === "GOOD" ? "✓ GOOD" : "✗ BAD"} (decided)
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setItem(retDoc.returnId, idx, "decision", "GOOD")}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                              d.decision === "GOOD"
                                ? "bg-green-600 border-green-600 text-white shadow-md"
                                : "bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700"
                            }`}
                          >
                            <CheckCircle size={15} /> GOOD
                          </button>
                          <button
                            onClick={() => setItem(retDoc.returnId, idx, "decision", "BAD")}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                              d.decision === "BAD"
                                ? "bg-red-600 border-red-600 text-white shadow-md"
                                : "bg-white border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-700"
                            }`}
                          >
                            <XCircle size={15} /> BAD
                          </button>
                        </div>
                      )}
                    </div>
                    {d.current === "PENDING" && d.decision && (
                      <input
                        type="text"
                        placeholder={`Remarks for ${d.name} (optional)`}
                        value={d.remarks}
                        onChange={(e) => setItem(retDoc.returnId, idx, "remarks", e.target.value)}
                        className="mt-3 w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg outline-none focus:border-[#c62d23] transition"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hasAnyGood && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Assign Warehouse Staff <span className="text-red-500">*</span>
                <span className="font-normal text-gray-400 ml-1">(for GOOD items)</span>
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] outline-none transition text-sm"
              >
                <option value="">Select warehouse staff...</option>
                {warehouseUsers.map((u) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          {hasAnyNewDecision && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Summary</p>
              <div className="space-y-1.5">
                {Object.values(decisions).flatMap((retDoc) =>
                  retDoc.items
                    .filter((d) => d.decision && d.current === "PENDING")
                    .map((d) => (
                      <div key={`${retDoc.returnId}-${d.name}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${catStyle(retDoc.category)}`}>
                            {retDoc.category === "Functional" ? "F" : "NF"}
                          </span>
                          <span className="text-gray-700">{d.name}</span>
                        </div>
                        <span className={`font-semibold text-xs ${d.decision === "GOOD" ? "text-green-700" : "text-red-700"}`}>
                          {d.decision === "GOOD" ? "→ Inventory" : "→ Bad Returns"}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasAnyNewDecision}
              className="flex-1 py-3 bg-[#c62d23] text-white rounded-xl font-semibold hover:bg-[#a8241c] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Decisions"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────────────*/
const StatCard = ({ title, value, icon, sub }) => (
  <div
    className="bg-white border rounded-xl p-4 sm:p-5 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between border-gray-200"
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-3">
      <p className="text-xs sm:text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 18 })}
    </div>
    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

/* ─────────────────────────────────────────────────────────────────
   COMPLETED TABLE
───────────────────────────────────────────────────────────────────*/
const CompletedTable = ({ items, type }) => {
  const [sortField, setSortField] = useState("updatedAt");
  const [sortDir,   setSortDir]   = useState("desc");
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(10);

  useEffect(() => { setPage(1); }, [items, type]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (["updatedAt", "createdAt"].includes(sortField)) { av = new Date(av || 0); bv = new Date(bv || 0); }
      if (sortField === "quantity") { av = +av; bv = +bv; }
      if (["orderId", "name"].includes(sortField)) {
        return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      }
      return sortDir === "asc" ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });
  }, [items, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }) =>
    sortField === field
      ? sortDir === "asc" ? <ChevronUp size={12} className="text-[#c62d23]" /> : <ChevronDown size={12} className="text-[#c62d23]" />
      : <ChevronUp size={12} className="text-gray-300" />;

  const isGood = type === "GOOD";

  const COLS = [
    { label: "Order ID",      field: "orderId",   sortable: true  },
    { label: "Chair / Part",  field: "name",      sortable: true  },
    { label: "Qty",           field: "quantity",  sortable: true  },
    { label: "Category",      field: null,        sortable: false },
    { label: "Returned From", field: null,        sortable: false },
    { label: "Remarks",       field: null,        sortable: false },
    { label: "Decided On",    field: "updatedAt", sortable: true  },
    { label: "Status",        field: null,        sortable: false },
  ];

  if (!items.length) return (
    <div className="text-center py-12 text-gray-400">
      <Package size={36} className="mx-auto mb-3 text-gray-200" />
      <p className="font-medium text-gray-500">No {isGood ? "good" : "bad"} items found</p>
    </div>
  );

  return (
    <div>
      {/* banner */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${isGood ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
        {isGood
          ? <CheckCircle size={13} className="text-green-500 shrink-0" />
          : <AlertTriangle size={13} className="text-red-500 shrink-0" />
        }
        <p className={`text-xs font-medium ${isGood ? "text-green-600" : "text-red-600"}`}>
          {isGood
            ? `${sorted.length} item${sorted.length !== 1 ? "s" : ""} approved and moved to inventory`
            : `${sorted.length} item${sorted.length !== 1 ? "s" : ""} rejected during fitting inspection`
          }
        </p>
      </div>

      {/* desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {COLS.map((col, ci) => (
                <th
                  key={ci}
                  onClick={() => col.sortable && toggleSort(col.field)}
                  className={`p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs select-none ${col.sortable ? "cursor-pointer hover:text-gray-900" : ""}`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon field={col.field} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, index) => (
              <tr key={`${r.returnId}-${r.name}`} className={`border-b border-gray-100 transition-colors ${index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}`}>
                <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs">{r.orderId}</td>
                <td className="p-3 lg:p-4 text-gray-800 text-xs font-medium">{r.name}</td>
                <td className="p-3 lg:p-4">
                  <span className={`inline-flex items-center justify-center font-bold text-xs px-2.5 py-1 rounded-full border ${isGood ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                    {r.quantity}
                  </span>
                </td>
                <td className="p-3 lg:p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${r.category === "Functional" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {r.category}
                  </span>
                </td>
                <td className="p-3 lg:p-4 text-gray-600 text-xs">{r.returnedFrom}</td>
                <td className="p-3 lg:p-4 text-gray-500 text-xs max-w-xs">
                  {r.remarks ? <span className="line-clamp-1">{r.remarks}</span> : <span className="text-gray-300 italic">—</span>}
                </td>
                <td className="p-3 lg:p-4 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(r.updatedAt || r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="p-3 lg:p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${isGood ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                    {isGood ? "✓ Good" : "✗ Bad"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {paginated.map((r) => (
          <div key={`${r.returnId}-${r.name}`} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{r.orderId}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{r.name}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${isGood ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {isGood ? "✓ Good" : "✗ Bad"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-gray-400 mb-0.5">Quantity</p><p className="font-bold">{r.quantity}</p></div>
              <div>
                <p className="text-gray-400 mb-0.5">Category</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${r.category === "Functional" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {r.category}
                </span>
              </div>
              <div><p className="text-gray-400 mb-0.5">Returned From</p><p className="font-medium text-gray-700">{r.returnedFrom}</p></div>
              <div>
                <p className="text-gray-400 mb-0.5">Decided On</p>
                <p className="font-medium text-gray-700">{new Date(r.updatedAt || r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
            </div>
            {r.remarks && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">📝 {r.remarks}</p>}
          </div>
        ))}
      </div>

      {/* pagination */}
      <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>
            <span className="font-semibold text-gray-600">{sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)}</span>
            {" "}of{" "}
            <span className="font-semibold text-gray-600">{sorted.length}</span> items
          </span>
          <label className="hidden sm:flex items-center gap-1.5">
            Rows:
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none cursor-pointer">
              {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 sm:px-4 py-1.5 rounded-lg bg-white border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition shadow-sm font-medium text-xs sm:text-sm">Prev</button>
          <span className="text-xs text-gray-700 font-medium px-2">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 sm:px-4 py-1.5 rounded-lg bg-white border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition shadow-sm font-medium text-xs sm:text-sm">Next</button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────*/
const FittingReturn = () => {
  // ── existing state ──
  const [returns,        setReturns]        = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [decisionModal,  setDecisionModal]  = useState(null);
  const [warehouseUsers, setWarehouseUsers] = useState([]);

  // ── new state for completed view ──
  const [pageView,        setPageView]        = useState("pending");   // "pending" | "completed"
  const [completedReturns,setCompletedReturns]= useState([]);
  const [completedLoading,setCompletedLoading]= useState(false);
  const [completedTab,    setCompletedTab]    = useState("GOOD");      // "GOOD" | "BAD"
  const [search,          setSearch]          = useState("");

  /* ── fetch pending (In-Fitting) — unchanged ── */
  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/returns?status=In-Fitting`, { headers: getAuthHeaders() });
      setReturns(res.data.data || []);
    } catch (err) {
      console.error("Fetch returns failed", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── fetch completed (Accepted + Rejected + Completed) ── */
  const fetchCompletedReturns = async () => {
    if (completedReturns.length > 0) return; // already loaded
    setCompletedLoading(true);
    try {
      const [a, r, c] = await Promise.all([
        axios.get(`${API}/returns?status=Accepted`,  { headers: getAuthHeaders() }),
        axios.get(`${API}/returns?status=Rejected`,  { headers: getAuthHeaders() }),
        axios.get(`${API}/returns?status=Completed`, { headers: getAuthHeaders() }),
      ]);
      setCompletedReturns([
        ...(a.data.data || []),
        ...(r.data.data || []),
        ...(c.data.data || []),
      ]);
    } catch (err) {
      console.error("Fetch completed failed", err);
    } finally {
      setCompletedLoading(false);
    }
  };

  const fetchWarehouseUsers = async () => {
    if (warehouseUsers.length > 0) return;
    try {
      const res = await axios.get(`${API}/auth/staff`, { headers: getAuthHeaders() });
      const staffList = res.data.users || res.data.data || res.data || [];
      setWarehouseUsers(staffList.filter((u) => u.role === "warehouse"));
    } catch (err) {
      console.error("Failed to fetch warehouse users", err);
    }
  };

  /* ── groups for pending table — unchanged ── */
  const groups = useMemo(() => {
    const map = {};
    returns.forEach((r) => {
      if (!map[r.orderId]) {
        map[r.orderId] = { orderId: r.orderId, returnedFrom: r.returnedFrom, returns: [], allItems: [], totalQty: 0, totalPending: 0 };
      }
      const g = map[r.orderId];
      g.returns.push(r);
      (r.items || []).forEach((item) => {
        g.allItems.push({ ...item, category: r.category, returnId: r._id });
        g.totalQty += item.quantity;
        if (item.fittingStatus === "PENDING") g.totalPending += 1;
      });
    });
    return Object.values(map);
  }, [returns]);

  /* ── derive good/bad item lists from completed returns ── */
  const { goodItems, badItems } = useMemo(() => {
    const good = [], bad = [];
    completedReturns.forEach((r) => {
      (r.items || []).forEach((item) => {
        const base = {
          returnId:     r._id,
          orderId:      r.orderId,
          category:     r.category,
          returnedFrom: typeof r.returnedFrom === "object" ? r.returnedFrom?.name : r.returnedFrom || "—",
          updatedAt:    r.updatedAt,
          createdAt:    r.createdAt,
          name:         item.name,
          quantity:     item.quantity,
          remarks:      item.fittingRemarks || "",
        };
        if (item.fittingStatus === "GOOD") good.push(base);
        if (item.fittingStatus === "BAD")  bad.push(base);
      });
    });
    return { goodItems: good, badItems: bad };
  }, [completedReturns]);

  /* ── search filter for completed items ── */
  const filteredGood = useMemo(() =>
    goodItems.filter((r) => {
      const q = search.toLowerCase();
      return !q || r.orderId?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q) || r.returnedFrom?.toLowerCase().includes(q);
    }), [goodItems, search]);

  const filteredBad = useMemo(() =>
    badItems.filter((r) => {
      const q = search.toLowerCase();
      return !q || r.orderId?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q) || r.returnedFrom?.toLowerCase().includes(q);
    }), [badItems, search]);

  /* ── stats for completed ── */
  const totalGoodQty = goodItems.reduce((s, i) => s + i.quantity, 0);
  const totalBadQty  = badItems.reduce((s, i)  => s + i.quantity, 0);
  const totalQty     = totalGoodQty + totalBadQty;
  const goodRate     = totalQty ? Math.round((totalGoodQty / totalQty) * 100) : 0;

  /* ── save decisions — unchanged ── */
  const saveGroupDecisions = async (decisionsMap, assignedTo) => {
    const calls = Object.values(decisionsMap)
      .map((retDoc) => {
        const toSubmit = retDoc.items.filter((d) => d.current === "PENDING" && d.decision);
        if (!toSubmit.length) return null;
        return axios.post(
          `${API}/returns/${retDoc.returnId}/fitting-decision`,
          { decisions: toSubmit.map((d) => ({ name: d.name, decision: d.decision, remarks: d.remarks })), assignedTo },
          { headers: getAuthHeaders() }
        );
      })
      .filter(Boolean);
    await Promise.all(calls);
    setCompletedReturns([]); // force reload on next completed view
    await fetchReturns();
  };

  const resolveReturnedFrom = (val) => typeof val === "object" ? val?.name : val || "—";

  useEffect(() => { fetchReturns(); }, []);

  /* ── switch to completed tab → fetch data ── */
  const handleViewSwitch = (view) => {
    setPageView(view);
    setSearch("");
    if (view === "completed") fetchCompletedReturns();
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* ── HEADER ── */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <RotateCcw size={28} className="text-[#c62d23]" />
                Fitting Returns
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {pageView === "pending"
                  ? "Inspect returned items and give GOOD / BAD decisions per SKU"
                  : "All items that have been inspected and given a fitting decision"}
              </p>
            </div>

            {/* PAGE VIEW TOGGLE */}
            <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => handleViewSwitch("pending")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pageView === "pending" ? "bg-[#c62d23] text-white shadow-md" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                Pending ({returns.length})
              </button>
              <button
                onClick={() => handleViewSwitch("completed")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pageView === "completed" ? "bg-[#c62d23] text-white shadow-md" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                Processed
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            PENDING VIEW — original table, untouched
        ════════════════════════════════════════*/}
        {pageView === "pending" && (
          <div className="p-6 lg:p-8">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Order ID", "Items", "Total Qty", "Categories", "Returned From", "Pending", "Action"].map((h) => (
                        <th key={h} className="p-4 text-left font-semibold text-gray-700 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="p-10 text-center text-gray-400">Loading...</td></tr>
                    ) : groups.length === 0 ? (
                      <tr><td colSpan={7} className="p-10 text-center text-gray-400">No returns in fitting at the moment</td></tr>
                    ) : (
                      groups.map((grp, idx) => (
                        <tr
                          key={grp.orderId}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                        >
                          <td className="p-4 font-semibold text-gray-900 whitespace-nowrap">{grp.orderId}</td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1.5">
                              {grp.allItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
                                  <span className="text-gray-800 font-medium">{item.name} ×{item.quantity}</span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${item.category === "Functional" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                    {item.category === "Functional" ? "F" : "NF"}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-full font-semibold ${item.fittingStatus === "GOOD" ? "bg-green-100 text-green-700" : item.fittingStatus === "BAD" ? "bg-red-100 text-red-700" : "bg-amber-50 text-amber-600"}`}>
                                    {item.fittingStatus}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-gray-900">{grp.totalQty}</td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              {[...new Set(grp.returns.map((r) => r.category))].map((cat) => (
                                <span key={cat} className={`px-2.5 py-1 rounded-full text-xs font-medium w-fit ${cat === "Functional" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-gray-600 whitespace-nowrap">{resolveReturnedFrom(grp.returnedFrom)}</td>
                          <td className="p-4">
                            {grp.totalPending > 0 ? (
                              <span className="text-amber-600 font-semibold text-xs bg-amber-50 px-2.5 py-1 rounded-full">{grp.totalPending} pending</span>
                            ) : (
                              <span className="text-green-600 text-xs font-medium">All decided</span>
                            )}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => { fetchWarehouseUsers(); setDecisionModal(grp); }}
                              className="flex items-center gap-1.5 bg-[#c62d23] hover:bg-[#a8241c] text-white px-3 py-2 rounded-lg text-sm font-medium transition shadow-sm whitespace-nowrap"
                            >
                              <CheckCircle size={14} /> Give Decision
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            COMPLETED VIEW — new section
        ════════════════════════════════════════*/}
        {pageView === "completed" && (
          <div className="p-6 lg:p-8 space-y-5">

            {/* stats */}
            {completedLoading ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]" />
                <p className="mt-2 text-gray-500 text-sm">Loading...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard title="Total Processed"  value={goodItems.length + badItems.length} icon={<Package      className="text-[#c62d23]" />} />
                  <StatCard title="Good → Inventory" value={goodItems.length}                   icon={<CheckCircle  className="text-[#c62d23]" />} sub={`${totalGoodQty} units`} />
                  <StatCard title="Bad → Rejected"   value={badItems.length}                    icon={<XCircle      className="text-[#c62d23]" />} sub={`${totalBadQty} units`} />
                  <StatCard title="Good Rate"         value={`${goodRate}%`}                    icon={<TrendingUp   className="text-[#c62d23]" />} sub={totalBadQty > 0 ? `${badItems.length} rejected` : "All passed"} />
                </div>

                {/* good / bad toggle + search */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                  {/* search + toggle bar */}
                  <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
                    {/* toggle */}
                    <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                      <button
                        onClick={() => setCompletedTab("GOOD")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${completedTab === "GOOD" ? "bg-[#c62d23] text-white shadow-md" : "text-gray-600 hover:bg-gray-200"}`}
                      >
                        <CheckCircle size={14} />
                        Good ({filteredGood.length})
                      </button>
                      <button
                        onClick={() => setCompletedTab("BAD")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${completedTab === "BAD" ? "bg-[#c62d23] text-white shadow-md" : "text-gray-600 hover:bg-gray-200"}`}
                      >
                        <XCircle size={14} />
                        Bad ({filteredBad.length})
                      </button>
                    </div>

                    {/* search */}
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by order ID, chair type, location…"
                        className="w-full pl-8 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
                      />
                      {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <CompletedTable
                    items={completedTab === "GOOD" ? filteredGood : filteredBad}
                    type={completedTab}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Decision Modal — unchanged */}
      {decisionModal && (
        <DecisionModal
          group={decisionModal}
          warehouseUsers={warehouseUsers}
          onClose={() => setDecisionModal(null)}
          onSave={saveGroupDecisions}
        />
      )}
    </div>
  );
};

export default FittingReturn;