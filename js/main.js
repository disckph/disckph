/* โหลดข่าวจาก data/news.json มาแสดงในหน้าแรก
   เพิ่มข่าวใหม่: แก้ไฟล์ data/news.json อย่างเดียว ไม่ต้องแตะ HTML/JS */

async function loadNews() {
  const list = document.getElementById("newsList");
  if (!list) return;

  try {
    const res = await fetch("data/news.json");
    const items = await res.json();

    if (!items.length) {
      list.innerHTML = '<p class="empty-state">ยังไม่มีข่าวประกาศ</p>';
      return;
    }

    const sorted = [...items].sort((a, b) => (a.date < b.date ? 1 : -1));

    list.innerHTML = sorted
      .map((item) => {
        const tagClass = item.tag === "ประกาศ" ? "tag gold" : "tag";
        const dateThai = formatThaiDate(item.date);
        const titleHtml = item.link
          ? `<a href="${item.link}">${item.title}</a>`
          : item.title;
        return `
          <div class="card">
            <span class="${tagClass}">${item.tag}</span>
            <h3>${titleHtml}</h3>
            <div class="meta">${dateThai}</div>
            <p>${item.summary}</p>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    list.innerHTML =
      '<p class="empty-state">โหลดข่าวไม่สำเร็จ (ถ้าเปิดไฟล์ตรงๆ ผ่าน file:// เบราว์เซอร์บล็อก fetch — ให้รันผ่าน local server หรือดูผ่าน GitHub Pages แทน)</p>';
    console.error(err);
  }
}

function formatThaiDate(isoDate) {
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y + 543}`;
}

loadNews();
