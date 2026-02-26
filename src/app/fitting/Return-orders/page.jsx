"use client";
import React, { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Fitting/sidebar";
import axios from "axios";
import { RotateCcw, X, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

/* ─────────────────────────────────────────────────────────────────
   DECISION MODAL
   Receives a `group` = { orderId, returnedFrom, returns: [...] }
   Shows items GROUPED by return doc (Functional section / Non-Functional section).
   Each SKU gets its own GOOD / BAD button.
   On save → one API call per return doc that has new decisions.
───────────────────────────────────────────────────────────────────*/
const DecisionModal = ({ group, warehouseUsers, onClose, onSave }) => {
  /*
    decisions shape:
    {
      [returnId]: {
        returnId,
        category,
        items: [{ name, quantity, current, decision, remarks }]
      }
    }
  */
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
    cat === "Functional"
      ? "bg-green-100 text-green-700"
      : "bg-orange-100 text-orange-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
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

          {/* ── One section per return doc ── */}
          {Object.values(decisions).map((retDoc, secIdx) => (
            <div key={retDoc.returnId}>
              {/* Section divider (not shown for first section) */}
              {secIdx > 0 && <hr className="border-gray-200 mb-5" />}

              {/* Section label */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${catStyle(retDoc.category)}`}>
                  {retDoc.category}
                </span>
                <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">
                  Items
                </span>
              </div>

              <div className="space-y-3">
                {retDoc.items.map((d, idx) => (
                  <div
                    key={d.name}
                    className={`border-2 rounded-xl p-4 transition-colors ${
                      d.current !== "PENDING"
                        ? "bg-gray-50 border-gray-200 opacity-60"
                        : d.decision === "GOOD"
                        ? "bg-green-50 border-green-300"
                        : d.decision === "BAD"
                        ? "bg-red-50 border-red-300"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    {/* Name + GOOD/BAD buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Qty: <span className="font-bold">{d.quantity}</span>
                        </p>
                      </div>

                      {d.current !== "PENDING" ? (
                        /* Read-only badge for already-decided items */
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          d.current === "GOOD"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {d.current === "GOOD" ? "✓ GOOD" : "✗ BAD"} (decided)
                        </span>
                      ) : (
                        /* Per-SKU GOOD / BAD toggle */
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

                    {/* Optional remarks — visible after a decision is made */}
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

          {/* ── Warehouse staff — only when any GOOD decision ── */}
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

          {/* ── Summary of new decisions ── */}
          {hasAnyNewDecision && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Summary</p>
              <div className="space-y-1.5">
                {Object.values(decisions).flatMap((retDoc) =>
                  retDoc.items
                    .filter((d) => d.decision && d.current === "PENDING")
                    .map((d) => (
                      <div
                        key={`${retDoc.returnId}-${d.name}`}
                        className="flex items-center justify-between text-sm"
                      >
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
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
            >
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
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────*/
const FittingReturn = () => {
  const [returns, setReturns]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [decisionModal, setDecisionModal]   = useState(null);
  const [warehouseUsers, setWarehouseUsers] = useState([]);

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

  /*
    Group raw returns by orderId → one row per order.
    group = { orderId, returnedFrom, returns[], allItems[], totalQty, totalPending }
  */
  const groups = useMemo(() => {
    const map = {};
    returns.forEach((r) => {
      if (!map[r.orderId]) {
        map[r.orderId] = {
          orderId:      r.orderId,
          returnedFrom: r.returnedFrom,
          returns:      [],
          allItems:     [],
          totalQty:     0,
          totalPending: 0,
        };
      }
      const g = map[r.orderId];
      g.returns.push(r);
      (r.items || []).forEach((item) => {
        g.allItems.push({ ...item, category: r.category, returnId: r._id });
        g.totalQty     += item.quantity;
        if (item.fittingStatus === "PENDING") g.totalPending += 1;
      });
    });
    return Object.values(map);
  }, [returns]);

  /*
    Save decisions:
    decisionsMap = { [returnId]: { returnId, category, items: [...] } }
    Fires one POST per return doc that has new (PENDING→decided) items.
  */
  const saveGroupDecisions = async (decisionsMap, assignedTo) => {
    const calls = Object.values(decisionsMap)
      .map((retDoc) => {
        const toSubmit = retDoc.items.filter(
          (d) => d.current === "PENDING" && d.decision
        );
        if (!toSubmit.length) return null;
        return axios.post(
          `${API}/returns/${retDoc.returnId}/fitting-decision`,
          {
            decisions: toSubmit.map((d) => ({
              name:     d.name,
              decision: d.decision,
              remarks:  d.remarks,
            })),
            assignedTo,
          },
          { headers: getAuthHeaders() }
        );
      })
      .filter(Boolean);

    await Promise.all(calls);
    await fetchReturns();
  };

  useEffect(() => { fetchReturns(); }, []);

  const resolveReturnedFrom = (val) =>
    typeof val === "object" ? val?.name : val || "—";

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <RotateCcw size={28} className="text-[#c62d23]" />
            Fitting Returns
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Inspect returned items and give GOOD / BAD decisions per SKU
          </p>
        </div>

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
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-gray-400">Loading...</td>
                    </tr>
                  ) : groups.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-gray-400">
                        No returns in fitting at the moment
                      </td>
                    </tr>
                  ) : (
                    groups.map((grp, idx) => (
                      <tr
                        key={grp.orderId}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        }`}
                      >
                        {/* Order ID */}
                        <td className="p-4 font-semibold text-gray-900 whitespace-nowrap">
                          {grp.orderId}
                        </td>

                        {/* All items — tiny F/NF badge per item */}
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5">
                            {grp.allItems.map((item, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
                                <span className="text-gray-800 font-medium">
                                  {item.name} ×{item.quantity}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.category === "Functional"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-orange-100 text-orange-700"
                                }`}>
                                  {item.category === "Functional" ? "F" : "NF"}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded-full font-semibold ${
                                  item.fittingStatus === "GOOD" ? "bg-green-100 text-green-700"
                                  : item.fittingStatus === "BAD"  ? "bg-red-100 text-red-700"
                                  : "bg-amber-50 text-amber-600"
                                }`}>
                                  {item.fittingStatus}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Total Qty */}
                        <td className="p-4 font-semibold text-gray-900">{grp.totalQty}</td>

                        {/* Category badges */}
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {[...new Set(grp.returns.map((r) => r.category))].map((cat) => (
                              <span
                                key={cat}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium w-fit ${
                                  cat === "Functional"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-orange-100 text-orange-800"
                                }`}
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Returned From */}
                        <td className="p-4 text-gray-600 whitespace-nowrap">
                          {resolveReturnedFrom(grp.returnedFrom)}
                        </td>

                        {/* Pending count */}
                        <td className="p-4">
                          {grp.totalPending > 0 ? (
                            <span className="text-amber-600 font-semibold text-xs bg-amber-50 px-2.5 py-1 rounded-full">
                              {grp.totalPending} pending
                            </span>
                          ) : (
                            <span className="text-green-600 text-xs font-medium">All decided</span>
                          )}
                        </td>

                        {/* Single "Give Decision" button for the whole order */}
                        <td className="p-4">
                          <button
                            onClick={() => {
                              fetchWarehouseUsers();
                              setDecisionModal(grp);
                            }}
                            className="flex items-center gap-1.5 bg-[#c62d23] hover:bg-[#a8241c] text-white px-3 py-2 rounded-lg text-sm font-medium transition shadow-sm whitespace-nowrap"
                          >
                            <CheckCircle size={14} />
                            Give Decision
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
      </div>

      {/* Decision Modal */}
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