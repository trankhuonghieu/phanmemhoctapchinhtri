import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/src/components/Button";
import { 
  Trophy, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Send,
  RotateCcw,
  GraduationCap,
  Eye,
  Settings,
  HelpCircle
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, getDocs, query, orderBy, setDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/src/lib/error-handler";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

const MOCK_QUESTIONS: Question[] = [
  {
    id: "1",
    text: "Mục tiêu trọng tâm của Nghị quyết Đại hội XIII của Đảng về xây dựng Quân đội là gì?",
    options: [
      "Xây dựng Quân đội nhân dân cách mạng, chính quy, tinh nhuệ, từng bước hiện đại.",
      "Xây dựng Quân đội chuyên nghiệp và hiện đại ngay lập tức.",
      "Chỉ tập trung vào phát triển vũ khí hạt nhân.",
      "Phát triển quân đội theo mô hình đánh thuê chuyên nghiệp."
    ],
    correctIndex: 0
  },
  {
    id: "2",
    text: "Phấn đấu đến năm nào xây dựng Quân đội nhân dân Việt Nam cách mạng, chính quy, tinh nhuệ, hiện đại?",
    options: [
      "Đến năm 2025",
      "Đến năm 2030",
      "Đến năm 2045",
      "Đến năm 2035"
    ],
    correctIndex: 1
  },
  {
    id: "3",
    text: "Đại hội XIII của Đảng xác định xây dựng Quân đội nhân dân cách mạng, chính quy, tinh nhuệ, hiện đại vào năm nào?",
    options: [
      "2025",
      "2045",
      "2030",
      "2035"
    ],
    correctIndex: 2
  },
  {
    id: "4",
    text: "Nhiệm vụ hàng đầu của Quân đội nhân dân Việt Nam trong thời kỳ mới là gì?",
    options: [
      "Bảo vệ vững chắc độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Tổ quốc.",
      "Phát triển kinh tế quốc phòng đạt doanh thu cao nhất khu vực.",
      "Tham gia các hoạt động gìn giữ hòa bình quốc tế là mục tiêu duy nhất.",
      "Mua sắm vũ khí mới từ tất cả các quốc gia trên thế giới."
    ],
    correctIndex: 0
  },
  {
    id: "5",
    text: "Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh là nhiệm vụ của:",
    options: [
      "Chỉ cấp lãnh đạo, quản lý.",
      "Toàn thể cán bộ, chiến sĩ và nhân dân.",
      "Chỉ những người có lỗi lầm cần sửa chữa.",
      "Các cơ quan văn hóa, giáo dục."
    ],
    correctIndex: 1
  },
  {
    id: "6",
    text: "Quân đội nhân dân Việt Nam mang bản chất của giai cấp nào?",
    options: [
      "Giai cấp nông dân.",
      "Giai cấp công nhân.",
      "Tầng lớp trí thức.",
      "Giai cấp tư sản."
    ],
    correctIndex: 1
  },
  {
    id: "7",
    text: "Ba chức năng của Quân đội nhân dân Việt Nam là gì?",
    options: [
      "Đội quân chiến đấu, đội quân công tác, đội quân lao động sản xuất.",
      "Đội quân chiến đấu, đội quân biểu diễn, đội quân xây dựng.",
      "Đội quân bảo vệ, đội quân kinh doanh, đội quân quốc tế.",
      "Đội quân nghi lễ, đội quân thường trực, đội quân dự bị."
    ],
    correctIndex: 0
  },
  {
    id: "8",
    text: "Nguyên tắc lãnh đạo của Đảng đối với Quân đội nhân dân Việt Nam là:",
    options: [
      "Lãnh đạo gián tiếp qua các tổ chức chính trị.",
      "Lãnh đạo tuyệt đối, trực tiếp về mọi mặt.",
      "Phối hợp lãnh đạo cùng các đoàn thể.",
      "Lãnh đạo thông qua chính quyền các cấp."
    ],
    correctIndex: 1
  },
  {
    id: "9",
    text: "Ngày thành lập Quân đội nhân dân Việt Nam là ngày nào?",
    options: [
      "22/12/1944",
      "19/08/1945",
      "02/09/1945",
      "22/12/1945"
    ],
    correctIndex: 0
  },
  {
    id: "10",
    text: "Lời thề thứ nhất trong 10 lời thề danh dự của quân nhân là hi sinh vì:",
    options: [
      "Lợi ích cá nhân.",
      "Tổ quốc Việt Nam xã hội chủ nghĩa.",
      "Gia đình và người thân.",
      "Tổ chức quốc tế."
    ],
    correctIndex: 1
  },
  {
    id: "11",
    text: "Quân đội nhân dân Việt Nam là quân đội của ai?",
    options: [
      "Của riêng các tướng lĩnh.",
      "Của nhân dân, do nhân dân, vì nhân dân.",
      "Của các lực lượng tình nguyện quốc tế.",
      "Của các tổ chức kinh tế lớn."
    ],
    correctIndex: 1
  },
  {
    id: "12",
    text: "Kỷ luật của Quân đội nhân dân Việt Nam được gọi là:",
    options: [
      "Kỷ luật lỏng lẻo.",
      "Kỷ luật tự giác nghiêm minh.",
      "Kỷ luật ép buộc.",
      "Kỷ luật không bắt buộc."
    ],
    correctIndex: 1
  },
  {
    id: "13",
    text: "Chủ tịch Hồ Chí Minh đã khen ngợi Quân đội ta: 'Quân đội ta trung với Đảng, hiếu với dân, sẵn sàng chiến đấu hy sinh vì độc lập, tự do của Tổ quốc, vì chủ nghĩa xã hội. Nhiệm vụ nào cũng hoàn thành, khó khăn nào cũng vượt qua, quân thù nào cũng...'",
    options: [
      "Đánh bại.",
      "Chiến thắng.",
      "Đánh thắng.",
      "Tiêu diệt."
    ],
    correctIndex: 2
  },
  {
    id: "14",
    text: "Danh hiệu cao quý nhất mà nhân dân dành tặng cho cán bộ, chiến sĩ Quân đội nhân dân Việt Nam là gì?",
    options: [
      "Người lính cụ Hồ.",
      "Anh bộ đội Cụ Hồ.",
      "Chiến sĩ thi đua.",
      "Dũng sĩ diệt Mỹ."
    ],
    correctIndex: 1
  },
  {
    id: "15",
    text: "Quân đội nhân dân Việt Nam đặt dưới sự lãnh đạo tuyệt đối, trực tiếp về mọi mặt của ai?",
    options: [
      "Chính phủ.",
      "Quốc hội.",
      "Đảng Cộng sản Việt Nam.",
      "Bộ Quốc phòng."
    ],
    correctIndex: 2
  },
  {
    id: "16",
    text: "Ngày hội Quốc phòng toàn dân ở Việt Nam là ngày nào?",
    options: [
      "22/12",
      "19/05",
      "02/09",
      "27/07"
    ],
    correctIndex: 0
  },
  {
    id: "17",
    text: "Cương lĩnh chính trị đầu tiên của Đảng được thông qua tại Hội nghị thành lập Đảng (1930) xác định nhiệm vụ gì?",
    options: [
      "Làm cách mạng tư sản dân quyền và cách mạng ruộng đất để đi tới xã hội cộng sản.",
      "Chỉ làm cách mạng tư sản dân quyền.",
      "Chỉ làm cách mạng ruộng đất.",
      "Xây dựng chủ nghĩa xã hội ngay lập tức."
    ],
    correctIndex: 0
  },
  {
    id: "18",
    text: "Sức mạnh của Quân đội nhân dân Việt Nam bắt nguồn từ đâu?",
    options: [
      "Từ sự lãnh đạo của Đảng và sự đùm bọc của nhân dân.",
      "Từ số lượng vũ khí hiện đại vượt trội.",
      "Từ sự hỗ trợ tài chính của các tập đoàn kinh tế.",
      "Từ sự viện trợ không giới hạn của nước ngoài."
    ],
    correctIndex: 0
  },
  {
    id: "19",
    text: "Phẩm chất 'Tận trung với Đảng, tận hiếu với dân' là nội dung của:",
    options: [
      "Chuẩn mực đạo đức cách mạng.",
      "Lời thề thứ 5.",
      "Nghị quyết Trung ương 4.",
      "Lời kêu gọi thi đua ái quốc."
    ],
    correctIndex: 0
  },
  {
    id: "20",
    text: "Mối quan hệ giữa Quân đội và Nhân dân Việt Nam được ví như:",
    options: [
      "Cá với nước.",
      "Môi với răng.",
      "Cây với lá.",
      "Chim với trời."
    ],
    correctIndex: 0
  },
  {
    id: "21",
    text: "Nghị quyết số 05-NQ/TW của Bộ Chính trị khóa XIII về tổ chức Quân đội nhân dân Việt Nam giai đoạn 2021 - 2030 tập trung vào mục tiêu nào?",
    options: [
      "Xây dựng Quân đội tinh, gọn, mạnh, tiến lên hiện đại.",
      "Tăng cường số lượng quân nhân dự bị lên gấp đôi.",
      "Chỉ tập trung vào hiện đại hóa Hải quân.",
      "Mở rộng quy mô các quân khu."
    ],
    correctIndex: 0
  },
  {
    id: "22",
    text: "Theo Nghị quyết Đại hội XIII, đến năm 2025, cơ bản xây dựng Quân đội:",
    options: [
      "Cách mạng, chính quy, hiện đại.",
      "Tinh, gọn, mạnh.",
      "Chuyên nghiệp hoàn toàn.",
      "Kỹ thuật cao."
    ],
    correctIndex: 1
  },
  {
    id: "23",
    text: "Nghị quyết số 847-NQ/QSTW của Quân ủy Trung ương về phát huy phẩm chất gì trong thời kỳ mới?",
    options: [
      "Phát huy phẩm chất Bộ đội Cụ Hồ, kiên quyết chống chủ nghĩa cá nhân.",
      "Phát huy tinh thần làm kinh tế giỏi.",
      "Tăng cường kỹ năng sử dụng ngoại ngữ.",
      "Nâng cao trình độ tin học."
    ],
    correctIndex: 0
  }
];

export default function QuizEngine({ userId, fullName, isAdmin }: { userId: string, fullName?: string, isAdmin?: boolean }) {
  const [dbQuestions, setDbQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [currentStep, setCurrentStep] = useState<"intro" | "quiz" | "result" | "preview">("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [totalTime, setTotalTime] = useState(600);
  const [isOfficial, setIsOfficial] = useState(false);
  const [examType, setExamType] = useState("trial"); // trial, official_1, official_2, official_3
  const [isSaving, setIsSaving] = useState(false);
  const [questionCount, setQuestionCount] = useState(20);
  const [customTimeLimit, setCustomTimeLimit] = useState(10); // Minutes
  const [showReview, setShowReview] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isSystemOpen, setIsSystemOpen] = useState(true);
  const [isUpdatingSystem, setIsUpdatingSystem] = useState(false);

  // Add Question State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    category: "resolution"
  });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      // Fetch Questions
      const q = query(collection(db, "questions"), orderBy("text"));
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Question[];
      setDbQuestions(fetched);

      // Fetch System Status
      const settingsDoc = await getDoc(doc(db, "settings", "quiz_system"));
      if (settingsDoc.exists()) {
        setIsSystemOpen(settingsDoc.data().isOpen);
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const toggleSystemStatus = async () => {
    if (!isAdmin) return;
    setIsUpdatingSystem(true);
    const newStatus = !isSystemOpen;
    console.log("Toggling system status to:", newStatus);
    
    try {
      // Use setDoc with merge: true to handle both creation and update
      await setDoc(doc(db, "settings", "quiz_system"), {
        isOpen: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: userId || "unknown_admin"
      }, { merge: true });
      
      setIsSystemOpen(newStatus);
    } catch (e) {
      console.error("Error updating system status:", e);
      handleFirestoreError(e, OperationType.UPDATE, "settings/quiz_system");
    } finally {
      setIsUpdatingSystem(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const allQuestions = [...MOCK_QUESTIONS, ...dbQuestions];

  // Adjust questionCount if it exceeds available questions
  useEffect(() => {
    if (questionCount > allQuestions.length && allQuestions.length > 0) {
      setQuestionCount(allQuestions.length);
    }
  }, [allQuestions.length]);

  const handleAddQuestion = async () => {
    if (!newQuestion.text || newQuestion.options.some(opt => !opt)) {
      alert("Vui lòng nhập đầy đủ câu hỏi và các phương án trả lời.");
      return;
    }

    setIsAddingQuestion(true);
    try {
      await addDoc(collection(db, "questions"), {
        text: newQuestion.text,
        options: newQuestion.options,
        correctIndex: newQuestion.correctIndex,
        category: newQuestion.category,
        createdAt: serverTimestamp()
      });
      alert("Đã thêm câu hỏi mới thành công!");
      setNewQuestion({
        text: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        category: "resolution"
      });
      setShowAddForm(false);
      fetchQuestions();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "questions");
    } finally {
      setIsAddingQuestion(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => {
    let timer: any;
    if (currentStep === "quiz" && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (currentStep === "quiz" && timeLeft <= 0) {
      console.log("Time's up! Auto-submitting.");
      setCurrentStep("result");
    }
    return () => clearInterval(timer);
  }, [currentStep, timeLeft]);

  const handleSaveResult = async () => {
    setIsSaving(true);
    const scoreInfo = calculateScore();
    
    // Map examType to human readable label
    const typeLabels: Record<string, string> = {
      trial: "Thi thử",
      official_1: "Thi chính thức lần 1",
      official_2: "Thi chính thức lần 2",
      official_3: "Thi chính thức lần 3"
    };

    try {
      // Save to quiz results
      await addDoc(collection(db, "quizResults"), {
        userId,
        userName: fullName || userId,
        score: scoreInfo.percentage,
        correctCount: scoreInfo.correct,
        totalCount: scoreInfo.total,
        type: isOfficial ? "official" : "trial",
        examType: examType,
        examTypeLabel: typeLabels[examType] || "Không xác định",
        finishedAt: serverTimestamp(),
        duration: totalTime - timeLeft
      });

      // If official, update user best score
      if (isOfficial) {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const currentBest = userSnap.data().bestOfficialScore || 0;
          if (scoreInfo.percentage > currentBest) {
            await updateDoc(userRef, {
              bestOfficialScore: scoreInfo.percentage
            });
          }
        }
      }
      alert("Đã lưu kết quả thi thành công!");
      setCurrentStep("intro");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "quizResults");
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Randomized shuffle for questions when starting
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

  const handleStart = (official: boolean) => {
    // Shuffle and slice from all available questions
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    const count = Math.min(questionCount, shuffled.length);
    setShuffledQuestions(shuffled.slice(0, count));
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsOfficial(official);
    setCurrentStep("quiz");
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowReview(false);
    setShowConfirmSubmit(false);
    
    // Set time: official uses custom limit, trial uses 20 mins
    const limit = official ? customTimeLimit * 60 : 1200;
    setTimeLeft(limit);
    setTotalTime(limit);
  };

  const handleSelectOption = (optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIndex }));
  };

  const handleSubmit = () => {
    setShowConfirmSubmit(true);
  };

  const confirmSubmit = () => {
    console.log("Setting currentStep to result");
    setCurrentStep("result");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateScore = () => {
    let correct = 0;
    shuffledQuestions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correct++;
    });
    return {
      correct,
      total: shuffledQuestions.length,
      percentage: shuffledQuestions.length > 0 ? Math.round((correct / shuffledQuestions.length) * 100) : 0
    };
  };

  if (currentStep === "intro") {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-white rounded-3xl p-8 border-t-8 border-military-red shadow-xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-military-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="w-10 h-10 text-military-red" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4 uppercase">Chế độ Ôn tập & Thi Chính trị</h2>
            <p className="text-slate-500 max-w-lg mx-auto mb-8 font-medium">
              Chào mừng đồng chí đến với hệ thống sát hạch kiến thức. Đảm bảo tinh thần tự giác và trung thực trong quá trình thi.
            </p>
          </div>
          
          {!isSystemOpen && !isAdmin ? (
            <div className="max-w-2xl mx-auto p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center mb-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Timer className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-400 uppercase mb-4">Hệ thống đang tạm khóa</h3>
              <p className="text-sm text-slate-500 mb-0">
                Hiện tại hệ thống ôn tập và thi cử chính thức đang tạm dừng hoạt động. Đồng chí vui lòng quay lại sau theo thông báo của Ban Chỉ huy.
              </p>
            </div>
          ) : (
            <>
              {isAdmin && (
                <div className="mb-10 p-6 bg-red-50/50 rounded-2xl border-2 border-red-100 shadow-inner">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-military-red" />
                  <h4 className="font-black text-military-red uppercase tracking-tight">Cấu hình Hội đồng thi (Chỉ dành cho chỉ huy)</h4>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-red-100">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider",
                    isSystemOpen ? "text-green-600" : "text-military-red"
                  )}>
                    {isSystemOpen ? "Hệ thống đang Mở" : "Hệ thống đang Khóa"}
                  </span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSystemStatus();
                    }}
                    disabled={isUpdatingSystem}
                    className={cn(
                      "relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none shadow-inner",
                      isSystemOpen ? "bg-green-500" : "bg-slate-300",
                      isUpdatingSystem && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-md flex items-center justify-center",
                      isSystemOpen ? "translate-x-7" : "translate-x-0"
                    )}>
                      {isUpdatingSystem && <div className="w-2 h-2 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />}
                    </div>
                  </button>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Số lượng câu hỏi (Lên tới 60+)</label>
                    <span className="text-xs font-black text-military-red">{questionCount} / {allQuestions.length} câu</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" 
                      max={Math.max(60, allQuestions.length)} 
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Chọn</span>
                      <span className="w-10 h-8 flex items-center justify-center bg-white border border-slate-200 font-black text-slate-800 rounded-lg text-xs">{questionCount}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Thời gian thi quy định</label>
                    <span className="text-xs font-black text-military-red">{customTimeLimit} phút</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" 
                      max={60} 
                      value={customTimeLimit}
                      onChange={(e) => setCustomTimeLimit(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Phút</span>
                      <span className="w-10 h-8 flex items-center justify-center bg-white border border-slate-200 font-black text-slate-800 rounded-lg text-xs">{customTimeLimit}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-red-100 flex justify-end">
                <Button variant="outline" size="sm" className="bg-white border-military-red text-military-red hover:bg-military-red hover:text-white transition-all uppercase font-black text-[10px]" onClick={() => setCurrentStep("preview")}>
                  <Eye className="w-4 h-4" /> BIÊN SOẠN & XEM TRƯỚC ĐỀ THI
                </Button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-red-400 transition-all text-left group">
              <h4 className="font-bold text-lg mb-2 group-hover:text-red-700 transition-colors">Chế độ Ôn tập</h4>
              <p className="text-xs text-slate-400 font-medium mb-4">Luyện tập không giới hạn thời gian. Phục vụ tự học tự rèn.</p>
              
              <div className="mb-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Phân loại ôn tập</label>
                <select 
                  value={examType === 'trial' ? 'trial' : 'trial'} // Forces trial if in this block or just use it
                  onChange={() => setExamType("trial")}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold font-mono"
                  disabled
                >
                  <option value="trial">ÔN TẬP / THI THỬ</option>
                </select>
              </div>

              <Button onClick={() => handleStart(false)} variant="secondary" className="w-full uppercase font-black text-xs">Bắt đầu Ôn tập</Button>
            </div>
            
            <div className="p-6 rounded-2xl bg-red-800 border-2 border-red-700 shadow-xl text-left">
              <h4 className="font-bold text-lg text-white mb-2">Thi Chính thức</h4>
              <p className="text-xs text-red-200 font-medium mb-4">Tính giờ 10:00. Kết quả ghi vào hồ sơ quân nhân.</p>
              
              <div className="mb-4">
                <label className="block text-[10px] font-black text-red-300 uppercase tracking-widest mb-2">Đợt thi chính thức</label>
                <select 
                  value={examType === 'trial' ? 'official_1' : examType}
                  onChange={(e) => {
                    setExamType(e.target.value);
                  }}
                  className="w-full bg-red-900/50 border border-red-500 rounded-lg py-2 px-3 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="official_1" className="bg-red-800">LẦN CHÍNH THỨC 1</option>
                  <option value="official_2" className="bg-red-800">LẦN CHÍNH THỨC 2</option>
                  <option value="official_3" className="bg-red-800">LẦN CHÍNH THỨC 3</option>
                </select>
              </div>

              <Button 
                onClick={() => {
                  if (examType === "trial") setExamType("official_1");
                  handleStart(true);
                }} 
                className="w-full bg-yellow-400 text-red-900 hover:bg-yellow-300 uppercase font-black text-xs"
              >
                Bắt đầu Thi bài
              </Button>
            </div>
            </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (currentStep === "preview") {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Eye className="w-6 h-6 text-red-600" /> Ngân hàng câu hỏi & Biên soạn
          </h3>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowAddForm(true)} className="rounded-xl border-green-600 text-green-600">Thêm câu hỏi</Button>
            <Button variant="outline" onClick={() => setCurrentStep("intro")} className="rounded-xl">Quay lại</Button>
          </div>
        </div>

        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-50 rounded-3xl p-8 border-2 border-green-100 shadow-inner mb-8"
          >
            <h4 className="font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
              <HelpCircle className="text-green-600" /> Biên soạn câu hỏi mới
            </h4>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nội dung câu hỏi (Dựa trên nghị quyết/chính trị)</label>
                <textarea 
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-green-400 outline-none"
                  rows={3}
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
                  placeholder="Nhập nội dung câu hỏi..."
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {newQuestion.options.map((opt, i) => (
                  <div key={i}>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Phương án {String.fromCharCode(65 + i)}</label>
                    <input 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...newQuestion.options];
                        newOpts[i] = e.target.value;
                        setNewQuestion({...newQuestion, options: newOpts});
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Đáp án đúng</label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                    value={newQuestion.correctIndex}
                    onChange={(e) => setNewQuestion({...newQuestion, correctIndex: parseInt(e.target.value)})}
                  >
                    {newQuestion.options.map((_, i) => (
                      <option key={i} value={i}>Phương án {String.fromCharCode(65 + i)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Phân loại</label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                    value={newQuestion.category}
                    onChange={(e) => setNewQuestion({...newQuestion, category: e.target.value})}
                  >
                    <option value="resolution">Học tập Nghị quyết</option>
                    <option value="politics">Kiến thức Chính trị</option>
                    <option value="tradition">Truyền thống Quân đội</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Hủy bỏ</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleAddQuestion} disabled={isAddingQuestion}>
                  {isAddingQuestion ? "Đang lưu..." : "Lưu câu hỏi"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          {loadingQuestions && <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</div>}
          {allQuestions.map((q, i) => (
            <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-military-red opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start mb-4">
                <p className="font-bold text-slate-800">{i + 1}. {q.text}</p>
                {q.category && <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase px-2 py-1 rounded-md">{q.category}</span>}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {q.options.map((opt, oi) => (
                  <div key={oi} className={cn(
                    "p-3 rounded-xl text-xs font-medium border flex items-center justify-between",
                    oi === q.correctIndex ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-50 border-slate-100 text-slate-500"
                  )}>
                    <span>
                      <span className="font-black mr-2">{String.fromCharCode(65 + oi)}.</span>
                      {opt}
                    </span>
                    {oi === q.correctIndex && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (currentStep === "quiz") {
    const question = shuffledQuestions[currentQuestionIndex];
    return (
      <div className="max-w-5xl mx-auto py-8 flex flex-col h-[80vh]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className={cn(
              "px-4 py-2 rounded-xl font-bold border",
              isOfficial ? "bg-military-red text-white border-military-red" : "bg-blue-600 text-white border-blue-600"
            )}>
              {isOfficial ? "THI CHÍNH THỨC" : "ÔN TẬP TỰ DO"}
            </span>
            <div className="flex items-center gap-2 text-slate-600 font-black text-lg bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
              <Timer className="w-5 h-5 text-military-red" />
              {formatTime(timeLeft)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-400">Tiến độ:</p>
            <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-600 transition-all shadow-[0_0_8px_rgba(220,38,38,0.5)]" 
                style={{ width: `${((currentQuestionIndex + 1) / shuffledQuestions.length) * 100}%` }}
              />
            </div>
            <span className="text-sm font-black text-slate-800">{currentQuestionIndex + 1}/{shuffledQuestions.length}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-8 flex-1">
          <div className="md:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl p-10 shadow-lg border border-slate-100 relative overflow-hidden">
              {/* Decorative star background */}
              <div className="absolute -top-10 -right-10 text-slate-50 transform rotate-12 pointer-events-none">
                <GraduationCap size={200} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-8 leading-relaxed relative z-10">
                {currentQuestionIndex + 1}. {question?.text}
              </h3>
              <div className="space-y-4 relative z-10">
                {question?.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={cn(
                      "w-full text-left p-5 rounded-2xl border-2 transition-all group relative overflow-hidden",
                      answers[currentQuestionIndex] === idx
                        ? "border-red-600 bg-red-50 flex items-center gap-4"
                        : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <span className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-black transition-colors",
                      answers[currentQuestionIndex] === idx
                        ? "bg-red-600 text-white"
                        : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className={cn(
                      "font-medium flex-1",
                      answers[currentQuestionIndex] === idx ? "text-slate-900 font-bold" : "text-slate-600"
                    )}>
                      {option}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              >
                <ChevronLeft className="w-5 h-5" /> Câu trước
              </Button>
              {currentQuestionIndex === shuffledQuestions.length - 1 ? (
                <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 shadow-green-100 uppercase font-black px-8">
                  <Send className="w-4 h-4" /> Nộp bài ngay
                </Button>
              ) : (
                <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="px-8 font-bold">
                  Tiếp theo <ChevronRight className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 h-fit">
            <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Sơ đồ câu hỏi
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {shuffledQuestions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center font-bold text-sm border-2 transition-all",
                    currentQuestionIndex === idx 
                      ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100" 
                      : answers[idx] !== undefined 
                        ? "border-green-500 bg-green-500 text-white" 
                        : "border-yellow-400 bg-yellow-400 text-white"
                  )}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {showConfirmSubmit && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-t-8 border-military-red"
              >
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-military-red" />
                </div>
                <h3 className="text-xl font-black text-slate-800 text-center mb-4 uppercase">Đồng chí muốn nộp bài?</h3>
                <p className="text-slate-500 text-center mb-8 font-medium">
                  {Object.keys(answers).length < shuffledQuestions.length 
                    ? `Đồng chí còn ${shuffledQuestions.length - Object.keys(answers).length} câu chưa trả lời. Kết quả sẽ được ghi vào hồ sơ sau khi nộp.`
                    : "Hệ thống sẽ tiến hành chấm điểm và lưu kết quả vào hồ sơ cá nhân."}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" onClick={() => setShowConfirmSubmit(false)} className="rounded-xl border-slate-200">Kiểm tra lại</Button>
                  <Button onClick={confirmSubmit} className="bg-military-red hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-100">Xác nhận nộp</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (currentStep === "result") {
    const score = calculateScore();
    const isPassed = score.percentage >= 60;

    return (
      <div className="max-w-2xl mx-auto py-12">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "bg-white rounded-3xl p-10 shadow-2xl text-center border-t-8",
            isPassed ? "border-green-500" : "border-military-red"
          )}
        >
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6",
            isPassed ? "bg-green-100" : "bg-red-100"
          )}>
            {isPassed ? (
              <Trophy className="w-12 h-12 text-green-600" />
            ) : (
              <XCircle className="w-12 h-12 text-military-red" />
            )}
          </div>
          
          <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase">
            {isPassed ? "Chúc mừng đồng chí!" : "Cần cố gắng hơn!"}
          </h2>
          <p className="text-slate-500 mb-8 font-medium">Báo cáo kết quả sát hạch kiến thức chính trị</p>

          <div className="bg-slate-50 rounded-2xl p-8 mb-8 grid grid-cols-2 gap-4 border border-slate-100">
            <div className="text-center">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Điểm số</p>
              <p className="text-5xl font-black text-slate-800 tracking-tighter">{score.percentage}%</p>
            </div>
            <div className="text-center border-l border-slate-200">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Trạng thái</p>
              <div className={cn(
                "inline-flex items-center gap-1 px-4 py-1 rounded-full text-xs font-black uppercase mt-1",
                isPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {isPassed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {isPassed ? "Đạt yêu cầu" : "Không đạt"}
              </div>
              <p className={cn(
                "text-2xl font-black mt-1",
                score.percentage >= 80 ? "text-green-600" : 
                isPassed ? "text-amber-600" : "text-military-red"
              )}>
                {score.percentage >= 80 ? "XUẤT SẮC" : 
                 isPassed ? "ĐẠT" : "KHÔNG ĐẠT"}
              </p>
            </div>
          </div>
          
          {shuffledQuestions.some((_, i) => answers[i] === undefined) && (
            <div className="mb-8 p-6 bg-yellow-50 rounded-2xl border border-yellow-200 text-left">
              <div className="flex items-center gap-2 mb-4 text-yellow-700">
                <AlertCircle className="w-5 h-5" />
                <h4 className="font-bold uppercase text-sm">Các câu chưa hoàn thành</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {shuffledQuestions.map((_, i) => answers[i] === undefined && (
                  <span key={i} className="px-3 py-1 bg-white border border-yellow-300 rounded-lg text-xs font-bold text-yellow-800">
                    Câu {i + 1}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 mb-8 text-left">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-600 w-5 h-5" />
                <span className="font-bold text-slate-700">Câu trả lời đúng</span>
              </div>
              <span className="font-black text-green-700">{score.correct} / {score.total}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-3">
                <XCircle className="text-military-red w-5 h-5" />
                <span className="font-bold text-slate-700">Câu trả lời sai / Chưa trả lời</span>
              </div>
              <span className="font-black text-military-red">{score.total - score.correct}</span>
            </div>
          </div>

          <div className="mb-8">
            <Button 
              variant="outline" 
              className="w-full bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
              onClick={() => setShowReview(!showReview)}
            >
              <Eye className="w-4 h-4" /> {showReview ? "Ẩn bài giải chi tiết" : "Xem bài giải chi tiết"}
            </Button>

            <AnimatePresence>
              {showReview && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-slate-50 rounded-2xl p-6 mt-4 space-y-6 text-left border border-slate-100 max-h-[400px] overflow-y-auto"
                >
                  {shuffledQuestions.map((q, idx) => (
                    <div key={q.id} className="pb-4 border-b border-slate-200 last:border-0">
                      <p className="font-bold text-slate-800 text-sm mb-3">
                        Câu {idx + 1}: {q.text}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                          const isSelected = answers[idx] === oi;
                          const isCorrect = q.correctIndex === oi;
                          return (
                            <div key={oi} className={cn(
                              "p-3 rounded-xl flex items-center gap-2 text-xs",
                              isCorrect ? "bg-green-100 text-green-700 border border-green-200" :
                              isSelected && !isCorrect ? "bg-red-100 text-red-700 border border-red-200" :
                              "bg-white text-slate-500 border border-slate-100"
                            )}>
                              <span className="font-black">{String.fromCharCode(65 + oi)}.</span>
                              <span className="flex-1">{opt}</span>
                              {isCorrect && <CheckCircle2 className="w-3 h-3" />}
                              {isSelected && !isCorrect && <XCircle className="w-3 h-3" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("intro")} disabled={isSaving}>
              <RotateCcw className="w-5 h-5" /> Làm lại
            </Button>
            <Button className="flex-1" onClick={handleSaveResult} disabled={isSaving}>
              {isSaving ? "Đang lưu..." : "Lưu kết quả hồ sơ"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
