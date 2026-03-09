/**
 * Chatbot Context Builder
 * Builds rich context for Gemini AI based on ALL user data from Firestore
 * Data excluded: password (stored in Firebase Auth, not Firestore)
 */

import { auth, db } from "../firebase-config";
import { getDocs, collection } from "firebase/firestore";
import {
  tasksService,
  classesService,
  userService,
  studySessionsService,
  uniformsService,
} from "./firestore-service";

/**
 * Build system prompt with ALL user context
 * @returns {Promise<string>} System prompt with complete user data
 */
export async function buildSystemContext() {
  const user = auth.currentUser;
  if (!user) {
    return CHATBOT_SYSTEM_PROMPT;
  }

  try {
    // Fetch ALL user data with independent error handling for each data source
    const [
      profile,
      allTasks,
      allClasses,
      allSessions,
      uniforms,
      calendarEvents,
      exams,
    ] = await Promise.all([
      getUserProfile().catch((err) => {
        console.warn("Failed to fetch user profile:", err);
        return null;
      }),
      getAllTasks().catch((err) => {
        console.warn("Failed to fetch tasks:", err);
        return [];
      }),
      getAllClasses().catch((err) => {
        console.warn("Failed to fetch classes:", err);
        return [];
      }),
      getAllStudySessions().catch((err) => {
        console.warn("Failed to fetch study sessions:", err);
        return [];
      }),
      getUniforms().catch((err) => {
        console.warn("Failed to fetch uniforms:", err);
        return {};
      }),
      getCalendarEvents().catch((err) => {
        console.warn("Failed to fetch calendar events:", err);
        return [];
      }),
      getExams().catch((err) => {
        console.warn("Failed to fetch exams:", err);
        return [];
      }),
    ]);

    // Calculate today's specific data
    const today = new Date();
    const todayString = today.toDateString();
    const todayDayName = today
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    const todayClasses = allClasses.filter((cls) => {
      if (cls.days && Array.isArray(cls.days)) {
        return cls.days.includes(todayDayName);
      }
      return false;
    });

    const todaySessions = allSessions.filter(
      (session) => new Date(session.completedAt).toDateString() === todayString,
    );
    const totalMinutesToday = todaySessions.reduce(
      (sum, session) => sum + (session.duration || 0),
      0,
    );

    // Separate pending and completed tasks
    const pendingTasks = allTasks.filter((task) => !task.completed);
    const completedTasks = allTasks.filter((task) => task.completed);

    // Calculate statistics
    const totalStudyTimeAll = allSessions.reduce(
      (sum, session) => sum + (session.duration || 0),
      0,
    );

    // Get upcoming calendar events (from today onwards)
    const upcomingEvents = calendarEvents
      .filter((event) => new Date(event.date) >= new Date(todayString))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10);

    // Get upcoming exams
    const upcomingExams = exams
      .filter((exam) => new Date(exam.date) >= new Date(todayString))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    // Get ALL calendar events and exams (not just upcoming) for comprehensive search
    const allEventsSorted = calendarEvents.sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    const allExamsSorted = exams.sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    const context = {
      userName: profile?.displayName || profile?.name || "User",
      email: user.email || "",
      streak: profile?.streak || 0,
      lastLogin: profile?.lastLogin || null,
      createdAt: profile?.createdAt || null,

      // Task stats
      totalTasks: allTasks.length,
      pendingTasks: pendingTasks.length,
      completedTasks: completedTasks.length,
      tasksWithDueDate: allTasks.filter((t) => t.dueDate).length,

      // Class stats
      totalClasses: allClasses.length,
      todayClasses: todayClasses.length,

      // Study stats
      totalStudyTimeAll,
      totalStudyTimeToday: totalMinutesToday,
      todaySessions: todaySessions.length,
      totalSessions: allSessions.length,

      // Calendar
      totalEvents: calendarEvents.length,
      upcomingEvents: upcomingEvents.length,
      totalExams: exams.length,
      upcomingExams: upcomingExams.length,
    };

    return buildCompleteContextualPrompt(
      context,
      pendingTasks,
      completedTasks,
      allTasks,
      allClasses,
      todayClasses,
      allSessions,
      uniforms,
      allEventsSorted,
      allExamsSorted,
      upcomingEvents,
      upcomingExams,
      profile,
    );
  } catch (error) {
    console.error("Error building system context:", error);
    // Return default prompt if context building fails
    return CHATBOT_SYSTEM_PROMPT;
  }
}

