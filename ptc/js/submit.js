/* หน้าผู้แทน: ยื่นใหม่ / แก้ไขด้วยลิงก์ (submit.html?c=P70-001&t=<token>) */
(function () {
  "use strict";
  var P = window.PTC, sb = P.client();
  var $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search), editCode = qs.get("c"), editToken = qs.get("t");
  var saved = null;            // {code, token, created_at} หลังบันทึก
  var pv = "12", mounted = null, DRAFT = "ptc-draft-v1";

  /* ---------- สร้างฟอร์ม ---------- */
  var isRep = function (f) { return f.owner !== "staff"; };
  P.buildFields($("fsBoth"), function (f) { return isRep(f) && f.where === "both"; }, "x-");
  P.buildFields($("fs12"), function (f) { return isRep(f) && f.where === "12"; }, "x-");
  P.buildFields($("fs11"), function (f) { return isRep(f) && f.where === "11" && f.type !== "area" && f.type !== "checks"; }, "x-");
  P.buildFields($("fs11b"), function (f) { return isRep(f) && f.where === "11" && (f.type === "area" || f.type === "checks"); }, "x-");
  $("deptList").innerHTML = P.DEPTS.map(function (d) { return "<option>" + P.esc(d) + "</option>"; }).join("");

  function kind() { return document.querySelector('input[name="kind"]:checked').value; }
  function collect() {
    var all = P.readFields($("f"));
    var s = P.split(all);
    return { kind: kind(), rep_name: $("rep_name").value.trim(), company: $("company").value.trim(),
      email: $("email").value.trim(), phone: $("phone").value.trim(), dept: $("dept").value.trim(), f12: s.f12, f11: s.f11 };
  }
  function fill(d) {
    ["rep_name", "company", "email", "phone", "dept"].forEach(function (k) { $(k).value = d[k] || ""; });
    document.querySelectorAll('input[name="kind"]').forEach(function (i) { i.checked = i.value === (d.kind || "new"); });
    P.fillFields($("f"), Object.assign({}, d.f12 || {}, d.f11 || {}));
  }
  function docData() {
    var d = collect();
    d.code = saved ? saved.code : null; d.created_at = saved ? saved.created_at : null;
    d.statusUrl = saved ? P.statusUrl(saved.code) : null; d.logo = P.logo();
    return d;
  }

  /* ---------- ตัวอย่าง A4 + ตรวจล้นกรอบ ---------- */
  var overs = { "12": [], "11": [] };
  function render() {
    var d = docData();
    P.toggleConditional($("f"), d.kind, d.f12.group);
    // วัดทั้ง 2 ใบ (ใบที่ไม่ได้โชว์วัดในกล่องซ่อน)
    ["12", "11"].forEach(function (w) {
      var html = w === "12" ? P.render12(d) : P.render11(d, null);
      if (w === pv) { mounted = P.mountPaper($("pvBox"), html); overs[w] = P.overflow(mounted.paper); }
      else { var hb = hidden(); hb.innerHTML = html; overs[w] = P.overflow(hb.firstElementChild); }
    });
    // จำนวนบรรทัดของช่อง 10-12 ในใบ 1.2
    var hb12 = pv === "12" ? mounted.paper : hidden().firstElementChild;
    if (pv !== "12") { hidden().innerHTML = P.render12(d); hb12 = hidden().firstElementChild; }
    hb12.querySelectorAll(".box").forEach(function (b) {
      var k = b.dataset.box, note = document.querySelector('[data-fit="' + k + '"]'), ta = $("x-" + k);
      if (!note) return;
      var used = P.linesUsed(b), over = b.classList.contains("over");
      var max = P.BOX_LINES[k];
      note.innerHTML = over ? '<span class="bad">ล้นกรอบในใบ 1.2 (เกิน ' + max + ' บรรทัด) กรุณาย่อ</span><span>' + ta.value.length + " ตัวอักษร</span>"
        : "<span>ใบ 1.2 ใช้ " + used + " จาก " + max + " บรรทัด (รวมหัวข้อ)</span><span>" + ta.value.length + " ตัวอักษร</span>";
      ta.classList.toggle("over", over);
    });
    var all = overs["12"].concat(overs["11"]);
    $("fitbar").className = "fitbar " + (all.length ? "bad" : "ok");
    $("fitbar").textContent = all.length ? "ล้นกรอบ: " + all.map(P.overflowLabel).join(", ") : "พอดี A4 ทั้ง 2 ใบ";
    saveDraft();
  }
  var hiddenBox;
  function hidden() {
    if (!hiddenBox) { hiddenBox = document.createElement("div"); hiddenBox.setAttribute("aria-hidden", "true");
      hiddenBox.style.cssText = "position:absolute;left:-10000px;top:0;visibility:hidden"; document.body.appendChild(hiddenBox); }
    return hiddenBox;
  }
  var rt;
  function schedule() { clearTimeout(rt); rt = setTimeout(render, 150); }
  $("f").addEventListener("input", schedule);
  $("f").addEventListener("change", schedule);
  document.querySelectorAll("[data-pv]").forEach(function (b) {
    b.addEventListener("click", function () {
      pv = b.dataset.pv; document.querySelectorAll("[data-pv]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); render();
    });
  });
  window.addEventListener("resize", function () { if (mounted) mounted.fit(); });

  /* ---------- ร่างในเครื่อง ---------- */
  function saveDraft() { if (editCode || saved) return; try { localStorage.setItem(DRAFT, JSON.stringify(collect())); } catch (e) {} }
  function loadDraft() { try { var d = JSON.parse(localStorage.getItem(DRAFT) || "null"); if (d) fill(d); } catch (e) {} }

  /* ---------- บันทึก ---------- */
  function showErr(msg) { $("err").textContent = msg; $("err").hidden = !msg; if (msg) $("err").scrollIntoView({ block: "center" }); }
  $("f").addEventListener("submit", async function (e) {
    e.preventDefault(); showErr("");
    var d = collect(), miss = [];
    if (!d.rep_name) miss.push("ชื่อผู้แทน"); if (!d.company) miss.push("บริษัท");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) miss.push("อีเมลที่ถูกต้อง");
    if (d.phone.replace(/\D/g, "").length < 9) miss.push("เบอร์โทรศัพท์ (อย่างน้อย 9 หลัก)");
    if (!d.dept) miss.push("กลุ่มงานของแพทย์ผู้เสนอ");
    miss = miss.concat(P.missing(Object.assign({}, d.f12, d.f11), d.kind, false));
    if (!$("consent").checked) miss.push("การยินยอมและรับรองข้อมูล");
    if (miss.length) return showErr("กรุณากรอก: " + miss.join(", "));
    render();
    // ใบ 1.2 ต้องพอดี 1 หน้า (บล็อกการบันทึก) ส่วนใบ 1.1 เภสัชกรปรับเองได้ จึงแค่เตือน
    var over = overs["12"];
    if (over.length) return showErr("ข้อความล้นกรอบ A4: " + over.map(P.overflowLabel).join(", ") + " กรุณาย่อข้อความก่อนบันทึก");
    $("saveBtn").disabled = true;
    try {
      var r;
      if (editCode) {
        r = await sb.rpc("ptc_update", { c: editCode, t: editToken, p: d });
        if (r.error) throw r.error;
        P.toast("บันทึกการแก้ไขแล้ว");
      } else {
        r = await sb.rpc("ptc_submit", { p: d });
        if (r.error) throw r.error;
        saved = r.data; editCode = saved.code; editToken = saved.token;
        try { localStorage.removeItem(DRAFT); } catch (e2) {}
        try { history.replaceState(null, "", P.editUrl(saved.code, saved.token)); } catch (e3) {}
        P.toast("บันทึกแล้ว ได้เลขรับ " + saved.code);
      }
      showReceipt();
    } catch (err) {
      console.error(err);
      showErr(String(err.message || err).indexOf("locked") > -1 ? "เอกสารนี้ถูกล็อกแล้ว แก้ไขไม่ได้ กรุณาติดต่องานเภสัชสนเทศ"
        : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อ dis.ckph@gmail.com");
    } finally { $("saveBtn").disabled = false; }
  });

  function showReceipt() {
    $("receipt").hidden = false; $("rcCode").textContent = saved.code;
    $("rcEdit").value = P.editUrl(saved.code, editToken);
    $("rcQr").innerHTML = P.qrSvg(P.statusUrl(saved.code), 3);
    $("saveBtn").textContent = "บันทึกการแก้ไข";
    $("draftNote").hidden = true;
    render(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $("rcCopy").addEventListener("click", function () {
    var v = $("rcEdit").value;
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { P.toast("คัดลอกลิงก์แล้ว"); },
      function () { $("rcEdit").select(); });
  });
  document.querySelectorAll("[data-word]").forEach(function (b) {
    b.addEventListener("click", function () {
      var d = docData(), name = saved.code + " ใบ " + (b.dataset.word === "12" ? "1.2 " : "1.1 ") + (d.f12.trade || "");
      if (b.dataset.word === "12") P.downloadDocx12(d, name);
      else P.wordDoc(P.render11(d, null), true, P.WORD_CSS, name);
    });
  });
  document.querySelectorAll("[data-print]").forEach(function (b) {
    b.addEventListener("click", function () {
      var d = docData(), w = b.dataset.print, pages = [];
      if (w === "12" || w === "both") pages.push(P.render12(d));
      if (w === "11" || w === "both") pages.push(P.render11(d, null));
      P.print(pages);
    });
  });

  /* ---------- เริ่ม ---------- */
  async function init() {
    if (editCode && editToken) {
      $("pageTitle").textContent = "แก้ไขเอกสาร " + editCode; $("modeEyebrow").textContent = "แก้ไขข้อมูลที่ยื่นไว้";
      var r = await sb.rpc("ptc_get", { c: editCode, t: editToken });
      if (r.error || !r.data) { showErr("ไม่พบเอกสาร ลิงก์อาจไม่ถูกต้อง"); $("saveBtn").disabled = true; render(); return; }
      fill(r.data); $("consent").checked = true;
      saved = { code: r.data.code, token: editToken, created_at: r.data.created_at };
      showReceipt();
      if (!r.data.editable) {
        $("lockNotice").hidden = false; $("saveBtn").hidden = true;
        $("f").querySelectorAll("input,select,textarea").forEach(function (el) { el.disabled = true; });
      }
    } else loadDraft();
    render();
  }
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('16pt "PTC Sarabun"'), document.fonts.load('bold 16pt "PTC Sarabun"')]).then(init, init); else init();
})();
