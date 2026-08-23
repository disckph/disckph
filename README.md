# เว็บไซต์งานเภสัชสนเทศ (DIS Site)

เว็บสถิตย์ (static site) ล้วน — HTML/CSS/JS ธรรมดา ไม่มี build step ไม่มี backend
แก้ไฟล์แล้ว push ขึ้น GitHub ก็ขึ้นเว็บจริงทันทีผ่าน GitHub Pages ฟรี

## โครงสร้างไฟล์

```
dis-site/
├── index.html          หน้าแรก + ข่าว
├── css/theme.css        สีธีม (CI กทม.: เขียว #00744B + ทอง) แก้ที่นี่ที่เดียว
├── js/partials.js       เมนู/ฟุตเตอร์ที่ใช้ร่วมทุกหน้า
├── js/main.js           โหลดข่าวจาก data/news.json มาแสดง
└── data/news.json       รายการข่าว — เพิ่มข่าวใหม่แก้ไฟล์นี้อย่างเดียว
```

## วิธีเพิ่มข่าว

เปิด `data/news.json` เติม object ใหม่ในลิสต์ เช่น:

```json
{
  "date": "2026-09-01",
  "tag": "ประกาศ",
  "title": "หัวข้อข่าว",
  "summary": "สรุปสั้นๆ",
  "link": ""
}
```

`tag` แนะนำให้ใช้ "ประกาศ" (ขึ้นสีทอง) หรือ "ข่าว" (สีเขียว) ไม่ต้องแก้ HTML/JS

## วิธีดูตัวอย่างก่อน publish

เปิด `index.html` ตรงๆ ผ่าน double-click **จะโหลดข่าวไม่ได้** เพราะเบราว์เซอร์บล็อก fetch บน `file://`
ให้รัน local server แทน (เลือกอย่างใดอย่างหนึ่ง):

```bash
# ถ้ามี Python
python -m http.server 8000
```

แล้วเปิด `http://localhost:8000` — หรือใช้ preview ผ่าน Claude Code ก็ได้เลย

## วิธีขึ้นเว็บจริงด้วย GitHub Pages (ฟรี)

1. สร้าง repo ใหม่บน GitHub (public หรือ private ก็ได้ — Pages ใช้ได้ทั้งคู่ถ้า public, private ต้องมี GitHub Pro)
2. push โฟลเดอร์นี้ทั้งหมดขึ้น repo (branch `main`)
3. ไปที่ repo → **Settings → Pages**
4. ตั้ง **Source: Deploy from a branch**, เลือก branch `main`, folder `/(root)`
5. รอ 1-2 นาที เว็บจะขึ้นที่ `https://<username>.github.io/<repo-name>/`

ถ้าอยากผูกโดเมนของ รพ. เองในอนาคต ตั้งค่าเพิ่มได้ที่ Settings → Pages → Custom domain ทีหลังได้เลย ไม่ต้องแก้โค้ด

## ขยายเพิ่มหน้าใหม่ (Policy, ทะเบียนยา, Database links, ฯลฯ)

1. สร้างไฟล์ `.html` ใหม่ในโฟลเดอร์นี้ (เช่น `policy.html`)
2. copy โครง `<header>`/`<footer>`/script tags จาก `index.html`
3. ตั้ง `data-active="policy"` ใน `<header id="site-header">` ให้ตรงกับ key ใน `js/partials.js`
4. ไปแก้ `js/partials.js` เอา `soon: true` ของเมนูนั้นออก แล้วเว็บทุกหน้าจะลิงก์ไปหาได้ทันที — ธีมสี/ฟอนต์เหมือนหน้าแรกอัตโนมัติเพราะใช้ `css/theme.css` ร่วมกัน
