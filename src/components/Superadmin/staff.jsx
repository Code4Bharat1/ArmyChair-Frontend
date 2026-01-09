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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function Staff() {
  /* ==========================
     STAFF LIST
  ========================== */
  const [staffs, setStaffs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // 🔽 NEW: expand/collapse state per role
  const [expanded, setExpanded] = useState({
    sales: false,
    warehouse: false,
    fitting: false,
  });

  const toggleExpand = (role) => {
    setExpanded((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  const fetchStaffs = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/auth/staff", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setStaffs(res.data);
    } catch (err) {
      console.error("Failed to fetch staff");
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  /* ==========================
     GROUP STAFF BY ROLE
  ========================== */
  const groupedStaff = {
    sales: staffs.filter((s) => s.role === "sales"),
    warehouse: staffs.filter((s) => s.role === "warehouse"),
    fitting: staffs.filter((s) => s.role === "fitting"),
  };

  /* ==========================
     FORM STATE (UNCHANGED)
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

      await axios.post("http://localhost:5000/api/auth/signup", form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setMessage("Staff added successfully");

      // ✅ auto-expand correct role so user sees it
      setExpanded((prev) => ({
        ...prev,
        [form.role]: true,
      }));

      setShowForm(false);
      fetchStaffs();

      // ✅ reset form (from your working version)
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
    <div className="flex min-h-screen bg-gray-900 text-neutral-100">
      <Sidebar />

      <div className="flex-1 p-6 space-y-8">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Staff Management</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-amber-600 px-4 py-2 rounded-xl text-sm"
          >
            <Plus size={16} /> Add Staff
          </button>
        </div>

        {/* ===== STAFF SECTIONS ===== */}
        {Object.entries(groupedStaff).map(([role, list]) => {
          const isExpanded = expanded[role];
          const visibleStaff = isExpanded ? list : list.slice(0, 4);

          return (
            <div key={role}>
              {/* TITLE + EXPAND BUTTON */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium capitalize">{role} Team</h2>

                {list.length > 4 && (
                  <button
                    onClick={() => toggleExpand(role)}
                    className="flex items-center gap-1 text-amber-400 text-sm"
                  >
                    {isExpanded ? (
                      <>
                        Collapse <ChevronUp size={16} />
                      </>
                    ) : (
                      <>
                        Expand <ChevronDown size={16} />
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* STAFF GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 transition-all">
                {visibleStaff.map((s) => (
                  <div
                    key={s._id}
                    onClick={() => setSelectedStaff(s)}
                    className="cursor-pointer bg-gray-800 rounded-xl p-4 flex flex-col items-center hover:ring-2 hover:ring-amber-500 transition"
                  >
                    <img
                      src={s.photo || "/avatar.png"}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    <p className="mt-3 font-medium text-center">{s.name}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* ===== STAFF DETAILS MODAL ===== */}
        {selectedStaff && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 w-full max-w-md rounded-2xl p-6 relative">
              <button
                onClick={() => setSelectedStaff(null)}
                className="absolute top-3 right-3"
              >
                <X />
              </button>

              <img
                src={selectedStaff.photo}
                className="w-28 h-28 rounded-full object-cover mx-auto"
              />

              <div className="mt-4 space-y-2 text-sm text-neutral-300">
                <p>
                  <b>Name:</b> {selectedStaff.name}
                </p>
                <p>
                  <b>Email:</b> {selectedStaff.email}
                </p>
                <p>
                  <b>Mobile:</b> {selectedStaff.mobile}
                </p>
                <p>
                  <b>Role:</b> {selectedStaff.role}
                </p>
                <p>
                  <b>DOB:</b>{" "}
                  {new Date(selectedStaff.dateOfBirth).toDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===== ADD STAFF FORM MODAL (UNCHANGED) ===== */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 w-full max-w-lg rounded-2xl relative">
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-3 right-3"
              >
                <X />
              </button>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <Input
                  icon={User}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                />
                <Input
                  icon={Mail}
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                />
                <Input
                  icon={Lock}
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                />
                <Input
                  icon={Phone}
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                  placeholder="Mobile"
                />
                <Input
                  icon={CreditCard}
                  name="aadharNumber"
                  value={form.aadharNumber}
                  onChange={handleChange}
                  placeholder="Aadhar"
                />

                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  className="w-full p-2 rounded-xl bg-neutral-900"
                />

                <div className="flex gap-3">
                  <label className="cursor-pointer bg-neutral-900 px-3 py-2 rounded-xl">
                    <Upload size={16} />
                    <input type="file" hidden onChange={handlePhotoUpload} />
                  </label>
                  <button
                    type="button"
                    onClick={openCamera}
                    className="bg-amber-600 px-3 py-2 rounded-xl"
                  >
                    <Camera size={16} />
                  </button>
                </div>

                {preview && (
                  <img src={preview} className="w-24 h-24 rounded-xl" />
                )}

                {cameraOpen && (
                  <>
                    <video ref={videoRef} autoPlay />
                    <button type="button" onClick={capturePhoto}>
                      Capture
                    </button>
                    <canvas ref={canvasRef} hidden />
                  </>
                )}

                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full p-2 rounded-xl bg-neutral-900"
                >
                  <option value="sales">Sales</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="fitting">Fitting</option>
                </select>
                {message && (
                  <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-600 py-2 rounded-xl disabled:opacity-60"
                >
                  {loading ? "Adding..." : "Add Staff"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* INPUT */
const Input = ({ icon: Icon, ...props }) => (
  <div className="relative">
    <Icon className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
    <input {...props} className="w-full pl-10 p-2 bg-neutral-900 rounded-xl" />
  </div>
);
