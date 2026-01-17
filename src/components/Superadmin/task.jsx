"use client";
import { useEffect, useState } from "react";
import { Send, CheckCircle, Clock } from "lucide-react";
import Sidebar from "@/components/Superadmin/sidebar";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function AssignTasks() {
  const [department, setDepartment] = useState("Sales");
  const [userId, setUserId] = useState("");
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token"));
    }
  }, []);

  const auth = token ? { headers: { Authorization: `Bearer ${token}` } } : null;

  const fetchTasks = async () => {
    if (!auth) return;
    try {
      const res = await axios.get(`${API}/tasks/all`, auth);
      setTasks(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async (dept) => {
    if (!auth) return;
    try {
      setLoadingStaff(true);
      const res = await axios.get(`${API}/auth/staff`, auth);
      const roleMap = { Sales: "sales", Warehouse: "warehouse", Fitting: "fitting", Production: "production" };
      const role = roleMap[dept];
      const filtered = role ? res.data.filter((u) => u.role === role) : res.data;
      setStaff(filtered);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load staff");
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchTasks();
    fetchStaff(department);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchStaff(department);
    setUserId("");
  }, [department, token]);

  const assignTask = async () => {
    if (!auth) return;
    try {
      await axios.post(`${API}/tasks/assign`, { department, userId, task }, auth);
      setTask("");
      setUserId("");
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />

      <div className="flex-1 p-10 space-y-10 overflow-auto">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Task Management</h1>
          <p className="text-neutral-400 mt-1">Assign work to staff and track completion in real-time.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          {/* ASSIGN CARD */}
          <div className="xl:col-span-1 bg-neutral-900/70 backdrop-blur border border-neutral-800 rounded-2xl p-8 shadow-lg">
            <h2 className="text-lg font-semibold mb-6">Assign New Task</h2>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-neutral-400">Department</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full mt-2 bg-neutral-950 border border-neutral-800 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600">
                  <option>Sales</option>
                  <option>Warehouse</option>
                  <option>Fitting</option>
                  <option>Production</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-400">Staff Member</label>
                <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full mt-2 bg-neutral-950 border border-neutral-800 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600">
                  <option value="">{loadingStaff ? "Loading staff..." : "Select staff"}</option>
                  {staff.map((u) => (
                    <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-400">Task Description</label>
                <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={4} placeholder="Describe the task clearly..." className="w-full mt-2 bg-neutral-950 border border-neutral-800 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none" />
              </div>

              <button onClick={assignTask} disabled={!userId || !task} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 transition py-3 rounded-xl flex items-center justify-center gap-2 font-medium">
                <Send size={18} /> Assign Task
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="xl:col-span-2 bg-neutral-900/70 backdrop-blur border border-neutral-800 rounded-2xl p-8 shadow-lg">
            <h2 className="text-lg font-semibold mb-6">Assigned Tasks</h2>

            {loading ? (
              <p>Loading...</p>
            ) : tasks.length === 0 ? (
              <p className="text-neutral-400">No tasks assigned yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="text-left p-4">Department</th>
                      <th className="text-left p-4">Employee</th>
                      <th className="text-left p-4">Task</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Assigned</th>
                      <th className="text-left p-4">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t._id} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition">
                        <td className="p-4">{t.department}</td>
                        <td className="p-4"><div className="font-medium">{t.assignedTo?.name}</div><div className="text-xs text-neutral-400">{t.assignedTo?.email}</div></td>
                        <td className="p-4 max-w-md">{t.task}</td>
                        <td className="p-4">{t.status === "Completed" ? <span className="inline-flex items-center gap-2 text-emerald-400"><CheckCircle size={16}/> Completed</span> : <span className="inline-flex items-center gap-2 text-amber-400"><Clock size={16}/> Pending</span>}</td>
                        <td className="p-4">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">{t.completedAt ? new Date(t.completedAt).toLocaleDateString() : "—"}</td>
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
