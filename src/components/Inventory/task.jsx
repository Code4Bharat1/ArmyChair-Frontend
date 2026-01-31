"use client";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, ClipboardList, Menu, X, UserCircle } from "lucide-react";
import axios from "axios";
import InventorySidebar from "@/components/Inventory/sidebar";
import { useRouter } from "next/navigation";

export default function WarehouseTasks() {
  const router = useRouter();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [showCurrentTask, setShowCurrentTask] = useState(false);
  const [pastTasks, setPastTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [allTasks, setAllTasks] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const loadTasks = async () => {
    try {
      const current = await axios.get(`${API}/tasks/my`, { headers });
      setPendingTasks(
        Array.isArray(current.data) ? current.data : [current.data]
      );

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
      <div className="flex min-h-screen bg-gray-50">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          <InventorySidebar />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#c62d23]"></div>
            <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading tasks...</p>
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
  const completedCount = allTasks.filter((t) => t.status === "Completed").length;
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
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <InventorySidebar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-3 sm:p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* LEFT SIDE */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-600 hover:text-[#c62d23] transition p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <Menu size={24} />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 truncate">
                  <ClipboardList size={20} className="text-[#c62d23] sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />
                  <span className="truncate">My Tasks</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">
                  Manage and track your assigned tasks
                </p>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setShowCurrentTask(true)}
                className="bg-[#c62d23] hover:bg-[#a82419] text-white px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 rounded-lg sm:rounded-xl font-semibold shadow-sm transition-all text-xs sm:text-sm md:text-base"
              >
                <span className="hidden sm:inline">Current Task</span>
                <span className="sm:hidden">Current</span>
              </button>

              <button
                onClick={() => router.push("/profile")}
                title="My Profile"
                className="text-gray-600 hover:text-[#c62d23] transition p-1 sm:p-0"
              >
                <UserCircle size={28} className="sm:w-8 sm:h-8 md:w-9 md:h-9" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
          {/* PAST TASKS */}
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Past Tasks</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6">
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
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <ClipboardList size={40} className="mx-auto mb-3 sm:mb-4 text-gray-300 sm:w-12 sm:h-12" />
                <p className="text-base sm:text-lg font-medium">No completed tasks yet</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs lg:text-sm">Task</th>
                        <th className="p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs lg:text-sm">Assigned On</th>
                        <th className="p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs lg:text-sm">Due Date</th>
                        <th className="p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs lg:text-sm">Completed On</th>
                        <th className="p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs lg:text-sm">Status</th>
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
                            <td className="p-3 lg:p-4 font-medium text-gray-900 text-xs lg:text-sm">{t.task}</td>
                            <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">{formatDate(t.createdAt)}</td>
                            <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">{formatDate(t.dueAt)}</td>
                            <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">
                              {t.status === "Completed" ? formatDate(t.updatedAt) : "-"}
                            </td>
                            <td className="p-3 lg:p-4">
                              {t.status === "Completed" ? (
                                <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-[10px] sm:text-sm font-medium whitespace-nowrap">
                                  ✔ Completed
                                </span>
                              ) : isOverdue ? (
                                <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] sm:text-sm font-medium whitespace-nowrap">
                                  ⚠ Overdue
                                </span>
                              ) : (
                                <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] sm:text-sm font-medium whitespace-nowrap">
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

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3 p-3 sm:p-4">
                  {filteredTasks.map((t) => {
                    const isOverdue =
                      t.status === "Pending" &&
                      t.dueAt &&
                      new Date(t.dueAt) < new Date();

                    return (
                      <div key={t._id} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm mb-1">
                              {t.task}
                            </h3>
                          </div>
                          {t.status === "Completed" ? (
                            <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[10px] font-medium whitespace-nowrap ml-2">
                              ✔ Completed
                            </span>
                          ) : isOverdue ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-medium whitespace-nowrap ml-2">
                              ⚠ Overdue
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium whitespace-nowrap ml-2">
                              ⏳ Pending
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-gray-500 mb-0.5">Assigned On</p>
                            <p className="text-gray-900 font-medium">{formatDate(t.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-0.5">Due Date</p>
                            <p className="text-gray-900 font-medium">{formatDate(t.dueAt)}</p>
                          </div>
                          {t.status === "Completed" && (
                            <div className="col-span-2">
                              <p className="text-gray-500 mb-0.5">Completed On</p>
                              <p className="text-gray-900 font-medium">{formatDate(t.updatedAt)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CURRENT TASK MODAL */}
      {showCurrentTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-xl sm:rounded-2xl shadow-xl relative flex flex-col">
            <button
              onClick={() => setShowCurrentTask(false)}
              className="absolute top-3 right-3 sm:top-5 sm:right-5 text-gray-500 hover:text-[#c62d23] text-xl w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center hover:bg-gray-100 rounded-lg sm:bg-transparent"
            >
              <X size={20} />
            </button>

            <div className="p-4 sm:p-6 md:p-8 pb-3 sm:pb-4 border-b">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pr-8">
                Current Task Details
              </h2>
            </div>

            <div className="overflow-y-auto px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 flex-1">
              {pendingTasks.length === 0 ? (
                <div className="text-center text-gray-600 py-10 text-sm sm:text-base">
                  No current tasks 🎉
                </div>
              ) : (
                pendingTasks.map((t) => (
                  <div key={t._id} className="mb-6 sm:mb-10 border-b pb-4 sm:pb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Assigned By</p>
                        <p className="text-gray-900 font-semibold mt-1 text-sm sm:text-base">
                          {t.assignedBy?.name || "Admin"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Status</p>
                        {t.status === "Completed" ? (
                          <span className="inline-block mt-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs sm:text-sm font-medium">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-block mt-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs sm:text-sm font-medium">
                            Pending
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Assigned On</p>
                        <p className="text-gray-900 font-semibold mt-1 text-sm sm:text-base">
                          {formatDate(t.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">Due Date</p>
                        <p className="text-gray-900 font-semibold mt-1 text-sm sm:text-base">
                          {formatDate(t.dueAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 sm:mb-6">
                      <p className="text-xs sm:text-sm text-gray-500 font-medium mb-2">
                        Task Description
                      </p>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-5 text-gray-900 text-sm sm:text-base">
                        {t.task}
                      </div>
                    </div>

                    {t.status === "Pending" && (
                      <button
                        onClick={() => markDone(t._id)}
                        className="w-full sm:w-auto py-2 px-4 sm:px-5 rounded-lg bg-[#c62d23] hover:bg-[#a82419] text-white font-semibold text-sm sm:text-base transition-all"
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
    className={`cursor-pointer bg-white border rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 transition-all shadow-sm hover:shadow-md ${
      danger ? "border-amber-300 bg-amber-50" : "border-gray-200"
    } ${active ? "ring-2 ring-[#c62d23]" : ""}`}
  >
    <p className="text-xs sm:text-sm text-gray-600 font-medium">{title}</p>
    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{value}</p>
  </div>
);