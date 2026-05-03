import { NAV_ITEMS } from "@/src/lib/navigation";
import { cn } from "@/src/lib/utils";
import { FileText, MoreVertical, ExternalLink, Edit2, Trash2, Plus, X, Loader2 } from "lucide-react";
import { Button } from "./Button";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import React, { useState } from "react";

interface Item {
  id: string;
  title: string;
  name?: string;
  category?: string;
  type?: string;
  createdAt?: any;
  status?: string;
  issuer?: string;
  issuedDate?: string;
  content?: string;
}

interface UniversalTableProps {
  activeTab: string;
  items: Item[];
  searchQuery?: string;
  loading: boolean;
  isAdmin?: boolean;
  onAddClick?: () => void;
  onEdit?: (item: Item) => void;
}

export function UniversalTable({ activeTab, items: itemsProp, searchQuery, loading, isAdmin, onAddClick, onEdit }: UniversalTableProps) {
  const [viewingDoc, setViewingDoc] = useState<Item | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const currentModuleLabel = NAV_ITEMS.find(i => i.id === activeTab)?.label;

  const items = itemsProp.filter(item => 
    !searchQuery || 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const activeItem = NAV_ITEMS.find(i => i.id === activeTab);
    const collectionName = activeItem?.collection;
    
    if (!collectionName) {
      console.error("Không tìm thấy collection cho tab:", activeTab);
      alert("Lỗi hệ thống: Không xác định được danh mục xóa.");
      return;
    }

    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 5000);
      return;
    }

    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteDoc(doc(db, collectionName, id));
      alert("Đã xóa dữ liệu thành công!");
    } catch (error: any) {
      console.error("Lỗi khi xóa:", error);
      alert(`Lỗi: Không thể xóa dữ liệu (${error.message})`);
    } finally {
      setDeletingId(null);
    }
  };
 
  return (
    <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <h2 className="font-black text-slate-800 flex items-center uppercase tracking-tight text-base">
            <span className="w-3 h-3 bg-red-600 rounded-sm mr-3 rotate-45"></span>
            {currentModuleLabel} ({items.length})
          </h2>
          {isAdmin && (activeTab === "news" || activeTab === "resolutions" || activeTab === "library" || activeTab === "notifications") && (
            <Button 
              onClick={onAddClick}
              size="sm"
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest px-4 h-9 shadow-lg shadow-red-200 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm tài liệu
            </Button>
          )}
        </div>
        <div className="flex space-x-2">
          {isAdmin && (
            <button 
              onClick={() => {
                const tableHtml = `
                  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
                  <head><meta charset="utf-8"><title>Báo cáo</title></head><body>
                  <h2>Báo cáo danh sách - ${currentModuleLabel}</h2>
                  <table border="1" style="width:100%; border-collapse:collapse;">
                    <thead>
                      <tr>
                        <th>${activeTab === 'library' ? 'Tên sách / Tài liệu' : 'Tên nội dung / Sự kiện'}</th>
                        <th>${activeTab === 'resolutions' || activeTab === 'library' ? 'Cấp ban hành / Nguồn' : 'Phân loại'}</th>
                        <th>${activeTab === 'library' ? 'Ngày xuất bản' : 'Cập nhật'}</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items.map(item => `
                        <tr>
                          <td>${item.title || ''}</td>
                          <td>${item.issuer || item.category || item.type || ''}</td>
                          <td>${activeTab === 'library' ? (item.issuedDate || 'Không rõ') : activeTab === 'resolutions' ? (item.issuedDate || 'Không rõ') : (item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('vi-VN') : '')}</td>
                          <td>${item.status || ''}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  </body></html>
                `;
                const blob = new Blob(['\ufeff', tableHtml], {
                  type: 'application/msword'
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Bao_cao_${activeTab}_${new Date().getTime()}.doc`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-4 py-1.5 bg-red-700 text-white text-[10px] font-bold rounded-full shadow-md hover:brightness-110 active:scale-95 transition-all uppercase"
            >
              Xuất báo cáo
            </button>
          )}
        </div>
      </div>
      
      <div className="overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-50 z-10">
            <tr className="text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
              <th className="px-6 py-4">{activeTab === 'library' ? 'Tên sách / Tài liệu' : 'Tên nội dung / Sự kiện'}</th>
              <th className="px-6 py-4">{activeTab === 'resolutions' || activeTab === 'library' ? 'Cấp ban hành / Nguồn' : 'Phân loại'}</th>
              <th className="px-6 py-4">{activeTab === 'library' ? 'Ngày xuất bản' : 'Cập nhật'}</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-5 h-20"><div className="w-full h-full bg-slate-100 rounded-xl" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-20 text-center">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Không có dữ liệu trong mục này</p>
              </td></tr>
            ) : activeTab === 'notifications' ? (
              Object.entries(
                items.reduce((acc, item) => {
                  const group = item.category || "Chưa phân loại";
                  if (!acc[group]) acc[group] = [];
                  acc[group].push(item);
                  return acc;
                }, {} as Record<string, Item[]>)
              ).map(([groupName, groupItems]) => (
                <React.Fragment key={groupName}>
                  <tr className="bg-slate-50/80 border-b border-t border-slate-100 first:border-t-0">
                    <td colSpan={5} className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-200"></span>
                        <span className="text-[11px] font-black uppercase text-slate-700 tracking-tight">
                          {groupName} có {groupItems.length < 10 ? '0' + groupItems.length : groupItems.length} tin
                        </span>
                      </div>
                    </td>
                  </tr>
                  {groupItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{item.title}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tight font-medium">Hệ thống học tập chính trị</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-tight bg-red-50 text-red-700">
                          {item.category || "Tổng hợp"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('vi-VN') : "02/05/2026"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter shadow-sm",
                          item.status === "Quan trọng" || item.status === "Mở" 
                            ? "bg-red-600 text-white shadow-red-100" 
                            : "bg-slate-100 text-slate-400"
                        )}>
                          {item.status || "MỚI"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                          {item.content && (
                            <button 
                              onClick={() => {
                                if (item.content?.startsWith('http')) {
                                  window.open(item.content, '_blank');
                                } else if (item.content?.startsWith('data:')) {
                                  const a = document.createElement('a');
                                  a.href = item.content;
                                  let ext = 'pdf';
                                  const mimeMatch = item.content.match(/data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-.]+)/);
                                  if (mimeMatch) {
                                    const mime = mimeMatch[1];
                                    if (mime.includes('wordprocessingml')) ext = 'docx';
                                    else if (mime.includes('msword')) ext = 'doc';
                                    else if (mime.includes('spreadsheetml')) ext = 'xlsx';
                                    else if (mime.includes('excel')) ext = 'xls';
                                    else if (mime.includes('jpeg')) ext = 'jpg';
                                    else if (mime.includes('png')) ext = 'png';
                                  }
                                  a.download = `${item.title}.${ext}`;
                                  a.click();
                                } else {
                                  setViewingDoc(item);
                                }
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Xem nội dung"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <div className="flex gap-1">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onEdit?.(item);
                                }}
                                disabled={deletingId === item.id}
                                className="relative z-30 p-2 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-100 rounded-xl transition-all cursor-pointer"
                                title="Chỉnh sửa thông tin"
                              >
                                <Edit2 className="w-4 h-4 pointer-events-none" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(item.id);
                                }}
                                disabled={deletingId === item.id}
                                className={cn(
                                  "relative z-30 p-2 transition-all border rounded-xl cursor-pointer flex items-center gap-1 overflow-hidden min-w-[40px] justify-center",
                                  deletingId === item.id 
                                    ? "text-red-700 bg-red-100 border-red-200 animate-pulse" 
                                    : confirmDeleteId === item.id
                                    ? "bg-red-600 text-white border-red-600 animate-[bounce_1s_infinite] scale-105 shadow-lg shadow-red-200"
                                    : "text-red-500 bg-red-50 hover:bg-red-600 hover:text-white border-red-100"
                                )}
                                title={confirmDeleteId === item.id ? "Ấn lần nữa để xác nhận xóa" : "Xóa"}
                              >
                                {deletingId === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : confirmDeleteId === item.id ? (
                                  <span className="text-[10px] font-bold uppercase px-1 whitespace-nowrap">Xác nhận</span>
                                ) : (
                                  <Trash2 className="w-4 h-4 pointer-events-none" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            ) : items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-800">{item.title}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tight font-medium">
                    {activeTab === 'library' ? `Ngày xuất bản: ${item.issuedDate || 'Không rõ'}` : activeTab === 'resolutions' ? `Thời gian ban hành: ${item.issuedDate || 'Không rõ'}` : 'Hệ thống học tập chính trị'}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-tight",
                    activeTab === 'resolutions' || activeTab === 'library' ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-700"
                  )}>
                    {item.issuer || item.category || item.type || "Tổng hợp"}
                  </span>
                </td>
                <td className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                  {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('vi-VN') : "02/05/2026"}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={cn(
                    "text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter shadow-sm",
                    item.status === "Quan trọng" || item.status === "Mở" 
                      ? "bg-red-600 text-white shadow-red-100" 
                      : "bg-slate-100 text-slate-400"
                  )}>
                    {item.status || "MỚI"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                    {item.content && (
                      <button 
                        onClick={() => {
                          if (item.content?.startsWith('http')) {
                            window.open(item.content, '_blank');
                          } else if (item.content?.startsWith('data:')) {
                            const a = document.createElement('a');
                            a.href = item.content;
                            let ext = 'pdf';
                            const mimeMatch = item.content.match(/data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-.]+)/);
                            if (mimeMatch) {
                              const mime = mimeMatch[1];
                              if (mime.includes('wordprocessingml')) ext = 'docx';
                              else if (mime.includes('msword')) ext = 'doc';
                              else if (mime.includes('spreadsheetml')) ext = 'xlsx';
                              else if (mime.includes('excel')) ext = 'xls';
                              else if (mime.includes('jpeg')) ext = 'jpg';
                              else if (mime.includes('png')) ext = 'png';
                            }
                            a.download = `${item.title}.${ext}`;
                            a.click();
                          } else {
                            setViewingDoc(item);
                          }
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Xem nội dung"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onEdit?.(item);
                              }}
                              disabled={deletingId === item.id}
                              className="relative z-30 p-2 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-100 rounded-xl transition-all cursor-pointer"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit2 className="w-4 h-4 pointer-events-none" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(item.id);
                              }}
                              disabled={deletingId === item.id}
                              className={cn(
                                "relative z-30 p-2 transition-all border rounded-xl cursor-pointer flex items-center gap-1 overflow-hidden min-w-[40px] justify-center",
                                deletingId === item.id 
                                  ? "text-red-700 bg-red-100 border-red-200 animate-pulse" 
                                  : confirmDeleteId === item.id
                                  ? "bg-red-600 text-white border-red-600 animate-[bounce_1s_infinite] scale-105 shadow-lg shadow-red-200"
                                  : "text-red-500 bg-red-50 hover:bg-red-600 hover:text-white border-red-100"
                              )}
                              title={confirmDeleteId === item.id ? "Ấn lần nữa để xác nhận xóa" : "Xóa"}
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : confirmDeleteId === item.id ? (
                                <span className="text-[10px] font-bold uppercase px-1 whitespace-nowrap">Xác nhận xóa</span>
                              ) : (
                                <Trash2 className="w-4 h-4 pointer-events-none" />
                              )}
                            </button>
                          </div>
                        )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewingDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative border border-slate-100">
            <button 
              onClick={() => setViewingDoc(null)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
            <h3 className="text-xl font-black text-slate-800 mb-6 uppercase border-b border-red-100 pb-4 pr-12">{viewingDoc.title}</h3>
            <div className="prose prose-slate max-w-none">
              <p className="whitespace-pre-wrap text-slate-600 font-medium leading-relaxed">
                {viewingDoc.content}
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setViewingDoc(null)} size="sm" className="rounded-xl px-8 h-10 font-bold uppercase">Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