/**
 * Enhanced chatbot system prompt with explicit search instructions
 */
const CHATBOT_SYSTEM_PROMPT = `Anda adalah StudyFlow AI Assistant, chatbot pembelajaran yang membantu siswa dan mahasiswa dalam proses belajar.

Karakter Anda:
- Ramah, suportif, dan motivatif
- Memberikan jawaban yang jelas dan terstruktur
- Menggunakan bahasa yang sesuai dengan input user (Indonesia/English)
- Memberikan encouragement dan tips belajar yang praktis

Anda membantu user dengan:
- Menjawab pertanyaan tentang belajar dan produktivitas
- Memberikan tips manajemen waktu dan teknik belajar
- Memotivasi user untuk tetap konsisten belajar
- Membantu user mengatur tugas dan jadwal belajar
- MELAKUKAN AKSI ke database (tambah tugas, event, kelas, dsb)

PENTING - Format Output:
- JANGAN gunakan karakter asterisk (*) untuk formatting teks
- Gunakan emoji instead untuk highlighting (🔴, 🟡, 🟢, ✅, dll)
- Gunakan bullet point dengan tanda dash (-) atau angka (1., 2., 3.)
- Hindari markdown formatting yang menampilkan karakter special

═══════════════════════════════════════════
INSTRUKSI AKSI APLIKASI (SANGAT PENTING!)
═══════════════════════════════════════════
Anda BISA melakukan aksi aplikasi (database + kontrol timer). Jika user meminta Anda untuk:
- Menambah tugas/PR/assignment → gunakan action "add_task"
- Menambah kelas/mata pelajaran → gunakan action "add_class"
- Menambah event/acara di kalender → gunakan action "add_event"
- Menandai tugas selesai → gunakan action "complete_task"
- Menghapus tugas → gunakan action "delete_task"
- Update tugas → gunakan action "update_task"
- Memulai timer fokus → gunakan action "start_pomodoro_timer"

🎯 PERILAKU UNTUK PROMPT SINGKAT (SANGAT PENTING!):
─────────────────────────────────────────────
Ketika user memberikan PROMPT SINGKAT seperti:
- "tambah tugas", "add task", "buat task", "catat tugas"
- "tambah event", "add event", "buat event"
- "tambah kelas", "add class", "buat kelas"

Anda HARUS:
1. LANGSUNG tampilkan modal/action dengan JSON
2. Tidak perlu menanya dulu "tugas apa?"
3. Berikan respons singkat seperti: "Baik, saya buatkan tugas baru untuk Anda. Silakan lengkapi detailnya:"
4. Sertakan JSON dengan field minimal (title kosong atau default)
5. User akan mengisi data melalui modal yang tampil

Contoh respons untuk prompt "tambah tugas":
"Baik, saya buatkan tugas baru. Silakan lengkapi detailnya di bawah:"

\`\`\`json
{
  "action": "add_task",
  "params": {
    "title": "",
    "dueDate": "",
    "priority": "medium",
    "description": "",
    "className": "",
    "type": "individual",
  },
  "confirmationMessage": "Silakan lengkapi detail tugas di atas"
}
\`\`\`

SAAT USER MEMINTA AKSI, Anda HARUS menyertakan blok JSON berikut di AKHIR respons Anda:

\`\`\`json
{
  "action": "add_task",
  "params": {
    "title": "Judul tugas",
    "dueDate": "YYYY-MM-DD",
    "priority": "low|medium|high",
    "description": "Deskripsi opsional",
    "className": "Nama kelas (opsional)",
    "type": "individual|class",
    "links": [{"url": "https://...", "title": "Judul link"}],
    "files": [{"name": "namafile.pdf", "url": "https://..."}]
  },
  "confirmationMessage": "Pesan konfirmasi yang ramah"
}
\`\`\`

DATABASE SCHEMA LENGKAP (WAJIB DIPAHAMI):
─────────────────────────────────────────

📋 TUGAS (Task) - Field yang tersedia:
- title: string (wajib) - Judul tugas
- text: string - sama dengan title
- type: string - "individual", "group", atau "exam"
- classId: string - ID kelas (opsional)
- className: string - Nama kelas (opsional)
- priority: string - "low", "medium", atau "high"
- dueDate: string - Tanggal deadline (YYYY-MM-DD)
- endDate: string - Tanggal akhir (opsional)
- description: string - Deskripsi tugas
- links: array of objects - [{ url: string, title: string }]
- files: array of objects - [{ name: string, url: string }]
- completed: boolean - Status selesai

📚 KELAS (Class) - Field yang tersedia:
- name: string (wajib) - Nama kelas/mapel
- teacher: string - Nama guru
- room: string - Ruangan kelas
- color: string - Warna tema (hex)
- schedules: array - Jadwal mingguan [{ day: "monday", time: "08:00" }]
- links: array of objects - Link materi/{ url: string, title: string }

📅 EVENT KALENDAR - Field yang tersedia:
- title: string (wajib) - Judul event
- date: string (wajib) - Tanggal (YYYY-MM-DD)
- endDate: string - Tanggal akhir (opsional)
- time: string - Waktu (HH:MM)
- description: string - Deskripsi event

CONTOH AKSI YANG DIDUKUNG:

1. add_task: { title, dueDate, priority, description, className, type, links, files }
2. update_task: { taskId, title, dueDate, priority, description, links, files }
3. complete_task: { taskId }
4. delete_task: { taskId }
5. add_class: { name, teacher, room, color, schedules, links }
6. add_event: { title, date, endDate, time, description }
7. start_pomodoro_timer: { duration(menit, opsional) }

ATURAN PENTING UNTUK AKSI:
- SELALU beri confirmationMessage yang ramah dan jelas
- Untuk prompt singkat, langsung tampilkan modal dengan field kosong
- Untuk tanggal, gunakan format YYYY-MM-DD
- Jika user bilang "besok", hitung tanggalnya berdasarkan hari ini
- User bisa mengisi/edit data melalui modal yang tampil
- Berikan respons teks biasa DI ATAS blok JSON
- Blok JSON HARUS di akhir respons`;

