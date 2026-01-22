"use client";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, ClipboardList } from "lucide-react";
import axios from "axios";

export default function WarehouseTasks() {
  const [pendingTasks, setPendingTasks] = useState([]);

  const [showCurrentTask, setShowCurrentTask] = useState(false);

  const [pastTasks, setPastTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [allTasks, setAllTasks] = useState([]);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = { Authorization: `Bearer ${token}` };

  const loadTasks = async () => {
    try {
      const current = await axios.get(`${API}/tasks/my`, { headers });
      setPendingTasks(
        Array.isArray(current.data) ? current.data : [current.data],
      );

      const currentTask = current.data || null;

      let historyData = [];

      try {
        const history = await axios.get(`${API}/tasks/my/history`, { headers });
        historyData = history.data || [];
        setPastTasks(historyData);
      } catch {
        setPastTasks([]);
      }

      // Combine current + history
      const combined = [
        ...(Array.isArray(current.data) ? current.data : [current.data]),
        ...historyData,
      ];

      setAllTasks(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markDone = async (id) => {
    try {
      await axios.put(`${API}/tasks/complete/${id}`, {}, { headers });
      loadTasks();
    } catch {
      alert("Failed to complete task");
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 text-gray-900">
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
            <p className="mt-2 text-gray-500">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDelayed = (t) => {
    if (!t.dueAt || t.status !== "Pending") return false;
    const due = new Date(t.dueAt);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const pendingCount = allTasks.filter((t) => t.status === "Pending").length;
  const completedCount = allTasks.filter(
    (t) => t.status === "Completed",
  ).length;
  const delayedCount = allTasks.filter((t) => isDelayed(t)).length;

  const filteredTasks = allTasks.filter((t) => {
    if (activeFilter === "PENDING") return t.status === "Pending";
    if (activeFilter === "COMPLETED") return t.status === "Completed";
    if (activeFilter === "DELAYED") return isDelayed(t);
    return true;
  });
  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            {/* LEFT SIDE */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList size={32} className="text-[#c62d23]" />
                <span>My Tasks</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage and track your assigned tasks
              </p>
            </div>

            {/* RIGHT SIDE BUTTON */}
            <button
              onClick={() => setShowCurrentTask(true)}
              className="bg-[#c62d23] hover:bg-[#a82419] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all"
            >
              Current Task
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* PAST TASKS */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Past Tasks</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              <StatCard
                title="Pending"
                value={pendingCount}
                onClick={() => setActiveFilter("PENDING")}
                active={activeFilter === "PENDING"}
              />
              <StatCard
                title="Completed"
                value={completedCount}
                onClick={() => setActiveFilter("COMPLETED")}
                active={activeFilter === "COMPLETED"}
              />
              <StatCard
                title="Delayed"
                value={delayedCount}
                onClick={() => setActiveFilter("DELAYED")}
                active={activeFilter === "DELAYED"}
                danger
              />
            </div>

            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ClipboardList
                  size={48}
                  className="mx-auto mb-4 text-gray-300"
                />
                <p className="text-lg font-medium">No completed tasks yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Task
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Assigned On
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Due Date
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Completed On
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTasks.map((t, index) => {
                      const isOverdue =
                        t.status === "Pending" &&
                        t.dueAt &&
                        new Date(t.dueAt) < new Date();

                      return (
                        <tr
                          key={t._id}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="p-4 font-medium text-gray-900">
                            {t.task}
                          </td>

                          <td className="p-4 text-gray-700">
                            {formatDate(t.createdAt)}
                          </td>

                          <td className="p-4 text-gray-700">
                            {formatDate(t.dueAt)}
                          </td>

                          <td className="p-4 text-gray-700">
                            {t.status === "Completed"
                              ? formatDate(t.updatedAt)
                              : "-"}
                          </td>

                          <td className="p-4">
                            {t.status === "Completed" ? (
                              <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-sm font-medium">
                                ✔ Completed
                              </span>
                            ) : isOverdue ? (
                              <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-sm font-medium">
                                ⚠ Overdue
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium">
                                ⏳ Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      {showCurrentTask && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    
    <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-xl relative flex flex-col">

      <button
        onClick={() => setShowCurrentTask(false)}
        className="absolute top-5 right-5 text-gray-500 hover:text-[#c62d23] text-xl"
      >
        ✕
      </button>

      <div className="p-8 pb-4 border-b">
        <h2 className="text-2xl font-bold text-gray-900">
          Current Task Details
        </h2>
      </div>

      <div className="overflow-y-auto px-8 pb-8 flex-1">

            {pendingTasks.length === 0 ? (
              <div className="text-center text-gray-600 py-10">
                No current tasks 🎉
              </div>
            ) : (
              pendingTasks.map((t) => (
                <div key={t._id} className="mb-10 border-b pb-6">
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        Assigned By
                      </p>
                      <p className="text-gray-900 font-semibold mt-1">
                        {t.assignedBy?.name || "Admin"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        Status
                      </p>
                      {t.status === "Completed" ? (
                        <span className="inline-block mt-1 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-sm font-medium">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-block mt-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium">
                          Pending
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        Assigned On
                      </p>
                      <p className="text-gray-900 font-semibold mt-1">
                        {formatDate(t.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 font-medium">
                        Due Date
                      </p>
                      <p className="text-gray-900 font-semibold mt-1">
                        {formatDate(t.dueAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-500 font-medium mb-2">
                      Task Description
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-gray-900">
                      {t.task}
                    </div>
                  </div>

                  {t.status === "Pending" && (
                    <button
                      onClick={() => markDone(t._id)}
                      className="py-2 px-5 rounded-lg bg-[#c62d23] hover:bg-[#a82419] text-white font-semibold"
                    >
                      Mark as Completed
                    </button>
                  )}
                </div>
              ))
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const StatCard = ({ title, value, onClick, active, danger }) => (
  <div
    onClick={onClick}
    className={`cursor-pointer bg-white border rounded-2xl p-6 transition-all shadow-sm hover:shadow-md ${
      danger ? "border-amber-300 bg-amber-50" : "border-gray-200"
    } ${active ? "ring-2 ring-[#c62d23]" : ""}`}
  >
    <p className="text-sm text-gray-600 font-medium">{title}</p>
    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
  </div>
);
