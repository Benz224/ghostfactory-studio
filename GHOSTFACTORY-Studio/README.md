# GHOSTFACTORY Studio

GHOSTFACTORY Studio คือ Local-first web app สำหรับผลิต TikTok/Reels/Shorts แบบ Multi Character + Multi Template Content Factory ระบบทำงานแบบ Manual AI Mode 100% ไม่มี login, Supabase, cloud database, payment หรือ AI API

Repository: `https://github.com/Benz224/ghostfactory-studio`

## จุดเด่น

- สร้าง daily content batch สำหรับ short-form video
- จัดการ character, template, idea bank และ project ในเครื่อง
- Copy prompt ไปใช้กับ ChatGPT, Nano Banana 2 หรือเครื่องมือ AI อื่นได้
- Parse ผลลัพธ์จาก ChatGPT กลับมาเป็น EP cards
- เช็ค prompt ซ้ำด้วย local history
- Export prompt package เป็นไฟล์ใน `output/`
- ใช้งานแบบ local-first ข้อมูลอยู่ใน JSON files ของโปรเจกต์

## Requirements

- Node.js 20 หรือใหม่กว่า
- npm
- Windows 10/11 ถ้าต้องการใช้ launcher แบบดับเบิลคลิก

Workflow หลัก:

```txt
Generate Batch -> Copy Prompt -> Paste Result -> Parse -> Edit EP -> Save -> Copy F/V -> Generate Image/Video -> Update Checklist -> Posted
```

ระบบบังคับ Character Lock ตามตัวละครที่เลือก เช่น Meow เป็น `fluffy orange tabby cat, orange striped fur, cute expressive face, high quality fur, Pixar-quality 3D animation` และเติม negative rules ใน Image/Video Prompt เพื่อกัน subtitle, text overlay, watermark, logo และ format ที่ไม่ใช่ vertical 9:16

## Quick Start

```bash
git clone https://github.com/Benz224/ghostfactory-studio.git
cd ghostfactory-studio
cd GHOSTFACTORY-Studio
npm install
npm run dev
```

จากนั้นเปิด:

```txt
http://localhost:3000
```

## Windows Launcher

แบบกดใช้งานเหมือนโปรแกรมบน Windows:

```txt
ดับเบิลคลิก launchers/windows/Open-GHOSTFACTORY-Studio.vbs
```

ไฟล์นี้จะเปิด server แบบ background แล้วเปิด Browser ให้อัตโนมัติที่ `http://127.0.0.1:3000`

ถ้าต้องการปิดโปรแกรม:

```txt
ดับเบิลคลิก launchers/windows/Close-GHOSTFACTORY-Studio.vbs
```

ถ้า Windows บล็อกไฟล์ `.vbs` ให้ใช้ `launchers/windows/Start-GHOSTFACTORY-Studio.bat` และ `launchers/windows/Stop-GHOSTFACTORY-Studio.bat` แทน

Launcher จะติดตั้ง dependency ให้เองถ้ายังไม่มี `node_modules`

## Scripts

```bash
npm run dev
npm run build
npm start
```

## Project Structure

```txt
data/                Seed/local JSON data
docs/                Documentation and changelog
launchers/windows/   Double-click launchers for Windows
scripts/             PowerShell start/stop scripts
src/app/             Next.js app routes and API routes
src/components/      UI components
src/lib/             Core storage, prompt, duplicate, generator logic
```

## Local Data

- `data/settings.json` เก็บค่า config เช่นจำนวน EP ต่อวันและ duplicate threshold
- `data/character.json` เก็บ character default ของ Meow
- `data/characters.json` เก็บตัวละครทั้งหมดสำหรับ Character Manager
- `data/templates.json` เก็บ content template ทั้งหมด
- `data/ep-history.json` เก็บ EP ทั้งหมดที่ save แล้ว
- `data/idea-memory.json` เก็บ category count และ keyword/twist memory สำหรับกันมุกซ้ำระยะยาว
- `data/daily-batches/` เก็บ batch template รายวัน
- `output/YYYY-MM-DD/24s/EP-ID/prompts.md` หรือ `output/YYYY-MM-DD/16s/EP-ID/prompts.md` เก็บ markdown export ของแต่ละ EP

## GitHub Hygiene

Repo นี้ตั้งค่าให้เก็บเฉพาะ source code และ seed data ที่จำเป็นสำหรับเริ่มใช้งานใหม่

- ไม่อัป `node_modules/`, `.next/`, `.ghostfactory/`
- ไม่อัปไฟล์ export ใน `output/`
- ไม่อัป batch ที่สร้างเองใน `data/daily-batches/`
- ไม่อัปไฟล์ upload ส่วนตัวใน `public/uploads/`
- เก็บ `package-lock.json` เพื่อให้ติดตั้ง dependency ได้ตรงกัน

## วิธีสร้าง Daily Batch