/**
 * Build COMPLETE contextual prompt with ALL user data and enhanced search instructions
 */
function buildCompleteContextualPrompt(
  context,
  pendingTasks,
  completedTasks,
  allTasks,
  allClasses,
  todayClasses,
  allSessions,
  uniforms,
  allEventsSorted,
  allExamsSorted,
  upcomingEvents,
  upcomingExams,
  profile,
) {
  let prompt = CHATBOT_SYSTEM_PROMPT;

  // ============================================
  // DATA INDEX - Quick reference for AI search
  // ============================================
  prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
  prompt += `\n║              INDEKS DATA YANG TERSEDIA                        ║`;
  prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
  prompt += `\n📊 SEMUA DATA:`;
  prompt += `\n   👤 Profil User: nama, email, streak, dll`;
  prompt += `\n   📚 TUGAS: ${context.totalTasks} total (${context.pendingTasks} pending, ${context.completedTasks} selesai)`;
  prompt += `\n      • ${context.tasksWithDueDate} tugas memiliki deadline/dueDate`;
  prompt += `\n   🏫 KELAS: ${context.totalClasses} kelas (dengan jadwal mingguan)`;
  prompt += `\n   📅 ACARA KALENDER: ${context.totalEvents} event`;
  prompt += `\n   📝 UJIAN: ${context.totalExams} jadwal ujian`;
  prompt += `\n   ⏱️ SESI BELAJAR: ${context.totalSessions} sesi`;
  prompt += `\n   👕 JADWAL SERAGAM: ${Object.keys(uniforms).length} hari`;

  prompt += `\n\n⚠️ PERINGATAN PENCARIAN DATA - WAJIB DIBACA!`;
  prompt += `\n─────────────────────────────────────────────────────────────`;
  prompt += `\nSAAT USER BERTANYA TENTANG "EVENT", "ACARA", "JADWAL", atau "TANGGAL":`;
  prompt += `\n   1️⃣  CEK SEMUA sumber data, jangan hanya fokus pada satu!`;
  prompt += `\n   2️⃣  TUGAS → cari di bagian "SEMUA TUGAS (dengan deadline)"`;
  prompt += `\n   3️⃣  KELAS → cari di bagian "DAFTAR KELAS"`;
  prompt += `\n   4️⃣  ACARA KALENDER → cari di bagian "SEMUA ACARA KALENDER"`;
  prompt += `\n   5️⃣  UJIAN → cari di bagian "SEMUA JADWAL UJIAN"`;
  prompt += `\n   6️⃣  Berikan jawaban yang mencakup SEMUA kategori yang relevan!`;

  // User Basic Info
  prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
  prompt += `\n║                    DATA PROFIL USER                             ║`;
  prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
  prompt += `\n👤 Nama: ${context.userName}`;
  prompt += `\n📧 Email: ${context.email}`;
  prompt += `\n🔥 Learning Streak: ${context.streak} hari`;
  if (context.lastLogin) {
    prompt += `\n🕐 Login Terakhir: ${formatDateTime(context.lastLogin)}`;
  }
  if (context.createdAt) {
    prompt += `\n📅 Bergabung Sejak: ${formatDate(context.createdAt)}`;
  }

  // Study Statistics
  prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
  prompt += `\n║                    STATISTIK BELAJAR                          ║`;
  prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
  prompt += `\n📊 TOTAL SEMUA:`;
  prompt += `\n   • Total Sesi Belajar: ${context.totalSessions} sesi`;
  prompt += `\n   • Total Waktu Belajar: ${context.totalStudyTimeAll} menit (${Math.round(context.totalStudyTimeAll / 60)} jam)`;
  prompt += `\n   • Total Tugas Selesai: ${context.completedTasks} dari ${context.totalTasks} tugas`;

  prompt += `\n\n📅 HARI INI:`;
  prompt += `\n   • Sesi Belajar: ${context.todaySessions} sesi`;
  prompt += `\n   • Waktu Belajar: ${context.totalStudyTimeToday} menit`;
  prompt += `\n   • Tugas Pending: ${context.pendingTasks} tugas`;
  prompt += `\n   • Kelas Hari Ini: ${context.todayClasses} kelas`;

  // ============================================
  // SEMUA TUGAS (dengan deadline) - Prioritized for date-related queries
  // ============================================
  const tasksWithDueDate = allTasks
    .filter((t) => t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  if (tasksWithDueDate.length > 0) {
    prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
    prompt += `\n║          SEMUA TUGAS (dengan deadline) - URUT TANGGAL         ║`;
    prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
    tasksWithDueDate.forEach((task, i) => {
      const priority =
        task.priority === "high"
          ? "🔴"
          : task.priority === "medium"
            ? "🟡"
            : "🟢";
      const status = task.completed ? "✅" : "⏳";
      const dueDate = task.dueDate ? ` → ${formatDate(task.dueDate)}` : "";
      const endDate = task.endDate ? ` s/d ${formatDate(task.endDate)}` : "";
      const className = task.className ? ` [${task.className}]` : "";
      prompt += `\n${i + 1}. ${status} ${priority} ${task.title}${className}${dueDate}${endDate}`;
      if (task.description) {
        prompt += `\n     📝 ${task.description}`;
      }
    });
  }

  // ============================================
  // SEMUA ACARA KALENDER - All events with dates
  // ============================================
  if (allEventsSorted && allEventsSorted.length > 0) {
    prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
    prompt += `\n║          SEMUA ACARA KALENDER - URUT TANGGAL                  ║`;
    prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
    allEventsSorted.forEach((event, i) => {
      const typeIcon = "📅";
      const time = event.time ? ` pukul ${event.time}` : "";
      const endDate = event.endDate ? ` s/d ${formatDate(event.endDate)}` : "";
      prompt += `\n${i + 1}. ${typeIcon} ${event.title}`;
      prompt += `\n     📆 ${formatDate(event.date)}${time}${endDate}`;
      if (event.description) {
        prompt += `\n     📝 ${event.description}`;
      }
    });
  }

  // ============================================
  // SEMUA JADWAL UJIAN - All exams with dates
  // ============================================
  if (allExamsSorted && allExamsSorted.length > 0) {
    prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
    prompt += `\n║          SEMUA JADWAL UJIAN - URUT TANGGAL                     ║`;
    prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
    allExamsSorted.forEach((exam, i) => {
      const endDate = exam.endDate ? ` s/d ${formatDate(exam.endDate)}` : "";
      prompt += `\n${i + 1}. 📝 ${exam.title || "Ujian"}`;
      prompt += `\n     📆 ${formatDate(exam.date)}${endDate}`;
      if (exam.subject) {
        prompt += `\n     📚 Mata Pelajaran: ${exam.subject}`;
      }
      if (exam.room) {
        prompt += `\n     📍 Ruangan: ${exam.room}`;
      }
    });
  }

  // ============================================
  // DAFTAR KELAS - Weekly recurring classes
  // ============================================
  if (allClasses && allClasses.length > 0) {
    prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
    prompt += `\n║                    DAFTAR KELAS (mingguan)                   ║`;
    prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
    allClasses.forEach((cls, i) => {
      const days =
        cls.days && Array.isArray(cls.days) ? cls.days.join(", ") : "N/A";
      const time = cls.time ? ` pukul ${cls.time}` : "";
      const room = cls.room ? ` di ${cls.room}` : "";
      prompt += `\n${i + 1}. ${cls.name}`;
      prompt += `\n     📆 Hari: ${days}${time}${room}`;
      if (cls.links && cls.links.length > 0) {
        prompt += `\n     🔗 Link: ${cls.links.map((l) => l.url).join(", ")}`;
      }
    });
  }

  // Pending Tasks (detailed view)
  if (pendingTasks && pendingTasks.length > 0) {
    prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
    prompt += `\n║                    TUGAS PENDING (${pendingTasks.length})         ║`;
    prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
    pendingTasks.slice(0, 10).forEach((task, i) => {
      const priority =
        task.priority === "high"
          ? "🔴"
          : task.priority === "medium"
            ? "🟡"
            : "🟢";
      const dueDate = task.dueDate
        ? ` (Deadline: ${formatDate(task.dueDate)})`
        : "";
      const className = task.className ? ` [${task.className}]` : "";
      prompt += `\n${i + 1}. ${priority} ${task.title}${className}${dueDate}`;
      if (task.description) {
        prompt += `\n   📝 ${task.description}`;
      }
      if (task.links && task.links.length > 0) {
        prompt += `\n   🔗 Link: ${task.links.map((l) => l.url).join(", ")}`;
      }
      if (task.files && task.files.length > 0) {
        prompt += `\n   📎 File: ${task.files.map((f) => f.name).join(", ")}`;
      }
    });
    if (pendingTasks.length > 10) {
      prompt += `\n... dan ${pendingTasks.length - 10} tugas lainnya`;
    }
  }

  // Completed Tasks (recent)
  if (completedTasks && completedTasks.length > 0) {
    const recentCompleted = completedTasks.slice(0, 5);
    prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
    prompt += `\n║                    TUGAS SELESAI (terbaru)                    ║`;
    prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
    recentCompleted.forEach((task, i) => {
      prompt += `\n${i + 1}. ✅ ${task.title}`;
    });
    if (completedTasks.length > 5) {
      prompt += `\n... total ${completedTasks.length} tugas selesai`;
    }
  }

  // Study Sessions (recent)
  if (allSessions && allSessions.length > 0) {
    const recentSessions = allSessions.slice(0, 10);
    prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
    prompt += `\n║                    SESI BELAJAR (terbaru)                   ║`;
    prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
    recentSessions.forEach((session, i) => {
      const date = formatDateTime(session.completedAt);
      const taskInfo = session.taskName ? ` - ${session.taskName}` : "";
      prompt += `\n${i + 1}. 📚 ${session.type}${taskInfo}`;
      prompt += `\n     ⏱️ ${session.duration} menit - ${date}`;
    });
    if (allSessions.length > 10) {
      prompt += `\n... total ${allSessions.length} sesi belajar`;
    }
  }

  // Uniforms (if available)
  if (uniforms && Object.keys(uniforms).length > 0) {
    prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
    prompt += `\n║                    JADWAL SERAGAM                             ║`;
    prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
    const dayMap = {
      monday: "Senin",
      tuesday: "Selasa",
      wednesday: "Rabu",
      thursday: "Kamis",
      friday: "Jumat",
      saturday: "Sabtu",
      sunday: "Minggu",
    };
    Object.entries(uniforms).forEach(([day, uniform]) => {
      if (uniform) {
        const dayName = dayMap[day] || day;
        prompt += `\n• ${dayName}: ${uniform}`;
      }
    });
  }

  // Additional Profile Data
  if (profile) {
    prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
    prompt += `\n║                    DATA TAMBAHAN                              ║`;
    prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
    Object.entries(profile).forEach(([key, value]) => {
      // Skip fields we already displayed
      if (
        ![
          "displayName",
          "name",
          "email",
          "streak",
          "lastLogin",
          "createdAt",
          "password",
        ].includes(key)
      ) {
        if (value && typeof value !== "object") {
          prompt += `\n• ${key}: ${value}`;
        }
      }
    });
  }

  prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
  prompt += `\n║                    INSTRUKSI PENCARIAN AI                       ║`;
  prompt += `\n╚══════════════════════════════════════════════════════════════╝`;

  prompt += `\n\n🔍 CARA PENCARIAN YANG BENAR:`;
  prompt += `\n─────────────────────────────────────────────────────────────`;
  prompt += `\n1. SAAT USER BERTANYA TENTANG TANGGAL/DEADLINE/EVENT:`;
  prompt += `\n   → CEK SEMUA kategori: TUGAS, KALENDER, UJIAN, KELAS`;
  prompt += `\n   → JANGAN hanya fokus pada satu kategori!`;
  prompt += `\n   → Berikan hasil dari SEMUA kategori yang relevan`;

  prompt += `\n\n2. SAAT USER BERTANYA "KAPAN":`;
  prompt += `\n   → Cek deadline tugas`;
  prompt += `\n   → Cek tanggal acara kalender`;
  prompt += `\n   → Cek jadwal ujian`;
  prompt += `\n   → Cek jadwal kelas (mingguan)`;
  prompt += `\n   → Kumpulkan SEMUA dan tampilkan secara lengkap`;

  prompt += `\n\n3. SAAT USER BERTANYA "APA AJA":`;
  prompt += `\n   → List semua item dari kategori yang relevan`;
  prompt += `\n   → Berikan detail tanggal untuk setiap item`;

  prompt += `\n\n4. CONTOH JAWABAN YANG BENAR:`;
  prompt += `\n   "Berikut adalah semua event dengan tanggal:"`;
  prompt += `\n   • Dari Tugas: [list tugas dengan deadline]`;
  prompt += `\n   • Dari Kalender: [list acara dengan tanggal]`;
  prompt += `\n   • Dari Ujian: [list ujian dengan tanggal]`;
  prompt += `\n   • Dari Kelas: [jadwal mingguan kelas]`;

  prompt += `\n\n5. DATA YANG HARUS DICEK UNTUK PERTANYAAN TENTANG EVENT/TANGGAL:`;
  prompt += `\n   ✅ TUGAS dengan dueDate/endDate`;
  prompt += `\n   ✅ ACARA KALENDER dengan date/endDate`;
  prompt += `\n   ✅ UJIAN dengan date/endDate`;
  prompt += `\n   ✅ KELAS dengan jadwal mingguan (days, time)`;

  prompt += `\n\n⚠️ JANGAN:`;
  prompt += `\n   • Jangan hanya memberikan jawaban dari satu sumber data`;
  prompt += `\n   • Jangan mengabaikan kategori lain yang relevan`;
  prompt += `\n   • Jangan asumsi user hanya ingin tahu tentang kelas`;

  prompt += `\n\n✅ GUNAKAN:`;
  prompt += `\n   • SEMUA data yang tersedia untuk jawaban yang lengkap`;
  prompt += `\n   • Berikan jawaban yang mencakup banyak kategori`;
  prompt += `\n   • Jika data tidak ada, katakan dengan jujur`;

  // ── Action capability reminder with today's date ──
  const todayISO = new Date().toISOString().split('T')[0];
  prompt += `\n\n╔══════════════════════════════════════════════════════════════╗`;
  prompt += `\n║                 KEMAMPUAN AKSI APLIKASI                        ║`;
  prompt += `\n╚══════════════════════════════════════════════════════════════╝`;
  prompt += `\n📅 Tanggal hari ini: ${todayISO}`;
  prompt += `\nAnda BISA melakukan aksi aplikasi. Jika user meminta:`;
  prompt += `\n  - Tambah tugas → sertakan JSON action "add_task" di akhir respons`;
  prompt += `\n  - Tambah kelas → sertakan JSON action "add_class"`;
  prompt += `\n  - Tambah event → sertakan JSON action "add_event"`;
  prompt += `\n  - Selesaikan tugas → sertakan JSON action "complete_task"`;
  prompt += `\n  - Hapus tugas → sertakan JSON action "delete_task"`;
  prompt += `\n  - Mulai timer fokus → sertakan JSON action "start_pomodoro_timer"`;
  prompt += `\nFormat JSON ada di system prompt awal. SELALU beri confirmationMessage.`;

  return prompt;
}

/**
 * Get user profile from Firestore
 */
async function getUserProfile() {
  try {
    return await userService.getProfile();
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

/**
 * Get ALL tasks (both pending and completed)
 */
async function getAllTasks() {
  try {
    return await tasksService.getTasks();
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
}

/**
 * Get ALL classes
 */
async function getAllClasses() {
  try {
    return await classesService.getClasses();
  } catch (error) {
    console.error("Error getting classes:", error);
    return [];
  }
}

/**
 * Get ALL study sessions
 */
async function getAllStudySessions() {
  try {
    return await studySessionsService.getSessionsForWeek();
  } catch (error) {
    console.error("Error getting study sessions:", error);
    return [];
  }
}

/**
 * Get uniforms settings
 */
async function getUniforms() {
  try {
    return await uniformsService.getUniforms();
  } catch (error) {
    console.error("Error getting uniforms:", error);
    return {};
  }
}

/**
 * Get calendar events
 */
async function getCalendarEvents() {
  try {
    const user = auth.currentUser;
    if (!user) return [];

    const eventsRef = collection(db, "users", user.uid, "calendarEvents");
    const snapshot = await getDocs(eventsRef);

    const events = [];
    snapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() });
    });

    return events;
  } catch (error) {
    console.error("Error getting calendar events:", error);
    return [];
  }
}

