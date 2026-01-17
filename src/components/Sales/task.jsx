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
      <div className="flex h-screen bg-black text-white">
        <SalesSidebar />
        <div className="flex-1 p-10 text-xl">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <SalesSidebar />

      <div className="flex-1 p-8 space-y-10 overflow-y-auto">
        <h1 className="text-3xl font-bold">My Tasks</h1>

        {/* CURRENT TASK */}
        {task ? (
          <div className="max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <ClipboardList className="text-amber-400" />
                Current Task
              </h2>

              {task.status === "Completed" ? (
                <span className="px-4 py-1 rounded-full bg-green-500/10 text-green-400 flex items-center gap-2">
                  <CheckCircle size={18} /> Completed
                </span>
              ) : (
                <span className="px-4 py-1 rounded-full bg-orange-500/10 text-orange-400 flex items-center gap-2">
                  <Clock size={18} /> Pending
                </span>
              )}
            </div>

            <div className="bg-neutral-800 rounded-lg p-4">
              <p className="text-sm text-neutral-400">Task Description</p>
              <p className="text-lg mt-1">{task.task}</p>
            </div>

            {task.status === "Pending" && (
              <button
                onClick={markDone}
                className="mt-8 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition font-semibold text-lg"
              >
                Mark Task as Completed
              </button>
            )}
          </div>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
            <ClipboardList className="mx-auto mb-4 text-green-400" size={48} />
            <h2 className="text-2xl font-bold mb-2">No Current Task</h2>
            <p className="text-neutral-400">You are all caught up 🎉</p>
          </div>
        )}

        {/* PAST TASKS */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">Past Tasks</h2>

          {pastTasks.length === 0 ? (
            <p className="text-neutral-400">No completed tasks yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-neutral-400 border-b border-neutral-700">
                    <th className="py-2 text-center">Task</th>
                    <th className="text-center">Completed On</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastTasks.map((t) => (
                    <tr
                      key={t._id}
                      className=" text-center border-b border-neutral-800 hover:bg-neutral-800/50"
                    >
                      <td className="py-3">{t.task}</td>
                      <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
                      <td className="text-green-400 flex justify-center items-center gap-2">
                        <CheckCircle size={16} /> Completed
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
  );
}
