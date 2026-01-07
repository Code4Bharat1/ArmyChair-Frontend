"use client";
import React, { useMemo, useState } from "react";
import { Search, Download, User } from "lucide-react";
import Sidebar from "@/components/Sidebar/sidebar";

const DefectsManagement = () => {
  const [search, setSearch] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [selectedWarranty, setSelectedWarranty] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedDelivery, setSelectedDelivery] = useState("All");

  const defects = [
    {
      id: "DP-306",
      defect: "Eggshell Leather Chair",
      subtext: "Brown armchair",
      date: "Sep 10, 2023",
      severity: "High Severity",
      warranty: "Under Warranty",
      status: "Awaiting",
      delivery: "",
      action: "Not Issue",
    },
    {
      id: "DP-303",
      defect: "Eggshell-XP",
      subtext: "Loveseat",
      date: "Aug 15, 2023",
      severity: "High Severity",
      warranty: "Expired",
      status: "In Progress",
      delivery: "",
      action: "Ongoing",
    },
    {
      id: "DP-302",
      defect: "Hydraulic Silver",
      subtext: "Floor oscillator",
      date: "Sep 24, 2023",
      severity: "Low Severity",
      warranty: "Under Warranty",
      status: "Submitted",
      delivery: "Pending Dispatch",
      action: "Move to Delivery",
    },
    {
      id: "DP-010",
      defect: "Conference Chair",
      subtext: "On wheels",
      date: "Jul 21, 2020",
      severity: "High Severity",
      warranty: "Expired",
      status: "Submitted",
      delivery: "Ready for Delivery",
      action: "",
    },
    {
      id: "DP-301",
      defect: "Greeting Cloud Pro",
      subtext: "Acrylic Label",
      date: "Aug 26, 2023",
      severity: "Low Severity",
      warranty: "Under Warranty",
      status: "Awaiting",
      delivery: "",
      action: "Not Issue",
    },
  ];

  /* ================= FILTER LOGIC ================= */
  const filteredDefects = useMemo(() => {
    return defects.filter((d) => {
      const matchSearch =
        d.id.toLowerCase().includes(search.toLowerCase()) ||
        d.defect.toLowerCase().includes(search.toLowerCase());

      const matchSeverity =
        selectedSeverity === "All" || d.severity === selectedSeverity;

      const matchWarranty =
        selectedWarranty === "All" || d.warranty === selectedWarranty;

      const matchStatus =
        selectedStatus === "All" || d.status === selectedStatus;

      const matchDelivery =
        selectedDelivery === "All" || d.delivery === selectedDelivery;

      return (
        matchSearch &&
        matchSeverity &&
        matchWarranty &&
        matchStatus &&
        matchDelivery
      );
    });
  }, [
    search,
    selectedSeverity,
    selectedWarranty,
    selectedStatus,
    selectedDelivery,
  ]);

  /* ================= EXPORT ================= */
  const exportCSV = () => {
    const headers = Object.keys(defects[0]).join(",");
    const rows = defects.map((d) => Object.values(d).join(",")).join("\n");

    const blob = new Blob([headers + "\n" + rows], {
      type: "text/csv",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "defects-report.csv";
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
              Defects Management
            </h1>
            <p className="text-sm text-neutral-400">
              Track repairs, manage warranty claims, and lock defective items.
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
              placeholder="Search defects by ID or product..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-600"
            />
          </div>

          {[
            [
              "Severity",
              selectedSeverity,
              setSelectedSeverity,
              ["All", "High Severity", "Low Severity"],
            ],
            [
              "Warranty",
              selectedWarranty,
              setSelectedWarranty,
              ["All", "Under Warranty", "Expired"],
            ],
            [
              "Status",
              selectedStatus,
              setSelectedStatus,
              ["All", "Submitted", "Awaiting", "In Progress"],
            ],
            [
              "Delivery",
              selectedDelivery,
              setSelectedDelivery,
              ["All", "Ready for Delivery", "Pending Dispatch"],
            ],
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
                  "Defect ID",
                  "Product",
                  "Date",
                  "Warranty",
                  "Status",
                  "Delivery",
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
              {filteredDefects.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-10 text-neutral-400"
                  >
                    No defects found
                  </td>
                </tr>
              )}

              {filteredDefects.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-neutral-700 hover:bg-neutral-750"
                >
                  <td className="px-6 py-4 text-white">{d.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-white">{d.defect}</div>
                    <div className="text-xs text-neutral-500">
                      {d.subtext}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-neutral-300">{d.date}</td>
                  <td className="px-6 py-4 text-neutral-300">
                    {d.warranty}
                  </td>
                  <td className="px-6 py-4 text-neutral-300">{d.status}</td>
                  <td className="px-6 py-4 text-neutral-300">
                    {d.delivery}
                  </td>
                  <td className="px-6 py-4 text-amber-500 font-medium">
                    {d.action}
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

export default DefectsManagement;
