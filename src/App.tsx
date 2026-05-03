/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { auth, db } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, setDoc } from "firebase/firestore";

interface UserProfile {
  fullName: string;
  role: string;
  rank: string;
  unit: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCustomLogin = (e: any) => {
      const userData = e.detail;
      setUser({ uid: userData.uid, displayName: userData.fullName } as any);
      setProfile(userData);
      setLoading(false);
    };

    const ensureAdminExists = async () => {
      try {
        const adminRef = doc(db, "users", "chinh-tri-vien");
        const snapshot = await getDoc(adminRef);
        if (!snapshot.exists()) {
          await setDoc(adminRef, {
            fullName: "Chính trị viên Hệ thống",
            username: "chinh-tri-vien",
            password: "123456",
            role: "admin",
            rank: "Đại tá",
            unit: "Cục Chính trị",
            lastAccess: serverTimestamp(),
            totalStudyHours: 0,
            bestOfficialScore: 0
          });
          console.log("System admin created: chinh-tri-vien / 123456");
        }
      } catch (e) {
        console.error("Error ensuring admin exists:", e);
      }
    };

    ensureAdminExists();
    window.addEventListener('custom-login', handleCustomLogin);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        } catch (e) {
          console.error("Error fetching profile:", e);
        }
      } else {
        // Only clear if no profile (to support custom login which sets profile first)
        // But usually onAuthStateChanged fires with null on logout
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('custom-login', handleCustomLogin);
    };
  }, []);

  const handleLogout = async () => {
    setUser(null);
    setProfile(null);
    try {
      if (auth.currentUser) {
        await auth.signOut();
      }
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-military-red flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 border-8 border-red-800 text-slate-900 flex flex-col font-sans overflow-hidden">
      {!user ? <Login /> : <Dashboard user={user} profile={profile} onLogout={handleLogout} />}
    </div>
  );
}