1. เข้าเมนู `Generator`
2. เลือก `Character`, `Template` และ `Content Goal`
3. ถ้าเลือก `Affiliate` หรือ `Review` ให้กรอก Product Name, Product Problem, Product Benefit และ CTA Text
4. กด `Generate`
5. ระบบสร้าง EP slots ตาม `settings.json`
   - `creditMode: low` = 3 EP เน้น 16s
   - `creditMode: normal` = ใช้ `daily24sCount` + `daily16sCount`
   - `creditMode: high` = 10 EP ถ้า settings รวมยังไม่ถึง 10
6. ทุก EP เริ่มด้วย status `idea`, viralScore `0`, มี character/template/contentGoal metadata และหลีกเลี่ยงแนวที่ใช้บ่อยจาก idea-memory

## Multi Character Workflow

1. เข้าเมนู `Characters`
2. กด `New Character` เพื่อเพิ่มตัวละครใหม่
3. กรอก name, type, description, visual style, personality, rules และ negative rules
4. กด `Save`
5. ถ้าต้องการให้เป็นตัวหลักของ prompt ใหม่ กด `Set Default`
6. ใช้ `Copy Character Lock Prompt` เพื่อ copy lock prompt ของตัวละครนั้นไปใช้เองได้

Meow อยู่ใน `data/characters.json` เป็น default character และระบบเดิมยัง fallback เป็น Meow ถ้า EP เก่าไม่มี character metadata

## Template System

1. เข้าเมนู `Templates`
2. เลือก template ที่มีอยู่ หรือกด `New Template`
3. กรอก category, goal, structure, bestFor, frame/video count และ tone
4. กด `Save`
5. ใช้ `Set Default` เพื่อกำหนด template เริ่มต้น
6. ใช้ `Copy Template Prompt` เพื่อ copy template instruction

Template เริ่มต้นมี 10 แบบ:

- Cute Daily Life
- Cat Logic
- Sigma Cat
- Horror Comedy
- Fake Documentary
- POV
- Product Review
- Problem Solution
- Affiliate Soft Sell
- Top 3 Product Reasons

## Affiliate Mode

ในหน้า Generator เลือก `Content Goal` เป็น `Affiliate` หรือ `Review` แล้วกรอก:

- Product Name
- Product Problem
- Product Benefit
- CTA Text

Prompt จะใช้โครง:

```txt
Hook ภายใน 3 วินาที -> Problem -> Character Reaction -> Product as Solution -> Soft CTA
```

กฎสำคัญ:

- ห้ามขายแข็งเกินไป
- ห้ามพูดเกินจริง
- ห้ามอ้างสรรพคุณเกินจริง
- ให้เป็นคอนเทนต์สนุกก่อน ขายทีหลัง
- หลีกเลี่ยงคำว่า “ดีที่สุด”, “แก้ได้ 100%”, “รับประกันผล”

## How to create a new character

สร้างจากหน้า `Characters` แล้วกด Save ระบบจะเขียนลง `data/characters.json` ทันที ตัวละครใหม่จะไปปรากฏใน dropdown หน้า Generator โดยไม่ต้องเพิ่ม code

## How to create a new content template

สร้างจากหน้า `Templates` แล้วกด Save ระบบจะเขียนลง `data/templates.json` ทันที Template ใหม่จะไปปรากฏใน dropdown หน้า Generator

## How to generate affiliate-style content without hard selling

1. เลือก Character ที่เหมาะกับช่อง
2. เลือก Template เช่น `Affiliate Soft Sell`, `Product Review` หรือ `Problem Solution`
3. ตั้ง `Content Goal` เป็น `Affiliate` หรือ `Review`
4. ใส่ product brief ให้ชัด แต่ไม่ exaggerate
5. Copy JSON Prompt ไปใช้ ChatGPT
6. ตรวจว่าผลลัพธ์เป็นคอนเทนต์สนุกก่อนขาย และ CTA เป็น soft CTA เท่านั้น

## วิธี Copy Prompt ไปใช้ ChatGPT

- กด `Copy Daily Prompt Markdown` เพื่อ copy prompt แบบ Markdown
- กด `Copy Daily Prompt JSON` เพื่อ copy prompt แบบ JSON ที่ parse ง่าย
- กด `Copy Daily AI Prompt With History` เพื่อ copy prompt พร้อมรายการ EP เก่า 20-50 EP ล่าสุดและ idea-memory
- กด `Copy Full Daily Package` เพื่อ copy prompt พร้อม slot 6 EP, format, category, history และ idea-memory

นำ prompt ไปวางใน ChatGPT Plus แล้วให้ตอบตาม format ที่ระบุไว้ใน prompt

## วิธี Parse ผลลัพธ์จาก ChatGPT

