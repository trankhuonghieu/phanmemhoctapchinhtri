import React, { useState, useEffect, useRef } from "react";
import { 
  Megaphone, 
  Upload, 
  Mic, 
  Volume2, 
  Calendar, 
  FileText, 
  Play, 
  Pause, 
  Trash2,
  CheckCircle,
  Clock,
  Loader2,
  Save,
  Music,
  StopCircle,
  X,
  Pencil
} from "lucide-react";
import { Button } from "@/src/components/Button";
import { cn } from "@/src/lib/utils";
import { db, storage } from "@/src/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { handleFirestoreError, OperationType } from "@/src/lib/error-handler";
import mammoth from "mammoth";

interface PropagandaProps {
  user: any;
  profile: any;
  searchQuery?: string;
}

export default function Propaganda({ user, profile, searchQuery }: PropagandaProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  
  const filteredBroadcasts = broadcasts.filter(b => 
    !searchQuery || 
    b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // New broadcast form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [voiceType, setVoiceType] = useState("vi-VN-Standard-A");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playingBroadcastId, setPlayingBroadcastId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleGlobalPause = (pause: boolean) => {
    setIsPaused(pause);
  };
  const [viewingContent, setViewingContent] = useState<{title: string, content: string} | null>(null);
  const [availableBrowserVoices, setAvailableBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingGlobal, setIsDeletingGlobal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedAudioName, setSelectedAudioName] = useState<string | null>(null);
  const [newRecordingName, setNewRecordingName] = useState("");
  const [showSaveRecording, setShowSaveRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [currentSourceFileName, setCurrentSourceFileName] = useState("");
  const [editingBroadcast, setEditingBroadcast] = useState<any | null>(null);

  // Audio Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioLibrary, setAudioLibrary] = useState<any[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const recordingInterval = useRef<any>(null);

  useEffect(() => {
    // Load Audio Library
    // Note: We avoid server-side orderBy if there's any chance files lack the field initially
    const q = query(collection(db, "audio_library"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      // Client-side sort to be resilient
      docs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || Date.now();
        const timeB = b.createdAt?.toMillis?.() || Date.now();
        return timeB - timeA;
      });
      setAudioLibrary(docs);
    });
    return () => unsubscribe();
  }, []);

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Trình duyệt của bạn không hỗ trợ thu âm hoặc đã bị chặn quyền truy cập microphone.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording failed:", err);
      alert("Không thể truy cập microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingInterval.current) clearInterval(recordingInterval.current);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert("Vui lòng chọn file âm thanh.");
      return;
    }

    setUploadingAudio(true);
    try {
      const storageRef = ref(storage, `recordings/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      await addDoc(collection(db, "audio_library"), {
        name: file.name,
        url: url,
        type: file.type,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      alert("Tải lên bản thu âm thành công!");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Lỗi khi tải lên file âm thanh.");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isDocx = file.name.toLowerCase().endsWith('.docx');
    const isTxt = file.name.toLowerCase().endsWith('.txt');

    if (!isDocx && !isTxt) {
      alert("Chỉ hỗ trợ định dạng .docx hoặc .txt");
      return;
    }

    setIsExtractingText(true);
    try {
      if (isTxt) {
        const text = await file.text();
        setContent(text);
        setCurrentSourceFileName(file.name);
      } else if (isDocx) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setContent(result.value);
        setCurrentSourceFileName(file.name);
      }
      alert(`Đã trích xuất văn bản từ file: ${file.name}`);
    } catch (err) {
      console.error("Text extraction failed:", err);
      alert("Lỗi khi trích xuất văn bản từ tài liệu.");
    } finally {
      setIsExtractingText(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const saveRecordingToLibrary = async () => {
    if (!audioBlob || !newRecordingName.trim()) {
      alert("Vui lòng nhập tên bản thu âm.");
      return;
    }

    setUploadingAudio(true);
    try {
      // Use simpler uploadBytes for faster execution on small blobs
      const storageRef = ref(storage, `recordings/${Date.now()}.webm`);
      const uploadResult = await uploadBytes(storageRef, audioBlob);
      const url = await getDownloadURL(uploadResult.ref);

      await addDoc(collection(db, "audio_library"), {
        name: newRecordingName.trim(),
        url: url,
        type: 'audio/webm',
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      
      // Auto-select for current broadcast
      setContent(url);
      setSelectedAudioName(newRecordingName.trim());
      setCurrentSourceFileName(newRecordingName.trim());
      setVoiceType('recorded');
      
      setAudioBlob(null);
      setAudioUrl(null);
      setNewRecordingName("");
      setShowSaveRecording(false);
      alert("Đã lưu và chọn bản thu thành công!");
    } catch (err: any) {
      console.error("Save system error:", err);
      alert("Lỗi hệ thống: " + err.message);
    } finally {
      setUploadingAudio(false);
    }
  };

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const viVoices = voices.filter(v => v.lang.includes('vi'));
      setAvailableBrowserVoices(viVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const voices = [
    { id: "vi-VN-Standard-A", label: "Nam Miền Bắc", icon: Volume2, gender: 'male' },
    { id: "vi-VN-Standard-B", label: "Nữ Miền Bắc", icon: Mic, gender: 'female' },
    { id: "vi-VN-Standard-C", label: "Nam Miền Nam", icon: Volume2, gender: 'male' },
    { id: "vi-VN-Standard-D", label: "Nữ Miền Nam", icon: Mic, gender: 'female' },
    { id: "recorded", label: "Bản thu âm", icon: Play, gender: 'any' },
  ];

  const getBestVoiceForPreference = (type: string) => {
    const viVoices = window.speechSynthesis.getVoices().filter(v => v.lang.includes('vi'));
    if (viVoices.length === 0) return null;

    const isFemale = type.includes('-B') || type.includes('-D');
    
    // Look for gender hints in common browser voice names
    const genderKeywords = isFemale ? ['female', 'nữ', 'hoaimy', 'an', 'huyen', 'linh'] : ['male', 'nam', 'namminh', 'man'];
    
    const matched = viVoices.find(v => 
      genderKeywords.some(keyword => v.name.toLowerCase().includes(keyword))
    );

    return matched || viVoices[0];
  };

  useEffect(() => {
    // Fetch all broadcasts and sort on client to avoid index issues or missing field filtering
    const q = query(
      collection(db, "broadcasts"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsArr = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) as any }));
      
      // Sort: Priority to showing most recently created OR nearest scheduled
      const sorted = docsArr.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || new Date(a.scheduledAt || 0).getTime();
        const timeB = b.createdAt?.toMillis?.() || new Date(b.scheduledAt || 0).getTime();
        return timeB - timeA;
      });
      
      setBroadcasts(sorted);
      setLoading(false);
    }, (error) => {
      console.error("Broadcast fetch error:", error);
      handleFirestoreError(error, OperationType.LIST, "broadcasts");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePreview = () => {
    if (!content) {
      alert("Vui lòng nhập nội dung để nghe thử!");
      return;
    }

    if (voiceType === "recorded") {
      if (content && content.startsWith('http')) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsPaused(true);
          return;
        } else if (audioRef.current && audioRef.current.paused && audioRef.current.src === content) {
          audioRef.current.play();
          setIsPaused(false);
          return;
        }

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const audio = new Audio(content);
        audioRef.current = audio;
        audio.onplay = () => {
          setIsPreviewing(true);
          setIsPaused(false);
        };
        audio.onpause = () => setIsPaused(true);
        audio.onended = () => {
          setIsPreviewing(false);
          setIsPaused(false);
          audioRef.current = null;
        };
        audio.play().catch(e => console.error("Preview audio failed:", e));
        return;
      }
      alert("Chế độ bản thu âm yêu cầu tải lên file audio thực tế.");
      return;
    }

    if (window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    try {
      window.speechSynthesis.cancel();
      setIsPaused(false);
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = 'vi-VN';
      utterance.rate = rate;
      utterance.pitch = pitch;
      
      const preferredVoice = getBestVoiceForPreference(voiceType);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsPreviewing(true);
      utterance.onend = () => {
        setIsPreviewing(false);
        setIsPaused(false);
      };
      utterance.onerror = (e) => {
        console.error("Speech error:", e);
        setIsPreviewing(false);
        setIsPaused(false);
        if (e.error === 'not-allowed') {
          alert("Trình duyệt chặn phát âm thanh tự động. Vui lòng tương tác với trang web trước.");
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speech synthesis failed:", err);
      alert("Không thể khởi tạo giọng nói trên trình duyệt này.");
    }
  };

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    console.log("Form submission for broadcast starts...");

    if (!title || !scheduledAt) {
      alert("Vui lòng điền tiêu đề và thời gian.");
      return;
    }

    if (voiceType !== 'recorded' && !content) {
      alert("Vui lòng nhập nội dung văn bản.");
      return;
    }

    if (voiceType === 'recorded' && !content) {
      alert("Vui lòng thu âm hoặc chọn một bản thu từ thư viện.");
      return;
    }

    setIsSubmitting(true);
    console.log("Preparing broadcast body, voiceType:", voiceType);
    
    // For recorded audio, the content is actually the URL.
    // However, to keep it clean, we store the URL in audioUrl and content as empty.
    const body = {
      title,
      content: voiceType === 'recorded' ? "" : content,
      audioUrl: voiceType === 'recorded' ? content : null,
      voiceType,
      rate,
      pitch,
      scheduledAt: new Date(scheduledAt).toISOString(),
      status: "pending",
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      sourceFileName: currentSourceFileName || (voiceType === 'recorded' ? (selectedAudioName || "Bản thu âm") : "Tai_lieu_AI.txt") 
    };

    console.log("Adding doc to broadcasts collection:", body);

    try {
      const docRef = await addDoc(collection(db, "broadcasts"), body);
      console.log("Broadcast created successfully with ID:", docRef.id);
      setIsAdding(false);
      setTitle("");
      setContent("");
      setScheduledAt("");
      setSelectedAudioName(null);
      setCurrentSourceFileName("");
      setAudioUrl(null);
      setAudioBlob(null);
      alert("Đã lên lịch phát thanh thành công!");
    } catch (e: any) {
      console.error("Error creating broadcast:", e);
      handleFirestoreError(e, OperationType.CREATE, "broadcasts");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 5000);
      return;
    }

    setDeletingId(id);
    setIsDeletingGlobal(true);
    setConfirmDeleteId(null);
    try {
      await deleteDoc(doc(db, "broadcasts", id));
      alert("Đã xóa bài phát thanh thành công!");
    } catch (e: any) {
      console.error("Delete error:", e);
      alert("Lỗi khi xóa bài phát thanh: " + (e.message || "Lỗi quyền truy cập."));
      try { handleFirestoreError(e, OperationType.DELETE, "broadcasts"); } catch (err) {}
    } finally {
      setDeletingId(null);
      setIsDeletingGlobal(false);
    }
  };

  const handleDeleteAudio = async (id: string, name: string) => {
    if (!window.confirm(`Xác nhận xóa bản thu: "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, "audio_library", id));
      alert("Đã xóa bản thu âm thành công!");
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, "audio_library");
    }
  };

  const handleEdit = (broadcast: any) => {
    setIsAdding(true);
    setEditingBroadcast(broadcast);
    setTitle(broadcast.title);
    setContent(broadcast.voiceType === 'recorded' ? broadcast.audioUrl : broadcast.content);
    setScheduledAt(new Date(broadcast.scheduledAt).toISOString().slice(0, 16));
    setVoiceType(broadcast.voiceType);
    setRate(broadcast.rate || 1);
    setPitch(broadcast.pitch || 1);
    setCurrentSourceFileName(broadcast.sourceFileName || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateBroadcast = async () => {
    if (!editingBroadcast) return;
    
    if (!title || !scheduledAt) {
      alert("Vui lòng điền tiêu đề và thời gian.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "broadcasts", editingBroadcast.id), {
        title,
        content: voiceType === 'recorded' ? "" : content,
        audioUrl: voiceType === 'recorded' ? content : null,
        voiceType,
        rate,
        pitch,
        scheduledAt: new Date(scheduledAt).toISOString(),
        updatedAt: serverTimestamp(),
        sourceFileName: currentSourceFileName || editingBroadcast.sourceFileName
      });
      
      alert("Đã cập nhật bài phát thanh thành công!");
      setIsAdding(false);
      setEditingBroadcast(null);
      setTitle("");
      setContent("");
      setScheduledAt("");
      setSelectedAudioName(null);
      setCurrentSourceFileName("");
      setAudioUrl(null);
      setAudioBlob(null);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, "broadcasts");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleListenBroadcast = (broadcast: any) => {
    // If clicking on the same broadcast that is currently playing/paused
    if (playingBroadcastId === broadcast.id) {
      if (broadcast.voiceType === "recorded") {
        if (audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.play();
            toggleGlobalPause(false);
          } else {
            audioRef.current.pause();
            toggleGlobalPause(true);
          }
          return;
        }
      } else {
        if (window.speechSynthesis.speaking) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            toggleGlobalPause(false);
          } else {
            window.speechSynthesis.pause();
            toggleGlobalPause(true);
          }
          return;
        }
      }
    }

    // Stop everything else
    window.speechSynthesis.cancel();
    toggleGlobalPause(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (broadcast.voiceType === "recorded") {
      if (broadcast.audioUrl) {
        const audio = new Audio(broadcast.audioUrl);
        audioRef.current = audio;
        setPlayingBroadcastId(broadcast.id);
        toggleGlobalPause(false);
        
        audio.onended = () => {
          setPlayingBroadcastId(null);
          toggleGlobalPause(false);
        };
        audio.onpause = () => toggleGlobalPause(true);
        audio.onplay = () => toggleGlobalPause(false);
        
        audio.play().catch(e => {
          console.error("Audio play failed:", e);
          alert("Không thể phát bản thu âm này.");
          setPlayingBroadcastId(null);
        });
        return;
      }
      alert("Không tìm thấy link bản thu âm.");
      return;
    }

    if (!broadcast.content) {
      alert("Không tìm thấy nội dung văn bản cho bản tin này.");
      return;
    }

    try {
      setPlayingBroadcastId(broadcast.id);
      const utterance = new SpeechSynthesisUtterance(broadcast.content);
      utterance.lang = 'vi-VN';
      utterance.rate = broadcast.rate || rate;
      utterance.pitch = broadcast.pitch || pitch;
      
      const preferredVoice = getBestVoiceForPreference(broadcast.voiceType);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => setPlayingBroadcastId(null);
      utterance.onerror = () => setPlayingBroadcastId(null);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speech synthesis failed:", err);
      alert("Lỗi khi phát âm thanh.");
      setPlayingBroadcastId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Tuyên truyền tự động</h3>
          <p className="text-slate-500 text-sm font-medium mt-1">Phát thanh nội bộ từ tài liệu văn bản & Trí tuệ nhân tạo</p>
        </div>
        {profile?.role === 'admin' && (
          <Button onClick={() => setIsAdding(!isAdding)} className="rounded-xl shadow-lg">
            {isAdding ? "Hủy bỏ" : "Tạo lịch mới"}
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-red-100 animate-in fade-in slide-in-from-top-4">
          <form onSubmit={editingBroadcast ? (e) => { e.preventDefault(); handleUpdateBroadcast(); } : handleCreateBroadcast} className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  {editingBroadcast ? "Đang chỉnh sửa bài phát thanh" : "Tiêu đề phát thanh"}
                </label>
                {editingBroadcast && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingBroadcast(null);
                      setIsAdding(false);
                      setTitle("");
                      setContent("");
                      setScheduledAt("");
                    }}
                    className="text-[10px] font-black text-red-600 uppercase hover:underline"
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Thông báo tình hình Biển Đông sáng 02/05"
                className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-600 transition-all font-medium"
                required
              />

              {voiceType === 'recorded' ? (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Bản thu âm</label>
                  
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                    <div className="flex justify-center gap-4 mb-4">
                      {!isRecording ? (
                        <Button 
                          type="button" 
                          onClick={startRecording}
                          variant="outline"
                          className="rounded-full w-16 h-16 p-0 border-2 border-red-200 hover:bg-red-50"
                        >
                          <Mic className="w-8 h-8 text-red-600" />
                        </Button>
                      ) : (
                        <Button 
                          type="button" 
                          onClick={stopRecording}
                          className="rounded-full w-16 h-16 p-0 bg-red-600 hover:bg-red-700 animate-pulse"
                        >
                          <StopCircle className="w-8 h-8 text-white" />
                        </Button>
                      )}
                    </div>
                    {isRecording && (
                      <p className="text-red-600 font-bold animate-pulse mb-4 text-sm">
                        Đang thu âm: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                      </p>
                    )}
                    {audioUrl && !isRecording && (
                      <div className="flex flex-col items-center gap-3">
                        <audio src={audioUrl} controls className="w-full max-w-xs h-10" />
                        
                        {!showSaveRecording ? (
                          <div className="flex gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              className="text-[10px] uppercase font-bold bg-green-50 text-green-700 border-green-200"
                              onClick={() => {
                                const now = new Date();
                                const timeStr = `${now.getHours()}h${now.getMinutes()}`;
                                setNewRecordingName(`Bản thu ${now.toLocaleDateString('vi-VN')} ${timeStr}`);
                                setShowSaveRecording(true);
                              }}
                            >
                              <Save className="w-3 h-3 mr-1" /> Lưu vào thư viện
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="text-[10px] uppercase font-bold text-slate-400"
                              onClick={() => { setAudioUrl(null); setAudioBlob(null); }}
                            >
                              Xóa và thử lại
                            </Button>
                          </div>
                        ) : (
                          <div className="w-full max-w-xs space-y-2 animate-in fade-in zoom-in-95">
                            <input 
                              type="text"
                              value={newRecordingName}
                              onChange={(e) => setNewRecordingName(e.target.value)}
                              placeholder="Tên bản thu âm..."
                              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-600 outline-none"
                              autoFocus
                            />
                            {uploadingAudio && (
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden animate-pulse">
                                <div className="bg-green-500 h-full w-1/2 animate-[shimmer_1s_infinite]" />
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                size="sm" 
                                className="flex-1 text-[10px] uppercase font-bold"
                                onClick={saveRecordingToLibrary}
                                disabled={uploadingAudio}
                              >
                                {uploadingAudio ? (
                                  <span className="flex items-center">
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    Đang lưu nhanh...
                                  </span>
                                ) : (
                                  <span className="flex items-center">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Xác nhận lưu
                                  </span>
                                )}
                              </Button>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="text-[10px] uppercase font-bold text-slate-400"
                                onClick={() => setShowSaveRecording(false)}
                                disabled={uploadingAudio}
                              >
                                Hủy
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {!audioUrl && !isRecording && (
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        Nhấn nút Micro để bắt đầu thu âm trực tiếp
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full justify-start rounded-xl font-bold text-xs"
                        onClick={() => setShowLibrary(true)}
                      >
                        <Music className="w-4 h-4 mr-2 text-red-600" />
                        Mở thư viện bản thu ({audioLibrary.length})
                      </Button>
                    </div>
                    <div>
                      <input 
                        type="file" 
                        id="audio-upload" 
                        className="hidden" 
                        accept="audio/*"
                        onChange={handleAudioUpload}
                      />
                      <label 
                        htmlFor="audio-upload"
                        className="cursor-pointer bg-slate-100 hover:bg-slate-200 p-3 rounded-xl block transition-all"
                      >
                        {uploadingAudio ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <Upload className="w-5 h-5 text-slate-600" />}
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nội dung tuyên truyền (Văn bản)</label>
                    <textarea 
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Nhập nội dung văn bản để chuyển đổi sang giọng nói AI..."
                      className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-600 transition-all font-medium h-32 resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Hoặc tải lên tài liệu (.docx, .txt)</label>
                    <input 
                      type="file" 
                      ref={docInputRef}
                      className="hidden" 
                      accept=".docx, .txt"
                      onChange={handleDocUpload}
                    />
                    <div 
                      onClick={() => docInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-red-400 transition-colors cursor-pointer group bg-slate-50",
                        isExtractingText && "opacity-50 cursor-wait bg-slate-100"
                      )}
                    >
                      {isExtractingText ? (
                        <Loader2 className="w-8 h-8 text-red-600 mx-auto mb-2 animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2 group-hover:text-red-500" />
                      )}
                      <p className="text-[10px] font-bold text-slate-500 italic">
                        {isExtractingText ? "Đang trích xuất văn bản..." : "Nhấn để chọn file Word hoặc Text"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                  Chọn Giọng đọc AI ({voices.length} tùy chọn)
                  {voiceType === 'recorded' && content && (
                    <span className="text-[10px] text-green-600 font-bold flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" /> Đã chọn bản thu
                    </span>
                  )}
                </label>
                {availableBrowserVoices.length <= 1 && voiceType !== 'recorded' && (
                  <p className="text-[9px] text-amber-600 mb-2 font-medium leading-tight">
                    * Trình duyệt của bạn chỉ có {availableBrowserVoices.length} giọng tiếng Việt. Các tùy chọn giọng đọc khác nhau có thể nghe giống nhau.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {voices.map(voice => (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => setVoiceType(voice.id)}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all flex items-center gap-3 text-left",
                        voiceType === voice.id 
                          ? "border-red-600 bg-red-50 text-red-700" 
                          : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <voice.icon className={cn("w-5 h-5 shrink-0", voiceType === voice.id ? "text-red-600" : "text-slate-300")} />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-tight block">{voice.label}</span>
                        {voice.id === 'recorded' && selectedAudioName && (
                          <span className="text-[8px] text-red-500 truncate block max-w-[80px] italic">{selectedAudioName}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Lịch phát thanh</label>
                <input 
                  type="datetime-local" 
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-600 transition-all font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-between">
                    Tốc độ đọc <span>{rate}x</span>
                  </label>
                  <input 
                    type="range" min="0.5" max="2" step="0.1"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-between">
                    Cao độ <span>{pitch}</span>
                  </label>
                  <input 
                    type="range" min="0.5" max="2" step="0.1"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-red-600"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  onClick={handlePreview} 
                  variant="outline" 
                  className={cn(
                    "flex-1 h-14 rounded-xl font-bold uppercase border-2 transition-all",
                    isPreviewing && !isPaused ? "border-red-600 bg-red-50 text-red-600" : "border-slate-100"
                  )}
                >
                  {isPreviewing ? (
                    isPaused ? (
                      <><Play className="w-5 h-5 mr-2" /> Tiếp tục</>
                    ) : (
                      <><Pause className="w-5 h-5 mr-2 animate-pulse" /> Tạm dừng</>
                    )
                  ) : (
                    <><Volume2 className="w-5 h-5 mr-2" /> Nghe thử</>
                  )}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-[2] h-14 rounded-xl text-lg font-black shadow-red-200 uppercase">
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (editingBroadcast ? "Cập nhật phát thanh" : "Xác nhận lên lịch phát")}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {viewingContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] relative border border-slate-100">
            <button 
              onClick={() => setViewingContent(null)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
            <h3 className="text-xl font-extrabold text-slate-800 mb-6 uppercase pr-12 leading-tight border-b border-red-100 pb-4">{viewingContent.title}</h3>
            <div className="prose prose-slate max-w-none">
              <p className="whitespace-pre-wrap text-slate-600 font-medium leading-relaxed text-sm">
                {viewingContent.content}
              </p>
            </div>
            <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setViewingContent(null)} className="rounded-xl px-12 h-12 font-bold uppercase shadow-lg shadow-red-100">Đóng lại</Button>
            </div>
          </div>
        </div>
      )}

      {showLibrary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full max-h-[80vh] overflow-y-auto shadow-2xl relative border border-slate-100">
            <button 
              onClick={() => setShowLibrary(false)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
            <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight flex items-center">
              <Music className="w-6 h-6 mr-2 text-red-600" /> Thư viện bản thu âm
            </h3>
            
            <div className="space-y-3">
              {audioLibrary.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thư viện trống</p>
                </div>
              ) : (
                audioLibrary.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-red-200 transition-all group">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-slate-700 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{new Date(item.createdAt?.toMillis()).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                       <Button 
                        size="sm" 
                        variant="ghost" 
                        className="rounded-full w-8 h-8 p-0"
                        onClick={() => {
                          const a = new Audio(item.url);
                          a.play();
                        }}
                      >
                        <Play className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button 
                        size="sm" 
                        className="rounded-xl h-8 text-[10px] font-bold uppercase"
                        onClick={() => {
                          setContent(item.url); // We use the URL as content for recorded type
                          setSelectedAudioName(item.name);
                          setVoiceType('recorded');
                          setShowLibrary(false);
                        }}
                      >
                        Chọn
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="rounded-full w-8 h-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600 border-slate-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAudio(item.id, item.name);
                        }}
                        title="Xóa bản thu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setShowLibrary(false)} className="rounded-xl px-8 font-bold uppercase">Đóng</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white h-48 rounded-3xl animate-pulse border border-slate-100" />
          ))
        ) : broadcasts.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
            <Megaphone className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest">Chưa có lịch phát thanh nào được tạo</p>
          </div>
        ) : filteredBroadcasts.map(broadcast => (
          <div key={broadcast.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                broadcast.status === "playing" ? "bg-red-600 text-white animate-pulse" : "bg-slate-100 text-slate-400"
              )}>
                {broadcast.status === "playing" ? <Volume2 className="w-6 h-6" /> : <Megaphone className="w-6 h-6" />}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-black px-3 py-1 rounded-full uppercase",
                  broadcast.status === "completed" ? "bg-green-100 text-green-700" : 
                  broadcast.status === "playing" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                )}>
                  {broadcast.status === "completed" ? "Đã phát" : broadcast.status === "playing" ? "Đang phát" : "Chờ phát"}
                </span>
                {profile?.role === 'admin' && (
                  <div className="flex items-center gap-1">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEdit(broadcast);
                      }} 
                      className="relative z-30 p-2.5 rounded-full transition-all border shadow-sm text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white border-blue-100 hover:border-blue-600 shadow-blue-100/50 cursor-pointer"
                      title="Chỉnh sửa lịch phát"
                    >
                      <Pencil className="w-4 h-4 pointer-events-none" /> 
                    </button>
                    <button 
                      type="button"
                      disabled={isDeletingGlobal}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(broadcast.id);
                      }} 
                      className={cn(
                        "relative z-30 p-2.5 rounded-full transition-all border shadow-sm cursor-pointer flex items-center justify-center min-w-[44px] overflow-hidden",
                        deletingId === broadcast.id ? "text-red-700 bg-red-100 border-red-300 animate-pulse" : 
                        confirmDeleteId === broadcast.id ? "bg-red-600 text-white border-red-600 animate-[bounce_1s_infinite] scale-105 shadow-lg shadow-red-200" :
                        "text-red-500 bg-red-50 hover:bg-red-600 hover:text-white border-red-100 hover:border-red-600"
                      )}
                      title={confirmDeleteId === broadcast.id ? "Ấn lần nữa để xác nhận xóa" : "Xóa lịch phát thanh"}
                    >
                      {deletingId === broadcast.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : confirmDeleteId === broadcast.id ? (
                        <span className="text-[10px] font-bold uppercase px-2 whitespace-nowrap">Xác nhận xóa</span>
                      ) : (
                        <Trash2 className="w-4 h-4 pointer-events-none" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h4 className="font-black text-slate-800 mb-2 leading-tight h-10 line-clamp-2">{broadcast.title}</h4>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <FileText className="w-3.5 h-3.5" />
                <span>{broadcast.sourceFileName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(broadcast.scheduledAt).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Volume2 className="w-3.5 h-3.5" />
                <span className="uppercase font-bold text-red-600">Giọng: {voices.find(v => v.id === broadcast.voiceType)?.label || 'Mặc định'}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => setViewingContent({ title: broadcast.title, content: broadcast.content })}
                variant="outline" 
                size="sm" 
                className="flex-1 rounded-xl text-[10px]"
              >
                Xem nội dung
              </Button>
              <Button 
                onClick={() => handleListenBroadcast(broadcast)}
                size="sm" 
                className={cn(
                  "flex-1 rounded-xl text-[10px] transition-all",
                  playingBroadcastId === broadcast.id ? "bg-red-600 text-white shadow-lg shadow-red-200" : ""
                )}
              >
                {playingBroadcastId === broadcast.id ? (
                  isPaused ? (
                    <><Play className="w-3.5 h-3.5 mr-1" /> Tiếp tục</>
                  ) : (
                    <><Pause className="w-3.5 h-3.5 mr-1 animate-pulse" /> Tạm dừng</>
                  )
                ) : (
                  <><Play className="w-3.5 h-3.5 mr-1" /> Nghe thử</>
                )}
              </Button>
            </div>
            
            {/* Progress bar if playing */}
            {broadcast.status === "playing" && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-red-100">
                <div className="h-full bg-red-600 animate-[progress_10s_linear_infinite]" style={{ width: '45%' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
