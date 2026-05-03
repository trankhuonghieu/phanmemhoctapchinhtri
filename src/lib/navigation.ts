import { 
  BellRing, 
  FileText, 
  Library, 
  Megaphone, 
  Users, 
  Bell, 
  GraduationCap, 
  PieChart,
  Trophy
} from "lucide-react";

export const NAV_ITEMS = [
  { id: "news", label: "Tin tức Chính trị", icon: BellRing, collection: "news" },
  { id: "resolutions", label: "Học tập Nghị quyết", icon: FileText, collection: "resolutions" },
  { id: "library", label: "Thư viện Tài liệu", icon: Library, collection: "library" },
  { id: "notifications", label: "Thông báo chính trị nội bộ", icon: Bell, collection: "notifications" },
  { id: "propaganda", label: "Tuyên truyền tự động", icon: Megaphone, collection: "broadcasts" },
  { id: "users", label: "Quản lý Quân nhân", icon: Users, collection: "users", adminOnly: true },
  { id: "exam", label: "Ôn tập & Thi cử", icon: GraduationCap, collection: "exams" },
  { id: "results-stats", label: "Thống kê kết quả thi", icon: PieChart, collection: "quizResults" },
];
