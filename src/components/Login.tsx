import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/src/components/Button";
import { Flag, ShieldCheck, User, Lock, Mail, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { auth, db } from "@/src/lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // Direct lookup by ID (assuming ID is username)
      const userRef = doc(db, "users", username.trim());
      const userSnap = await getDoc(userRef);
      
      let userData = null;
      let userId = null;

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.password === password) {
          userData = data;
          userId = userSnap.id;
        }
      } 
      
      // Fallback to query in case ID is not username
      if (!userData) {
        const q = query(collection(db, "users"), where("username", "==", username.trim()), where("password", "==", password));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          userData = querySnapshot.docs[0].data();
          userId = querySnapshot.docs[0].id;
        }
      }

      if (userData && userId) {
        // Update last access (don't block login if it fails)
        setDoc(doc(db, "users", userId), { lastAccess: serverTimestamp() }, { merge: true }).catch(e => console.error("Access log update failed:", e));
        
        // Pass user data to App
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('custom-login', { 
            detail: { uid: userId, ...userData } 
          }));
        }
      } else {
        setError("Tên đăng nhập hoặc mật khẩu không chính xác.");
      }
    } catch (e: any) {
      console.error("Custom Login Error:", e);
      setError(`Lỗi hệ thống: ${e.message || "Vui lòng kiểm tra kết nối mạng."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile exists, if not create basic one
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          fullName: user.displayName || "Quân nhân mới",
          rank: "Chưa cập nhật",
          unit: "Chưa cập nhật",
          role: "user",
          lastAccess: serverTimestamp(),
          totalStudyHours: 0,
          bestOfficialScore: 0
        });
      } else {
        await setDoc(userRef, { lastAccess: serverTimestamp() }, { merge: true });
      }
    } catch (error) {
      console.error("Login Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative bg-slate-50">
      {/* Immersive Pure Light Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }} 
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-white rounded-full blur-[120px] shadow-[0_0_100px_rgba(255,255,255,0.8)]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1]
          }} 
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
          className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-red-100 rounded-full blur-[100px]" 
        />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(220,38,38,0.05)_0%,transparent_50%)]" />
      </div>

      {/* Main Container */}
      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 50 }}
        className="w-full max-w-4xl grid md:grid-cols-2 bg-white/80 backdrop-blur-3xl rounded-[48px] shadow-[0_48px_80px_-24px_rgba(0,0,0,0.12)] overflow-hidden z-10 border border-white"
      >
        
        {/* Left Side: Branding */}
        <div className="bg-red-800 p-12 flex flex-col justify-center items-center text-center relative overflow-hidden text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mb-8 shadow-[0_20px_40px_rgba(250,204,21,0.3)] z-10"
          >
            <div className="w-16 h-16 bg-red-700 rounded-full flex items-center justify-center border-2 border-yellow-500">
              <span className="text-yellow-400 text-4xl font-black">★</span>
            </div>
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl md:text-4xl font-black leading-tight mb-4 z-10 uppercase tracking-[0.2em]"
          >
            Học tập<br />Chính trị
          </motion.h1>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "40px" }}
            transition={{ delay: 0.6 }}
            className="h-1 bg-yellow-400 mb-6 z-10 rounded-full"
          />
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-yellow-400/80 font-black uppercase tracking-[0.3em] text-[10px] z-10"
          >
            Quân đội Nhân dân Việt Nam
          </motion.p>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-900/50 rounded-full -ml-32 -mb-32 blur-3xl" />
        </div>

        {/* Right Side: Form */}
        <div className="p-12 bg-white/40 flex flex-col justify-center relative">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tight">Đăng nhập</h2>
            <p className="text-slate-400 text-sm font-medium">Truy cập hệ thống đơn vị</p>
          </div>

          <form className="space-y-6" onSubmit={handleCustomLogin}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 border border-red-100 text-red-600 text-xs p-4 rounded-2xl font-bold uppercase tracking-tight flex items-center gap-3"
              >
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                {error}
              </motion.div>
            )}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên đăng nhập</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-red-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Ví dụ: chinh-tri-vien..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-red-600/5 focus:border-red-600/20 transition-all font-bold text-slate-700 shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-red-600 transition-colors" />
                <input 
                  type="password" 
                  placeholder="••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-red-600/5 focus:border-red-600/20 transition-all font-bold text-slate-700 shadow-sm"
                  required
                />
              </div>
            </div>
            
            <Button className="w-full h-14 rounded-2xl text-base font-black shadow-red-200 shadow-xl uppercase tracking-widest group" disabled={isLoading}>
              <span className="flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Vào hệ thống"}
                {!isLoading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </span>
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white/40 backdrop-blur-sm px-4 text-slate-300 font-black tracking-widest">Hoặc SSO</span></div>
            </div>

            <Button 
              type="button"
              variant="outline" 
              className="w-full border-slate-100 bg-white/50 text-slate-400 hover:bg-white h-14 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4 mr-3 grayscale group-hover:grayscale-0 transition-all" />
              Sử dụng Google SSO
            </Button>
          </form>


        </div>
      </motion.div>
    </div>
  );
}
