# 📱 Clean Neo-Brutalism To-Do List Mobile Web App

เว็บแอปพลิเคชันจัดการสิ่งที่ต้องทำ (To-Do List) ออกแบบมาสำหรับมือถือโดยเฉพาะ (Mobile-First) ในสไตล์ **Clean Neo-Brutalism** พร้อมฟอนต์ **Kanit (คณิต)** 100% ทั้งระบบ และเชื่อมต่อฐานข้อมูล **Google Sheets แบบ Real-time Two-way Sync**

---

## ✨ จุดเด่น (Features)

- ⚡ **ใช้งานง่าย รวดเร็ว (Zero-friction)**: พิมพ์สิ่งที่ต้องทำแล้วกดเพิ่มได้ทันที เหมาะสำหรับเวลาเร่งรีบ
- 🎨 **สไตล์ Clean Neo-Brutalism**: เส้นขอบหนา 2.5px และเงาฮาร์ดแชโดว์คมชัด 3.5px สบายตา ไม่ลายตา
- 🔤 **ฟอนต์ Kanit 100%**: ใช้ฟอนต์ Kanit จาก Google Fonts สวยงามอ่านง่ายทุกจุด
- 🌈 **มี 6 ธีมสีให้เลือกเปลี่ยนได้ในแอป**:
  1. Warm Oat & Indigo (Default ⭐)
  2. Pastel Pop Retro 🍭
  3. Matcha & Earthy Sage 🍵
  4. Tokyo Sunset 🌇
  5. Monochrome & Yellow ⚡
  6. Midnight Dark Neo 🌙
- 📊 **Google Sheets Database**: ซิงค์ข้อมูลกับ Google Sheet ส่วนตัวได้ฟรี 100% ผ่าน Google Apps Script
- 💾 **Offline-First**: ใช้งานได้ทันทีแม้ไม่มีเน็ต ข้อมูลไม่สูญหาย และจะซิงค์ขึ้น Google Sheet เมื่อออนไลน์
- 📱 **Mobile & PWA Ready**: รองรับการกด "Add to Home Screen" เพื่อใช้งานแบบเต็มจอเสมือน Native App

---

## 🚀 วิธีเปิดใช้งานในเครื่อง (Local)

1. รันเซิร์ฟเวอร์:
   ```bash
   node server.js
   ```
   หรือ
   ```bash
   npm start
   ```
2. เปิดเบราว์เซอร์:
   - **บนคอมพิวเตอร์:** `http://localhost:3000`
   - **บนมือถือ (Wi-Fi เดียวกัน):** `http://<IP-เครื่องของคุณ>:3000`

---

## 📊 วิธีเชื่อมต่อ Google Sheets

อ่านคู่มืออย่างละเอียดได้ที่ [google-sheets-script/SETUP_GUIDE.md](./google-sheets-script/SETUP_GUIDE.md)

1. เปิด [https://sheets.new](https://sheets.new)
2. ไปที่ **ส่วนขยาย (Extensions)** > **Apps Script**
3. วางโค้ดจาก [google-sheets-script/Code.gs](./google-sheets-script/Code.gs)
4. กด **Deploy** > **New deployment** > **Web app** (เลือก Access: **Anyone**)
5. คัดลอก Web App URL มาใส่ในปุ่ม **Google Sheets** บนหน้าเว็บแอป
