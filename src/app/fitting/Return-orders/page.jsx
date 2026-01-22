"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Fitting/sidebar";
import axios from "axios";
import { RotateCcw, X, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const FittingReturn = () => {
  const [returns, setReturns] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState("");
  const [remarks, setRemarks] = useState("");
  const [inventoryType, setInventoryType] = useState("");
  const [uiDecision, setUiDecision] = useState(""); // only for UI

  const fetchReturns = async () => {
    const res = await axios.get(`${API}/returns?status=In-Fitting`, {
      headers: getAuthHeaders(),
    });
    setReturns(res.data.data);
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const submitDecision = async () => {
    try {
      const payload = {
        decision,
        remarks,
      };

      // ✅ send inventoryType ONLY if accepted
      if (decision === "Accepted") {
        payload.inventoryType = inventoryType;
      }

      await axios.post(
        `${API}/returns/${selected._id}/fitting-decision`,
        payload,
        { headers: getAuthHeaders() },
      );

      setOpenModal(false);
      setSelected(null);
      setRemarks("");
      setInventoryType("");
      fetchReturns();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    }
  };

  const closeModal = () => {
    setOpenModal(false);
    setSelected(null);
    setRemarks("");
    setInventoryType("");
    setDecision("");
    setUiDecision("");
  };

  const isFunctional = selected?.category === "Functional";
  const isNonFunctional = selected?.category === "Non-Functional";

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <RotateCcw size={32} className="text-[#c62d23]" />
              <span>Fitting Returns</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Inspect returned items and update inventory
            </p>
          </div>
        </div>

        <div className="p-8">
          {/* TABLE */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Order ID", "Chair Model", "Quantity", "Reason", "Action"].map((h) => (
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
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-500">
                        No returns in fitting at the moment
                      </td>
                    </tr>
                  ) : (
                    returns.map((r, index) => (
                      <tr
                        key={r._id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="p-4 font-medium text-gray-900">{r.orderId}</td>
                        <td className="p-4 text-gray-900">{r.chairType}</td>
                        <td className="p-4 font-semibold text-gray-900">{r.quantity}</td>
                        <td className="p-4 text-gray-700">{r.reason || "—"}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelected(r);
                                setUiDecision("Accepted");
                                setDecision("");
                                setInventoryType("");
                                setRemarks("");
                                setOpenModal(true);
                              }}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                            >
                              <CheckCircle size={16} />
                              Accept
                            </button>

                            <button
                              onClick={() => {
                                setSelected(r);
                                setUiDecision("Rejected");
                                setDecision("Rejected");
                                setInventoryType("");
                                setRemarks("");
                                setOpenModal(true);
                              }}
                              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </div>
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

      {/* MODAL */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {uiDecision === "Accepted" ? (
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <XCircle className="text-red-600" size={20} />
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900">
                  {uiDecision} Return
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Return Details */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 font-medium">Order ID</p>
                    <p className="text-gray-900 font-semibold">{selected?.orderId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Chair Model</p>
                    <p className="text-gray-900 font-semibold">{selected?.chairType}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Quantity</p>
                    <p className="text-gray-900 font-semibold">{selected?.quantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Category</p>
                    <p className="text-gray-900 font-semibold">{selected?.category}</p>
                  </div>
                </div>
              </div>

              {/* Inventory Type Selection (Only for Accepted) */}
              {uiDecision === "Accepted" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Add returned item to:
                  </label>
                  <div className="space-y-2">
                    {isFunctional && (
                      <button
                        onClick={() => {
                          setInventoryType("GOOD");
                          setDecision("Accepted");
                        }}
                        className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                          inventoryType === "GOOD"
                            ? "bg-green-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                        }`}
                      >
                        <CheckCircle size={18} />
                        Good Inventory
                      </button>
                    )}

                    {isNonFunctional && (
                      <button
                        onClick={() => {
                          setInventoryType("BAD");
                          setDecision("Accepted");
                        }}
                        className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                          inventoryType === "BAD"
                            ? "bg-red-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                        }`}
                      >
                        <AlertCircle size={18} />
                        Bad Inventory
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Remarks {uiDecision === "Rejected" && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c62d23] focus:border-transparent resize-none text-gray-900"
                  placeholder="Enter your remarks here..."
                  rows="4"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={uiDecision === "Accepted" && !inventoryType}
                onClick={submitDecision}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  uiDecision === "Accepted" && !inventoryType
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : uiDecision === "Accepted"
                    ? "bg-green-600 hover:bg-green-700 text-white shadow-sm"
                    : "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                }`}
              >
                Confirm {uiDecision === "Accepted" ? "Accept" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FittingReturn;