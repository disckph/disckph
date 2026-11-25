/* DIS Record — แอปฝั่งเภสัชกร (Supabase) */
(function () {
  "use strict";
  var C = window.DIS_CONFIG, LK = window.DIS_LOOKUPS;
  var sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
  var $ = function (id) { return document.getElementById(id); };
  // เกณฑ์คำถามเร่งด่วน (นาที) ตัวชี้วัดข้อ 8 · ปรับจาก 10 เป็น 15 นาที (2026-11-09) รหัส immediate_10min ในฐานข้อมูลคงเดิม
  var URGENT_MIN = 15;
  var me = null, staff = [], depts = [], currentId = null, currentRequestId = null, logRows = [];
  var MONTHS = ["ต.ค.","พ.ย.","ธ.ค.","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย."];

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad(n) { return ("0" + n).slice(-2); }
  function toLocalInput(d) { d = new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function fromLocalInput(v) { return v ? new Date(v).toISOString() : null; }
  function fyOf(d) { d = new Date(d); return d.getFullYear() + 543 + (d.getMonth() >= 9 ? 1 : 0); }
  function thDate(d) { d = new Date(d); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + String(d.getFullYear() + 543).slice(-2) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function label(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return v || ""; }
  function deptName(id) { for (var i = 0; i < depts.length; i++) if (depts[i].id === id) return depts[i].name; return ""; }
  function pct(a, b) { return b ? Math.round(a / b * 1000) / 10 : null; }
  var toastEl = $("toast"), tt;
  function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(tt); tt = setTimeout(function () { toastEl.hidden = true; }, 3000); }
  function fail(err, where) { console.error(where, err); toast("ผิดพลาด: " + (err && err.message ? err.message : err)); }

  /* ---------- theme ---------- */
  var root = document.documentElement;
  $("themeToggle").addEventListener("click", function () {
    var dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("dis-theme", root.dataset.theme); } catch (e) {}
  });

  /* ---------- views ---------- */
  var tabs = document.querySelectorAll(".tab[data-view]");
  function show(v) {
    document.querySelectorAll(".view").forEach(function (s) { s.hidden = s.id !== "v-" + v; });
    tabs.forEach(function (t) { t.setAttribute("aria-selected", t.dataset.view === v); });
    if (["dashboard","record","inbox","log","works"].indexOf(v) > -1) { try { history.replaceState(null, "", "#" + v); } catch (e) {} }
    window.scrollTo({ top: 0 });
  }
  function go(v) {
    show(v);
    if (v === "dashboard") loadDashboard();
    if (v === "inbox") loadInbox();
    if (v === "log") loadLog();
    if (v === "works") loadWorks();
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { if (t.dataset.view === "record" && !currentId) newRecord(); go(t.dataset.view); }); });
  document.querySelectorAll("[data-new]").forEach(function (b) { b.addEventListener("click", function () { newRecord(); go("record"); }); });

  /* ---------- auth ---------- */
  $("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault(); $("lg-err").hidden = true;
    var r = await sb.auth.signInWithPassword({ email: $("lg-email").value.trim(), password: $("lg-pass").value });
    if (r.error) { $("lg-err").textContent = "เข้าสู่ระบบไม่สำเร็จ ตรวจอีเมลและรหัสผ่านอีกครั้ง"; $("lg-err").hidden = false; return; }
    start();
  });
  $("btnLogout").addEventListener("click", async function () { await sb.auth.signOut(); location.hash = ""; location.reload(); });

  $("profileForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var u = (await sb.auth.getUser()).data.user;
    var r = await sb.from("staff").insert({ id: u.id, initials: $("pf-init").value.trim() || "ภก.", full_name: $("pf-name").value.trim() || null, role: "admin" });
    if (r.error) { $("pf-err").textContent = r.error.message; $("pf-err").hidden = false; return; }
    start();
  });

  async function start() {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) { $("tabs").hidden = true; $("userChip").hidden = true; show("login"); return; }
    var p = await sb.from("staff").select("*").eq("id", s.user.id).maybeSingle();
    if (p.error) return fail(p.error, "staff");
    if (!p.data) { show("profile"); return; }
    me = p.data;
    $("tabs").hidden = false; $("userChip").hidden = false; $("userName").textContent = me.initials;
    await loadRefs();
    var v = (location.hash || "#dashboard").slice(1);
    if (v === "record") newRecord();
    go(["dashboard","record","inbox","log","works"].indexOf(v) > -1 ? v : "dashboard");
  }

  async function loadRefs() {
    var a = await sb.from("staff").select("id,initials,full_name").order("initials");
    var b = await sb.from("departments").select("id,name").order("name");
    staff = a.data || []; depts = b.data || [];
    $("f-pharm").innerHTML = staff.map(function (s) { return '<option value="' + s.id + '">' + esc(s.initials + (s.full_name ? " (" + s.full_name + ")" : "")) + "</option>"; }).join("");
    $("deptList").innerHTML = depts.map(function (d) { return "<option>" + esc(d.name) + "</option>"; }).join("");
    var fyNow = fyOf(new Date()), opts = "";
    for (var y = fyNow; y >= 2564; y--) opts += '<option value="' + y + '">ปีงบ ' + y + "</option>";
    $("fySel").innerHTML = opts; $("logFy").innerHTML = '<option value="">ทุกปีงบ</option>' + opts;
  }

  /* =====================================================================
     RECORD FORM
     ===================================================================== */
  var form = $("disForm");
  var MULTI = { srcType: true, ansCh: true };
  ["req","chan","purp","urg","srcType","ansCh","outcome","use","sat"].forEach(function (k) {
    $("c-" + k).innerHTML = LK[k].map(function (o, i) {
      return '<label class="choice"><input type="' + (MULTI[k] ? "checkbox" : "radio") + '" name="' + k + '" value="' + esc(o[0]) + '"><span><b>' + pad(i + 1) + "</b>" + esc(o[1]) + "</span></label>";
    }).join("");
  });
  $("f-cat").innerHTML = '<option value="">— เลือกหมวดหลัก —</option>' + LK.cat.map(function (c, i) { return '<option value="' + esc(c) + '">' + pad(i + 1) + " " + esc(c) + "</option>"; }).join("");
  $("f-cat2").innerHTML = '<option value="">— ไม่มี —</option>' + LK.cat.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");

  function getRadio(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; }
  function getChecks(name) { return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; }); }
  function setChoice(name, vals) {
    vals = Array.isArray(vals) ? vals : (vals == null ? [] : [vals]);
    form.querySelectorAll('input[name="' + name + '"]').forEach(function (i) { i.checked = vals.indexOf(i.value) > -1; });
  }
  function tags(boxId) { return Array.prototype.map.call(document.querySelectorAll("#" + boxId + " .tag"), function (t) { return t.dataset.v; }); }
  function setTags(boxId, list) {
    var box = $(boxId), inp = box.querySelector("input");
    box.querySelectorAll(".tag").forEach(function (t) { t.remove(); });
    (list || []).forEach(function (v) { addTag(box, inp, v); });
  }
  function addTag(box, inp, v) {
    v = String(v).trim(); if (!v) return;
    var s = document.createElement("span"); s.className = "tag"; s.dataset.v = v;
    s.innerHTML = esc(v) + ' <button type="button" aria-label="ลบ">×</button>';
    box.insertBefore(s, inp);
  }
  document.querySelectorAll(".tagbox").forEach(function (box) {
    var inp = box.querySelector("input");
    box.addEventListener("click", function (e) { if (e.target.tagName === "BUTTON") { e.target.parentNode.remove(); update(); } });
    function commit() { if (inp.value.trim()) { addTag(box, inp, box.id === "drugBox" ? inp.value.toLowerCase() : inp.value); inp.value = ""; update(); } }
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } });
    inp.addEventListener("change", commit);
    inp.addEventListener("blur", commit);
  });

  function crcl() {
    var age = +$("f-age").value, wt = +$("f-wt").value, scr = +$("f-scr").value, sex = $("f-sex").value;
    var v = age && wt && scr && sex ? ((140 - age) * wt) / (72 * scr) * (sex === "หญิง" ? 0.85 : 1) : null;
    $("crcl").textContent = v ? v.toFixed(0) : "—";
  }

  function minutes() {
    var r = $("f-recv").value, d = $("f-done").value;
    return r && d ? Math.round((new Date(d) - new Date(r)) / 60000) : null;
  }

  function checks() {
    var base = getRadio("req") && $("f-dept").value.trim() && getRadio("chan") && getRadio("purp") && getRadio("urg") &&
      $("f-q").value.trim() && tags("drugBox").length && $("f-cat").value;
    var m = minutes();
    return [
      [!!base, "ข้อมูลผู้ถามและคำถามครบ", "ประเภทผู้ถาม หน่วยงาน วิธีถาม จุดประสงค์ ความรีบด่วน ชื่อยา หมวดหลัก"],
      [!!($("f-ans").value.trim() && getRadio("ansCh")), "ความครบถ้วนของคำตอบ", "มีคำตอบและวิธีส่งคำตอบ"],
      [!!(getChecks("srcType").length && (tags("refBox").length || getChecks("srcType").indexOf("no_search") > -1)), "เอกสารอ้างอิง", "ประเภทและชื่อเอกสารที่ใช้"],
      [m !== null && m >= 0, "เวลาตอบ", "มีเวลาตอบกลับ คำนวณนาทีได้"],
      [!!getRadio("outcome") || !!currentRequestId, "ผลลัพธ์", currentRequestId && !getRadio("outcome") ? "คำขอเว็บไซต์: รอผลจากแบบประเมินของผู้ถาม (กรอกเองได้เมื่อทราบผล)" : "บันทึกผลต่อผู้ถาม"]
    ];
  }

  function update() {
    $("patientSec").hidden = getRadio("purp") !== "patient_problem";
    var fu = $("fuYes").checked;
    $("f-fudate").disabled = !fu; $("f-furesult").disabled = !fu;
    var m = minutes(), urgent = getRadio("urg") === "immediate_10min", cb = $("calcBox");
    if (m === null) cb.innerHTML = '<span>เวลาที่ใช้ตอบ</span><strong class="num">—</strong><span class="hint">กด "ตอนนี้" เมื่อตอบเสร็จ ระบบคำนวณนาทีให้</span>';
    else if (m < 0) cb.innerHTML = '<span class="err">เวลาตอบกลับก่อนเวลารับคำถาม ตรวจวันเวลาอีกครั้ง</span>';
    else {
      var ok = !urgent || m <= URGENT_MIN;
      cb.innerHTML = '<span>เวลาที่ใช้ตอบ</span><strong class="num">' + m + " นาที</strong>" +
        (urgent ? '<span class="pill ' + (ok ? "p-ok" : "p-bad") + '">' + (ok ? "ทันเวลา (≤ " + URGENT_MIN + " นาที)" : "เกินเวลาที่กำหนด") + "</span>" : '<span class="pill p-muted">ไม่ใช่คำถามเร่งด่วน</span>');
    }
    var items = checks(), n = items.filter(function (i) { return i[0]; }).length, p = Math.round(n / items.length * 100);
    $("checklist").innerHTML = items.map(function (i) {
      return '<li class="' + (i[0] ? "done" : "todo") + '"><span class="ic">' + (i[0] ? "✓" : "") + "</span><span><b>" + i[1] + '</b><br><span class="hint">' + i[2] + "</span></span></li>";
    }).join("");
    $("ring").style.setProperty("--p", p); $("ringTxt").textContent = p + "%";
    crcl(); tick();
  }
  form.addEventListener("input", update); form.addEventListener("change", update);
  $("btnNow").addEventListener("click", function () { $("f-done").value = toLocalInput(new Date()); update(); });

  function tick() {
    var r = $("f-recv").value; if (!r) return;
    var end = $("f-done").value ? new Date($("f-done").value) : new Date();
    var sec = Math.max(0, Math.round((end - new Date(r)) / 1000));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    $("timer").textContent = (h ? h + ":" : "") + pad(m) + ":" + pad(s);
    $("timerBar").style.width = Math.min(100, sec / (URGENT_MIN * 0.6)) + "%";
    var urgent = getRadio("urg") === "immediate_10min", left = URGENT_MIN * 60 - sec, tp = $("timerPill");
    $("timerBar").style.background = left < 0 && urgent ? "var(--bad)" : "";
    if (!urgent) { tp.className = "pill p-muted"; tp.textContent = "ไม่เร่งด่วน"; }
    else if ($("f-done").value) { tp.className = "pill " + (left >= 0 ? "p-ok" : "p-bad"); tp.textContent = left >= 0 ? "ตอบทันเวลา" : "เกินเป้า"; }
    else if (left >= 0) { tp.className = "pill p-warn"; tp.textContent = "เหลือ " + Math.floor(left / 60) + ":" + pad(left % 60); }
    else { tp.className = "pill p-bad"; tp.textContent = "เกิน " + Math.floor(-left / 60) + ":" + pad(-left % 60); }
  }
  setInterval(function () { if (!$("v-record").hidden) tick(); }, 1000);

  function setStatusPill(st) {
    var s = LK.status[st] || ["ยังไม่บันทึก", "p-muted"];
    $("recStatus").className = "pill " + s[1]; $("recStatus").textContent = "สถานะ: " + s[0];
  }

  function resetForm() {
    form.reset(); setTags("drugBox", []); setTags("refBox", []);
    ["req","chan","purp","urg","srcType","ansCh","outcome","use","sat"].forEach(function (k) { setChoice(k, []); });
    $("fuNo").checked = true; $("recErr").hidden = true;
  }

  /* ---------- ตอบกลับผู้ถาม (คำขอจากเว็บไซต์ และคำถามที่รับเอง เช่น โทรศัพท์) ---------- */
  var currentRequest = null;
  function replyText() {
    var x = currentRequest || {}, T = LK.replyTemplate;
    var refs = tags("refBox");
    var body = "Dear " + (x.requester_name || $("f-name").value.trim() || "Colleague") + ",\n\n" +
      "Thank you for reaching out.\n\n" +
      "Regarding your inquiry about " + ($("f-q").value.trim()) + "\n\n" +
      ($("f-ans").value.trim() || "[คำตอบ]") + "\n\n" +
      (refs.length ? "Reference: " + refs.join(", ") + "\n\n" : "") +
      (x.survey_token ? T.surveyLine + "\n" + surveyUrl(x) + "\n\n" : "") +
      "Please feel free to reach out if you have any further questions.\n\n" +
      "Best regards,\n" + T.signature;
    return { subject: currentRequest ? T.subject : T.subjectDirect, body: body };
  }
  function refreshReply() {
    var x = currentRequest, card = $("replyCard");
    card.hidden = !!currentRequestId && !x;   // คำขอเว็บที่ยังโหลดไม่เสร็จ/โหลดไม่สำเร็จ: ไม่ให้ตอบผิดคน
    $("replyEmailBox").hidden = !!x; $("replySurveyBox").hidden = !x; $("replyHintWeb").hidden = !x; $("replyHintDirect").hidden = !!x;
    if (card.hidden) return;
    var to = x ? (x.reply_channel === "email" ? (x.contact || "").trim() : "") : $("f-replyEmail").value.trim();
    var back = x ? { line: "LINE", phone: "โทรกลับ", email: "e-mail" }[x.reply_channel] || "" : "";
    $("replyTo").textContent = x ? "ตอบกลับทาง " + back + ": " + (x.contact || "-") : "พิมพ์คำตอบในข้อ 5 แล้วส่งให้ผู้ถามทาง LINE หรืออีเมลได้";
    var email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to);
    $("btnGmail").hidden = !email;
    if (email) {
      var m = replyText();
      $("btnGmail").href = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(to) +
        "&su=" + encodeURIComponent(m.subject) + "&body=" + encodeURIComponent(m.body);
    }
  }
  function replyReady() {
    if ($("f-ans").value.trim()) return true;
    toast("พิมพ์คำตอบในข้อ 5 ก่อน"); $("f-ans").focus(); return false;
  }
  $("btnCopyReply").addEventListener("click", function () {
    if (!replyReady()) return;
    var t = replyText().body;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(
      function () { toast("คัดลอกข้อความแล้ว วางใน LINE หรืออีเมลได้เลย"); },
      function () { window.prompt("คัดลอกข้อความนี้", t); });
  });
  // มือถือ: เปิดหน้าต่างแชร์ของเครื่อง เลือก LINE แล้วเลือกแชตผู้ถาม
  $("btnShareReply").hidden = !navigator.share;
  $("btnShareReply").addEventListener("click", function () {
    if (!replyReady()) return;
    navigator.share({ text: replyText().body }).catch(function (e) { if (e && e.name !== "AbortError") toast("เปิดหน้าต่างแชร์ไม่ได้ ใช้ปุ่มคัดลอกแทน"); });
  });
  $("btnGmail").addEventListener("click", function (e) { if (!replyReady()) { e.preventDefault(); return; } refreshReply(); });
  $("f-replyEmail").addEventListener("input", refreshReply);
  $("f-replyEmail").addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); });   // กัน Enter ไปปิดคำถาม
  var reqSeq = 0;
  async function loadRequest(id) {
    var seq = ++reqSeq, sv = [];
    currentRequest = null; $("f-replyEmail").value = "";
    refreshReply();
    if (id) {
      var r = await sb.from("dis_requests").select("*").eq("id", id).maybeSingle();
      var s = await sb.from("survey_responses").select("*").eq("request_id", id).order("created_at", { ascending: false });
      if (seq !== reqSeq) return;   // เปิดรายการอื่นไปแล้วระหว่างโหลด
      currentRequest = r.data || null;
      sv = s.data || [];
      refreshReply();
    }
    // ผลแบบประเมินจากผู้ถาม (ใช้ประกอบการกรอก "ผลต่อผู้ถาม" แล้วปิดคำถาม)
    var box = $("replySurvey");
    if (!currentRequest) { box.innerHTML = ""; return; }
    if (!sv.length) { box.innerHTML = '<span class="pill p-muted">ยังไม่ได้รับแบบประเมิน</span>'; return; }
    var a = sv[0], yn = function (v) { return v ? '<span class="pill p-ok">ใช่</span>' : '<span class="pill p-bad">ไม่</span>'; };
    box.innerHTML = '<dl class="kv"><dt>ครบถ้วน</dt><dd>' + yn(a.complete) + "</dd><dt>ชัดเจน</dt><dd>" + yn(a.clear) + "</dd><dt>ตรงความต้องการ</dt><dd>" + yn(a.relevant) +
      "</dd><dt>นำไปใช้ได้</dt><dd>" + yn(a.useful) + "</dd><dt>ทันเวลา</dt><dd>" + yn(a.timely) + "</dd><dt>โดยรวม</dt><dd>" + (a.overall || "—") + "/5</dd></dl>" +
      (a.comment ? '<p class="hint">"' + esc(a.comment) + '"</p>' : "");
  }

  function newRecord(pre) {
    pre = pre || {};
    currentId = null; currentRequestId = pre.request_id || null;
    loadRequest(currentRequestId);
    resetForm();
    $("f-recv").value = toLocalInput(pre.received_at || new Date());
    if (me) $("f-pharm").value = me.id;
    $("f-name").value = pre.requester_name || "";
    $("f-dept").value = pre.department || "";
    $("f-q").value = pre.question || "";
    setChoice("chan", pre.ask_channel || "โทรศัพท์/โทรสาร");
    setChoice("urg", pre.urgency || null);
    if (pre.answer_channel) setChoice("ansCh", pre.answer_channel);
    $("recCode").textContent = "ใหม่";
    $("recFrom").textContent = pre.request_code ? "รับเรื่องจากคำขอเว็บไซต์ " + pre.request_code : "กรอกตามลำดับที่ทำงานจริง: รับคำถาม → สืบค้น → ตอบ → ติดตามผล";
    setStatusPill(null); update();
  }

  async function openRecord(id) {
    var r = await sb.from("dis_questions").select("*").eq("id", id).single();
    if (r.error) return fail(r.error, "open");
    var q = r.data, pt = q.patient || {};
    resetForm(); currentId = q.id; currentRequestId = q.request_id;
    loadRequest(currentRequestId);
    $("f-recv").value = toLocalInput(q.received_at);
    $("f-pharm").value = q.pharmacist_id || "";
    $("f-name").value = q.requester_name || "";
    setChoice("req", q.requester_type); $("f-dept").value = deptName(q.department_id);
    setChoice("chan", q.ask_channel); setChoice("purp", q.purpose); setChoice("urg", q.urgency);
    $("f-q").value = q.question || ""; setTags("drugBox", q.drugs); $("f-kw").value = (q.keywords || []).join(", ");
    $("f-cat").value = q.category_main || ""; $("f-cat2").value = q.category_sub || "";
    $("f-sex").value = pt.sex || ""; $("f-age").value = pt.age_y || ""; $("f-wt").value = pt.weight_kg || ""; $("f-ht").value = pt.height_cm || "";
    $("f-scr").value = pt.scr || ""; $("f-hn").value = pt.hn || ""; $("f-pt").value = pt.notes || "";
    setChoice("srcType", q.source_levels || []); setTags("refBox", q.references_used); $("f-notfound").value = q.references_not_found || "";
    $("f-ans").value = q.answer || ""; setChoice("ansCh", (q.answer_channel || "").split(", ")); $("f-done").value = q.answered_at ? toLocalInput(q.answered_at) : "";
    setChoice("outcome", q.outcome); setChoice("use", q.use_result);
    $(q.followup_needed ? "fuYes" : "fuNo").checked = true;
    $("f-fudate").value = q.followup_date || ""; $("f-furesult").value = q.followup_result || "";
    setChoice("sat", q.satisfaction_verbal); $("f-faq").checked = !!q.faq_candidate;
    $("recCode").textContent = q.code; $("recFrom").textContent = "รับเมื่อ " + thDate(q.received_at) + (q.request_id ? " · มาจากคำขอเว็บไซต์" : "");
    setStatusPill(q.status); update(); show("record");
  }

  async function deptId(name) {
    name = name.trim(); if (!name) return null;
    for (var i = 0; i < depts.length; i++) if (depts[i].name === name) return depts[i].id;
    var r = await sb.from("departments").insert({ name: name }).select("id,name").single();
    if (r.error) throw r.error;
    depts.push(r.data); $("deptList").insertAdjacentHTML("beforeend", "<option>" + esc(name) + "</option>");
    return r.data.id;
  }

  function num(id) { var v = $(id).value; return v === "" ? null : +v; }

  async function save(status) {
    $("recErr").hidden = true;
    if (status !== "draft" && checks().some(function (c) { return !c[0]; })) {
      $("recErr").textContent = "ยังกรอกไม่ครบ ดูรายการที่ยังไม่มีเครื่องหมายถูกด้านบน"; $("recErr").hidden = false; return;
    }
    if (!getRadio("req") || !$("f-q").value.trim()) { $("recErr").textContent = "อย่างน้อยต้องมีประเภทผู้ถามและคำถาม จึงบันทึกร่างได้"; $("recErr").hidden = false; return; }
    if (status === "followup" && !$("fuYes").checked) { $("fuYes").checked = true; update(); }
    form.classList.add("loading");
    try {
      var patient = getRadio("purp") === "patient_problem" ? {
        sex: $("f-sex").value || null, age_y: num("f-age"), weight_kg: num("f-wt"), height_cm: num("f-ht"),
        scr: num("f-scr"), hn: $("f-hn").value.trim() || null, notes: $("f-pt").value.trim() || null
      } : null;
      var row = {
        request_id: currentRequestId,
        received_at: fromLocalInput($("f-recv").value),
        pharmacist_id: $("f-pharm").value || null,
        requester_name: $("f-name").value.trim() || null,
        requester_type: getRadio("req"),
        department_id: await deptId($("f-dept").value),
        ask_channel: getRadio("chan") || "อื่นๆ",
        purpose: getRadio("purp") || "other",
        urgency: getRadio("urg") || "other",
        question: $("f-q").value.trim(),
        drugs: tags("drugBox"),
        keywords: $("f-kw").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean),
        category_main: $("f-cat").value || null,
        category_sub: $("f-cat2").value || null,
        patient: patient,
        source_levels: getChecks("srcType"),
        references_used: tags("refBox"),
        references_not_found: $("f-notfound").value.trim() || null,
        answer: $("f-ans").value.trim() || null,
        answer_channel: getChecks("ansCh").join(", ") || null,   // หลายช่องทางเก็บเป็นข้อความคั่นด้วย ", "
        answered_at: fromLocalInput($("f-done").value),
        outcome: getRadio("outcome"),
        use_result: getRadio("use"),
        followup_needed: $("fuYes").checked,
        followup_date: $("fuYes").checked ? ($("f-fudate").value || null) : null,
        followup_result: $("fuYes").checked ? ($("f-furesult").value.trim() || null) : null,
        satisfaction_verbal: getRadio("sat"),
        faq_candidate: $("f-faq").checked,
        status: status
      };
      var r = currentId
        ? await sb.from("dis_questions").update(row).eq("id", currentId).select("id,code,status").single()
        : await sb.from("dis_questions").insert(row).select("id,code,status").single();
      if (r.error) throw r.error;
      currentId = r.data.id; $("recCode").textContent = r.data.code; setStatusPill(r.data.status);
      if (currentRequestId) await sb.from("dis_requests").update({ status: status === "closed" || status === "answered" ? "answered" : "in_progress" }).eq("id", currentRequestId);
      toast({ draft: "บันทึกร่าง ", followup: "บันทึกแล้ว รอติดตามผล ", answered: "บันทึกแล้ว ตอบแล้ว รอผลประเมิน ", closed: "ปิดคำถาม " }[status] + r.data.code + " แล้ว");
    } catch (err) { fail(err, "save"); }
    form.classList.remove("loading");
  }
  // คำขอจากเว็บไซต์ที่ยังไม่รู้ผล (ตอบทางอีเมล/LINE) บันทึกเป็น "ตอบแล้ว รอผลประเมิน" ไว้ก่อน ปิดจริงเมื่อได้ผลจากแบบประเมิน
  form.addEventListener("submit", function (e) { e.preventDefault(); save(currentRequestId && !getRadio("outcome") ? "answered" : "closed"); });
  $("btnDraft").addEventListener("click", function () { save("draft"); });
  $("btnFollow").addEventListener("click", function () { save("followup"); });

  /* =====================================================================
     DASHBOARD
     ===================================================================== */
  $("fySel").addEventListener("change", loadDashboard);

  function bars(id, map, limit) {
    var rows = Object.keys(map).map(function (k) { return [k, map[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, limit || 7);
    var max = rows.length ? rows[0][1] : 1;
    $(id).innerHTML = rows.length ? rows.map(function (r) {
      return '<span class="lbl" title="' + esc(r[0]) + '">' + esc(r[0]) + '</span><span class="track"><span style="width:' + (r[1] / max * 100) + '%"></span></span><span class="n">' + r[1] + "</span>";
    }).join("") : '<span class="empty" style="grid-column:1/-1">ยังไม่มีข้อมูล</span>';
  }
  function countBy(rows, fn) { var m = {}; rows.forEach(function (r) { var k = fn(r); if (k) m[k] = (m[k] || 0) + 1; }); return m; }

  async function loadDashboard() {
    var fy = +$("fySel").value || fyOf(new Date());
    var r = await sb.from("dis_questions").select("id,code,received_at,requester_type,department_id,purpose,urgency,question,category_main,response_minutes,answer,references_used,source_levels,answered_at,outcome,satisfaction_verbal,faq_candidate,status,followup_date,legacy").eq("fiscal_year", fy);
    if (r.error) return fail(r.error, "dashboard");
    var all = r.data || [], rows = all.filter(function (q) { return q.status !== "draft"; });
    // ข้อมูลเดิมจาก Google Form ไม่มีเวลาตอบจริง มีแค่ช่วงเวลา (legacy.response_bucket) และประเภทแหล่งอ้างอิง
    function bucket(q) { return q.legacy && q.legacy.response_bucket; }
    function hasRef(q) { return (q.references_used || []).length || (q.legacy && (q.source_levels || []).length); }
    function onTime(q) { return q.response_minutes != null ? q.response_minutes <= URGENT_MIN : bucket(q) === "ทันที (ภายใน 10 นาที)"; }
    var complete = rows.filter(function (q) { return q.answer && hasRef(q) && (q.answered_at || bucket(q)) && q.outcome; }).length;
    var urg = rows.filter(function (q) { return q.urgency === "immediate_10min" && (q.response_minutes != null || bucket(q)); });
    var urgOk = urg.filter(onTime).length;
    var withOut = rows.filter(function (q) { return q.outcome; }), resolved = withOut.filter(function (q) { return q.outcome === "resolved"; }).length;
    var sat = rows.filter(function (q) { return ["very","satisfied","not"].indexOf(q.satisfaction_verbal) > -1; }), satOk = sat.filter(function (q) { return q.satisfaction_verbal !== "not"; }).length;
    var tiles = [
      { l: "ความสมบูรณ์ของการบันทึก (คำตอบ · อ้างอิง · เวลา · ผลลัพธ์)", v: pct(complete, rows.length), t: 100, f: complete + " / " + rows.length + " รายการ", tgt: "เป้า 100%" },
      { l: "คำถามเร่งด่วนตอบได้ภายใน " + URGENT_MIN + " นาที", v: pct(urgOk, urg.length), t: 65, f: urgOk + " / " + urg.length + " คำถามเร่งด่วน", tgt: "เป้า ≥ 65%" },
      { l: "ผู้ถามเข้าใจ/คลี่คลายปัญหา", v: pct(resolved, withOut.length), t: 80, f: resolved + " / " + withOut.length + " รายการ", tgt: "เป้า ≥ 80%" },
      { l: "ความพึงพอใจของผู้รับบริการ (วาจา)", v: pct(satOk, sat.length), t: 80, f: satOk + " / " + sat.length + " ที่ได้ถาม", tgt: "เป้า ≥ 80%" }
    ];
    $("kpiTiles").innerHTML = tiles.map(function (k) {
      var pass = k.v !== null && (k.t === 100 ? k.v >= 100 : k.v >= k.t);
      return '<div class="card tile' + (k.v === null ? " warn" : "") + '"><div class="tile-label">' + k.l + "</div>" +
        '<div class="tile-value">' + (k.v === null ? "—" : k.v + "<small>%</small>") + "</div>" +
        '<div class="meter"><span style="width:' + (k.v || 0) + '%"></span><i style="left:' + k.t + '%"></i></div>' +
        '<div class="tile-foot"><span class="num">' + k.f + "</span>" + (k.v === null ? '<span class="pill p-info">ยังไม่มีข้อมูล</span>' : '<span class="pill ' + (pass ? "p-ok" : "p-bad") + '">' + (pass ? "ผ่าน" : "ไม่ผ่าน") + " · " + k.tgt + "</span>") + "</div></div>";
    }).join("");

    // กราฟรายเดือน (ต.ค. = 0)
    var counts = new Array(12).fill(0), uT = new Array(12).fill(0), uOk = new Array(12).fill(0);
    rows.forEach(function (q) {
      var i = (new Date(q.received_at).getMonth() + 3) % 12; counts[i]++;
      if (q.urgency === "immediate_10min" && (q.response_minutes != null || bucket(q))) { uT[i]++; if (onTime(q)) uOk[i]++; }
    });
    drawChart(counts, uT.map(function (t, i) { return t ? uOk[i] / t * 100 : null; }));

    bars("catBars", countBy(rows, function (q) { return q.category_main; }));
    bars("reqBars", countBy(rows, function (q) { return q.requester_type; }), 5);
    bars("deptBars", countBy(rows, function (q) { return deptName(q.department_id); }), 5);

    var pp = rows.filter(function (q) { return q.purpose === "patient_problem"; }).length;
    var mins = rows.map(function (q) { return q.response_minutes; }).filter(function (m) { return m != null && m >= 0; }).sort(function (a, b) { return a - b; });
    var mean = mins.length ? Math.round(mins.reduce(function (a, b) { return a + b; }, 0) / mins.length) : null;
    var med = mins.length ? mins[Math.floor(mins.length / 2)] : null;
    $("otherKpi").innerHTML =
      "<dt>ข้อ 7 · จำนวนคำถามทั้งหมด</dt><dd class=\"num\">" + rows.length + " (ร่างอีก " + (all.length - rows.length) + ")</dd>" +
      "<dt>ข้อ 6 · เพื่อแก้ปัญหาผู้ป่วย : ทั้งหมด</dt><dd class=\"num\">" + pp + " : " + rows.length + (rows.length ? " (" + pct(pp, rows.length) + "%)" : "") + "</dd>" +
      "<dt>เวลาตอบเฉลี่ย</dt><dd class=\"num\">" + (mean === null ? "—" : mean + " นาที · มัธยฐาน " + med + " นาที") + "</dd>" +
      "<dt>เสนอเข้า FAQ</dt><dd class=\"num\">" + rows.filter(function (q) { return q.faq_candidate; }).length + " คำถาม</dd>" +
      "<dt>ข้อ 3, 4, 5, 9</dt><dd>ตรวจคุณภาพ · แบบประเมินออนไลน์ · PTC · องค์ความรู้ <span class=\"pill p-gold\">ระยะ 2</span></dd>";

    // งานค้าง
    var pend = all.filter(function (q) { return q.status === "draft" || q.status === "followup" || q.status === "answered"; });
    var rq = await sb.from("dis_requests").select("id,code,requester_name,department,question,created_at").eq("status", "new").order("created_at");
    var reqs = rq.data || [];
    $("queueCount").textContent = (pend.length + reqs.length) + " รายการ";
    var html = reqs.map(function (x) {
      return '<li><span class="pill p-bad">คำขอเว็บไซต์</span><div><div class="q-title">' + esc(x.question) + '</div><div class="q-meta"><span class="mono">' + esc(x.code) + "</span> · " + esc(x.requester_name) + " · " + esc(x.department) + '</div></div><button type="button" class="btn btn-ghost btn-sm" data-req="' + x.id + '">รับเรื่อง</button></li>';
    }).join("") + pend.map(function (q) {
      var s = LK.status[q.status];
      return '<li><span class="pill ' + s[1] + '">' + s[0] + '</span><div><div class="q-title">' + esc(q.question) + '</div><div class="q-meta"><span class="mono">' + esc(q.code) + "</span> · " + thDate(q.received_at) + (q.followup_date ? " · นัดติดตาม " + q.followup_date : "") + '</div></div><button type="button" class="btn btn-ghost btn-sm" data-open="' + q.id + '">เปิด</button></li>';
    }).join("");
    $("queueList").innerHTML = html || '<li class="empty" style="display:block">ไม่มีงานค้าง</li>';
  }

  function drawChart(counts, urgPct) {
    var W = 640, H = 250, l = 40, r = 40, t = 18, b = 34, iw = W - l - r, ih = H - t - b, bw = iw / 12;
    var maxC = Math.max(4, Math.ceil(Math.max.apply(null, counts) / 4) * 4), s = "";
    for (var g = 0; g <= 4; g++) {
      var y = t + ih - ih * g / 4;
      s += '<line class="grid-line" x1="' + l + '" x2="' + (W - r) + '" y1="' + y + '" y2="' + y + '"/>';
      s += '<text x="' + (l - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + (maxC * g / 4) + "</text>";
      s += '<text x="' + (W - r + 8) + '" y="' + (y + 4) + '">' + (25 * g) + "%</text>";
    }
    counts.forEach(function (c, i) {
      var h = ih * c / maxC, x = l + i * bw + bw * 0.2;
      if (c) {
        s += '<rect class="area" x="' + x + '" y="' + (t + ih - h) + '" width="' + (bw * 0.6) + '" height="' + h + '" rx="4"/>';
        s += '<text class="val" x="' + (x + bw * 0.3) + '" y="' + (t + ih - h - 5) + '" text-anchor="middle">' + c + "</text>";
      }
      s += '<text x="' + (l + i * bw + bw / 2) + '" y="' + (H - 12) + '" text-anchor="middle">' + MONTHS[i] + "</text>";
    });
    var ty = t + ih - ih * 0.8;
    s += '<line class="target" x1="' + l + '" x2="' + (W - r) + '" y1="' + ty + '" y2="' + ty + '"/>';
    var pts = [];
    urgPct.forEach(function (p, i) { if (p !== null) pts.push([l + i * bw + bw / 2, t + ih - ih * p / 100]); });
    if (pts.length > 1) s += '<polyline class="line" points="' + pts.map(function (p) { return p.join(","); }).join(" ") + '"/>';
    pts.forEach(function (p, i) { s += '<circle class="dot' + (i === pts.length - 1 ? " end" : "") + '" cx="' + p[0] + '" cy="' + p[1] + '" r="4"/>'; });
    $("monthChart").innerHTML = s;
  }

  document.addEventListener("click", function (e) {
    var o = e.target.closest("[data-open]"); if (o) { openRecord(+o.dataset.open); return; }
    var q = e.target.closest("[data-req]"); if (q) { takeRequest(+q.dataset.req); }
  });

  /* =====================================================================
     INBOX
     ===================================================================== */
  $("inboxStatus").addEventListener("change", loadInbox);
  async function loadInbox() {
    var qy = sb.from("dis_requests").select("*").order("created_at", { ascending: false }).limit(200);
    if ($("inboxStatus").value === "open") qy = qy.in("status", ["new", "in_progress"]);
    var r = await qy; if (r.error) return fail(r.error, "inbox");
    $("inboxList").innerHTML = (r.data || []).map(function (x) {
      var s = LK.reqStatus[x.status];
      var wanted = { today: "ต้องการวันนี้", "3days": "ภายใน 3 วัน", no_rush: "ไม่รีบ" }[x.wanted_by] || "";
      var back = { line: "LINE", phone: "โทรกลับ", email: "e-mail" }[x.reply_channel] || "";
      return '<li><span class="pill ' + s[1] + '">' + s[0] + '</span><div><div class="q-title" style="white-space:normal">' + esc(x.question) + '</div><div class="q-meta"><span class="mono">' + esc(x.code) + "</span> · " + esc(LK.reqType[x.request_type] || "") + " · " + esc(x.requester_name) + " · " + esc(x.department) + " · " + wanted + " · ตอบกลับทาง " + back + " " + esc(x.contact || "") + " · ส่งเมื่อ " + thDate(x.created_at) + "</div></div>" +
        '<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">' +
        (x.status === "new" ? '<button type="button" class="btn btn-ghost btn-sm" data-req="' + x.id + '">รับเรื่อง</button>' : "") +
        (x.status === "answered" ? '<button type="button" class="btn btn-ghost btn-sm" data-copy="' + esc(surveyUrl(x)) + '">คัดลอกลิงก์แบบประเมิน</button>' : "") +
        (x.status === "new" || x.status === "in_progress" ? '<button type="button" class="btn btn-ghost btn-sm" data-close-req="' + x.id + '" title="ปิดโดยไม่บันทึกเป็นคำถาม เช่น คำขอทดสอบ/ซ้ำ/ส่งผิด">ปิดคำขอ</button>' : "") +
        "</span></li>";
    }).join("") || '<li class="empty" style="display:block">ยังไม่มีคำขอ</li>';
  }
  function surveyUrl(x) { return new URL("survey.html?r=" + x.id + "&t=" + x.survey_token, location.href).href; }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]"); if (!b) return;
    var url = b.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
      function () { toast("คัดลอกลิงก์แล้ว วางส่งพร้อมคำตอบได้เลย"); },
      function () { window.prompt("คัดลอกลิงก์นี้", url); });
  });
  // ปิดคำขอที่ไม่ต้องบันทึกเป็นคำถาม (ทดสอบ/ซ้ำ/ส่งผิด) — เปิดดูย้อนหลังได้ที่ตัวกรอง "ทั้งหมด"
  document.addEventListener("click", async function (e) {
    var b = e.target.closest("[data-close-req]"); if (!b) return;
    if (!window.confirm("ปิดคำขอนี้โดยไม่บันทึกเป็นคำถาม?")) return;
    var r = await sb.from("dis_requests").update({ status: "closed" }).eq("id", +b.dataset.closeReq);
    if (r.error) return fail(r.error, "close request");
    toast("ปิดคำขอแล้ว"); loadInbox();
    if (!$("v-dashboard").hidden) loadDashboard();
  });
  async function takeRequest(id) {
    var r = await sb.from("dis_requests").select("*").eq("id", id).single();
    if (r.error) return fail(r.error, "request");
    var x = r.data;
    await sb.from("dis_requests").update({ status: "in_progress" }).eq("id", id);
    newRecord({
      request_id: x.id, request_code: x.code, requester_name: x.requester_name, department: x.department,
      question: x.question, ask_channel: "เว็บ DIS", received_at: x.created_at,
      urgency: x.wanted_by === "today" ? "within_1day" : "other",
      answer_channel: { line: "LINE", phone: "โทรศัพท์/โทรสาร", email: "e-mail" }[x.reply_channel]
    });
    show("record");
  }

  /* =====================================================================
     LOG
     ===================================================================== */
  var logTimer;
  ["logSearch","logFy","logStatus","logUrg"].forEach(function (id) {
    $(id).addEventListener("input", function () { clearTimeout(logTimer); logTimer = setTimeout(loadLog, 250); });
  });
  async function loadLog() {
    var qy = sb.from("dis_questions").select("*").order("received_at", { ascending: false }).limit(500);
    if ($("logFy").value) qy = qy.eq("fiscal_year", +$("logFy").value);
    if ($("logStatus").value) qy = qy.eq("status", $("logStatus").value);
    if ($("logUrg").value) qy = qy.eq("urgency", $("logUrg").value);
    var s = $("logSearch").value.trim().replace(/[,()*%"\\]/g, " ").trim();
    if (s) qy = qy.or("code.ilike.%" + s + "%,question.ilike.%" + s + "%,answer.ilike.%" + s + "%,requester_name.ilike.%" + s + "%,drugs.cs.{" + s.toLowerCase() + "}");
    var r = await qy; if (r.error) return fail(r.error, "log");
    logRows = r.data || [];
    $("logBody").innerHTML = logRows.map(function (q) {
      var late = q.urgency === "immediate_10min" && q.response_minutes != null && q.response_minutes > URGENT_MIN;
      var st = LK.status[q.status];
      return '<tr class="clickable" data-open="' + q.id + '"><td class="mono">' + esc(q.code) + '</td><td class="num">' + thDate(q.received_at) + "</td><td>" + esc(q.requester_type) + " · " + esc(deptName(q.department_id)) + "</td><td>" + esc((q.drugs || []).join(", ")) + "</td><td>" + esc(q.category_main || "") + "</td><td>" +
        (q.urgency === "immediate_10min" ? '<span class="pill p-warn">ทันที</span>' : esc(label(LK.urg, q.urgency))) + '</td><td class="r num' + (late ? " over" : "") + '">' + (q.response_minutes == null ? "—" : q.response_minutes + " นาที") + "</td><td>" + esc(label(LK.outcome, q.outcome)) + '</td><td><span class="pill ' + st[1] + '">' + st[0] + "</span></td></tr>";
    }).join("") || '<tr><td colspan="9" class="empty">ไม่พบรายการ</td></tr>';
    $("logCount").textContent = "แสดง " + logRows.length + " รายการ";
  }

  $("btnExport").addEventListener("click", function () {
    var cols = [["code","เลขที่"],["fiscal_year","ปีงบ"],["received_at","วันเวลารับคำถาม"],["requester_type","ประเภทผู้ถาม"],["department","หน่วยงาน"],["ask_channel","วิธีถาม"],["purpose","จุดประสงค์"],["urgency","ความรีบด่วน"],["question","คำถาม"],["drugs","ชื่อยา"],["category_main","หมวดหลัก"],["category_sub","หมวดรอง"],["source_levels","ประเภทแหล่งข้อมูล"],["references_used","เอกสารอ้างอิง"],["answer","คำตอบ"],["answer_channel","วิธีส่งคำตอบ"],["answered_at","วันเวลาตอบกลับ"],["response_minutes","นาทีที่ใช้ตอบ"],["outcome","ผลลัพธ์"],["use_result","การนำไปใช้"],["followup_needed","ติดตามผล"],["followup_result","ผลการติดตาม"],["satisfaction_verbal","ความพึงพอใจ"],["status","สถานะ"]];
    var csv = cols.map(function (c) { return c[1]; }).join(",") + "\n" + logRows.map(function (q) {
      return cols.map(function (c) {
        var v = c[0] === "department" ? deptName(q.department_id) : q[c[0]];
        if (c[0] === "received_at" || c[0] === "answered_at") v = v ? thDate(v) : "";
        if (c[0] === "purpose") v = label(LK.purp, v); if (c[0] === "urgency") v = label(LK.urg, v); if (c[0] === "outcome") v = label(LK.outcome, v);
        if (c[0] === "use_result") v = label(LK.use, v); if (c[0] === "satisfaction_verbal") v = label(LK.sat, v);
        if (c[0] === "source_levels") v = (v || []).map(function (x) { return label(LK.srcType, x); });
        if (c[0] === "status") v = (LK.status[v] || [v])[0];
        if (Array.isArray(v)) v = v.join("; ");
        v = v == null ? "" : String(v);
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(",");
    }).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "DIS-" + ($("logFy").value || "ทั้งหมด") + ".csv"; a.click();
  });

  /* =====================================================================
     WORKS: สถิติ Newsletter & ยาเข้า-ออก
     - Newsletter: ../data/news.json (+ LK.extraIssues = ฉบับที่แจก LINE แต่ไม่ได้ลงเป็นข่าว)
     - ยื่นเสนอยา: ตาราง ptc_submissions (ไม่ดึงช่องราคา/ข้อมูลติดต่อ)
     - ยาเข้า-ออกรายปี: ตาราง ptc_yearly (สร้างด้วย ptc-stats.sql) ยังไม่รวมมติ PTC เรื่องอื่น
     ===================================================================== */
  var WK = { news: [], subs: [], yearly: [], qCount: {}, ready: false };
  var YR_N = [["submitted","ยื่นเสนอ"],["sub_new","ยื่นใหม่"],["sub_replace","ยื่นทดแทน"],["in_cycle","เข้าตามวาระ"],["in_new","เข้าใหม่"],["in_replace","ทดแทน"],["out_cycle","ออกตามวาระ"],["in_off","เข้านอกวาระ"],["out_off","ออกนอกวาระ"]];
  var wkErr = {};
  $("yrFields").innerHTML = YR_N.map(function (n) { return '<div class="field"><label for="yr-' + n[0] + '">' + n[1] + '</label><input type="number" min="0" step="1" id="yr-' + n[0] + '"></div>'; }).join("");
  // งวดข่าว "2569-10b" = ปี-เดือน พ.ศ. + ฉบับที่ในเดือน
  function issueInfo(s) { var m = /^(\d{4})-(\d{2})/.exec(s || ""); if (!m) return null; var y = +m[1], mo = +m[2]; return { fy: y + (mo >= 10 ? 1 : 0), i: (mo + 2) % 12 }; }
  function uniq(list) { return list.filter(function (v, i) { return list.indexOf(v) === i; }); }
  function dash(v) { return v == null ? "—" : v; }
  // PostgREST คืนสูงสุด 1,000 แถวต่อครั้ง จึงดึงต่อจนหมด
  async function fetchAll(make) {
    var out = [], from = 0, r;
    do { r = await make().range(from, from + 999); if (r.error) return r; out = out.concat(r.data || []); from += 1000; } while ((r.data || []).length === 1000);
    return { data: out, error: null };
  }

  async function loadWorks() {
    var err = {};
    var res = await Promise.all([
      fetch("../data/news.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).catch(function (e) { err.news = e; return []; }),
      fetchAll(function () { return sb.from("ptc_submissions").select("id,code,fiscal_year,kind,dept,status").order("id"); }),
      fetchAll(function () { return sb.from("ptc_yearly").select("*").order("fiscal_year"); }),
      fetchAll(function () { return sb.from("dis_questions").select("id,fiscal_year").neq("status", "draft").order("id"); })
    ]);
    // ประกาศเปิดตัวเว็บไม่มีงวด จึงไม่นับเป็นข่าว newsletter
    WK.news = res[0].filter(function (n) { return issueInfo(n.issue); });
    ["subs","yearly"].forEach(function (k, i) { var r = res[i + 1]; if (r.error) { err[k] = r.error; WK[k] = []; } else WK[k] = r.data; });
    WK.qCount = {};
    if (res[3].error) err.q = res[3].error; else res[3].data.forEach(function (q) { WK.qCount[q.fiscal_year] = (WK.qCount[q.fiscal_year] || 0) + 1; });
    wkErr = err;
    var m = [];
    if (err.news) m.push("โหลดข่าวจากเว็บไม่สำเร็จ");
    if (err.subs) m.push("โหลดรายการยื่นเสนอยาไม่สำเร็จ");
    if (err.yearly) m.push("โหลดตัวเลขยาเข้า-ออกไม่สำเร็จ (ถ้ายังไม่เคยใช้ ต้องรัน ptc-stats.sql ใน Supabase ก่อน)");
    if (err.q) m.push("โหลดจำนวนคำถามไม่สำเร็จ");
    Object.keys(err).forEach(function (k) { console.error("works " + k, err[k]); });
    $("wkNotice").hidden = !m.length; $("wkNotice").textContent = m.join(" · ");
    $("yrForm").querySelector("button").disabled = !!err.yearly;
    if (!$("wkFy").options.length) {
      var o = ""; for (var y = fyOf(new Date()); y >= 2569; y--) o += '<option value="' + y + '">ปีงบ ' + y + "</option>";
      $("wkFy").innerHTML = o;
    }
    WK.ready = true; drawWorks();
  }
  $("wkFy").addEventListener("change", drawWorks);

  function wkStat(fy) {
    var news = WK.news.filter(function (n) { return issueInfo(n.issue).fy === fy; });
    var extra = LK.extraIssues.filter(function (x) { return issueInfo(x.issue).fy === fy; });
    var issues = uniq(news.map(function (n) { return n.issue; }).concat(extra.map(function (x) { return x.issue; })));
    var subs = WK.subs.filter(function (s) { return s.fiscal_year === fy && s.status !== "withdrawn"; });
    var yr = WK.yearly.filter(function (y) { return y.fiscal_year === fy; })[0] || {};
    function add(a, b) { return yr[a] != null && yr[b] != null ? yr[a] + yr[b] : null; }
    // ถ้ากรอกตัวเลขรายปีไว้ใช้ค่านั้นก่อน ไม่งั้นนับจากระบบออนไลน์
    var manual = yr.submitted != null, rep = subs.filter(function (x) { return x.kind === "replace"; }).length, online = !wkErr.subs && subs.length > 0;
    return { fy: fy, news: news, issues: issues, subs: subs, rep: rep, yr: yr, inAll: add("in_cycle", "in_off"), outAll: add("out_cycle", "out_off"),
      submitted: manual ? yr.submitted : online ? subs.length : null,
      subNew: manual ? yr.sub_new : online ? subs.length - rep : null, subRep: manual ? yr.sub_replace : online ? rep : null };
  }

  function drawWorks() {
    var s = wkStat(+$("wkFy").value || fyOf(new Date())), y = s.yr, none = wkErr.yearly ? "โหลดไม่สำเร็จ" : "ยังไม่ได้กรอก";
    var tiles = [
      ["Newsletter", wkErr.news ? "—" : s.issues.length, "ฉบับ", wkErr.news ? "โหลดไม่สำเร็จ" : s.news.length + " ข่าวบนเว็บ"],
      ["ยื่นเสนอยา", dash(s.submitted), "รายการ", s.submitted == null ? "ยังไม่มีข้อมูล" : "เข้าใหม่ " + dash(s.subNew) + " · ทดแทน " + dash(s.subRep)],
      ["ยาเข้าตามวาระ", dash(y.in_cycle), "ทะเบียน", y.in_cycle == null ? none : "เข้าใหม่ " + dash(y.in_new) + " · ทดแทน " + dash(y.in_replace)],
      ["ยาออกตามวาระ", dash(y.out_cycle), "ทะเบียน", y.out_cycle == null ? none : "รวมนอกวาระ " + dash(s.outAll) + " ทะเบียน"]
    ];
    $("wkTiles").innerHTML = tiles.map(function (t) {
      return '<div class="card tile"><div class="tile-label" style="min-height:0">' + t[0] + '</div><div class="tile-value">' + t[1] + " <small>" + t[2] + '</small></div><div class="tile-foot"><span class="num">' + esc(t[3]) + "</span></div></div>";
    }).join("");
    drawNews(s);
    bars("wkTags", countBy(s.news, function (n) { return n.tag; }), 8);
    var st = { wait: 0, ready: 0, ptc: 0, failed: 0 };
    s.subs.forEach(function (x) { st[x.status === "complete" ? "ready" : x.status === "ptc" ? "ptc" : x.status === "failed" ? "failed" : "wait"]++; });
    $("wkSubs").innerHTML = wkErr.subs ? "<dt>โหลดไม่สำเร็จ</dt><dd>—</dd>" :
      [["ยื่นทั้งหมด", s.subs.length], ["เข้าใหม่ · ทดแทน", (s.subs.length - s.rep) + " · " + s.rep], ["อยู่ระหว่างตรวจเอกสาร", st.wait], ["เอกสารครบ รอเข้า PTC", st.ready], ["เข้าวาระ PTC แล้ว", st.ptc], ["ไม่ผ่านเกณฑ์", st.failed]]
        .map(function (x) { return "<dt>" + x[0] + '</dt><dd class="num">' + x[1] + "</dd>"; }).join("");
    bars("wkSubDept", wkErr.subs ? {} : countBy(s.subs, function (x) { return x.dept; }), 6);
    $("wkYear").innerHTML = [
      ["ยื่นเสนอตามรอบ", y.submitted == null ? "—" : y.submitted + " (ใหม่ " + dash(y.sub_new) + " · ทดแทน " + dash(y.sub_replace) + ")"],
      ["เข้าตามวาระ", y.in_cycle == null ? "—" : y.in_cycle + " (เข้าใหม่ " + dash(y.in_new) + " · ทดแทน " + dash(y.in_replace) + ")"],
      ["ออกตามวาระ", dash(y.out_cycle)],
      ["เข้า · ออกนอกวาระ", dash(y.in_off) + " · " + dash(y.out_off)],
      ["รวมเข้า · ออกทั้งปี", dash(s.inAll) + " · " + dash(s.outAll)]
    ].map(function (x) { return "<dt>" + x[0] + '</dt><dd class="num">' + x[1] + "</dd>"; }).join("") + (y.note ? "<dt>หมายเหตุ</dt><dd>" + esc(y.note) + "</dd>" : "");
    YR_N.forEach(function (n) { $("yr-" + n[0]).value = y[n[0]] == null ? "" : y[n[0]]; }); $("yr-note").value = y.note || "";
    var rows = "";
    for (var f = fyOf(new Date()); f >= 2569; f--) {
      var c = wkStat(f);
      rows += "<tr><td>" + f + "</td>" + [wkErr.news ? null : c.issues.length, wkErr.news ? null : c.news.length, wkErr.q ? null : (WK.qCount[f] || 0), c.submitted, c.yr.in_cycle, c.yr.out_cycle, c.inAll, c.outAll]
        .map(function (v) { return '<td class="r num">' + dash(v) + "</td>"; }).join("") + "</tr>";
    }
    $("wkCompare").innerHTML = rows;
  }

  function drawNews(s) {
    var c = new Array(12).fill(0), n = new Array(12).fill(0), W = 640, H = 230, l = 30, t = 18, b = 44, iw = W - l - 10, ih = H - t - b, bw = iw / 12, x = "";
    s.news.forEach(function (k) { c[issueInfo(k.issue).i]++; });
    s.issues.forEach(function (k) { n[issueInfo(k).i]++; });
    var max = Math.max(4, Math.ceil(Math.max.apply(null, c) / 4) * 4);
    for (var g = 0; g <= 4; g++) { var y = t + ih - ih * g / 4; x += '<line class="grid-line" x1="' + l + '" x2="' + (W - 10) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (l - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + (max * g / 4) + "</text>"; }
    c.forEach(function (v, i) {
      var h = ih * v / max, cx = l + i * bw + bw / 2;
      if (v) x += '<rect class="bar" x="' + (cx - bw * 0.28) + '" y="' + (t + ih - h) + '" width="' + (bw * 0.56) + '" height="' + h + '" rx="4"><title>' + MONTHS[i] + " " + v + " ข่าว " + n[i] + ' ฉบับ</title></rect><text class="val" x="' + cx + '" y="' + (t + ih - h - 5) + '" text-anchor="middle">' + v + "</text>";
      x += '<text x="' + cx + '" y="' + (H - 26) + '" text-anchor="middle">' + MONTHS[i] + "</text>" + (n[i] ? '<text x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle">(' + n[i] + ")</text>" : "");
    });
    $("wkChart").innerHTML = x;
  }

  /* ---------- สรุปสำหรับตอบหัวหน้า / CSV ---------- */
  function wkSummary(s) {
    var y = s.yr, L = ["สรุปผลงานเภสัชสนเทศ ปีงบประมาณ " + s.fy + " (ข้อมูล ณ " + thDate(new Date()).slice(0, 8) + ")"];
    if (!wkErr.news) L.push("Newsletter: " + s.issues.length + " ฉบับ " + s.news.length + " ข่าว");
    if (!wkErr.q) L.push("คำถาม DIS: " + (WK.qCount[s.fy] || 0) + " คำถาม");
    if (s.submitted != null) L.push("ยื่นเสนอยา: " + s.submitted + " รายการ (เข้าใหม่ " + dash(s.subNew) + " ทดแทน " + dash(s.subRep) + ")");
    if (y.in_cycle != null) L.push("ยาเข้าตามวาระ: " + y.in_cycle + " ทะเบียน" + (s.inAll != null ? " (รวมนอกวาระ " + s.inAll + ")" : ""));
    if (y.out_cycle != null) L.push("ยาออกตามวาระ: " + y.out_cycle + " ทะเบียน" + (s.outAll != null ? " (รวมนอกวาระ " + s.outAll + ")" : ""));
    return L.join("\n");
  }
  $("wkCopy").addEventListener("click", function () {
    if (!WK.ready) return;
    var t = wkSummary(wkStat(+$("wkFy").value));
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("คัดลอกสรุปแล้ว วางใน LINE ได้เลย"); }, function () { window.prompt("คัดลอกข้อความนี้", t); });
  });
  $("wkCsv").addEventListener("click", function () {
    if (!WK.ready) return;
    var s = wkStat(+$("wkFy").value), q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var out = [["Newsletter"], ["งวด","วันที่หนังสือ","หมวด","หัวข้อ"]].concat(s.news.map(function (n) { return [n.issue, n.date, n.tag, n.title]; }));
    out.push([], ["ยาเข้า-ออก ปีงบ " + s.fy]);
    YR_N.forEach(function (n) { out.push([n[1], s.yr[n[0]]]); });
    out.push([], ["ยื่นเสนอยาออนไลน์"], ["เลขรับ","ประเภท","กลุ่มงาน","สถานะ"]);
    s.subs.forEach(function (r) { out.push([r.code, r.kind === "replace" ? "ทดแทน" : "เข้าใหม่", r.dept, label(LK.ptcSubStatus, r.status)]); });
    var e = document.createElement("a");
    e.href = URL.createObjectURL(new Blob(["﻿" + out.map(function (r) { return r.map(q).join(","); }).join("\n")], { type: "text/csv;charset=utf-8" }));
    e.download = "DIS-newsletter-drug-" + s.fy + ".csv"; e.click();
  });

  /* ---------- บันทึกตัวเลขรายปี ---------- */
  $("yrForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var row = { fiscal_year: +$("wkFy").value, note: $("yr-note").value.trim() || null, updated_at: new Date().toISOString() };
    YR_N.forEach(function (n) { var v = $("yr-" + n[0]).value; row[n[0]] = v === "" ? null : Math.max(0, parseInt(v, 10)); });
    var r = await sb.from("ptc_yearly").upsert(row);
    if (r.error) return fail(r.error, "yearly");
    toast("บันทึกตัวเลขปีงบ " + row.fiscal_year + " แล้ว"); loadWorks();
  });

  /* ---------- go ---------- */
  if (C.SUPABASE_ANON_KEY.indexOf("PASTE") === 0) {
    show("login"); $("lg-err").textContent = "ยังไม่ได้ใส่ SUPABASE_ANON_KEY ใน js/config.js"; $("lg-err").hidden = false;
  } else start();
})();
