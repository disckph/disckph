/* PTC ยื่นเสนอยา — ของที่ใช้ร่วมกัน: สถานะ, ฟอร์มจากนิยามช่อง, ตัวอย่างใบ A4, พิมพ์ */
(function () {
  "use strict";
  var P = window.PTC, esc = P.esc;

  /* สถานะ [ชื่อที่ผู้แทนเห็น, สี pill] — ลำดับตามขั้นงาน */
  P.STATUS = {
    submitted: ["ยื่นออนไลน์แล้ว รอส่งแฟ้ม", "p-info"],
    received:  ["รับแฟ้มแล้ว รอตรวจ", "p-muted"],
    fix:       ["รอแก้ไขเอกสาร", "p-bad"],
    passed:    ["ตรวจผ่าน รอรับแฟ้มไปทำสำเนา", "p-gold"],
    out:       ["แฟ้มอยู่กับผู้แทน", "p-warn"],
    complete:  ["เอกสารครบ รอเข้าที่ประชุม PTC", "p-ok"],
    ptc:       ["เข้าวาระประชุม PTC แล้ว", "p-ok"],
    failed:    ["ไม่ผ่านเกณฑ์ / ไม่นำเสนอ", "p-bad"],
    withdrawn: ["ถอนเรื่อง", "p-muted"]
  };
  P.FLOW = ["submitted", "received", "passed", "complete", "ptc"];
  P.pill = function (s) { var x = P.STATUS[s] || [s, "p-muted"]; return '<span class="pill ' + x[1] + '">' + esc(x[0]) + "</span>"; };

  P.client = function () { var C = window.DIS_CONFIG; return window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY); };
  P.base = function () { return location.href.replace(/[^/]*([?#].*)?$/, ""); };
  P.statusUrl = function (code) { return P.base() + "status.html?c=" + encodeURIComponent(code || ""); };
  P.editUrl = function (code, token) { return P.base() + "submit.html?c=" + encodeURIComponent(code) + "&t=" + encodeURIComponent(token); };
  P.logo = function () { return P.base() + "img/logo-form.png"; };

  var tt;
  P.toast = function (msg) {
    var el = document.getElementById("toast"); if (!el) return;
    el.textContent = msg; el.hidden = false; clearTimeout(tt); tt = setTimeout(function () { el.hidden = true; }, 3200);
  };

  /* ---------- ฟอร์มจากนิยามช่อง ----------
     filter(f) เลือกว่าช่องไหนอยู่ในกล่องนี้ ; prefix กันชื่อ id ซ้ำ */
  P.buildFields = function (container, filter, prefix) {
    container.innerHTML = P.FIELDS.filter(filter).map(function (f) {
      var id = prefix + f.k, star = f.req ? ' <span class="req-star">*</span>' : "", attrs = 'id="' + id + '" data-k="' + f.k + '"';
      var wrapAttr = ' data-wrap="' + f.k + '"' + (f.onlyKind ? ' data-only-kind="' + f.onlyKind + '"' : "") + (f.onlyGroup ? ' data-only-group="' + f.onlyGroup + '"' : "");
      var ph = f.ph ? ' placeholder="' + esc(f.ph) + '"' : "";
      if (f.type === "area") {
        return '<div class="field"' + wrapAttr + '><label for="' + id + '">' + esc(f.label) + star + "</label>" +
          "<textarea " + attrs + ph + ' rows="3"></textarea><div class="fit-note" data-fit="' + f.k + '"></div></div>';
      }
      if (f.type === "select") {
        return '<div class="field"' + wrapAttr + '><label for="' + id + '">' + esc(f.label) + star + "</label><select " + attrs + ">" +
          '<option value="">— เลือก —</option>' + f.opts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>"; }).join("") + "</select></div>";
      }
      if (f.type === "checks") {
        return '<div class="field"' + wrapAttr + '><span class="lbl">' + esc(f.label) + star + '</span><div class="uh-list" ' + attrs + ">" +
          f.opts.map(function (o, i) { return '<label><input type="checkbox" value="' + esc(o) + '" id="' + id + "-" + i + '"> ' + esc(o) + "</label>"; }).join("") + "</div></div>";
      }
      return '<div class="field"' + wrapAttr + '><label for="' + id + '">' + esc(f.label) + star + "</label><input type=\"text\" " + attrs + ph +
        (f.max ? ' maxlength="' + f.max + '"' : "") + "></div>";
    }).join("");
  };
  P.readFields = function (container) {
    var out = {};
    container.querySelectorAll("[data-k]").forEach(function (el) {
      var k = el.dataset.k;
      if (el.classList.contains("uh-list")) out[k] = Array.prototype.map.call(el.querySelectorAll("input:checked"), function (i) { return i.value; });
      else out[k] = el.value.trim();
    });
    return out;
  };
  P.fillFields = function (container, data) {
    data = data || {};
    container.querySelectorAll("[data-k]").forEach(function (el) {
      var v = data[el.dataset.k];
      if (el.classList.contains("uh-list")) el.querySelectorAll("input").forEach(function (i) { i.checked = (v || []).indexOf(i.value) > -1; });
      else el.value = v == null ? "" : v;
    });
  };
  /* ซ่อน/แสดงช่องตามประเภทการเสนอและกลุ่มยา */
  P.toggleConditional = function (root, kind, group) {
    root.querySelectorAll("[data-only-kind]").forEach(function (w) { w.hidden = w.dataset.onlyKind !== kind; });
    root.querySelectorAll("[data-only-group]").forEach(function (w) { w.hidden = w.dataset.onlyGroup !== group; });
  };
  P.missing = function (data, kind, staff) {
    return P.FIELDS.filter(function (f) {
      if (!f.req || (f.owner === "staff" && !staff)) return false;
      if (f.onlyKind && f.onlyKind !== kind) return false;
      if (f.onlyGroup && f.onlyGroup !== data.group) return false;
      var v = data[f.k]; return v == null || (Array.isArray(v) ? !v.length : !String(v).trim());
    }).map(function (f) { return f.label; });
  };
  /* แยกข้อมูลรวมออกเป็น f12 / f11 / ช่องลับ */
  P.split = function (all) {
    var f12 = {}, f11 = {}, conf = {};
    P.FIELDS.forEach(function (f) {
      if (!(f.k in all)) return;
      if (f.owner === "staff") conf[f.k] = all[f.k];
      else if (f.where === "11") f11[f.k] = all[f.k];
      else f12[f.k] = all[f.k];
    });
    return { f12: f12, f11: f11, conf: conf };
  };

  /* ---------- ตัวอย่างกระดาษ (ย่อให้พอดีกล่อง) ---------- */
  P.mountPaper = function (box, html) {
    box.innerHTML = html;
    var paper = box.firstElementChild;
    function fit() {
      var w = box.clientWidth; if (!w) return;
      var s = w / paper.offsetWidth; paper.style.transform = "scale(" + s + ")"; box.style.height = paper.offsetHeight * s + "px";
    }
    fit(); return { paper: paper, fit: fit };
  };

  /* ---------- พิมพ์ ---------- */
  P.print = function (htmlPages) {
    var area = document.getElementById("printArea");
    if (!area) { area = document.createElement("div"); area.id = "printArea"; area.className = "print-only"; document.body.appendChild(area); }
    area.innerHTML = htmlPages.join("");
    var go = function () { window.print(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(go, 50); }); else setTimeout(go, 200);
  };

  /* ---------- ข้อความแจ้งผลรวมช่องที่ล้นกรอบ ---------- */
  P.overflowLabel = function (key) {
    var map = { col1: "1.1 คอลัมน์ข้อมูลทั่วไป", col2: "1.1 คอลัมน์เหตุผลประกอบการพิจารณา", col3: "1.1 คอลัมน์ราคา", col4: "1.1 คอลัมน์โรงพยาบาลอื่น", page12: "ใบ 1.2 ยาวเกิน 1 หน้า (ย่อชื่อหรือข้อมูลบรรทัดเดียว)", page11: "ใบ 1.1 ยาวเกิน 1 หน้า" };
    if (map[key]) return map[key];
    var f = P.FIELDS.filter(function (x) { return x.k === key; })[0];
    return "1.2 " + (f ? f.label : key);
  };
})();
