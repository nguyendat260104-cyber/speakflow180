# SpeakFlow 180 — Nền Tảng Luyện Tiếng Anh Giao Tiếp Thực Chiến

[![Production](https://img.shields.io/badge/Production-Live-success?style=for-the-badge&logo=vercel)](https://speakflow180.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-speakflow180-181717?style=for-the-badge&logo=github)](https://github.com/nguyendat260104-cyber/speakflow180)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **SpeakFlow 180** là hệ thống luyện nói phản xạ và giao tiếp tiếng Anh 180 ngày chuyên sâu dành riêng cho kỹ sư IT Vận Hành Hệ Thống (DevOps / SRE) và nhân sự Tài Chính & Ngân Hàng (FinTech).

---

## 🚀 Trải Nghiệm Trực Tiếp
- **Website Production:** [https://speakflow180.vercel.app](https://speakflow180.vercel.app)
- **GitHub Repository:** [https://github.com/nguyendat260104-cyber/speakflow180](https://github.com/nguyendat260104-cyber/speakflow180)

---

## 🎯 Điểm Nổi Bật

1. **5 Trục Điều Hướng Tối Ưu Mobile (5 Core Hubs):**
   - 🎯 **Ca Học Tối Nay:** Bộ đếm 45 phút, checklist 3 chặng, XP & Streak tracker.
   - 🗺️ **Lộ Trình 180 Ngày:** 6 giai đoạn từ mất gốc phát âm đến phản xạ tự nhiên.
   - 🎙️ **Luyện Nói & AI Voice Call:** Hội thoại đàm thoại 2 chiều với phản hồi giọng nói tức thì (<50ms fast path).
   - ✍️ **Bài Tập & Phản Xạ:** Shadowing, luyện mẫu câu giao tiếp FinTech & IT.
   - 📚 **Kho Tài Liệu & Sổ Tay:** Thư viện podcast, audio native và Sổ tay từ vựng thông minh.

2. **Chuyên Ngành IT Hệ Thống & Ngân Hàng (FinTech & DevOps):**
   - Nhân vật AI đồng hành: **Marcus Vance** (Tech Lead DevOps & FinTech Systems Architect - SF).
   - Tình huống thực tế: Họp khẩn sự cố hệ thống (`Production Outage Incident`), báo cáo trễ hạn (`Database Latency`), giải trình kiểm toán (`Compliance & Security Audit`), tích hợp cổng thanh toán (`Payment Gateway Integration`).
   - Bảng phát âm thuật ngữ IT chuẩn quốc tế: `cache`, `server`, `database`, `incident`, `latency`, `infrastructure`, `compliance`, `transaction`, `authentication`, `kubernetes`.

3. **Công Nghệ Âm Thanh & AI Phát Âm Theo Chuẩn ELSA:**
   - **Ghi âm & Nghe lại giọng thật:** Tích hợp `MediaRecorder` thu âm giọng nói trực tiếp, cho phép học viên nghe lại giọng mình (`🎧 Nghe lại giọng của bạn`) đối chiếu song song với mẫu người bản xứ (`🔊 Mẫu bản xứ`).
   - **Phiên âm IPA & Khẩu hình miệng:** Hướng dẫn vị trí đặt lưỡi, môi, bật hơi cho từng âm tiết.
   - **Sư phạm Giảng viên 10 năm kinh nghiệm:** AI chỉ ra lỗi dịch thô tiếng Việt (Viet-English) và cung cấp cách diễn đạt chuẩn bản ngữ.

4. **Hệ Thống Đăng Ký, Đăng Nhập & Tự Động Đồng Bộ Đám Mây:**
   - Đăng nhập/Đăng ký theo vai trò công việc.
   - **Vercel Serverless API (`/api/sync`):** Tự động đẩy tiến độ học tập lên đám mây Vercel mỗi khi hoàn thành bài học.
   - **Tự động lưu trữ vào GitHub:** Tự động đồng bộ toàn bộ dữ liệu người dùng vào repository GitHub.
   - **Sao lưu ngoại tuyến:** Xuất/Nhập file `.json` tiện lợi.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend:** HTML5, Modern Vanilla JavaScript (ES6+), Tailwind CSS, Lucide Icons.
- **Audio & Speech:** Web Speech API (`SpeechSynthesis`, `SpeechRecognition`), HTML5 `MediaRecorder` API.
- **Backend Serverless:** Vercel Serverless Node.js Functions (`/api/sync`).
- **Cloud & Storage:** LocalStorage Cache, Vercel Serverless Cache, GitHub REST API Sync.
- **AI Integrations:** Google Gemini Flash API, Groq Llama 3.3 70B API.

---

## 💻 Hướng Dẫn Chạy Cục Bộ (Local Development)

```bash
# 1. Clone repository
git clone https://github.com/nguyendat260104-cyber/speakflow180.git
cd speakflow180

# 2. Mở trực tiếp file index.html trên trình duyệt, hoặc chạy qua local server:
npx serve .
# hoặc
python -m http.server 8080
```

---

## ☁️ Triển Khai Lên Vercel

```bash
# Triển khai Production lên Vercel
npx vercel --prod
```

---

## 📄 Bản Quyền
Dự án được xây dựng và phát triển bởi [nguyendat260104-cyber](https://github.com/nguyendat260104-cyber). Giấy phép MIT.
