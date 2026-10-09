/* หน้าเภสัชกร: รายการ, รายละเอียด (เช็คลิสต์ แก้ข้อมูล สถานะ ยืมคืน พิมพ์ Word ติดต่อ), สถิติ, Excel */
(function () {
  "use strict";
  var P = window.PTC, sb = P.client(), esc = P.esc;
  var $ = function (id) { return document.getElementById(id); };
  var me = null, rows = [], confMap = {}, filt = "all", cur = null, curConf = {}, curEvents = [], dpv = "12", dMounted = null;

  function fyOf(d) { d = new Date(d); return d.getFullYear() + 543 + (d.getMonth() >= 9 ? 1 : 0); }
  function pad(n) { return ("0" + n).slice(-2); }
  function thShort(d) { d = new Date(d); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + String(d.getFullYear() + 543).slice(-2) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function fail(e, where) { console.error(where, e); P.toast("ผิดพลาด: " + (e && e.message ? e.message : e)); }

  /* ---------- theme / views ---------- */
  var root = document.documentElement;
  $("themeToggle").addEventListener("click", function () {
    var dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark"; try { localStorage.setItem("dis-theme", root.dataset.theme); } catch (e) {}
  });
  function show(v) {
    document.querySelectorAll(".view").forEach(function (s) { s.hidden = s.id !== "v-" + v; });
    document.querySelectorAll(".tab[data-view]").forEach(function (t) { t.setAttribute("aria-selected", t.dataset.view === v); });
    window.scrollTo({ top: 0 });
  }
  document.querySelectorAll(".tab[data-view]").forEach(function (t) {
    t.addEventListener("click", function () { show(t.dataset.view); if (t.dataset.view === "stats") drawStats(); if (t.dataset.view === "list") drawList(); });
  });

  /* ---------- auth ---------- */
  $("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault(); $("lg-err").hidden = true;
    var r = await sb.auth.signInWithPassword({ email: $("lg-email").value.trim(), password: $("lg-pass").value });
    if (r.error) { $("lg-err").textContent = "เข้าสู่ระบบไม่สำเร็จ ตรวจอีเมลและรหัสผ่านอีกครั้ง"; $("lg-err").hidden = false; return; }
    start();
  });
  $("btnLogout").addEventListener("click", async function () { await sb.auth.signOut(); location.reload(); });

  async function start() {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) { show("login"); return; }
    me = s.user; $("tabs").hidden = false; $("userChip").hidden = false;
    var fyNow = fyOf(new Date()), o = "";
    for (var y = fyNow; y >= 2570; y--) o += '<option value="' + y + '">ปีงบ ' + y + "</option>";
    $("fySel").innerHTML = o;
    $("submitLink").textContent = P.base() + "submit.html";
    await load();
    var c = new URLSearchParams(location.search).get("c");
    if (c) { var hit = rows.filter(function (r) { return r.code === c.toUpperCase(); })[0]; if (hit) return openDetail(hit.id); }
    show("list"); drawList();
  }
  $("fySel").addEventListener("change", async function () { await load(); drawList(); });

  async function load() {
    var fy = +$("fySel").value;
    $("fyLabel").textContent = fy; $("fyLabel2").textContent = fy;
    var a = await sb.from("ptc_submissions").select("*").eq("fiscal_year", fy).order("code");
    if (a.error) return fail(a.error, "load");
    rows = a.data || [];
    var ids = rows.map(function (r) { return r.id; });
    confMap = {};
    if (ids.length) {
      var b = await sb.from("ptc_confidential").select("*").in("submission_id", ids);
      (b.data || []).forEach(function (c) { confMap[c.submission_id] = c.data || {}; });
    }
  }

  /* ---------- รายการ ---------- */
  function count(s) { return rows.filter(function (r) { return r.status === s; }).length; }
  function drawList() {
    var k = [["ยื่นทั้งหมด", rows.filter(function (r) { return r.status !== "withdrawn"; }).length, ""],
      ["ยังไม่ส่งแฟ้ม", count("submitted"), ""], ["รอเราตรวจ", count("received"), count("received") ? "alert" : ""],
      ["รอผู้แทนแก้ไข", count("fix"), ""], ["แฟ้มอยู่นอกห้อง", count("out"), count("out") ? "alert" : ""],
      ["ครบ รอเข้า PTC", count("complete"), ""]];
    $("kpis").innerHTML = k.map(function (x) { return '<div class="card kpi ' + x[2] + '"><div class="n">' + x[1] + '</div><div class="l">' + x[0] + "</div></div>"; }).join("");
    var opts = [["all", "ทั้งหมด"]].concat(Object.keys(P.STATUS).map(function (s) { return [s, P.STATUS[s][0]]; }));
    $("chips").innerHTML = opts.map(function (o) {
      return '<label class="choice"><input type="radio" name="flt" value="' + o[0] + '"' + (o[0] === filt ? " checked" : "") + "><span>" + esc(o[1]) +
        (o[0] !== "all" ? " " + count(o[0]) : "") + "</span></label>";
    }).join("");
    $("chips").querySelectorAll("input").forEach(function (i) { i.onchange = function () { filt = i.value; drawRows(); }; });
    drawRows();
  }
  $("q").addEventListener("input", function () { drawRows(); });
  function drawRows() {
    var q = $("q").value.trim().toLowerCase();
    var list = rows.filter(function (r) {
      if (filt !== "all" && r.status !== filt) return false;
      if (!q) return true;
      return [r.code, r.f12.trade, r.f12.generic, r.company, r.f12.proposer, r.rep_name, r.dept].join(" ").toLowerCase().indexOf(q) > -1;
    });
    $("emptyNote").hidden = rows.length > 0;
    $("rows").innerHTML = list.map(function (r) {
      return '<tr class="click" data-id="' + r.id + '"><td><b class="mono">' + esc(r.code) + "</b></td><td>" + esc(r.f12.trade) + '<div class="hint">' + esc(r.f12.generic) + "</div></td><td>" +
        (r.kind === "replace" ? "ทดแทน" : "ใหม่") + "</td><td>" + esc(r.dept) + '</td><td class="num">' + esc(r.f12.group || "") + "</td><td>" + esc(r.rep_name) +
        '<div class="hint">' + esc(r.company) + "</div></td><td>" + P.pill(r.status) + '</td><td class="hint">' + thShort(r.updated_at) + "</td></tr>";
    }).join("");
    $("rows").querySelectorAll("tr").forEach(function (tr) { tr.onclick = function () { openDetail(+tr.dataset.id); }; });
  }

  /* ---------- รายละเอียด ---------- */
  P.buildFields($("dsConf"), function (f) { return f.owner === "staff"; }, "c-");
  P.buildFields($("dsRep"), function (f) { return f.owner !== "staff"; }, "r-");
  $("deptList").innerHTML = P.DEPTS.map(function (d) { return "<option>" + esc(d) + "</option>"; }).join("");
  $("stSel").innerHTML = Object.keys(P.STATUS).map(function (s) { return '<option value="' + s + '">' + esc(P.STATUS[s][0]) + "</option>"; }).join("");
  $("bulkDept").innerHTML = P.DEPTS.map(function (d) { return "<option>" + esc(d) + "</option>"; }).join("");

  document.querySelectorAll("[data-sub]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-sub]").forEach(function (x) { x.setAttribute("aria-selected", x === b); });
      document.querySelectorAll("[data-pane]").forEach(function (p) { p.hidden = p.dataset.pane !== b.dataset.sub; });
      if (b.dataset.sub === "data") renderDetailPaper();
      if (b.dataset.sub === "contact") drawContact();
    });
  });

  async function openDetail(id) {
    cur = rows.filter(function (r) { return r.id === id; })[0]; if (!cur) return;
    curConf = confMap[id] || {};
    $("tabDetail").hidden = false; show("detail");
    try { history.replaceState(null, "", "?c=" + cur.code); } catch (e) {}
    var ev = await sb.from("ptc_events").select("*").eq("submission_id", id).order("at", { ascending: false });
    curEvents = ev.data || [];
    drawDetail();
  }
  function drawDetail() {
    $("dEyebrow").textContent = cur.code + " · " + (cur.kind === "replace" ? "เสนอทดแทน" : "เสนอเข้าใหม่") + " · " + cur.dept + " · กลุ่ม " + (cur.f12.group || "-");
    $("dTitle").textContent = cur.f12.trade || "";
    $("dPill").innerHTML = P.pill(cur.status);
    var q = [];
    if (cur.status === "submitted") q.push(["received", "รับแฟ้มต้นฉบับแล้ว"]);
    if (cur.status === "fix") q.push(["received", "รับแฟ้มที่แก้แล้ว"]);
    if (cur.status === "complete") q.push(["ptc", "เข้าวาระ PTC แล้ว"]);
    $("quick").innerHTML = q.map(function (x) { return '<button class="btn btn-primary btn-sm" data-q="' + x[0] + '">' + x[1] + "</button>"; }).join("");
    $("quick").querySelectorAll("button").forEach(function (b) { b.onclick = function () { setStatus(b.dataset.q, null); }; });
    // เช็คลิสต์
    var ck = cur.checklist || {};
    $("chkList").innerHTML = P.CHECKLIST.map(function (c) {
      var v = ck[c[0]] || "";
      return '<div class="chk-row"><b class="mono">' + c[0] + "</b><span>" + esc(c[1]) + '</span><span class="tri" data-item="' + c[0] + '">' +
        [["ok", "ครบ"], ["fix", "แก้ไข"], ["missing", "ขาด"], ["na", "ไม่เกี่ยว"]].map(function (o) {
          return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (v === o[0]) + '">' + o[1] + "</button>";
        }).join("") + "</span></div>";
    }).join("");
    $("chkList").querySelectorAll(".tri button").forEach(function (b) {
      b.onclick = function () { var on = b.getAttribute("aria-pressed") !== "true"; b.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", false); }); b.setAttribute("aria-pressed", on); };
    });
    $("chkNote").value = cur.status_note || "";
    // ฟอร์มข้อมูล
    ["rep_name", "company", "email", "phone", "kind", "dept"].forEach(function (k) { $("d-" + k).value = cur[k] || ""; });
    P.fillFields($("dsRep"), Object.assign({}, cur.f12, cur.f11));
    P.fillFields($("dsConf"), curConf);
    P.toggleConditional($("df"), cur.kind, cur.f12.group);
    $("stSel").value = cur.status; $("stNote").value = cur.status_note || "";
    $("bName").value = cur.rep_name || ""; $("bPhone").value = cur.phone || "";
    drawEvents();
    if (!document.querySelector('[data-pane="data"]').hidden) renderDetailPaper();
    if (!document.querySelector('[data-pane="contact"]').hidden) drawContact();
  }
  function readChecklist() {
    var out = {};
    $("chkList").querySelectorAll(".tri").forEach(function (t) { var on = t.querySelector('[aria-pressed="true"]'); if (on) out[t.dataset.item] = on.dataset.v; });
    return out;
  }
  function flagged(ck) {
    return P.CHECKLIST.filter(function (c) { return ck[c[0]] === "fix" || ck[c[0]] === "missing"; })
      .map(function (c) { return "ข้อ " + c[0] + " " + c[1] + (ck[c[0]] === "missing" ? " (ขาด)" : " (ต้องแก้ไข)"); });
  }

  async function saveRow(patch, eventRow) {
    var r = await sb.from("ptc_submissions").update(patch).eq("id", cur.id).select().single();
    if (r.error) { fail(r.error, "save"); return false; }
    Object.assign(cur, r.data);
    if (eventRow) {
      eventRow.submission_id = cur.id; eventRow.staff_id = me.id;
      var e = await sb.from("ptc_events").insert(eventRow).select().single();
      if (!e.error) curEvents.unshift(e.data);
    }
    drawDetail(); return true;
  }
  async function setStatus(s, note) {
    var patch = { status: s }; if (note !== null && note !== undefined) patch.status_note = note;
    if (await saveRow(patch, { kind: "status", status: s, note: note || P.STATUS[s][0] })) P.toast("เปลี่ยนสถานะเป็น " + P.STATUS[s][0]);
  }
  $("chkSave").onclick = async function () { if (await saveRow({ checklist: readChecklist(), status_note: $("chkNote").value.trim() || null }, null)) P.toast("บันทึกเช็คลิสต์แล้ว"); };
  $("chkFix").onclick = async function () {
    var ck = readChecklist(), list = flagged(ck);
    if (!list.length && !$("chkNote").value.trim()) return P.toast("ติ๊ก แก้ไข/ขาด อย่างน้อย 1 ข้อ หรือเขียนหมายเหตุ");
    var note = list.join("\n") + ($("chkNote").value.trim() ? (list.length ? "\n" : "") + $("chkNote").value.trim() : "");
    await saveRow({ checklist: ck }, null);
    await setStatus("fix", note);
    $("mailTpl").value = "fix"; document.querySelector('[data-sub="contact"]').click();
  };
  $("chkPass").onclick = async function () {
    await saveRow({ checklist: readChecklist() }, null);
    await setStatus("passed", "ตรวจผ่าน กรุณามารับแฟ้มไปทำสำเนา แล้วส่งสำเนาและไฟล์ PDF ทางอีเมล dis.ckph@gmail.com");
    $("mailTpl").value = "passed"; document.querySelector('[data-sub="contact"]').click();
  };
  $("stSave").onclick = function () { setStatus($("stSel").value, $("stNote").value.trim() || null); };
  $("bOut").onclick = async function () {
    if (!$("bName").value.trim()) return P.toast("ใส่ชื่อผู้รับแฟ้ม");
    if (await saveRow({ status: "out" }, { kind: "borrow", status: "out", person: $("bName").value.trim(), person_phone: $("bPhone").value.trim(), note: $("bNote").value.trim() || null }))
      P.toast("บันทึกการยืมแฟ้มแล้ว");
  };
  $("bIn").onclick = async function () {
    if (await saveRow({ status: "complete", status_note: null }, { kind: "return", status: "complete", person: $("bName").value.trim(), person_phone: $("bPhone").value.trim(), note: $("bNote").value.trim() || null }))
      P.toast("บันทึกรับแฟ้มคืนแล้ว");
  };
  function drawEvents() {
    var name = { status: "สถานะ", borrow: "ยืมแฟ้มออก", "return": "รับแฟ้มคืน", note: "บันทึก", edit: "แก้ข้อมูล" };
    $("evRows").innerHTML = curEvents.map(function (e) {
      return "<tr><td class=\"hint\">" + thShort(e.at) + "</td><td>" + (e.kind === "status" && e.status ? P.pill(e.status) : esc(name[e.kind] || e.kind)) + "</td><td>" +
        esc([e.person, e.person_phone, e.note].filter(Boolean).join(" · ")) + "</td></tr>";
    }).join("");
  }

  /* แก้ข้อมูล + ช่องลับ */
  function detailDoc() {
    var all = P.readFields($("dsRep")), s = P.split(all);
    return { code: cur.code, created_at: cur.created_at, kind: $("d-kind").value, dept: $("d-dept").value.trim(), company: $("d-company").value.trim(),
      f12: s.f12, f11: s.f11, statusUrl: P.statusUrl(cur.code), logo: P.logo() };
  }
  function renderDetailPaper() {
    var d = detailDoc(), conf = P.readFields($("dsConf"));
    P.toggleConditional($("df"), d.kind, d.f12.group);
    dMounted = P.mountPaper($("dPv"), dpv === "12" ? P.render12(d) : P.render11(d, conf));
    var o = P.overflow(dMounted.paper);
    $("dFit").className = "fitbar " + (o.length ? "bad" : "ok");
    $("dFit").textContent = o.length ? "ล้นกรอบ: " + o.map(P.overflowLabel).join(", ") : "พอดี A4";
  }
  var dt; $("df").addEventListener("input", function () { clearTimeout(dt); dt = setTimeout(renderDetailPaper, 150); });
  $("df").addEventListener("change", function () { clearTimeout(dt); dt = setTimeout(renderDetailPaper, 50); });
  document.querySelectorAll("[data-dpv]").forEach(function (b) { b.onclick = function () { dpv = b.dataset.dpv; document.querySelectorAll("[data-dpv]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); renderDetailPaper(); }; });
  window.addEventListener("resize", function () { if (dMounted) dMounted.fit(); });
  $("df").addEventListener("submit", async function (e) {
    e.preventDefault();
    var d = detailDoc(), conf = P.readFields($("dsConf"));
    var ok = await saveRow({ kind: d.kind, dept: d.dept, rep_name: $("d-rep_name").value.trim(), company: d.company,
      email: $("d-email").value.trim(), phone: $("d-phone").value.trim(), f12: d.f12, f11: d.f11 }, { kind: "edit", note: "เภสัชกรแก้ข้อมูล" });
    if (!ok) return;
    var c = await sb.from("ptc_confidential").upsert({ submission_id: cur.id, data: conf, updated_at: new Date().toISOString() });
    if (c.error) return fail(c.error, "conf");
    confMap[cur.id] = conf; curConf = conf; P.toast("บันทึกข้อมูลแล้ว");
  });

  /* พิมพ์ / Word */
  function docOf(r) { return { code: r.code, created_at: r.created_at, kind: r.kind, dept: r.dept, company: r.company, f12: r.f12, f11: r.f11, statusUrl: P.statusUrl(r.code), logo: P.logo() }; }
  document.querySelectorAll("[data-pr]").forEach(function (b) {
    b.onclick = function () {
      var d = docOf(cur), w = b.dataset.pr;
      P.print([w === "12" ? P.render12(d) : P.render11(d, w === "11c" ? curConf : null)]);
    };
  });
  document.querySelectorAll("[data-wd]").forEach(function (b) {
    b.onclick = function () {
      var d = docOf(cur), w = b.dataset.wd;
      if (w === "12") P.downloadDocx12(d, cur.code + " ใบ 1.2 " + (cur.f12.trade || ""));
      else P.wordDoc(P.render11(d, curConf), true, P.WORD_CSS, cur.code + " ใบ 1.1 " + (cur.f12.trade || ""));
    };
  });
  $("bulk11").onclick = function () {
    var dept = $("bulkDept").value;
    var list = rows.filter(function (r) { return r.dept === dept && ["withdrawn", "failed"].indexOf(r.status) < 0; })
      .sort(function (a, b) { return (a.kind === b.kind ? 0 : a.kind === "new" ? -1 : 1) || a.code.localeCompare(b.code); });
    if (!list.length) return P.toast("ไม่มีรายการของกลุ่มงานนี้");
    P.print(list.map(function (r) { return P.render11(docOf(r), confMap[r.id] || {}); }));
  };

  /* ติดต่อ */
  function mailText(t) {
    var head = "เรียน คุณ" + cur.rep_name + "\n\nเรื่อง เอกสารเสนอยา " + (cur.f12.trade || "") + " (เลขรับ " + cur.code + ")\n\n";
    var foot = "\n\nติดตามสถานะได้ที่ " + P.statusUrl(cur.code) + "\n\nงานบริการเภสัชสนเทศ กลุ่มงานเภสัชกรรม\nโรงพยาบาลเจริญกรุงประชารักษ์";
    if (t === "fix") return head + "งานเภสัชสนเทศตรวจแฟ้มแล้ว พบรายการที่ต้องแก้ไขดังนี้\n" + (cur.status_note || "-") + "\n\nกรุณาแก้ไขและนำแฟ้มมาส่งอีกครั้งภายในกำหนดเวลา" + foot;
    if (t === "passed") return head + "แฟ้มเอกสารตรวจผ่านแล้ว กรุณามารับแฟ้มต้นฉบับไปทำสำเนาตามแนวทาง แล้วส่งสำเนาให้แพทย์ผู้เสนอและผู้เกี่ยวข้อง พร้อมส่งไฟล์ PDF ทางอีเมล dis.ckph@gmail.com\nเมื่อมารับแฟ้ม เจ้าหน้าที่จะบันทึกชื่อผู้รับและเบอร์โทรไว้" + foot;
    return head + "งานเภสัชสนเทศได้รับแฟ้มต้นฉบับแล้ว อยู่ระหว่างตรวจความครบถ้วน" + foot;
  }
  function drawContact() {
    $("ctKv").innerHTML = "<dt>ผู้แทน</dt><dd>" + esc(cur.rep_name) + " · " + esc(cur.company) + "</dd><dt>อีเมล</dt><dd class=\"mono\">" + esc(cur.email) +
      "</dd><dt>โทร</dt><dd class=\"mono\">" + esc(cur.phone) + "</dd><dt>ลิงก์แก้ไขของผู้แทน</dt><dd class=\"mono\" style=\"word-break:break-all\">" + esc(P.editUrl(cur.code, cur.edit_token)) + "</dd>";
    var body = mailText($("mailTpl").value), subj = "เอกสารเสนอยา " + cur.code + " " + (cur.f12.trade || "");
    $("mailBody").textContent = body;
    $("mailGo").href = "mailto:" + encodeURIComponent(cur.email) + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body);
    $("telGo").href = "tel:" + cur.phone.replace(/[^\d+]/g, ""); $("telGo").textContent = "โทร " + cur.phone;
  }
  $("mailTpl").onchange = drawContact;
  $("mailCopy").onclick = function () { navigator.clipboard.writeText($("mailBody").textContent).then(function () { P.toast("คัดลอกแล้ว"); }); };

  /* ---------- สถิติ ---------- */
  function statRows() { return rows.filter(function (r) { return r.status !== "withdrawn"; }); }
  function statMatrix() {
    var by = {}, list = statRows().filter(function (r) { return r.status !== "failed"; });
    list.forEach(function (r) {
      var d = by[r.dept] = by[r.dept] || { g: [0, 0, 0, 0, 0], n: 0, s: 0 };
      var g = +r.f12.group; if (g >= 1 && g <= 5) d.g[g - 1]++;
      if (r.kind === "replace") d.s++; else d.n++;
    });
    return by;
  }
  function drawStats() {
    var by = statMatrix(), depts = Object.keys(by).sort(), tot = { g: [0, 0, 0, 0, 0], n: 0, s: 0 };
    var body = depts.map(function (k) {
      var d = by[k]; d.g.forEach(function (v, i) { tot.g[i] += v; }); tot.n += d.n; tot.s += d.s;
      var sum = d.g.reduce(function (a, b) { return a + b; }, 0);
      return "<tr><td>" + esc(k) + "</td>" + d.g.map(function (v) { return '<td class="num">' + v + "</td>"; }).join("") +
        '<td class="num"><b>' + sum + '</b></td><td class="num">' + d.n + '</td><td class="num">' + d.s + "</td></tr>";
    }).join("");
    var all = tot.g.reduce(function (a, b) { return a + b; }, 0);
    $("statTbl").innerHTML = "<thead><tr><th>กลุ่มงาน</th>" + [1, 2, 3, 4, 5].map(function (g) { return '<th class="num">กลุ่ม ' + g + "</th>"; }).join("") +
      '<th class="num">รวม</th><th class="num">เข้าใหม่</th><th class="num">ทดแทน</th></tr></thead><tbody>' + (body || '<tr><td colspan="9" class="hint">ยังไม่มีข้อมูล</td></tr>') +
      "</tbody><tfoot><tr><td>รวม</td>" + tot.g.map(function (v) { return '<td class="num">' + v + "</td>"; }).join("") + '<td class="num">' + all + '</td><td class="num">' + tot.n + '</td><td class="num">' + tot.s + "</td></tr></tfoot>";
    var failed = rows.filter(function (r) { return r.status === "failed"; });
    $("statNote").textContent = failed.length ? "ไม่ผ่านเกณฑ์ " + failed.length + " รายการ: " + failed.map(function (r) { return r.code + " " + (r.f12.trade || ""); }).join(", ") : "";
  }

  /* ---------- Excel ---------- */
  $("xlsBtn").addEventListener("click", async function () {
    if (!window.XLSX) return P.toast("โหลดตัวสร้าง Excel ไม่สำเร็จ ลองรีเฟรชหน้า");
    var ids = rows.map(function (r) { return r.id; }), ev = [];
    if (ids.length) { var e = await sb.from("ptc_events").select("*").in("submission_id", ids).order("at"); ev = e.data || []; }
    var codeOf = {}; rows.forEach(function (r) { codeOf[r.id] = r.code; });
    var cols = P.FIELDS;
    var main = rows.map(function (r) {
      var o = { "เลขรับ": r.code, "สถานะ": (P.STATUS[r.status] || [r.status])[0], "ประเภท": r.kind === "replace" ? "ทดแทน" : "เข้าใหม่", "กลุ่มงาน": r.dept };
      var all = Object.assign({}, r.f12, r.f11, confMap[r.id] || {});
      cols.forEach(function (f) { var v = all[f.k]; o[f.label] = Array.isArray(v) ? v.join(", ") : (v || ""); });
      o["ผู้แทน"] = r.rep_name; o["บริษัท"] = r.company; o["อีเมล"] = r.email; o["โทร"] = r.phone;
      o["หมายเหตุถึงผู้แทน"] = r.status_note || ""; o["ผล PTC"] = r.ptc_result || "";
      o["ยื่นออนไลน์"] = thShort(r.created_at); o["อัปเดตล่าสุด"] = thShort(r.updated_at);
      return o;
    });
    var by = statMatrix(), st = Object.keys(by).sort().map(function (k) {
      var d = by[k]; return { "กลุ่มงาน": k, "กลุ่ม 1": d.g[0], "กลุ่ม 2": d.g[1], "กลุ่ม 3": d.g[2], "กลุ่ม 4": d.g[3], "กลุ่ม 5": d.g[4], "รวม": d.g.reduce(function (a, b) { return a + b; }, 0), "เข้าใหม่": d.n, "ทดแทน": d.s };
    });
    var lg = ev.map(function (e) { return { "เวลา": thShort(e.at), "เลขรับ": codeOf[e.submission_id], "รายการ": e.kind, "สถานะ": e.status ? (P.STATUS[e.status] || [e.status])[0] : "", "ผู้รับ/ส่ง": e.person || "", "โทร": e.person_phone || "", "หมายเหตุ": e.note || "" }; });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(main.filter(function (o) { return o["ประเภท"] === "เข้าใหม่"; })), "เข้าใหม่");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(main.filter(function (o) { return o["ประเภท"] === "ทดแทน"; })), "ทดแทน");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(st), "สถิติ");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lg), "log");
    XLSX.writeFile(wb, "ยาเข้า-PTC-ปีงบ" + $("fySel").value + ".xlsx");
  });

  start();
})();
