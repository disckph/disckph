/* PTC ยื่นเสนอยา — นิยามช่องข้อมูล + ตัววาดใบ 1.1 / 1.2 (ใช้ร่วมกันทั้งหน้าผู้แทนและหน้าเภสัชกร)
   ช่องที่ owner: "staff" = ช่องลับ เภสัชกรเติมเอง ผู้แทนไม่เห็น (เก็บในตาราง ptc_confidential)
   อยากย้ายช่องไหนเป็นช่องลับ/ช่องผู้แทน แก้ owner ที่นี่ที่เดียว */
(function () {
  "use strict";

  var UHOSNET = [
    "โรงพยาบาลศิริราช", "โรงพยาบาลจุฬาลงกรณ์", "โรงพยาบาลรามาธิบดี", "โรงพยาบาลมหาราชนครเชียงใหม่",
    "โรงพยาบาลศรีนครินทร์", "โรงพยาบาลสงขลานครินทร์", "โรงพยาบาลพระมงกุฎเกล้า", "คณะแพทยศาสตร์วชิรพยาบาล",
    "โรงพยาบาลราชวิถี", "ศูนย์การแพทย์สมเด็จพระเทพรัตนราชสุดาฯ", "สถาบันสุขภาพเด็กแห่งชาติมหาราชินี",
    "ศูนย์การแพทย์มหาวิทยาลัยนเรศวร", "โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ"
  ];
  var DEPTS = ["กุมารเวชกรรม", "จักษุวิทยา", "จิตเวช", "ทันตกรรม", "เวชศาสตร์ฉุกเฉิน", "เวชศาสตร์ฟื้นฟู",
    "เวชศาสตร์ผู้สูงอายุ", "รังสีวิทยา", "วิสัญญีวิทยา", "ศัลยกรรม", "สูติ-นรีเวชกรรม", "โสต ศอ นาสิก",
    "ออร์โธปิดิกส์", "อายุรกรรม", "กลุ่มงานเภสัชกรรม"];
  var NED = [["NED", "ไม่อยู่ในบัญชียาหลัก (NED)"], ["ก", "บัญชี ก"], ["ข", "บัญชี ข"], ["ค", "บัญชี ค"], ["ง", "บัญชี ง"], ["จ(1)", "บัญชี จ(1)"], ["จ(2)", "บัญชี จ(2)"]];

  /* เช็คลิสต์ตามแนวทาง รพจ-70 (ใช้ในหน้าเภสัชกร) */
  var CHECKLIST = [
    ["1.1", "เอกสารสรุปรายการยาที่นำเสนอเข้าใหม่"], ["1.2", "ใบคำร้องขอนำยาเข้า (FM-PHA-042 rev.05) พิมพ์ และลงนามครบ"],
    ["1.3", "ใบเสนอราคา ยืนราคาอย่างน้อย 1 ปี ไม่สูงกว่าราคากลาง/รพ.สังกัด สนพ."], ["1.4", "ใบสำคัญการขึ้นทะเบียนตำรับยา"],
    ["1.5", "หนังสือแต่งตั้งตัวแทนจำหน่ายแต่ผู้เดียว (ยานำเข้า)"], ["1.6", "สำเนาบัญชียาหลักแห่งชาติหน้าที่มีชื่อยา"],
    ["1.7", "แบบเอกสาร 1.7 พร้อมรูปยา และนามบัตรผู้แทน"], ["1.8", "Certificate of analysis ยาและวัตถุดิบ"],
    ["1.9", "GMP/PIC/S โรงงานผลิตยาและวัตถุดิบ"], ["1.10", "Stability data"],
    ["1.11", "เอกสารอนุญาตจำหน่ายในประเทศผู้ผลิต (ยานำเข้า)"], ["1.12", "RMP และ Elemental Impurities Risk Assessment (หากมี)"],
    ["1.13", "หลักฐานมีจำหน่ายใน รพ. เครือข่าย UHosNet อย่างน้อย 1 แห่ง"], ["2.1", "เอกสารวิชาการเพิ่มเติม (ถ้ามี)"],
    ["2.2", "BE / biosimilar จากสถาบันในประเทศไทย (ถ้ามี)"], ["2.3", "หลักฐานยานวัตกรรมไทย (ถ้ามี)"]
  ];

  /* ช่องข้อมูลทั้งหมด
     where: "both" = ใช้ทั้ง 1.1 และ 1.2, "12" = เฉพาะ 1.2, "11" = เฉพาะ 1.1
     owner: "rep" ผู้แทนกรอก / "staff" ช่องลับ เภสัชกรเติม
     lines: จำนวนบรรทัดที่ช่องนี้มีในใบ 1.2 (ช่อง 10-12) */
  var FIELDS = [
    { k: "proposer", label: "แพทย์ผู้เสนอ (นพ./พญ.)", where: "both", req: true, ph: "นพ.สมชาย ใจดี" },
    { k: "trade", label: "ชื่อการค้า (ระบุลักษณะ ขนาด)", where: "both", req: true, ph: "BEXSERO 0.5 mL prefilled syringe" },
    { k: "generic", label: "ชื่อสามัญทางยา", where: "both", req: true },
    { k: "tmt24", label: "รหัสมาตรฐานยา 24 หลัก", where: "both", max: 24 },
    { k: "tpu", label: "TPU code", where: "both" },
    { k: "gpu", label: "GPU code", where: "both" },
    { k: "old_drug", label: "ชื่อยาเดิมที่เสนอทดแทน", where: "both", onlyKind: "replace" },
    { k: "ned_list", label: "สถานะในบัญชียาหลักแห่งชาติ", where: "both", type: "select", opts: NED, req: true },
    { k: "group", label: "เสนอเข้าบัญชียา รพจ. กลุ่ม", where: "both", type: "select", opts: [["1", "กลุ่ม 1"], ["2", "กลุ่ม 2"], ["3", "กลุ่ม 3"], ["4", "กลุ่ม 4"], ["5", "กลุ่ม 5"]], req: true },
    { k: "group2_cond", label: "เงื่อนไขการสั่งใช้ / ข้อบ่งใช้ กรณีกลุ่ม 2", where: "both", type: "area", onlyGroup: "2" },
    { k: "manufacturer", label: "บริษัทผู้ผลิต", where: "both", req: true },
    { k: "country", label: "ประเทศผู้ผลิต", where: "both", req: true },
    { k: "distributor", label: "บริษัทผู้จัดจำหน่ายในประเทศไทย", where: "both", req: true },
    { k: "price", label: "ราคาต่อหน่วยหรือต่อบรรจุภัณฑ์ (รวม VAT)", where: "both", req: true, ph: "2,735.99 บาท/PFS" },
    { k: "indication", label: "ข้อบ่งใช้ (Indication)", where: "both", type: "area", req: true },
    { k: "compare", label: "ข้อเปรียบเทียบกับยาอื่นในกลุ่มเดียวกันที่มีในโรงพยาบาล", where: "12", type: "area" },
    { k: "reason", label: "เหตุผลในการนำเข้า", where: "both", type: "area", req: true },

    { k: "drug_type", label: "ประเภทยา", where: "11", type: "select", opts: [["Original", "Original"], ["Generic", "Generic"], ["Biosimilar", "Biosimilar"]], req: true },
    { k: "ned_cat", label: "หมวดยาตามบัญชียาหลัก (หมวดที่/รายการที่)", where: "11", ph: "หมวดที่ 4.1 / รายการที่ 3 หรือ -" },
    { k: "reg_no", label: "เลขทะเบียนยา", where: "11", req: true },
    { k: "reg_date", label: "ขึ้นทะเบียนกับ อย. เมื่อ", where: "11", ph: "25 กรกฎาคม 2567" },
    { k: "patent_end", label: "วันสิ้นสุดสิทธิบัตรยา", where: "11", ph: "- ถ้าไม่มี" },
    { k: "innovation", label: "บัญชีนวัตกรรม", where: "11", type: "select", opts: [["No", "No"], ["Yes", "Yes"]] },
    { k: "innovation_exp", label: "วันหมดอายุบัญชีนวัตกรรม", where: "11", ph: "-" },
    { k: "api_country", label: "วัตถุดิบจากประเทศ", where: "11" },
    { k: "dosage", label: "วิธีใช้ยา", where: "11", type: "area" },
    { k: "storage", label: "การเก็บรักษา", where: "11" },
    { k: "shelf_life", label: "อายุยา", where: "11" },
    { k: "storage_open", label: "การเก็บรักษาหลังเปิดใช้", where: "11", ph: "-" },
    { k: "shelf_open", label: "อายุยาหลังเปิดใช้", where: "11", ph: "-" },
    { k: "safety", label: "ความปลอดภัย และข้อควรระวัง", where: "11", type: "area" },
    { k: "form_limit", label: "ข้อจำกัดของรูปแบบยา", where: "11", ph: "-" },
    { k: "cost_price", label: "ราคาทุนต่อหน่วย (รวมภาษี) ที่เสนอ", where: "11", req: true, ph: "85.60 บาท/30 เม็ด (2.853 บาท/เม็ด)" },
    { k: "bma_hosp", label: "โรงพยาบาลสังกัดสำนักการแพทย์ที่ใช้ยานี้ พร้อมราคาทุนต่อหน่วย", where: "11", type: "area", ph: "1. โรงพยาบาลราชพิพัฒน์ 8.56 บาท/เม็ด" },
    { k: "uhosnet", label: "โรงเรียนแพทย์ (UHosNet) ที่มีการใช้ยานี้ อย่างน้อย 1 แห่ง", where: "11", type: "checks", opts: UHOSNET },

    { k: "old_price", label: "ราคายาเดิม (ใน รพ.)", where: "11", owner: "staff" },
    { k: "mid_price", label: "ราคากลาง (อิงประกาศฉบับล่าสุด, รวมภาษี)", where: "11", owner: "staff" },
    { k: "existing", label: "รายการยาที่มีแล้วใน รพ. ด้วยข้อบ่งใช้เดียวกัน (ราคา)", where: "11", owner: "staff", type: "area" }
  ];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function br(s) { return esc(s).replace(/\n/g, "<br>"); }
  function dash(s) { return (s == null || String(s).trim() === "") ? "-" : s; }
  function thDateLong(d) {
    if (!d) return "";
    d = new Date(d);
    var m = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
    return d.getDate() + " " + m[d.getMonth()] + " " + (d.getFullYear() + 543);
  }
  function thDateShort(d) {
    if (!d) return "";
    d = new Date(d);
    var m = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    return d.getDate() + " " + m[d.getMonth()] + " " + (d.getFullYear() + 543);
  }
  function radio(on) { return on ? "&#9673;" : "&#9675;"; }   // ◉ ○

  /* ---------- QR (ถ้าโหลด qrcode-generator ได้) ---------- */
  function qrSvg(text, cell) {
    if (!window.qrcode || !text) return "";
    var q = window.qrcode(0, "M"); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: cell || 2, margin: 0, scalable: true });
  }

  /* ---------- ใบ 1.2 (A4 แนวตั้ง) ----------
     d = { code, created_at, kind, dept, f12:{...} , statusUrl, logo } */
  /* ข้อ 10-12: จำนวนบรรทัด (รวมบรรทัดหัวข้อ) ตามแบบฟอร์มเดิม ใช้ร่วมกับไฟล์ Word (ptc-docx.js) */
  var BOX_LINES = { indication: 4, compare: 4, reason: 5 };
  var BOX_LABEL = { indication: "ข้อบ่งใช้ (Indication)", compare: "ข้อเปรียบเทียบกับยาอื่น ๆ ในกลุ่มเดียวกันที่มีในโรงพยาบาล", reason: "เหตุผลในการนำเข้าหรือออกจากโรงพยาบาล" };

  /* ---------- ใบ 1.2 (A4 แนวตั้ง) จัดบรรทัดเหมือนไฟล์ Word ทุกบรรทัด ----------
     หน่วย: บรรทัดสูง 19pt, เลขข้อเยื้อง 9mm, ตำแหน่งแท็บเป็น mm นับจากขอบซ้ายของเนื้อหา */
  function render12(d) {
    var f = d.f12 || {}, rep = d.kind === "replace", ned = f.ned_list || "";
    var inNed = ned && ned !== "NED";
    var g = f.group || "";
    function v(x) { return x ? '<span class="v">' + esc(x) + "</span>" : ""; }
    // ส่วนของบรรทัดที่ลากจุดไปถึงตำแหน่ง to (mm) หรือสุดบรรทัด
    function seg(html, to) { return '<span class="sg"' + (to ? ' style="flex:0 0 ' + to + 'mm"' : "") + '><span class="tx">' + html + '</span><span class="dots"></span></span>'; }
    function plain(html, w) { return '<span class="sg pl"' + (w ? ' style="min-width:' + w + 'mm"' : "") + '><span class="tx">' + html + "</span></span>"; }
    function line(n, html) { return '<div class="ln">' + (n ? '<span class="n">' + n + ".</span>" : '<span class="n"></span>') + '<span class="lr">' + html + "</span></div>"; }
    var G = "&nbsp;&nbsp; ";   // ช่องว่างก่อนหัวข้อถัดไปในบรรทัดเดียวกัน (ต้องตรงกับ GAP ใน ptc-docx.js)
    function r(on) { return '<span class="rd">' + (on ? "&#9673;" : "&#9675;") + "</span> "; }
    function box(n, k) {
      return '<div class="ln"><span class="n">' + n + '.</span><div class="box" data-box="' + k + '" style="--lines:' + BOX_LINES[k] + '">' +
        esc(BOX_LABEL[k]) + (f[k] ? '&nbsp; <span class="v">' + br(f[k]) + "</span>" : "") + "</div></div>";
    }
    var I = 9; // เยื้องเลขข้อ (mm) ต้องตรงกับ NUM ใน ptc-docx.js
    function at(mm) { return mm - I; } // แปลงตำแหน่งจากขอบซ้ายเป็นความกว้างช่องในแถว
    return '' +
    '<div class="paper p12" data-paper="12">' +
      '<table class="hd"><tr>' +
        '<td class="hd-logo">' + (d.logo ? '<img src="' + esc(d.logo) + '" alt="">' : "") + '</td>' +
        '<td class="hd-title"><div class="ttl">ใบคำร้องขอนำยาเข้าและออก<br>จากรายการประจำโรงพยาบาล</div></td>' +
        '<td class="hd-rcv"><table class="rcv">' +
          '<tr><td colspan="2">เฉพาะเจ้าหน้าที่</td></tr>' +
          '<tr><td>เลขที่รับ<div class="code">' + esc(d.code || "รอบันทึก") + '</div></td><td>ผู้รับเอกสาร<div class="code">&nbsp;</div></td></tr>' +
          '<tr><td>ยื่นออนไลน์<br>' + (esc(thDateShort(d.created_at)) || "&nbsp;") + '</td><td>วันที่รับแฟ้ม<br>&nbsp;</td></tr>' +
        '</table></td>' +
      '</tr></table>' +
      '<div class="items">' +
        line(1, "ผู้เสนอ " + v(f.proposer) + G + "หน่วยงาน " + v(d.dept)) +
        line(2, "ชื่อการค้า (ระบุลักษณะ ขนาด) " + v(f.trade)) +
        line(3, "ชื่อสามัญทางยา " + v(f.generic)) +
        line(4, "รหัสมาตรฐานยา 24 หลัก " + v(f.tmt24) + G + "รหัส TPU " + v(f.tpu) + G + "รหัส GPU " + v(f.gpu)) +
        line(5, '<span class="tb" style="min-width:' + at(68.8) + 'mm">' + r(!rep) + "เสนอเป็นยาเข้าใหม่</span>" + r(false) + "เสนอออกจากโรงพยาบาล (ข้ามไปตอบข้อ 12.)") +
        line(0, r(rep) + "เสนอเพื่อทดแทนยาเดิม (ระบุชื่อยาเดิม) " + v(rep ? f.old_drug : "")) +
        line(6, "สถานะในบัญชียาหลักแห่งชาติฉบับปัจจุบัน") +
        line(0, r(inNed) + "อยู่ในบัญชียาหลักแห่งชาติ บัญชี " + v(inNed ? ned : "") + G + r(ned === "NED") + "ไม่อยู่ในบัญชียาหลักแห่งชาติ") +
        line(7, '<span class="tb" style="min-width:' + at(68.8) + 'mm">เสนอเข้าอยู่ในบัญชียา รพจ. กลุ่ม</span>' +
          '<span class="tb" style="min-width:21.2mm">' + r(g === "1") + '1</span><span class="tb" style="min-width:21.2mm">' + r(g === "3") + '3</span><span class="tb" style="min-width:21.2mm">' + r(g === "4") + "4</span>" + r(g === "5") + "5") +
        line(0, '<span class="tb" style="min-width:' + at(68.8) + 'mm"></span>' + r(g === "2") + "2&nbsp; ระบุข้อบ่งใช้ (indication) " + v(g === "2" ? f.group2_cond : "")) +
        line(8, "บริษัทผู้ผลิต " + v(f.manufacturer) + G + "ประเทศ " + v(f.country)) +
        line(0, "บริษัทผู้จำหน่ายในประเทศไทย " + v(f.distributor)) +
        line(9, "ราคาต่อหน่วย หรือต่อบรรจุภัณฑ์ (ราคารวมภาษีมูลค่าเพิ่ม) " + v(f.price)) +
        box(10, "indication") + box(11, "compare") + box(12, "reason") +
      '</div>' +
      // ช่องเซ็น: ความกว้างคอลัมน์ตรงกับ SW ใน ptc-docx.js (twip ÷ 56.7 = mm) เส้นจุด 9 cm วงเล็บอยู่ที่ปลายเส้นจุด
      '<table class="sig"><colgroup><col style="width:28.2mm"><col style="width:14.8mm"><col style="width:14.1mm"><col style="width:90mm"><col style="width:35.3mm"></colgroup>' +
        '<tr class="sr"><td class="qr" rowspan="4">' + (d.statusUrl ? qrSvg(d.statusUrl, 2) + '<div class="sm">สแกนดูสถานะ</div>' : "") + '</td>' +
          '<td></td><td class="l">ลงชื่อ</td><td class="dl"></td><td class="l">&nbsp;ผู้เสนอ</td></tr>' +
        '<tr><td></td><td></td><td class="pn"><span>(</span><span>' + esc(f.proposer || "") + '</span><span>)</span></td><td></td></tr>' +
        '<tr class="sr"><td></td><td class="l">ลงชื่อ</td><td class="dl"></td><td class="l">&nbsp;หัวหน้ากลุ่มงาน</td></tr>' +
        '<tr><td></td><td></td><td class="pn"><span>(</span><span></span><span>)</span></td><td></td></tr>' +
      '</table>' +
      '<div class="fm">FM-PHA-042 rev.05</div>' +
    '</div>';
  }

  /* ---------- ใบ 1.1 (A4 แนวนอน 4 คอลัมน์ ตามแบบที่ใช้ปีงบ 69) ----------
     conf = ช่องลับ (ส่ง null ถ้าเป็นฉบับผู้แทน → แสดงเป็นช่องว่างให้เภสัชกรเติม) */
  function render11(d, conf) {
    var f = Object.assign({}, d.f12 || {}, d.f11 || {}), c = conf || {}, rep = d.kind === "replace", staffView = !!conf;
    var ned = f.ned_list || "";
    function kv(label, val) { return '<p><b>' + label + '</b> ' + br(dash(val)) + "</p>"; }
    function kb(label, val) { return '<p><b>' + label + '</b><br>' + br(dash(val)) + "</p>"; }   // คำตอบขึ้นบรรทัดใหม่ (คอลัมน์ 1 แคบ)
    function sec(label, val) { return '<p class="sec"><b>' + label + "</b><br>" + br(dash(val)) + "</p>"; }
    function secret(val) { return staffView ? br(dash(val)) : '<span class="tbf">(เภสัชกรกรอก)</span>'; }
    var uh = f.uhosnet || [];
    var col1 =
      kv("ชื่อการค้า", f.trade + (f.generic ? " (" + f.generic + ")" : "")) +
      kv("ประเภทยา", f.drug_type) +
      kb("หมวดยาตามบัญชียาหลักแห่งชาติ", f.ned_cat) +
      kv("กลุ่มยาในบัญชียาหลักแห่งชาติ", ned) +
      kb("แพทย์ผู้เสนอ", f.proposer) +
      kb("รหัสยา 24 หลัก", f.tmt24) + kv("TPU code", f.tpu) + kv("GPU code", f.gpu) +
      kv("เลขทะเบียนยา", f.reg_no) + kb("ขึ้นทะเบียนกับ อย. เมื่อ", f.reg_date) +
      kv("วันสิ้นสุดสิทธิบัตรยา", f.patent_end) +
      kv("บัญชีนวัตกรรม", f.innovation) + kv("วันหมดอายุบัญชีนวัตกรรม", f.innovation_exp) +
      kb("บริษัทผู้เสนอ", d.company) + kb("บริษัทผู้ผลิต", f.manufacturer + (f.country ? ", " + f.country : "")) +
      kb("บริษัทจัดจำหน่ายยา", f.distributor) + kv("วัตถุดิบจากประเทศ", f.api_country);
    var col2 =
      '<p class="c"><b>' + (rep ? "เสนอเพื่อทดแทนยาเดิม" : "เสนอเป็นยาเข้าใหม่") + "</b>" +
        (rep ? "<br>" + br(f.old_drug || "") + (staffView && c.old_price ? " (" + esc(c.old_price) + ")" : "") : "") +
        "<br><b>เข้าบัญชีโรงพยาบาล กลุ่ม " + esc(f.group || "-") + "</b></p>" +
      (f.group === "2" ? sec("เงื่อนไขการสั่งใช้กรณียากลุ่ม 2", f.group2_cond) : "") +
      '<hr>' +
      kv("เหตุผลในการนำเสนอ", f.reason) + sec("ข้อบ่งใช้", f.indication) + kv("วิธีใช้ยา", f.dosage) +
      kv("การเก็บรักษา", f.storage) + kv("อายุยา", f.shelf_life) +
      kv("การเก็บรักษาหลังเปิดใช้", f.storage_open) + kv("อายุยาหลังเปิดใช้", f.shelf_open) +
      sec("ความปลอดภัย และข้อควรระวัง", f.safety) + kv("ข้อจำกัดของรูปแบบยา", f.form_limit);
    var col3 =
      '<p class="c"><b>ราคาทุนต่อหน่วย</b><br>(รวมภาษี)<br>' + br(dash(f.cost_price)) + "</p>" +
      '<p class="c"><b>ราคากลาง</b><br>(รวมภาษี)<br>' + secret(c.mid_price) + "</p><hr>" +
      '<p class="c"><b>รายการยาที่มีแล้วในโรงพยาบาลด้วยข้อบ่งใช้เดียวกัน (ราคา)</b><br>' + secret(c.existing) + "</p>";
    var col4 =
      '<p><b>โรงพยาบาลสังกัดสำนักการแพทย์ พร้อมราคาทุนต่อหน่วย</b><br>' + br(dash(f.bma_hosp)) + "</p><hr>" +
      '<p><b>โรงเรียนแพทย์ดังต่อไปนี้</b></p>' +
      UHOSNET.map(function (h) { return '<p class="ck"><span class="cb">' + (uh.indexOf(h) > -1 ? "&#9745;" : "&#9744;") + "</span> " + esc(h) + "</p>"; }).join("");
    return '' +
    '<div class="paper p11" data-paper="11">' +
      (d.code ? '<div class="hdr11">เลขรับ ' + esc(d.code) + "</div>" : "") +
      '<div class="t11">เอกสารสรุปรายการยาที่นำเสนอเข้าใหม่</div>' +
      // ความกว้างคอลัมน์ตามที่ผู้ใช้กำหนด (รวม 27.75 cm) ขนาดตัวอักษร: หัวตาราง 14, คอลัมน์ 1 = 13, คอลัมน์ 2-4 = 14, ชื่อโรงเรียนแพทย์ 12
      '<table class="g11"><colgroup><col style="width:5cm"><col style="width:14cm"><col style="width:3.5cm"><col style="width:5.25cm"></colgroup>' +
        '<tr class="h"><th style="width:5cm">ข้อมูลทั่วไปของยา</th><th style="width:14cm">เหตุผลประกอบการพิจารณา</th><th style="width:3.5cm">ราคาทุน/รายการเดิม</th><th style="width:5.25cm">โรงพยาบาลอื่นที่มีการใช้ยานี้</th></tr>' +
        '<tr class="b"><td class="c1" style="width:5cm"><div class="col" data-col="1">' + col1 + '</div></td><td class="c2" style="width:14cm"><div class="col" data-col="2">' + col2 +
        '</div></td><td class="c3" style="width:3.5cm"><div class="col" data-col="3">' + col3 + '</div></td><td class="c4" style="width:5.25cm"><div class="col" data-col="4">' + col4 + "</div></td></tr>" +
      "</table>" +
    "</div>";
  }

  /* ตรวจว่าเนื้อหาล้นกรอบหรือไม่ (ต้องเรียกหลังใบถูกใส่ใน DOM แล้ว) คืนค่า [{where, label}] */
  function overflow(paperEl) {
    var out = [];
    paperEl.querySelectorAll(".box").forEach(function (b) {
      // นับบรรทัดจริง (ฟอนต์ไทยมีหัว/หางเกินบรรทัด จึงเทียบ scrollHeight ตรงๆ ไม่ได้)
      var o = linesUsed(b) > (+getComputedStyle(b).getPropertyValue("--lines") || 5); b.classList.toggle("over", o);
      if (o) out.push(b.dataset.box);
    });
    paperEl.querySelectorAll(".col").forEach(function (b) {
      var o = b.scrollHeight > b.clientHeight + 1; b.classList.toggle("over", o);
      if (o) out.push("col" + b.dataset.col);
    });
    // ทั้งหน้าเกิน A4 (เช่น ช่องบรรทัดเดียวยาวจนขึ้นบรรทัดใหม่หลายบรรทัด ดันลายเซ็นตกขอบ)
    if (paperEl.scrollHeight > paperEl.clientHeight + 1) out.push(paperEl.classList.contains("p11") ? "page11" : "page12");
    return out;
  }
  function linesUsed(box) {
    var lh = parseFloat(getComputedStyle(box).lineHeight) || 20, h0 = box.style.height;
    box.style.height = "auto"; var h = box.scrollHeight; box.style.height = h0;
    return Math.max(box.textContent.trim() ? 1 : 0, Math.round(h / lh));
  }

  /* ---------- ดาวน์โหลดเป็นไฟล์ Word (.doc แบบ HTML ที่ Word เปิดแก้ได้) ---------- */
  function wordDoc(innerHtml, landscape, cssText, filename) {
    var page = landscape
      ? "@page Section1{size:841.9pt 595.3pt;mso-page-orientation:landscape;margin:24pt 27.6pt 24pt 27.6pt}"
      : "@page Section1{size:595.3pt 841.9pt;margin:36pt 42pt 30pt 48pt}";
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="utf-8"><title>' + esc(filename) + '</title><style>' + page +
      "div.Section1{page:Section1} body{font-family:'TH SarabunPSK','TH Sarabun New';} " + cssText + "</style></head>" +
      '<body><div class="Section1 word">' + innerHtml + "</div></body></html>";
    var blob = new Blob(["﻿", html], { type: "application/msword" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename + ".doc";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  /* สไตล์เรียบง่ายสำหรับไฟล์ Word (Word ไม่รองรับ CSS สมัยใหม่) */
  var WORD_CSS =
    ".paper{font-size:14pt;line-height:1.15} .ttl{font-size:20pt;font-weight:bold;border:1.5pt solid #000;padding:4pt 10pt}" +
    "table.hd,table.sig{width:100%;border-collapse:collapse} .hd-logo img{width:60pt;height:60pt}" +
    "table.rcv{border-collapse:collapse;font-size:12pt} table.rcv td{border:1pt solid #000;padding:1pt 6pt} .c{text-align:center} .code{font-weight:bold;font-size:15pt}" +
    ".v{text-decoration:underline;color:#000} .box{border-bottom:1pt dotted #000;min-height:60pt} ol.items li{margin-bottom:2pt}" +
    ".fm{text-align:right;font-size:11pt} .sm{font-size:10pt} .qr svg{width:60pt;height:60pt}" +
    ".hdr11{text-align:right;font-weight:bold;font-size:14pt;margin:0} .t11{text-align:center;font-weight:bold;font-size:16pt}" +
    "table.g11{border-collapse:collapse;font-size:14pt;line-height:1.1} table.g11 th,table.g11 td{border:1pt solid #000;padding:3pt 5pt;vertical-align:top} table.g11 th{font-size:14pt}" +
    "td.c1,td.c1 p{font-size:13pt} td.c2,td.c2 p,td.c3,td.c3 p,td.c4,td.c4 p{font-size:14pt} td.c4 p.ck,td.c4 p.ck span{font-size:12pt}" +
    "table.g11 p{margin:0 0 2pt} p.ck{margin:0} .cb{font-family:'Segoe UI Symbol'} .tbf{color:#888}";

  window.PTC = { BOX_LINES: BOX_LINES, BOX_LABEL: BOX_LABEL, FIELDS: FIELDS, UHOSNET: UHOSNET, DEPTS: DEPTS, NED: NED, CHECKLIST: CHECKLIST,
    render12: render12, render11: render11, overflow: overflow, linesUsed: linesUsed, wordDoc: wordDoc, WORD_CSS: WORD_CSS,
    esc: esc, thDateLong: thDateLong, thDateShort: thDateShort, qrSvg: qrSvg };
})();
