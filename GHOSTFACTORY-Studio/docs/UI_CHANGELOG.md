# UI_CHANGELOG

## GHOSTFACTORY Studio v0.3 UI Refresh

เป้าหมายของรอบนี้คือเปลี่ยนความรู้สึกจาก dashboard/CMS ให้เป็น Simple Creative Workspace สำหรับผลิต TikTok/Reels/Shorts ของ Meow โดยยังคง Manual AI Mode และ local-first workflow เดิมไว้ครบ

## Component ที่เปลี่ยน

### App Shell

- เปลี่ยน `src/app/layout.tsx` จาก top navigation เป็น sidebar ซ้ายบน desktop และ top compact nav บน mobile
- ใช้ navigation หลัก 3 จุด: Generator, Library, Settings
- ใช้ color system ใหม่ตาม palette ที่กำหนดเท่านั้น

### Generator Workspace

- เปลี่ยน `src/components/DailyBatchView.tsx` เป็น workspace แบบ card grid
- เพิ่ม top action bar หลัก 4 ปุ่ม: Generate, Save, Export, Library
- EP แสดงเป็น card ใหญ่ ไม่แสดง prompt ยาวใน card
- Card แสดงเฉพาะ title, category, hook, story summary, frame count, video count, status และ actions
- ปุ่ม Open เปิด drawer/modal ในหน้าเดิม
- EP Detail ใช้ accordion 5 ส่วน: Story, Frames, Videos, Caption, Production
- Production มี checklist และ progress bar ต่อ EP
- Advanced Mode ซ่อนข้อมูล parse debug, duplicate detail และ prompt history

### Home

- เปลี่ยน `src/app/page.tsx` จากหน้าสถิติเป็น creative entry point
- แสดง workflow แบบเข้าใจเร็ว: Generate, Copy Prompt, Create Clips, Mark Done
- ลด metric/dashboard language ออกจาก first screen

### Library

- ปรับ `src/app/library/page.tsx` ให้ card-based และใช้ visual style เดียวกับ Studio
- ยังคง search/filter/status/checklist/copy prompt เดิมไว้
- ลดความรู้สึกเป็น admin list ด้วย soft cards, badge และ palette ใหม่

### Settings

- ปรับ `src/components/SettingsForm.tsx` และ `src/app/settings/page.tsx` ให้เข้ากับ visual system ใหม่
- ยังคงบันทึก local `data/settings.json` เหมือนเดิม

## File ที่แก้

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/app/generator/page.tsx`
- `src/app/library/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/DailyBatchView.tsx`
- `src/components/PromptBlock.tsx`
- `src/components/SettingsForm.tsx`
- `tailwind.config.ts`
- `package.json`
- `package-lock.json`

## UX เหตุผล

- ผู้ใช้ควรเข้าใจใน 5 วินาทีว่าต้อง Generate, Copy Prompt, สร้างคลิป และ Mark Done
- Prompt ยาว, parse debug และ duplicate metrics ไม่ควรแย่งพื้นที่จากงานสร้างสรรค์ จึงย้ายไป Advanced Mode
- EP card ควรเป็นหน่วยงานสร้างคลิป ไม่ใช่ row ในระบบจัดการข้อมูล
- Drawer/modal ช่วยให้ผู้ใช้เปิดดูรายละเอียด EP โดยไม่หลุดจาก context ของ batch วันนี้
- Accordion ทำให้ข้อมูลหนาแน่นบนมือถือยังใช้งานได้
- Soft shadow, rounded 14px+ และ palette อุ่นช่วยลดความรู้สึกเป็น admin panel

## Before vs After

### Before

- หน้าแรกเน้นจำนวน EP และ metric
- Generator แสดงข้อมูล technical มากเกินไปในหน้าเดียว
- EP card มี prompt/debug/parse health ให้เห็นตลอด
- Layout ให้ความรู้สึกเหมือน developer dashboard หรือ CMS

### After

- หน้าแรกเป็น creative workspace entry
- Generator มี action bar สั้นและ EP grid
- EP card อ่านเร็วและเปิด detail เมื่อจำเป็น
- Prompt/debug/duplicate detail ถูกซ่อนใน Advanced Mode
- Production checklist และ progress bar ทำให้ workflow จาก prompt ไปถึง posted ชัดขึ้น

## Build Verification

รัน `npm run build` แล้วผ่านด้วย Next.js production build
