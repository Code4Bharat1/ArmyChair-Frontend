"use client";
import React, { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import Sidebar from "@/components/Sidebar/sidebar";

const Return = () => {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const returns = [
    {
      id: "RT-201",
      product: "Ergonomic Office Chair",
      subtext: "Mesh back, black",
      date: "Sep 18, 2023",
      type: "Functional",
      status: "Approved",
      action: "Add to Inventory",
    },
    {
      id: "RT-202",
      product: "Hydraulic Pump V2",
      subtext: "Chair height mechanism",
      date: "Sep 19, 2023",
      type: "Non-Functional",
      status: "Inspected",
      action: "Move to Defects",
    },
    {
      id: "RT-203",
      product: "Leather Armrest",
      subtext: "Right armrest",
      date: "Sep 21, 2023",
      type: "Functional",
      status: "Pending",
      action: "Await Inspection",
    },
    {
      id: "RT-204",
      product: "Conference Chair",
      subtext: "Broken wheel",
      date: "Sep 22, 2023",
      type: "Non-Functional",
      status: "Approved",
      action: "Move to Defects",
    },
    {
      id: "RT-205",
      product: "Meeting Table - Oak",
      subtext: "Minor surface scratch",
      date: "Sep 24, 2023",
      type: "Functional",
      status: "Approved",
      action: "Add to Inventory",
    },
  ];

  /* ================= FILTER LOGIC ================= */
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchSearch =
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.product.toLowerCase().includes(search.toLowerCase());

      const matchType =
        selectedType === "All" || r.type === selectedType;

      const matchStatus =
        selectedStatus === "All" || r.status === selectedStatus;

      return matchSearch && matchType && matchStatus;
    });
  }, [search, selectedType, selectedStatus]);

  /* ================= EXPORT ================= */
  const exportCSV = () => {
    const headers = Object.keys(returns[0]).join(",");
    const rows = returns.map((r) => Object.values(r).join(",")).join("\n");

    const blob = new Blob([headers + "\n" + rows], {
      type: "text/csv",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "returns-report.csv";
    a.click();
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 p-5 overflow-auto">
        {/* ================= HEADER ================= */}
        <div className="bg-neutral-800 border-b border-neutral-700 mb-8 p-4 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-white">
              Returns Management
            </h1>
            <p className="text-sm text-neutral-400">
              Track returned orders and route functional items to inventory and
              non-functional items to defects.
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>

        {/* ================= FILTERS ================= */}
        <div className="flex flex-wrap gap-7 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search return by ID or product..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-600"
            />
          </div>

          {[
            ["Type", selectedType, setSelectedType, ["All", "Functional", "Non-Functional"]],
            ["Status", selectedStatus, setSelectedStatus, ["All", "Pending", "Inspected", "Approved"]],
          ].map(([label, value, setter, options]) => (
            <div key={label}>
              <label className="block text-xs text-neutral-400 mb-1">
                {label}
              </label>
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-600"
              >
                {options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-neutral-700">
              <tr>
                {[
                  "Return ID",
                  "Product",
                  "Return Date",
                  "Category",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left p-4 text-xs font-medium text-neutral-400 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredReturns.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-10 text-neutral-400"
                  >
                    No return orders found
                  </td>
                </tr>
              )}

              {filteredReturns.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-neutral-700 hover:bg-neutral-750"
                >
                  <td className="px-6 py-4 text-white">{r.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-white">{r.product}</div>
                    <div className="text-xs text-neutral-500">
                      {r.subtext}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-neutral-300">{r.date}</td>
                  <td className="px-6 py-4 text-neutral-300">{r.type}</td>
                  <td className="px-6 py-4 text-neutral-300">{r.status}</td>
                  <td className="px-6 py-4 font-medium text-amber-500">
                    {r.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Return;
