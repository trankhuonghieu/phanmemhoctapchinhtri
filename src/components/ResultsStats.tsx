import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Clock, 
  Download,
  Trash2,
  Loader2,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Target,
  PieChart as PieChartIcon,
  Users,
  Award,
  FileDown
} from "lucide-react";
import { db } from "@/src/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, where, getDocs } from "firebase/firestore";
import { cn } from "@/src/lib/utils";
import { handleFirestoreError, OperationType } from "@/src/lib/error-handler";
import * as docx from "docx";
import { saveAs } from "file-saver";

interface ResultsStatsProps {
  isAdmin?: boolean;
  userId?: string;
}

export default function ResultsStats({ isAdmin, userId }: ResultsStatsProps) {
  const [results, setResults] = useState<any[]>([]);
  const [usersInfo, setUsersInfo] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "official" | "trial">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (isAdmin) {
        try {
          const snapshot = await getDocs(collection(db, "users"));
          const info: Record<string, any> = {};
          snapshot.docs.forEach(doc => {
            info[doc.id] = doc.data();
          });
          setUsersInfo(info);
        } catch (e) {
          console.error("Error fetching users for units:", e);
        }
      }
    };
    fetchUsers();

    let q;
    if (isAdmin) {
      q = query(
        collection(db, "quizResults"),
        orderBy("finishedAt", "desc"),
        limit(200)
      );
    } else {
      q = query(
        collection(db, "quizResults"),
        where("userId", "==", userId),
        orderBy("finishedAt", "desc"),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResults(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data({ serverTimestamps: 'estimate' }) 
      })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "quizResults");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, userId]);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 5000);
      return;
    }

    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteDoc(doc(db, "quizResults", id));
      alert("Đã xóa kết quả thành công!");
    } catch (e: any) {
      alert("Lỗi khi xóa kết quả: " + (e.message || "Lỗi quyền truy cập."));
      try { handleFirestoreError(e, OperationType.DELETE, "quizResults"); } catch (err) {}
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportWord = async () => {
    alert("Đang tạo báo cáo Word...");
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType } = docx;

    const exportResults = results.filter(res => {
        const matchesFilter = filter === "all" || res.type === filter;
        const matchesSearch = !searchQuery || (res.id.toLowerCase().includes(searchQuery.toLowerCase()) || (res.userName?.toLowerCase().includes(searchQuery.toLowerCase())));
        return matchesFilter && matchesSearch;
    });

    const exportGroupedUnits = exportResults.reduce((acc, res) => {
        const userUnit = (usersInfo[res.userId]?.unit) || "Chưa phân đơn vị";
        if (!acc[userUnit]) acc[userUnit] = [];
        acc[userUnit].push(res);
        return acc;
    }, {} as Record<string, any[]>);

    const docItems: any[] = [
      new Paragraph({
          children: [
              new TextRun({ text: "BÁO CÁO KẾT QUẢ THI", bold: true, size: 32 })
          ],
          alignment: docx.AlignmentType.CENTER,
          spacing: { after: 400 }
      })
    ];

    Object.entries(exportGroupedUnits).forEach(([unit, items]: [string, any[]]) => {
      docItems.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Đơn vị: ${unit}`, bold: true, size: 28 })
          ],
          spacing: { before: 400, after: 200 }
        })
      );

      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STT", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Quân nhân", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Phân loại", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Điểm số", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ngày thi", bold: true })] })] })
          ]
        })
      ];

      items.forEach((item, index) => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(String(index + 1))] }),
              new TableCell({ children: [new Paragraph(item.userName || "N/A")] }),
              new TableCell({ children: [new Paragraph(item.type === 'official' ? "Chính thức" : "Ôn tập")] }),
              new TableCell({ children: [new Paragraph(`${item.score}%`)] }),
              new TableCell({ children: [new Paragraph(item.finishedAt?.toDate ? item.finishedAt.toDate().toLocaleDateString('vi-VN') : "N/A")] })
            ]
          })
        );
      });

      docItems.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        })
      );
    });

    const outputDoc = new Document({
      sections: [{
        properties: {},
        children: docItems,
      }]
    });

    Packer.toBlob(outputDoc).then((blob) => {
      saveAs(blob, "Bao_Cao_Sức_Khỏe_Kết_Quả.docx");
    });
  };

  const filteredResults = results.filter(res => {
    const matchesFilter = filter === "all" || res.type === filter;
    const matchesSearch = !searchQuery || (res.id.toLowerCase().includes(searchQuery.toLowerCase()) || (res.userName?.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesFilter && matchesSearch;
  });

  const groupedByUnit = filteredResults.reduce((acc, res) => {
    const userUnit = isAdmin ? ((usersInfo[res.userId] && usersInfo[res.userId].unit) || "Chưa phân đơn vị") : "Lịch sử của tôi";
    if (!acc[userUnit]) acc[userUnit] = [];
    acc[userUnit].push(res);
    return acc;
  }, {} as Record<string, any[]>);

  // Quick stats values
  const totalUsers = Object.keys(usersInfo).length || filteredResults.length;
  const passedResults = filteredResults.filter(r => r.score >= 50);
  const avgScore = filteredResults.length ? (filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length).toFixed(1) : "0";
  const passRate = filteredResults.length ? ((passedResults.length / filteredResults.length) * 100).toFixed(1) + "%" : "0%";

  return (
    <div className="space-y-6 pb-12">
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Tổng quân nhân", value: totalUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Số giờ học TB", value: "4.2h", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Tỷ lệ Đạt thi", value: passRate, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
            { label: "Điểm TB đơn vị", value: avgScore, icon: Award, color: "text-red-700", bg: "bg-red-50" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-slate-800">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Thống kê KẾT QUẢ THI</h3>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {isAdmin ? "Danh sách tổng hợp và xếp loại toàn quân" : "Lịch sử ôn tập và thi chính thức của đồng chí"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <button 
              onClick={() => setFilter("all")}
              className={cn("px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all", filter === 'all' ? "bg-red-600 text-white shadow-lg shadow-red-100" : "text-slate-400 hover:text-slate-600")}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setFilter("official")}
              className={cn("px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all", filter === 'official' ? "bg-red-600 text-white shadow-lg shadow-red-100" : "text-slate-400 hover:text-slate-600")}
            >
              Chính thức
            </button>
            <button 
              onClick={() => setFilter("trial")}
              className={cn("px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all", filter === 'trial' ? "bg-red-600 text-white shadow-lg shadow-red-100" : "text-slate-400 hover:text-slate-600")}
            >
              Thi thử
            </button>
          </div>
          {isAdmin && (
            <button onClick={handleExportWord} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white border border-blue-700 rounded-xl hover:bg-blue-700 shadow-sm transition-all font-bold text-[10px] uppercase">
              <FileDown className="w-4 h-4" /> Xuất báo cáo
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="relative group max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm kiếm mã hoặc tên quân nhân..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-red-50 transition-all uppercase"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden py-20 text-center">
          <div className="max-w-xs mx-auto space-y-3">
            <Target className="w-12 h-12 text-slate-200 mx-auto" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Chưa có kết quả thi nào</p>
          </div>
        </div>
      ) : (
        Object.entries(groupedByUnit).map(([unit, unitResults]: [string, any[]]) => (
          <div key={unit} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <span className="w-3 h-3 bg-red-600 rounded-sm rotate-45 flex-shrink-0"></span>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{unit}</h4>
              <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-200 px-2 py-1 rounded-md">
                {unitResults.length} Kết quả
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <th className="px-6 py-5">Phân loại</th>
                    <th className="px-6 py-5">Quân nhân</th>
                    <th className="px-6 py-5 text-center">Tỷ lệ đúng</th>
                    <th className="px-6 py-5 text-center">Thời gian thi</th>
                    <th className="px-6 py-5 text-right">Ngày thi</th>
                    {isAdmin && <th className="px-6 py-5 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {unitResults.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border",
                            res.type === 'official' ? "bg-red-50 border-red-100 text-red-600" : "bg-blue-50 border-blue-100 text-blue-600"
                          )}>
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">
                              {res.examTypeLabel || (res.type === 'official' ? "Thi chính thức" : "Thi thử / Ôn tập")}
                            </p>
                            <span className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                              res.score >= 80 ? "bg-green-100 text-green-700" : 
                              res.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                            )}>
                              {res.score >= 80 ? "Xuất sắc" : res.score >= 50 ? "Đạt" : "Không đạt"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-xs font-bold text-slate-600 uppercase">
                            {isAdmin ? (res.userName || "Mã: " + res.userId?.substring(0, 8)) : "Tài khoản của tôi"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-slate-800">{res.score}%</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{res.correctCount}/{res.totalCount} câu</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          {Math.floor(res.duration / 60)}:{String(res.duration % 60).padStart(2, '0')}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end">
                          <p className="text-xs font-bold text-slate-700">{res.finishedAt?.toDate ? res.finishedAt.toDate().toLocaleDateString('vi-VN') : "Hôm nay"}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{res.finishedAt?.toDate ? res.finishedAt.toDate().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "Mới đây"}</p>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-5 text-right">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(res.id);
                            }}
                            disabled={deletingId === res.id}
                            className={cn(
                              "p-2 rounded-xl transition-all relative z-30 cursor-pointer flex items-center justify-center min-w-[44px] overflow-hidden",
                              deletingId === res.id ? "text-red-700 bg-red-100 border-red-200 animate-pulse" : 
                              confirmDeleteId === res.id ? "bg-red-600 text-white border-red-600 animate-[bounce_1s_infinite] scale-105 shadow-lg shadow-red-200" :
                              "text-slate-300 hover:text-red-600 hover:bg-red-50"
                            )}
                            title={confirmDeleteId === res.id ? "Ấn lần nữa để xác nhận xóa" : "Xóa kết quả"}
                          >
                            {deletingId === res.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : confirmDeleteId === res.id ? (
                              <span className="text-[10px] font-bold uppercase px-2 whitespace-nowrap">Xác nhận</span>
                            ) : (
                              <Trash2 className="w-4 h-4 pointer-events-none" />
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
