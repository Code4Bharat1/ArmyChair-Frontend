"use client";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, ClipboardList } from "lucide-react";
import axios from "axios";
import SalesSidebar from "./sidebar";

export default function WarehouseTasks() {
  const [task, setTask] = useState(null);
  const [pastTasks, setPastTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = { Authorization: `Bearer ${token}` };

  const loadTasks = async () => {
    try {
      const current = await axios.get(`${API}/tasks/my`, { headers });
      setTask(current.data);

      // SAFE: if history route exists use it, else fallback
      try {
        const history = await axios.get(`${API}/tasks/my/history`, { headers });
        setPastTasks(history.data || []);
      } catch {
        setPastTasks([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markDone = async () => {
    try {
      await axios.put(`${API}/tasks/complete/${task._id}`, {}, { headers });
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
        <SalesSidebar />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
            <p className="mt-2 text-gray-500">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <SalesSidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList size={32} className="text-[#c62d23]" />
              <span>My Tasks</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage and track your assigned tasks
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* CURRENT TASK */}
          {task ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <ClipboardList className="text-[#c62d23]" />
                  Current Task
                </h2>

                {task.status === "Completed" ? (
                  <span className="px-4 py-2 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-2 font-medium">
                    <CheckCircle size={18} /> Completed
                  </span>
                ) : (
                  <span className="px-4 py-2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-2 font-medium">
                    <Clock size={18} /> Pending
                  </span>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <p className="text-sm text-gray-600 font-semibold mb-2">Task Description</p>
                <p className="text-lg text-gray-900">{task.task}</p>
              </div>

              {task.status === "Pending" && (
                <button
                  onClick={markDone}
                  className="mt-6 w-full py-3 rounded-xl bg-[#c62d23] hover:bg-[#a82419] text-white transition-all font-semibold text-lg shadow-sm"
                >
                  Mark Task as Completed
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
              <ClipboardList className="mx-auto mb-4 text-[#c62d23]" size={48} />
              <h2 className="text-2xl font-bold mb-2 text-gray-900">No Current Task</h2>
              <p className="text-gray-600">You are all caught up 🎉</p>
            </div>
          )}

          {/* PAST TASKS */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Past Tasks</h2>
            </div>

            {pastTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No completed tasks yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 text-left font-semibold text-gray-700">Task</th>
                      <th className="p-4 text-left font-semibold text-gray-700">Completed On</th>
                      <th className="p-4 text-left font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastTasks.map((t, index) => (
                      <tr
                        key={t._id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                      >
                        <td className="p-4 text-gray-900 font-medium">{t.task}</td>
                        <td className="p-4 text-gray-700">
                          {new Date(t.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-2 w-fit font-medium">
                            <CheckCircle size={16} /> Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
