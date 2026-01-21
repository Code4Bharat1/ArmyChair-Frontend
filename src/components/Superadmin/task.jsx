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
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <span>Task Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Assign work to staff and track completion in real-time.
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* ASSIGN CARD */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Assign New Task</h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select 
                    value={department} 
                    onChange={(e) => setDepartment(e.target.value)} 
                    className="w-full p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all cursor-pointer"
                  >
                    <option>Sales</option>
                    <option>Warehouse</option>
                    <option>Fitting</option>
                    <option>Production</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
                  <select 
                    value={userId} 
                    onChange={(e) => setUserId(e.target.value)} 
                    className="w-full p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="">{loadingStaff ? "Loading staff..." : "Select staff"}</option>
                    {staff.map((u) => (
                      <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Description</label>
                  <textarea 
                    value={task} 
                    onChange={(e) => setTask(e.target.value)} 
                    rows={4} 
                    placeholder="Describe the task clearly..." 
                    className="w-full p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 outline-none transition-all resize-none" 
                  />
                </div>

                <button 
                  onClick={assignTask} 
                  disabled={!userId || !task} 
                  className="w-full bg-[#c62d23] hover:bg-[#a8241c] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <Send size={18} /> Assign Task
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Assigned Tasks</h2>

              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : tasks.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No tasks assigned yet.</div>
              ) : (
                <div className="overflow-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-4 font-semibold text-gray-700">Department</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Employee</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Task</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Assigned</th>
                        <th className="text-left p-4 font-semibold text-gray-700">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((t, index) => (
                        <tr 
                          key={t._id} 
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="p-4 text-gray-700">{t.department}</td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{t.assignedTo?.name}</div>
                            <div className="text-xs text-gray-500">{t.assignedTo?.email}</div>
                          </td>
                          <td className="p-4 text-gray-700 max-w-md">{t.task}</td>
                          <td className="p-4">
                            {t.status === "Completed" ? (
                              <span className="inline-flex items-center gap-2 text-green-600">
                                <CheckCircle size={16}/> Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-amber-600">
                                <Clock size={16}/> Pending
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-gray-700">{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td className="p-4 text-gray-700">{t.completedAt ? new Date(t.completedAt).toLocaleDateString() : "—"}</td>
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
    </div>
  );
}