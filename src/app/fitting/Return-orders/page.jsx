"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Fitting/sidebar"; // fitting sidebar
import axios from "axios";

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
    await axios.post(
      `${API}/returns/${selected._id}/fitting-decision`,
      { decision, remarks },
      { headers: getAuthHeaders() }
    );
    setOpenModal(false);
    setSelected(null);
    fetchReturns();
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 mb-8 p-4">
          <h1 className="text-2xl font-semibold text-white">
            Fitting Returns
          </h1>
          <p className="text-sm text-neutral-400">
            Inspect returned items and approve or reject them.
          </p>
        </div>

        {/* TABLE */}
        <div className="bg-neutral-800 m-5 border border-neutral-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-neutral-700">
              <tr>
                {["Order ID", "Chair", "Qty", "Reason", "Action"].map(h => (
                  <th
                    key={h}
                    className="text-center p-4 text-xs font-medium text-neutral-400 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {returns.map(r => (
                <tr
                  key={r._id}
                  className="border-b text-center border-neutral-700 hover:bg-neutral-750"
                >
                  <td className="px-6 py-4">{r.orderId}</td>
                  <td className="px-6 py-4">{r.chairType}</td>
                  <td className="px-6 py-4">{r.quantity}</td>
                  <td className="px-6 py-4">{r.reason || "-"}</td>
                  <td className="px-6 py-4 space-x-3">
                    <button
                      onClick={() => {
                        setSelected(r);
                        setDecision("Accepted");
                        setOpenModal(true);
                      }}
                      className="bg-green-600 px-4 py-1 rounded text-white"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        setSelected(r);
                        setDecision("Rejected");
                        setOpenModal(true);
                      }}
                      className="bg-red-600 px-4 py-1 rounded text-white"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {openModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 p-6 rounded-lg w-96 border border-neutral-700">
            <h2 className="text-lg font-semibold mb-3">
              {decision} Return
            </h2>
            <textarea
              className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded"
              placeholder="Remarks"
              onChange={(e) => setRemarks(e.target.value)}
            />
            <button
              onClick={submitDecision}
              className="mt-4 w-full bg-amber-600 hover:bg-amber-700 py-2 rounded"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FittingReturn;
