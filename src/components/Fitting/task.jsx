"use client";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, ClipboardList } from "lucide-react";
import axios from "axios";
import FittingSidebar from "@/components/Fitting/sidebar";

export default function FittingTasks() {
  const [task, setTask] = useState(null);
  const [pastTasks, setPastTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

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
      <div className="flex min-h-screen bg-gray-50">
        <FittingSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#c62d23]"></div>
            <p className="mt-4 text-gray-600">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <FittingSidebar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList size={32} className="text-[#c62d23]" />
              <span>My Fitting Tasks</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              View and complete your assigned fitting work
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* CURRENT TASK */}
          {task ? (
            <div className="max-w-8xl bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-3 text-gray-900">
                  <ClipboardList className="text-[#c62d23]" size={24} />
                  Current Task
                </h2>

                {task.status === "Completed" ? (
                  <span className="px-4 py-2 rounded-full bg-green-50 text-green-700 flex items-center gap-2 font-medium">
                    <CheckCircle size={18} /> Completed
                  </span>
                ) : (
                  <span className="px-4 py-2 rounded-full bg-amber-50 text-amber-700 flex items-center gap-2 font-medium">
                    <Clock size={18} /> Pending
                  </span>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Task Description</p>
                <p className="text-lg text-gray-900">{task.task}</p>
              </div>

              {task.status === "Pending" && (
                <button
                  onClick={markDone}
                  className="mt-8 w-full py-3 rounded-xl bg-[#c62d23] hover:bg-[#a82419] transition-colors font-semibold text-lg text-white shadow-sm"
                >
                  Mark Task as Completed
                </button>
              )}
            </div>
          ) : (
            <div className="max-w-4xl bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
              <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={48} />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900">No Current Task</h2>
              <p className="text-gray-600">You are all caught up 🎉</p>
            </div>
          )}

          {/* PAST TASKS */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList className="text-[#c62d23]" size={24} />
                Past Tasks
              </h2>
            </div>

            {pastTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No completed tasks yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-4 px-6 text-left font-semibold text-gray-700">Task Description</th>
                      <th className="py-4 px-6 text-left font-semibold text-gray-700">Completed On</th>
                      <th className="py-4 px-6 text-left font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastTasks.map((t, index) => (
                      <tr
                        key={t._id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="py-4 px-6 text-gray-900">{t.task}</td>
                        <td className="py-4 px-6 text-gray-700">
                          {new Date(t.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium flex items-center gap-2 w-fit">
                            <CheckCircle size={14} /> Completed
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