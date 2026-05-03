import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, FileText, Send, Link as LinkIcon, Calendar, Info, Shield, Loader2, UploadCloud } from "lucide-react";
import { Button } from "./Button";
import { db } from "@/src/lib/firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/src/lib/error-handler";

interface DocumentFormProps {
  type: "news" | "resolutions" | "library" | "notifications";
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DocumentForm({ type, initialData, onClose, onSuccess }: DocumentFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Common fields
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [status, setStatus] = useState(initialData?.status || "Đóng");
  
  // News specific
  const [category, setCategory] = useState(initialData?.category || "Tin quân đội");
  
  // Notification specific
  const [week, setWeek] = useState(initialData?.week || "1");
  const [month, setMonth] = useState(initialData?.month || String(new Date().getMonth() + 1));
  const [year, setYear] = useState(initialData?.year || String(new Date().getFullYear()));
  
  // Resolution specific
  const [issuer, setIssuer] = useState(initialData?.issuer || "");
  const [issuedDate, setIssuedDate] = useState(initialData?.issuedDate || "");
  const [fileAttached, setFileAttached] = useState<{name: string, size: number} | null>(
    initialData?.content?.startsWith('data:') ? { name: initialData.title + " (Tệp đính kèm)", size: 0 } : null
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("File quá lớn. Vui lòng chọn file dưới 800KB. Với file lớn hơn, hãy dùng link Google Drive/OneDrive.");
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setContent(event.target.result as string);
        setFileAttached({ name: file.name, size: file.size });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setContent("");
    setFileAttached(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const collectionPath = type === "news" ? "news" : type === "resolutions" ? "resolutions" : type === "notifications" ? "notifications" : "library";
      const data: any = {
        title,
        content,
        status,
        updatedAt: serverTimestamp(),
      };

      if (!initialData) {
        data.createdAt = serverTimestamp();
      }

      if (type === "news") {
        data.category = category;
      } else if (type === "notifications") {
        data.week = week;
        data.month = month;
        data.year = year;
        data.category = `Tuần ${week} tháng ${month}/${year}`;
      } else {
        data.issuer = issuer;
        data.issuedDate = issuedDate;
      }

      if (initialData?.id) {
        await updateDoc(doc(db, collectionPath, initialData.id), data);
      } else {
        await addDoc(collection(db, collectionPath), data);
      }
      alert("Đã lưu tài liệu thành công!");
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, initialData ? OperationType.UPDATE : OperationType.CREATE, type);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[2.5rem] p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] border border-slate-100 mb-10 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-[100%] -mr-16 -mt-16 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-200">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
              {type === "news" ? "Thêm Tin tức Chính trị" : type === "resolutions" ? "Thêm Học tập Nghị quyết" : type === "notifications" ? "Thêm Thông báo chính trị nội bộ" : "Thêm Tài liệu"}
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Cập nhật tài liệu vào cơ sở dữ liệu hệ thống</p>
          </div>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8 relative z-10">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
              {type === "news" || type === "notifications" ? "Tên nội dung / Sự kiện" : type === "resolutions" ? "Tên nghị quyết" : "Tên sách / Tài liệu"}
            </label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề..."
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all font-bold text-slate-700"
              required
            />
          </div>

          {type === "news" ? (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phân loại</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
              >
                <option>Tin quân đội</option>
                <option>Tin đơn vị</option>
                <option>Tin trong nước</option>
                <option>Tin quốc tế</option>
              </select>
            </div>
          ) : type === "notifications" ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tuần</label>
                <select 
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-4 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                >
                  <option value="1">Tuần 1</option>
                  <option value="2">Tuần 2</option>
                  <option value="3">Tuần 3</option>
                  <option value="4">Tuần 4</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tháng</label>
                <select 
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-4 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={String(i+1)}>Tháng {i+1}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Năm</label>
                <select 
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-4 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  {type === "library" ? "Nguồn / Nhà xuất bản" : "Cấp ban hành"}
                </label>
                <input 
                  type="text" 
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder={type === "library" ? "Ví dụ: NXB Quân đội" : "Ví dụ: Tổng cục Chính trị"}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all font-bold text-slate-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  {type === "library" ? "Ngày xuất bản" : "Thời gian ban hành"}
                </label>
                <input 
                  type="date" 
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all font-bold text-slate-700"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Trạng thái</label>
            <div className="flex gap-4">
              {["Mở", "Đóng"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-tighter transition-all border-2",
                    status === s 
                      ? "bg-red-600 border-red-600 text-white shadow-lg" 
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-2 pb-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <LinkIcon className="w-3 h-3" /> Đường dẫn tài liệu / Nội dung (Word/PDF/Link)
              </label>
              <label className="cursor-pointer group flex items-center gap-1.5 bg-white border-2 border-dashed border-red-200 text-red-600 hover:border-red-500 hover:bg-red-50 px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all shadow-sm">
                <UploadCloud className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                <span>Tải tệp lên</span>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" onChange={handleFileUpload} />
              </label>
            </div>
            {fileAttached ? (
              <div className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-6 flex flex-col items-center justify-center h-[215px]">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 text-red-600">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="font-bold text-slate-700 text-center max-w-[80%] truncate">{fileAttached.name}</p>
                {fileAttached.size > 0 && <p className="text-xs text-slate-400 mt-1">{(fileAttached.size / 1024).toFixed(1)} KB</p>}
                <button type="button" onClick={removeFile} className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-red-500 hover:border-red-200 transition-all">
                  Hủy file đính kèm
                </button>
              </div>
            ) : (
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Dán link tài liệu hoặc nhập nội dung phổ biến tại đây..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-4 px-5 focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all font-bold text-slate-700 h-[215px] resize-none"
                required
              />
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 h-16 rounded-2xl bg-red-800 hover:bg-red-900 text-white font-black uppercase tracking-widest shadow-2xl shadow-red-200 group"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Xác nhận lưu
                </span>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={onClose}
              className="h-16 w-32 rounded-2xl border-2 border-slate-100 font-black uppercase text-xs text-slate-400"
            >
              Hủy
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-8 bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[11px] text-blue-900 font-bold uppercase tracking-widest">Hỗ trợ lưu trữ</p>
          <p className="text-xs text-blue-700 font-medium leading-relaxed mt-1">
            Hiện tại hệ thống hỗ trợ lưu trữ thông qua liên kết (Link). Admin có thể tải tệp lên Google Drive/OneDrive sau đó dán liên kết vào ô nội dung để quân nhân có thể xem và tải về.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
