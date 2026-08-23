/* Header/Footer ใช้ร่วมกันทุกหน้า — แก้เมนูที่นี่ที่เดียว หน้าอื่นอัปเดตตาม
   วิธีใช้ในแต่ละหน้า: <div id="site-header" data-active="home"></div>
                       <div id="site-footer"></div>
   แล้วแนบ <script src="js/partials.js"></script> ท้ายหน้า (ปรับ path ../ ตามความลึกของโฟลเดอร์) */

const NAV_ITEMS = [
  { key: "home", label: "หน้าแรก / ข่าว", href: "index.html" },
  { key: "policy", label: "Policy PTC", href: "policy.html", soon: true },
  { key: "registry", label: "อัพเดททะเบียนยา", href: "registry.html", soon: true },
  { key: "links", label: "Database ภายนอก", href: "links.html", soon: true },
  { key: "catalog", label: "Drug Catalog", href: "catalog.html", soon: true },
  { key: "dashboard", label: "Dashboard", href: "dashboard.html", soon: true },
];

function renderHeader() {
  const el = document.getElementById("site-header");
  if (!el) return;
  const active = el.dataset.active || "";

  const navHtml = NAV_ITEMS.map((item) => {
    if (item.soon) {
      return `<li><a class="disabled" href="#" onclick="return false;">${item.label}<span class="soon-tag">เร็วๆ นี้</span></a></li>`;
    }
    const cls = item.key === active ? "active" : "";
    return `<li><a class="${cls}" href="${item.href}">${item.label}</a></li>`;
  }).join("");

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
        <ul>${navHtml}</ul>
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
