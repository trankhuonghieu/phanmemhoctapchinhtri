import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Calendar, 
  Filter, 
  FileText, 
  Library, 
  Bell, 
  PieChart, 
  GraduationCap, 
  Users,
  LogOut,
  BellRing,
  MoreVertical,
  ChevronRight,
  Plus,
  ShieldCheck,
  FileDown,
  Play,
  User,
  Megaphone,
  Menu,
  Clock as ClockIcon
} from "lucide-react";
import { Button } from "@/src/components/Button";
import { cn } from "@/src/lib/utils";
import QuizEngine from "./QuizEngine";
import Propaganda from "./Propaganda";
import UserManagement from "./UserManagement";
import ResultsStats from "./ResultsStats";
import { UniversalTable } from "./UniversalTable";
import { auth, db } from "@/src/lib/firebase";
import { onSnapshot, collection, query, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { User as FirebaseUser, signOut } from "firebase/auth";
import { handleFirestoreError, OperationType } from "@/src/lib/error-handler";
import DocumentForm from "./DocumentForm";
import { NAV_ITEMS } from "@/src/lib/navigation";

interface DashboardProps {
  user: FirebaseUser;
  profile: any;
  onLogout?: () => void;
}

export default function Dashboard({ user, profile, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("news");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setIsAddingContent(false);
    setEditingItem(null);
    const activeItem = NAV_ITEMS.find(i => i.id === activeTab);
    if (!activeItem?.collection) return;

    setLoading(true);
    const q = query(
      collection(db, activeItem.collection),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) as any }));
      if (profile?.role !== 'admin') {
        docs = docs.filter(doc => doc.status !== 'Đóng');
      }
      setItems(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, activeItem.collection || null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await signOut(auth);
    }
  };

  const renderContent = () => {
    const showForm = (isAddingContent || editingItem) && (activeTab === "news" || activeTab === "resolutions" || activeTab === "library" || activeTab === "notifications");

    switch (activeTab) {
      case "news":
      case "resolutions":
      case "library":
      case "notifications":
        return (
          <div className="space-y-8">
            {showForm && (
              <DocumentForm 
                type={activeTab as "news" | "resolutions" | "library" | "notifications"} 
                initialData={editingItem}
                onClose={() => {
                  setIsAddingContent(false);
                  setEditingItem(null);
                }}
                onSuccess={() => {
                  setIsAddingContent(false);
                  setEditingItem(null);
                }}
              />
            )}
            <UniversalTable 
              activeTab={activeTab} 
              items={items}
              searchQuery={searchQuery}
              loading={loading} 
              isAdmin={profile?.role === 'admin'}
              onAddClick={() => setIsAddingContent(true)}
              onEdit={(item) => setEditingItem(item)}
            />
          </div>
        );
      case "exam":
        return <QuizEngine userId={user.uid} fullName={profile?.fullName || user.displayName} isAdmin={profile?.role === 'admin'} />;
      case "propaganda":
        return <Propaganda user={user} profile={profile} searchQuery={searchQuery} />;
      case "users":
        return <UserManagement />;
      case "results-stats":
        return <ResultsStats isAdmin={profile?.role === 'admin'} userId={user.uid} />;
      default:
        return (
          <UniversalTable 
            activeTab={activeTab} 
            items={items}
            searchQuery={searchQuery}
            loading={loading} 
            isAdmin={profile?.role === 'admin'}
            onAddClick={() => setIsAddingContent(true)}
            onEdit={(item) => setEditingItem(item)}
          />
        );
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className={cn(
        "bg-red-800 text-white flex flex-col shrink-0 shadow-2xl z-50 transition-all duration-300 fixed md:relative inset-y-0 left-0",
        isSidebarOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-64"
      )}>
        <div className="p-6 flex flex-col items-center border-b border-red-700/50">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mb-3 shadow-lg">
            <div className="w-12 h-12 bg-red-700 rounded-full flex items-center justify-center border-2 border-yellow-500">
              <span className="text-yellow-400 text-xl font-black">★</span>
            </div>
          </div>
          <h1 className="text-center font-bold text-lg leading-tight tracking-wide">HỌC TẬP CHÍNH TRỊ</h1>
          <p className="text-[10px] text-yellow-400 font-medium tracking-[0.2em] uppercase mt-1">Quân đội Nhân dân Việt Nam</p>
        </div>
 
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(item => !item.adminOnly || profile?.role === 'admin').map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center px-6 py-3 transition-all group",
                activeTab === item.id 
                  ? "bg-red-700 text-yellow-400 border-r-4 border-yellow-400" 
                  : "hover:bg-red-700 text-white/80 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 mr-3 shrink-0", activeTab === item.id ? "text-yellow-400" : "text-white/60 group-hover:text-white")} />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>
 
        <div className="p-4 border-t border-red-700/50 block md:hidden">
          <p className="text-[9px] text-white/50 font-medium leading-tight">
            Hệ thống được phát triển bởi THƯỢNG ÚY TRẦN KHƯƠNG HIẾU - TRỢ LÝ HẬU CẦN
          </p>
        </div>
        
        <div className="p-4 border-t border-red-700/50 hidden md:block">
          <p className="text-[9px] text-white/50 font-medium leading-tight">
            Hệ thống được phát triển bởi THƯỢNG ÚY TRẦN KHƯƠNG HIẾU - TRỢ LÝ HẬU CẦN
          </p>
        </div>

        <div className="p-4 border-t border-red-700/50">
          <div className="flex items-center space-x-3 p-2 bg-red-900/40 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-slate-300 border border-yellow-400 overflow-hidden shrink-0">
              {user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <User className="text-slate-500 w-full h-full p-1" />}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{profile?.fullName || user.displayName}</p>
              <p className="text-[10px] text-yellow-400 uppercase">{profile?.rank || "Quân nhân"}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full mt-3 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
            Đăng xuất hệ thống
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
        {/* Header / Global Search */}
        <header className="h-20 bg-white border-b border-slate-200 px-4 sm:px-6 md:px-8 flex items-center justify-between shadow-sm z-0">
          <div className="flex items-center flex-1 max-w-2xl">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="mr-3 md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative w-full">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..." 
                className="w-full bg-slate-100 border-none rounded-full py-2.5 pl-10 sm:pl-12 pr-4 text-xs sm:text-sm focus:ring-2 focus:ring-red-600 focus:bg-white transition-all font-medium" 
              />
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400"><Search className="w-4 h-4" /></div>
            </div>
            <div className="ml-2 sm:ml-4 flex items-center space-x-1 sm:space-x-2">
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium whitespace-nowrap hidden sm:block">Lọc theo:</span>
              <button className="px-2 sm:px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] sm:text-xs font-semibold hover:bg-slate-50 active:scale-95 transition-all">Tất cả</button>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 ml-4 sm:ml-8">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cập nhật hệ thống</p>
              <p className="text-xs font-black">2 Tháng 5, 2026</p>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            {profile?.role === 'admin' && activeTab !== 'news' && activeTab !== 'resolutions' && activeTab !== 'library' && activeTab !== 'notifications' && activeTab !== 'users' && activeTab !== 'results-stats' && activeTab !== 'propaganda' && activeTab !== 'exam' && (
              <button 
                onClick={async () => {
                  const title = prompt("Nhập tiêu đề:");
                  if (!title) return;
                  const activeItem = NAV_ITEMS.find(i => i.id === activeTab);
                  if (activeItem?.collection) {
                    try {
                      await addDoc(collection(db, activeItem.collection), {
                        title,
                        content: "Nội dung mẫu được khởi tạo tự động...",
                        authorId: user.uid,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        status: "Mới"
                      });
                    } catch (e) {
                      handleFirestoreError(e, OperationType.CREATE, activeItem.collection);
                    }
                  }
                }}
                className="w-10 h-10 flex items-center justify-center bg-yellow-400 text-red-900 rounded-full shadow-md hover:brightness-105 active:scale-90 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Content Scroller */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
