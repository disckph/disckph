/* Header/Footer ใช้ร่วมกันทุกหน้า — แก้เมนูที่นี่ที่เดียว หน้าอื่นอัปเดตตาม
   วิธีใช้ในแต่ละหน้า: <div id="site-header" data-active="home"></div>
                       <div id="site-footer"></div>
   แล้วแนบ <script src="js/partials.js"></script> ท้ายหน้า (ปรับ path ../ ตามความลึกของโฟลเดอร์)

   โครงสร้างเมนู: รายการที่มี href = ลิงก์เดี่ยว, รายการที่มี children = dropdown
   ใส่ data-active ตรงกับ key ของลิงก์เดี่ยว หรือ key ของ parent ถ้าอยู่ในหน้าลูกของ dropdown นั้น */

const NAV_ITEMS = [
  { key: "home", label: "หน้าแรก", href: "index.html" },
  { key: "news", label: "ข่าวสาร", href: "news.html", soon: true },
  {
    key: "policy",
    label: "คู่มือ/ระเบียบ",
    children: [
      { key: "sop", label: "ระเบียบปฏิบัติกลุ่มงานเภสัชกรรม", href: "sop.html", soon: true },
      { key: "dis-knowledge", label: "ความรู้และบริการงานเภสัชสนเทศ", href: "dis-knowledge.html", soon: true },
    ],
  },
  {
    key: "database",
    label: "ฐานข้อมูล",
    children: [
      { key: "registry", label: "ทะเบียนยา/เวชภัณฑ์", href: "registry.html", soon: true },
      { key: "links", label: "Database ภายนอก", href: "links.html", soon: true },
      { key: "dashboard", label: "Dashboard", href: "dashboard.html" },
    ],
  },
  {
    key: "resources",
    label: "คลังทรัพยากร",
    children: [
      { key: "downloads", label: "โปรแกรม/ดาวน์โหลด", href: "downloads.html", soon: true },
      { key: "elearning", label: "E-learning", href: "elearning.html", soon: true },
      { key: "media", label: "สื่อการเรียนการสอน", href: "media.html", soon: true },
    ],
  },
  { key: "academic", label: "ผลงานวิชาการ", href: "academic.html", soon: true },
];

function renderNavLink(item, active) {
  if (item.soon) {
    return `<a class="disabled" href="#" onclick="return false;">${item.label}<span class="soon-tag">เร็วๆ นี้</span></a>`;
  }
  const cls = item.key === active ? "active" : "";
  return `<a class="${cls}" href="${item.href}">${item.label}</a>`;
}

function renderNav(active) {
  return NAV_ITEMS.map((item) => {
    if (item.children) {
      const isActiveGroup = item.children.some((c) => c.key === active);
      const childrenHtml = item.children
        .map((child) => `<li>${renderNavLink(child, active)}</li>`)
        .join("");
      return `
        <li class="nav-dropdown">
          <button class="dropdown-trigger ${isActiveGroup ? "active" : ""}" type="button">
            ${item.label} <span class="caret">&#9662;</span>
          </button>
          <ul class="dropdown-panel">${childrenHtml}</ul>
        </li>
      `;
    }
    return `<li>${renderNavLink(item, active)}</li>`;
  }).join("");
}

function renderHeader() {
  const el = document.getElementById("site-header");
  if (!el) return;
  const active = el.dataset.active || "";

  el.innerHTML = `
    <div class="nav-pill">
      <a class="brand" href="index.html">
        <span class="logo-badge">DIS</span>
        <span>
          งานเภสัชสนเทศ
          <span class="brand-sub">Drug Information Service</span>
        </span>
      </a>
      <nav class="main-nav" id="mainNav">
        <ul>${renderNav(active)}</ul>
      </nav>
      <button class="theme-toggle" id="themeToggle" aria-label="สลับโหมดมืด/สว่าง"></button>
      <button class="nav-toggle" id="navToggle" aria-label="เมนู">&#9776;</button>
    </div>
  `;

  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
  }

  // Dropdown: คลิกเปิด/ปิด, เปิดได้ทีละอันเดียว, คลิกนอกเมนูปิดหมด
  const dropdowns = el.querySelectorAll(".nav-dropdown");
  dropdowns.forEach((dd) => {
    const trigger = dd.querySelector(".dropdown-trigger");
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dd.classList.contains("open");
      dropdowns.forEach((other) => other.classList.remove("open"));
      dd.classList.toggle("open", !isOpen);
    });
  });
  document.addEventListener("click", () => {
    dropdowns.forEach((dd) => dd.classList.remove("open"));
  });

  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    const setIcon = () => {
      themeBtn.textContent = document.documentElement.dataset.theme === "dark" ? "☀️" : "🌙";
    };
    setIcon();
    themeBtn.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("dis-theme", next);
      setIcon();
    });
  }
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  const year = new Date().getFullYear() + 543; // พ.ศ.
  el.innerHTML = `
    <div class="container footer-grid">
      <div>
        &copy; ${year} งานเภสัชสนเทศ กลุ่มงานเภสัชกรรม<br />
        โรงพยาบาลเจริญกรุงประชารักษ์ สำนักการแพทย์ กรุงเทพมหานคร
      </div>
      <div>จัดทำเพื่อการสื่อสารภายในหน่วยงาน</div>
    </div>
  `;
}

renderHeader();
renderFooter();
