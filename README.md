# GHOSTFACTORY Studio

GHOSTFACTORY Studio คือ local-first web app สำหรับวางแผนและผลิตคอนเทนต์ TikTok/Reels/Shorts แบบ manual AI workflow

## ใช้ทำอะไร

- สร้าง daily content batch
- จัดการ character และ template
- copy prompt ไปใช้กับ ChatGPT หรือเครื่องมือสร้างภาพ/วิดีโอ
- parse ผลลัพธ์กลับมาเป็น EP cards
- save history และ export prompt package ไว้ในเครื่อง

## เริ่มใช้งานแบบง่ายบน Windows

1. กดปุ่ม `Code`
2. เลือก `Download ZIP`
3. แตกไฟล์ ZIP
4. เข้าโฟลเดอร์:

```txt
GHOSTFACTORY-Studio/
```

5. ดับเบิลคลิก:

```txt
launchers/windows/Open-GHOSTFACTORY-Studio.vbs
```

ระบบจะติดตั้ง dependency ถ้ายังไม่มี แล้วเปิดเว็บให้ที่:

```txt
http://127.0.0.1:3000
```

ถ้าต้องการปิดโปรแกรม ให้ดับเบิลคลิก:

```txt
launchers/windows/Close-GHOSTFACTORY-Studio.vbs
```

ถ้า Windows บล็อกไฟล์ `.vbs` ให้ใช้ไฟล์ `.bat` แทน:

```txt
launchers/windows/Start-GHOSTFACTORY-Studio.bat
launchers/windows/Stop-GHOSTFACTORY-Studio.bat
```

## รันด้วย Terminal

ต้องมี Node.js 20 หรือใหม่กว่า

```bash
git clone https://github.com/Benz224/ghostfactory-studio.git
cd ghostfactory-studio/GHOSTFACTORY-Studio
npm install
npm run dev
```

เปิด browser:

```txt
http://localhost:3000
```

## Workflow เบื้องต้น

1. เข้าเมนู `Generator`
2. เลือก `Character`, `Template` และ `Content Goal`
3. กด `Generate`
4. Copy prompt ไปวางใน ChatGPT
5. Copy ผลลัพธ์จาก ChatGPT กลับมาวางในช่อง parse
6. กด `Parse Result`
7. ตรวจ EP cards แล้วกด `Save EP`
8. ใช้ปุ่ม copy frame/video prompt ไปสร้างภาพหรือวิดีโอต่อ

## ข้อมูลถูกเก็บที่ไหน

ข้อมูลทั้งหมดเก็บในเครื่อง:

```txt
GHOSTFACTORY-Studio/data/
GHOSTFACTORY-Studio/output/
```

ไฟล์ที่สร้างจากการใช้งาน เช่น `output/`, `.next/`, `node_modules/` จะไม่ถูกอัปขึ้น GitHub

## คู่มือเต็ม

อ่านรายละเอียดทั้งหมดได้ที่:

```txt
GHOSTFACTORY-Studio/README.md
```