/**
 * Get exams
 */
async function getExams() {
  try {
    const user = auth.currentUser;
    if (!user) return [];

    const examsRef = collection(db, "users", user.uid, "exams");
    const snapshot = await getDocs(examsRef);

    const exams = [];
    snapshot.forEach((doc) => {
      exams.push({ id: doc.id, ...doc.data() });
    });

    return exams;
  } catch (error) {
    console.error("Error getting exams:", error);
    return [];
  }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Hari ini";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return "Besok";
  }

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format date and time for display
 */
function formatDateTime(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Detect intent from user message (simple rule-based)
 * @param {string} message - User message
 * @returns {string} Detected intent
 */
export function detectIntent(message) {
  const lowerMessage = message.toLowerCase();

  // Greeting
  if (
    /^(halo|hi|hello|hey|selamat pagi|selamat siang|selamat malam|assalamualaikum)/i.test(
      lowerMessage,
    )
  ) {
    return "greeting";
  }

  // ── ACTION INTENTS (must be checked before general read intents) ──

  // Add task
  if (
    /(tambah(kan)?\s+(tugas|task|pr)|buat(kan)?\s+(tugas|task|pr)|add\s+task|create\s+task|catat(kan)?\s+tugas)/i.test(
      lowerMessage,
    )
  ) {
    return "add_task";
  }

  // Complete task
  if (
    /(selesai(kan)?\s+(tugas|task)|tandai.*(selesai|done)|mark.*(done|complete)|complete\s+task)/i.test(
      lowerMessage,
    )
  ) {
    return "complete_task";
  }

  // Delete task
  if (
    /(hapus(kan)?\s+(tugas|task)|delete\s+task|remove\s+task|buang\s+tugas)/i.test(
      lowerMessage,
    )
  ) {
    return "delete_task";
  }

  // Add class
  if (
    /(tambah(kan)?\s+(kelas|mata\s*pelajaran|mapel)|buat(kan)?\s+(kelas|mata\s*pelajaran)|add\s+class)/i.test(
      lowerMessage,
    )
  ) {
    return "add_class";
  }

  // Add event
  if (
    /(tambah(kan)?\s+(event|acara|jadwal)|buat(kan)?\s+(event|acara)|add\s+event|catat(kan)?\s+(event|acara))/i.test(
      lowerMessage,
    )
  ) {
    return "add_event";
  }

  // Start Focus timer
  if (
    /((mulai|start)\s+(timer|fokus)|mulai\s+fokus|start\s+focus)/i.test(
      lowerMessage,
    )
  ) {
    return "start_pomodoro_timer";
  }

  // ── READ INTENTS ──

  // Study progress
  if (
    /(progress|kemajuan|berapa (lama|menit|jam)|study time|waktu belajar|streak)/i.test(
      lowerMessage,
    )
  ) {
    return "study_progress";
  }

  // Tasks
  if (
    /(tugas|task|pekerjaan|deadline|pr|pr|ulangan|ujian|quiz)/i.test(
      lowerMessage,
    )
  ) {
    return "task_help";
  }

  // Schedule
  if (
    /(jadwal|kelas|kuliah|pelajaran|next class|kelas berikutnya)/i.test(
      lowerMessage,
    )
  ) {
    return "schedule_query";
  }

  // Timer
  if (/(timer|fokus|start|mulai|pause|stop|break)/i.test(lowerMessage)) {
    return "timer_control";
  }

  // Motivation
  if (
    /(malas|lelah|capek|semangat|motivasi|stres|burnout|help|bantuan)/i.test(
      lowerMessage,
    )
  ) {
    return "motivation";
  }

  // Recommendation
  if (
    /(harus|should|what to|recommend|suggest|apa yang|belajar apa)/i.test(
      lowerMessage,
    )
  ) {
    return "recommendation";
  }

  // Feedback
  if (
    /(terima kasih|thanks|thank you|bermanfaat|helpful|tidak membantu)/i.test(
      lowerMessage,
    )
  ) {
    return "feedback";
  }

  return "general";
}

/**
 * Build conversation history for context
 * @param {Array} messages - Chat messages
 * @param {number} maxMessages - Maximum messages to include
 * @returns {Array} Filtered messages for context
 */
export function buildConversationHistory(messages, maxMessages = 20) {
  // Keep only the most recent messages within limit
  const recentMessages = messages.slice(-maxMessages);

  // Convert to Gemini format
  return recentMessages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : msg.role,
    content: msg.content,
  }));
}

export default {
  buildSystemContext,
  detectIntent,
  buildConversationHistory,
};



