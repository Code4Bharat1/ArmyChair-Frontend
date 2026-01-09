"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Sidebar from "@/components/Superadmin/sidebar";
import {
  Users,
  Mail,
  Lock,
  User,
  Phone,
  CreditCard,
  Calendar,
  Camera,
  Upload,
  Plus,
  X,
  Search,
  UserCheck,
  UserCog,
} from "lucide-react";

export default function Staff() {
  /* ==========================
     STAFF LIST
  ========================== */
  const [staffs, setStaffs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [search, setSearch] = useState("");
  const API = process.env.NEXT_PUBLIC_API_URL;
  
  const fetchStaffs = async () => {
    try {
      const res = await axios.get(`${API}/auth/staff`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      console.log("Staff data:", res.data); // 👈 Check console
      setStaffs(res.data);
    } catch (err) {
      console.error("Failed to fetch staff");
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  /* ==========================
     FILTER
  ========================== */
  const filteredStaff = staffs.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  /* ==========================
     STATS
  ========================== */
  const totalStaff = staffs.length;
  const salesCount = staffs.filter((s) => s.role === "sales").length;
  const warehouseCount = staffs.filter((s) => s.role === "warehouse").length;
  const fittingCount = staffs.filter((s) => s.role === "fitting").length;

  /* ==========================
     FORM STATE
  ========================== */
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "sales",
    mobile: "",
    aadharNumber: "",
    dateOfBirth: "",
    photo: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [preview, setPreview] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setPreview(URL.createObjectURL(file));
    setForm({ ...form, photo: base64 });
  };

  const openCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
    setCameraOpen(true);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8);
    setForm({ ...form, photo: base64 });
    setPreview(base64);
    video.srcObject.getTracks().forEach((t) => t.stop());
    setCameraOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const { name, email, password, mobile, aadharNumber, dateOfBirth } = form;

    if (
      !name ||
      !email ||
      !password ||
      !mobile ||
      !aadharNumber ||
      !dateOfBirth
    ) {
      setMessage("All required fields must be filled");
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${API}/auth/signup`, form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setMessage("Staff added successfully");
      setShowForm(false);
      fetchStaffs();

      setForm({
        name: "",
        email: "",
        password: "",
        role: "sales",
        mobile: "",
        aadharNumber: "",
        dateOfBirth: "",
        photo: "",
      });
      setPreview(null);
      setCameraOpen(false);
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-sm text-neutral-400">
              Manage and track all staff members
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} /> Add Staff
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Staff"
            value={totalStaff}
            icon={<Users />}
            highlight
          />
          <StatCard
            title="Sales Team"
            value={salesCount}
            icon={<UserCheck />}
          />
          <StatCard
            title="Warehouse Team"
            value={warehouseCount}
            icon={<UserCog />}
          />
          <StatCard
            title="Fitting Team"
            value={fittingCount}
            icon={<UserCheck />}
          />
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, email or role..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm"
          />
        </div>

        {/* TABLE */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900 text-neutral-400 text-sm">
              <tr>
                <th className="p-4 text-left">PHOTO</th>
                <th className="p-4 text-left">NAME</th>
                <th className="p-4 text-left">EMAIL</th>
                <th className="p-4 text-left">MOBILE</th>
                <th className="p-4 text-left">AADHAR NUMBER</th>
                <th className="p-4 text-left">ROLE</th>
                <th className="p-4 text-left">DATE OF BIRTH</th>
                <th className="p-4 text-left">ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredStaff.map((s) => (
                <tr
                  key={s._id}
                  className="border-t border-neutral-700 hover:bg-neutral-700/30"
                >
                  <td className="p-4">
                    <img
                      src={s.photo || "/avatar.png"}
                      className="w-10 h-10 rounded-full object-cover"
                      alt={s.name}
                    />
                  </td>
                  <td className="p-4 font-medium">{s.name}</td>
                  <td className="p-4 text-neutral-400">{s.email}</td>
                  <td className="p-4 text-neutral-400">{s.mobile}</td>
                  <td className="p-4 text-neutral-400">{s.aadharNumber}</td>
                  <td className="p-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-amber-900/60 text-amber-400 border border-amber-700">
                      {s.role}
                    </span>
                  </td>
                  <td className="p-4 text-neutral-400">
                    {new Date(s.dateOfBirth).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setSelectedStaff(s)}
                      className="text-amber-400 hover:text-amber-300 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStaff.length === 0 && (
            <div className="p-8 text-center text-neutral-400">
              No staff members found
            </div>
          )}
        </div>

        {/* ===== STAFF DETAILS MODAL ===== */}
        {selectedStaff && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-neutral-800 border border-neutral-700 w-full max-w-md rounded-xl p-6 relative">
              <button
                onClick={() => setSelectedStaff(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center">
                <img
                  src={selectedStaff.photo || "/avatar.png"}
                  className="w-28 h-28 rounded-full object-cover border-4 border-neutral-700"
                  alt={selectedStaff.name}
                />

                <h2 className="mt-4 text-xl font-bold">{selectedStaff.name}</h2>
                <span className="mt-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-900/60 text-amber-400 border border-amber-700">
                  {selectedStaff.role}
                </span>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-neutral-700">
                  <span className="text-neutral-400">Email</span>
                  <span className="font-medium">{selectedStaff.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-700">
                  <span className="text-neutral-400">Mobile</span>
                  <span className="font-medium">{selectedStaff.mobile}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-700">
                  <span className="text-neutral-400">Aadhar</span>
                  <span className="font-medium">{selectedStaff.aadharNumber}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-neutral-400">Date of Birth</span>
                  <span className="font-medium">
                    {new Date(selectedStaff.dateOfBirth).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== ADD STAFF FORM MODAL ===== */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-800 border border-neutral-700 w-full max-w-lg rounded-xl relative max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-neutral-800 border-b border-neutral-700 p-4 flex justify-between items-center">
                <h2 className="text-lg font-bold">Add New Staff Member</h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setPreview(null);
                    setCameraOpen(false);
                  }}
                  className="text-neutral-400 hover:text-neutral-200"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <Input
                  icon={User}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  required
                />
                <Input
                  icon={Mail}
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                />
                <Input
                  icon={Lock}
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                  required
                />
                <Input
                  icon={Phone}
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                  placeholder="Mobile Number"
                  required
                />
                <Input
                  icon={CreditCard}
                  name="aadharNumber"
                  value={form.aadharNumber}
                  onChange={handleChange}
                  placeholder="Aadhar Number"
                  required
                />

                <div>
                  <label className="block text-sm text-neutral-400 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    className="w-full p-2 rounded-lg bg-neutral-900 border border-neutral-700 focus:border-amber-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full p-2 rounded-lg bg-neutral-900 border border-neutral-700 focus:border-amber-600 focus:outline-none"
                  >
                    <option value="sales">Sales</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="fitting">Fitting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    Photo
                  </label>
                  <div className="flex gap-3">
                    <label className="cursor-pointer flex items-center gap-2 bg-neutral-900 border border-neutral-700 hover:border-amber-600 px-4 py-2 rounded-lg text-sm transition">
                      <Upload size={16} />
                      Upload
                      <input type="file" hidden onChange={handlePhotoUpload} accept="image/*" />
                    </label>
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 hover:border-amber-600 px-4 py-2 rounded-lg text-sm transition"
                    >
                      <Camera size={16} />
                      Camera
                    </button>
                  </div>
                </div>

                {preview && (
                  <div className="flex justify-center">
                    <img
                      src={preview}
                      className="w-32 h-32 rounded-lg object-cover border-2 border-neutral-700"
                      alt="Preview"
                    />
                  </div>
                )}

                {cameraOpen && (
                  <div className="space-y-2">
                    <video
                      ref={videoRef}
                      autoPlay
                      className="w-full rounded-lg border-2 border-neutral-700"
                    />
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-full bg-amber-600 hover:bg-amber-700 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Capture Photo
                    </button>
                    <canvas ref={canvasRef} hidden />
                  </div>
                )}

                {message && (
                  <div className={`text-sm px-4 py-2 rounded-lg ${
                    message.includes("success")
                      ? "bg-green-900/60 text-green-400 border border-green-700"
                      : "bg-red-900/60 text-red-400 border border-red-700"
                  }`}>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded-lg font-medium transition"
                >
                  {loading ? "Adding Staff..." : "Add Staff Member"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= STAT CARD ================= */
function StatCard({ title, value, icon, highlight }) {
  return (
    <div
      className={`rounded-xl p-5 border ${
        highlight
          ? "bg-gradient-to-r from-amber-900/60 to-black border-amber-700"
          : "bg-neutral-800 border-neutral-700"
      }`}
    >
      <div className="flex justify-between items-center text-neutral-400">
        <span className="text-sm">{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

/* ================= INPUT ================= */
const Input = ({ icon: Icon, ...props }) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
    <input
      {...props}
      className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-amber-600 focus:outline-none"
    />
  </div>
);