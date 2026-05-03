import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  UserCheck, 
  Search,
  Filter,
  MoreVertical,
  Loader2,
  Lock,
  Pencil
} from "lucide-react";
import { Button } from "@/src/components/Button";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/src/lib/error-handler";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [rank, setRank] = useState("Binh nhất");
  const [unit, setUnit] = useState("C1/D1/E1");
  const [role, setRole] = useState("user");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<string | "all">("all");

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      orderBy("lastAccess", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username) {
      alert("Vui lòng điền đầy đủ thông tin Họ tên và Tên đăng nhập.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, "users", username);
      await setDoc(userRef, {
        fullName,
        username,
        password: editingUser?.password || "123456", 
        rank,
        role,
        unit,
        lastAccess: editingUser?.lastAccess || serverTimestamp(),
        totalStudyHours: editingUser?.totalStudyHours || 0,
        bestOfficialScore: editingUser?.bestOfficialScore || 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      alert(editingUser ? "Đã cập nhật thông tin thành công!" : "Đã cấp tài khoản mới thành công!");
      handleCancel();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "users");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setUsername(user.username || user.id);
    setRank(user.rank);
    setUnit(user.unit || "");
    setRole(user.role);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingUser(null);
    setFullName("");
    setUsername("");
    setRank("Binh nhất");
    setUnit("C1/D1/E1");
    setRole("user");
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (rawUserId: string) => {
    const userId = String(rawUserId).trim();
    if (!userId) return;

    if (confirmDeleteId !== userId) {
      setConfirmDeleteId(userId);
      // Automatically reset confirmation after 5 seconds
      setTimeout(() => setConfirmDeleteId(null), 5000);
      return;
    }

    setDeletingUserId(userId);
    setConfirmDeleteId(null);
    try {
      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);
      alert("Đã xóa tài khoản quân nhân thành công!");
    } catch (e: any) {
      console.error("Delete Error:", e);
      alert(`Không thể xóa tài khoản. Lỗi: ${e.message || "Hãy kiểm tra quyền truy cập."}`);
      try { handleFirestoreError(e, OperationType.DELETE, `users/${userId}`); } catch (err) {}
    } finally {
      setDeletingUserId(null);
    }
  };

  // Group users by unit
  const groupedUsers = users.reduce((acc: any, user) => {
    const unitName = user.unit || "Chưa phân đơn vị";
    if (!acc[unitName]) acc[unitName] = [];
    acc[unitName].push(user);
    return acc;
  }, {});

  const filteredUnits = Object.keys(groupedUsers).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Quản lý Quân nhân</h3>
          <p className="text-slate-500 text-sm font-medium mt-1">Hệ thống cấp phát tài khoản và theo dõi quân số theo đơn vị</p>
        </div>
        <div className="flex gap-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Tìm tên, tài khoản..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-red-50 transition-all w-64 uppercase"
            />
          </div>
          <Button onClick={() => isAdding ? handleCancel() : setIsAdding(true)} className="rounded-xl shadow-lg">
            {isAdding ? "Hủy bỏ" : <><UserPlus className="w-4 h-4" /> Cấp tài khoản mới</>}
          </Button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border-2 border-red-50 mb-10 overflow-visible relative">
          <div className="absolute -top-4 right-10 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
            Chế độ Admin
          </div>

          <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
              <UserPlus className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {editingUser ? "Chỉnh sửa thông tin quân nhân" : "Cấp tài khoản quân nhân"}
              </h4>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-1">Thông tin sẽ được mã hóa và lưu trữ bảo mật</p>
            </div>
          </div>
          
          <form onSubmit={handleAddUser} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Họ và tên quân nhân</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Hải"
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 focus:bg-white transition-all text-sm font-bold shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tên đăng nhập (ID)</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="vanhai_79"
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 focus:bg-white transition-all text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>

            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cấp bậc</label>
              <div className="relative">
                <select 
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 focus:bg-white transition-all text-sm font-bold shadow-sm appearance-none cursor-pointer"
                >
                  <option>Binh nhì</option>
                  <option>Binh nhất</option>
                  <option>Hạ sĩ</option>
                  <option>Trung sĩ</option>
                  <option>Thượng sĩ</option>
                  <option>Thiếu úy</option>
                  <option>Trung úy</option>
                  <option>Thượng úy</option>
                  <option>Đại úy</option>
                  <option>Thiếu tá</option>
                  <option>Trung tá</option>
                  <option>Thượng tá</option>
                  <option>Đại tá</option>
                  <option>Thiếu úy QNCN</option>
                  <option>Trung úy QNCN</option>
                  <option>Thượng úy QNCN</option>
                  <option>Đại úy QNCN</option>
                  <option>Thiếu tá QNCN</option>
                  <option>Trung tá QNCN</option>
                  <option>Thượng tá QNCN</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                  <Filter className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Đơn vị</label>
              <input 
                type="text" 
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="C1 / D1 / E1"
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 focus:bg-white transition-all text-sm font-bold shadow-sm"
                required
              />
            </div>

            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Quyền hạn</label>
              <div className="relative">
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 focus:bg-white transition-all text-sm font-bold shadow-sm appearance-none cursor-pointer"
                >
                  <option value="user">Học viên / Thí sinh</option>
                  <option value="admin">Quản trị viên (Phòng chính trị)</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex items-end gap-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-[60px] rounded-2xl font-black uppercase text-sm shadow-2xl shadow-red-200 group relative overflow-hidden">
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingUser ? <><UserCheck className="w-5 h-5" /> Cập nhật thông tin</> : <><UserPlus className="w-5 h-5" /> Khởi tạo tài khoản</>)}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-800 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
              {editingUser && (
                <Button type="button" onClick={handleCancel} variant="outline" className="h-[60px] rounded-2xl font-black uppercase text-sm border-2">
                  Hủy bỏ
                </Button>
              )}
            </div>

            <div className="lg:col-span-3 mt-4 flex items-center gap-4 bg-red-50/50 p-6 rounded-[2rem] border border-red-100/50">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-600 shadow-sm border border-red-100">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-red-900 font-black uppercase tracking-widest">Lưu ý bảo mật</p>
                <p className="text-[11px] text-red-700 font-bold mt-0.5">
                  Mật khẩu mặc định là <span className="underline decoration-2">123456</span>. Quân nhân phải thực hiện đổi mật khẩu ngay sau lần đăng nhập đầu tiên để đảm bảo an toàn thông tin đơn vị.
                </p>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-8">
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-600 mb-4" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Đang tải danh sách quân nhân...</p>
          </div>
        ) : filteredUnits.map(unitName => {
          const unitUsers = groupedUsers[unitName].filter((u: any) => 
            u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
            u.username.toLowerCase().includes(searchQuery.toLowerCase())
          );
          
          if (unitUsers.length === 0 && searchQuery) return null;

          return (
            <div key={unitName} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-red-600 rounded-full" />
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Đơn vị: {unitName}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Số lượng quân nhân: {unitUsers.length}</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-red-600 uppercase">
                  {unitName}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/30 border-b border-slate-100/50">
                    <tr className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      <th className="px-6 py-5">Quân nhân</th>
                      <th className="px-6 py-5">Tài khoản</th>
                      <th className="px-6 py-5">Quyền hạn</th>
                      <th className="px-6 py-5">Truy cập cuối</th>
                      <th className="px-6 py-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {unitUsers.map((user: any) => (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 uppercase font-black text-xs">
                              {user.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 uppercase">{user.fullName}</p>
                              <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight">{user.rank}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{user.username || "Chưa có"}</code>
                            {user.password && <Lock className="w-3 h-3 text-slate-300" title="Sử dụng mật khẩu riêng" />}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-1 rounded-full uppercase",
                            user.role === 'admin' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {user.role === 'admin' ? "Quản trị viên" : "Quân nhân"}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-xs font-medium text-slate-500">
                          {user.lastAccess?.toDate ? user.lastAccess.toDate().toLocaleString('vi-VN') : "N/A"}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation(); 
                                handleEdit(user); 
                              }} 
                              className="relative z-30 p-3 text-slate-300 hover:text-blue-600 transition-colors rounded-xl cursor-pointer"
                              title="Chỉnh sửa thông tin"
                              disabled={deletingUserId === user.id}
                            >
                              <Pencil className="w-5 h-5 pointer-events-none" />
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation(); 
                                handleDelete(user.id); 
                              }} 
                              className={cn(
                                "relative z-30 p-2.5 transition-all rounded-xl cursor-pointer flex items-center gap-2 overflow-hidden min-w-[44px] justify-center",
                                deletingUserId === user.id ? "text-red-600 animate-pulse border border-red-200 bg-red-50" : 
                                confirmDeleteId === user.id ? "bg-red-600 text-white shadow-lg shadow-red-200 animate-[bounce_1s_infinite] scale-105" : "text-slate-300 hover:text-red-600 hover:bg-red-50 focus:bg-red-50"
                              )}
                              disabled={deletingUserId === user.id}
                              title={confirmDeleteId === user.id ? "Ấn lần nữa để xác nhận xóa" : "Xóa tài khoản"}
                            >
                              {deletingUserId === user.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : confirmDeleteId === user.id ? (
                                <span className="text-[11px] font-bold uppercase whitespace-nowrap px-1">Xác nhận xóa</span>
                              ) : (
                                <Trash2 className="w-5 h-5 pointer-events-none" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
