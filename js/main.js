/* โหลดข่าวจาก data/news.json มาแสดง
   - หน้าแรก (#newsList): แสดงข่าวล่าสุดแบบย่อ ไม่เกิน HOME_LIMIT ชิ้น
   - หน้าข่าวสาร (#newsFull): แสดงทุกข่าวแบบเต็ม + ตัวกรองหมวด
   เพิ่มข่าวใหม่: แก้ไฟล์ data/news.json อย่างเดียว ไม่ต้องแตะ HTML/JS */

const HOME_LIMIT = 6;

/* หมวดข่าว → สี (class ใน theme.css) และลำดับที่แสดงในตัวกรอง
   ถ้าใส่ tag ที่ไม่มีในนี้ จะได้สีเขียวมาตรฐาน */
const TAG_STYLE = {
  "ยกเลิกจำหน่าย": "tag-red",
  "ยาขาดคราว": "tag-orange",
  "เปลี่ยนแปลงผลิตภัณฑ์": "tag-blue",
  "ราคา": "tag-gold",
  "ตัวแทนจำหน่าย": "tag-purple",
  "ประกาศ": "tag-gold",
  "ข่าว": "",
};
const TAG_ORDER = ["ยกเลิกจำหน่าย", "ยาขาดคราว", "เปลี่ยนแปลงผลิตภัณฑ์", "ราคา", "ตัวแทนจำหน่าย", "ประกาศ", "ข่าว"];

function tagClass(tag) {
  const extra = TAG_STYLE[tag] || "";
  return extra ? `tag ${extra}` : "tag";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatThaiDate(isoDate) {
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y + 543}`;
}

/* การ์ดย่อ (หน้าแรก) — กดหัวข้อไปหาข่าวเต็มใน news.html */
function renderCompactCard(item) {
  const titleHtml = `<a href="news.html#${encodeURIComponent(item.id || "")}">${escapeHtml(item.title)}</a>`;
  return `
    <div class="card">
      <span class="${tagClass(item.tag)}">${escapeHtml(item.tag)}</span>
      <h3>${titleHtml}</h3>
      <div class="meta">${formatThaiDate(item.date)}${item.company ? ` · ${escapeHtml(item.company)}` : ""}</div>
      <p>${escapeHtml(item.summary)}</p>
    </div>
  `;
}

/* การ์ดเต็ม (หน้าข่าวสาร) */
function renderFullCard(item) {
  const points = (item.points || []).map((p) => `<li>${escapeHtml(p)}</li>`).join("");
  const pointsHtml = points ? `<ul class="news-points">${points}</ul>` : "";
  const refHtml = item.ref ? `<span class="news-ref">${escapeHtml(item.ref)}</span>` : "";
  const linkHtml = item.link
    ? `<a class="news-source" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">อ่านเพิ่มเติม ↗</a>`
    : "";
  const footer = refHtml || linkHtml ? `<div class="news-footer">${refHtml}${linkHtml}</div>` : "";

  return `
    <article class="card news-card" id="${escapeHtml(item.id || "")}" data-tag="${escapeHtml(item.tag)}">
      <div class="news-head">
        <span class="${tagClass(item.tag)}">${escapeHtml(item.tag)}</span>
        <span class="meta">${formatThaiDate(item.date)}${item.company ? ` · ${escapeHtml(item.company)}` : ""}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="news-summary">${escapeHtml(item.summary)}</p>
      ${pointsHtml}
      ${footer}
    </article>
  `;
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => (a.date < b.date ? 1 : -1));
}

async function fetchNews() {
  const res = await fetch("data/news.json");
  return res.json();
}

const LOAD_FAIL_MSG =
  '<p class="empty-state">โหลดข่าวไม่สำเร็จ (ถ้าเปิดไฟล์ตรงๆ ผ่าน file:// เบราว์เซอร์บล็อก fetch — ให้รันผ่าน local server หรือดูผ่าน GitHub Pages แทน)</p>';

/* ---------- หน้าแรก ---------- */
async function loadHomeNews() {
  const list = document.getElementById("newsList");
  if (!list) return;
  try {
    const items = sortByDateDesc(await fetchNews());
    if (!items.length) {
      list.innerHTML = '<p class="empty-state">ยังไม่มีข่าวประกาศ</p>';
      return;
    }
    list.innerHTML = items.slice(0, HOME_LIMIT).map(renderCompactCard).join("");
  } catch (err) {
    list.innerHTML = LOAD_FAIL_MSG;
    console.error(err);
  }
}

/* ---------- หน้าข่าวสาร ---------- */
async function loadFullNews() {
  const list = document.getElementById("newsFull");
  const filterBar = document.getElementById("newsFilter");
  if (!list) return;
  try {
    const items = sortByDateDesc(await fetchNews());
    if (!items.length) {
      list.innerHTML = '<p class="empty-state">ยังไม่มีข่าวประกาศ</p>';
      return;
    }

    // ตัวกรองหมวด: นับจำนวนต่อหมวด เรียงตาม TAG_ORDER
    const counts = {};
    items.forEach((it) => (counts[it.tag] = (counts[it.tag] || 0) + 1));
    const tags = Object.keys(counts).sort(
      (a, b) => (TAG_ORDER.indexOf(a) + 100) % 100 - (TAG_ORDER.indexOf(b) + 100) % 100
    );
    if (filterBar) {
      filterBar.innerHTML =
        `<button class="chip active" data-tag="">ทั้งหมด <b>${items.length}</b></button>` +
        tags
          .map((t) => `<button class="chip ${TAG_STYLE[t] || ""}" data-tag="${escapeHtml(t)}">${escapeHtml(t)} <b>${counts[t]}</b></button>`)
          .join("");
      filterBar.addEventListener("click", (e) => {
        const btn = e.target.closest(".chip");
        if (!btn) return;
        filterBar.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === btn));
        const tag = btn.dataset.tag;
        list.querySelectorAll(".news-card").forEach((card) => {
          card.hidden = tag !== "" && card.dataset.tag !== tag;
        });
      });
    }

    list.innerHTML = items.map(renderFullCard).join("");

    // ถ้ามาจากลิงก์ #id ให้เลื่อนไปหาข่าวนั้นและไฮไลต์
    const focusHash = () => {
      if (location.hash.length < 2) return;
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (!target) return;
      list.querySelectorAll(".highlight").forEach((c) => c.classList.remove("highlight"));
      target.classList.add("highlight");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    focusHash();
    window.addEventListener("hashchange", focusHash);
  } catch (err) {
    list.innerHTML = LOAD_FAIL_MSG;
    console.error(err);
  }
}

loadHomeNews();
loadFullNews();