1. Copy ผลลัพธ์จาก ChatGPT
2. วางในช่อง `Paste ChatGPT Result`
3. กด `Parse Result`
4. ระบบจะแปลงผลลัพธ์เป็น EP Cards, เช็ค duplicate ทันที และแสดง Parse Health ของแต่ละ EP

Parser รองรับ:

- Markdown จริงจาก GPT เช่น `## EP01`, `**Format:**`, `#### F1`, `### Voice Script`
- JSON object
- JSON array
- Markdown + JSON ผสม
- video subfields: `camera`, `motion`, `audio`, `dialogue`, `mood`

รายละเอียด debug ถูกซ่อนไว้ใน Advanced Mode เพื่อให้หน้า Generator ยังเป็น creative workspace

## วิธี Save EP

- กด `Save EP` ในการ์ดที่ต้องการบันทึก
- หรือกด `Save All Non-Duplicate` เพื่อ save ทุก EP ที่ไม่ซ้ำ

ก่อน save ระบบจะ validate field สำคัญและเตือนถ้า Parse Health ต่ำกว่า 80 แต่ยังอนุญาตให้ยืนยัน save ได้ ก่อนบันทึกจริงระบบจะเรียก duplicate checker ทุกครั้ง ถ้าซ้ำหรือคล้ายมากจะไม่บันทึก

หลัง save สำเร็จ:

- status เป็น `prompt_ready`
- ปุ่มเปลี่ยนเป็น `Saved`
- update `data/ep-history.json`
- update `data/idea-memory.json`
- export package ไปที่ `output/YYYY-MM-DD/format/EP-ID/`

ไฟล์ที่ export:

- `prompts.md`
- `frames.txt`
- `videos.txt`
- `caption.txt`
- `voice-script.txt`
- `ep.json`

## Copy ไปใช้กับ Nano Banana / เครื่องมือ AI อื่น

ในแต่ละ EP Card มีปุ่ม:

- `Copy All Frames`
- `Copy F prompt` ต่อ frame
- `Copy All Videos`
- `Copy V prompt` ต่อ video
- `Copy Voice Script`
- `Copy Caption + Hashtags`

ใช้ปุ่มเหล่านี้เพื่อ copy prompt จาก EP ปัจจุบันไปสร้างภาพหรือวิดีโอในเครื่องมือภายนอกแบบ manual workflow

## Status Workflow

EP รองรับ status:

- `idea`
- `prompt_ready`
- `frame_ready`
- `video_ready`
- `posted`
- `archived`

หน้า Library แสดง status, filter ตาม status และแก้ status กลับลง `data/ep-history.json` ได้

## Production Checklist

ทุก EP มี checklist:

- Image F1-Fn ตามจำนวน frames จริง
- Video V1-Vn ตามจำนวน videos จริง
- Edited
- Posted

Checklist รองรับจำนวน frame/video จริง และบันทึกกลับลง EP ได้จากหน้า Library

## Library Filters

หน้า Library filter ได้ด้วย:

- search title/story/hook
- date
- format
- category
- character
- template
- content goal
- affiliate / non affiliate
- status
- posted / not posted
- has missing prompt
- parse health warning

## วิธีเช็ค EP ซ้ำ

ระบบกันซ้ำมี 2 ชั้น:

1. `Copy Daily AI Prompt With History` จะเอา EP เก่าไปใส่ท้าย prompt เพื่อให้ ChatGPT หลีกเลี่ยงตั้งแต่ตอนคิด
2. หลัง `Parse Result` ระบบจะเช็ค similarity กับ `data/ep-history.json` ทันที และก่อน `Save EP` / `Save All Non-Duplicate` ฝั่ง API จะเช็คซ้ำอีกครั้งเสมอ ถ้าซ้ำหรือคล้ายมากจะไม่บันทึก

ระบบอ่าน EP เก่าจาก `data/ep-history.json` แล้วเทียบข้อมูล:

- `title`
- `story`
- `hook`
- `category`

จากนั้น normalize text, ตัดเครื่องหมายวรรคตอน, แยก token และคำนวณ similarity แบบ Jaccard/character n-gram ถ้าคะแนนมากกว่า `duplicateSimilarityThreshold` ใน `settings.json` จะถือว่าซ้ำ

## วิธีใช้กับ Nano Banana 2 / เครื่องมือ AI อื่น

1. Save EP ให้เรียบร้อย
2. เปิด Library แล้วกด `Copy F` หรือ `Copy All Frames` เพื่อสร้างภาพ
3. กด `Copy V` หรือ `Copy All Videos` เพื่อสร้างวิดีโอ
4. ใช้ `Caption` และ `Hashtags` สำหรับโพสต์ TikTok/Reels/Shorts

## หมายเหตุ Phase 1

- Manual AI Mode เท่านั้น
- ไม่เรียก ChatGPT API
- ไม่ใช้ระบบ Login/User
- ไม่ใช้ Cloud Database
- ทุกอย่างเก็บใน local JSON และ local files
