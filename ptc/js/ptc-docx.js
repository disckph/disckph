/* ใบ 1.2 เป็นไฟล์ Word (.docx) จริง — ฟอนต์ TH SarabunPSK 16 จัดหน้าตามแบบ FM-PHA-042 rev.05
   เปิดใน Word แล้วพิมพ์ได้ตรงแบบ ใช้ทั้งหน้าผู้แทนและหน้าเภสัชกร (ไม่ต้องพึ่งไลบรารีภายนอก) */
(function () {
  "use strict";
  var P = window.PTC;
  var FONT = "TH SarabunPSK", SYM = "Segoe UI Symbol";
  var W = 10338;                       // ความกว้างบรรทัด (twip) = A4 11906 - ขอบซ้าย 851 - ขอบขวา 717
  var NUM = 510;                       // ระยะเยื้องหลังเลขข้อ
  var LINE = 360;                      // ระยะบรรทัด 18pt (exact) ต้องตรงกับหน้าเว็บ .p12
  // ข้อ 10-12 จำนวนบรรทัดรวมบรรทัดหัวข้อ ตามแบบฟอร์มเดิม (10, 11 = 4 บรรทัด, 12 = 5 บรรทัด) ต้องตรงกับ P.BOX_LINES

  function x(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function run(text, o) {
    o = o || {};
    var pr = (o.sym ? '<w:rFonts w:ascii="' + SYM + '" w:hAnsi="' + SYM + '" w:cs="' + SYM + '"/>' : "") + (o.b ? "<w:b/><w:bCs/>" : "") +
      (o.sz ? '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>' : "") + (o.u ? '<w:u w:val="dotted"/>' : "");
    return "<w:r>" + (pr ? "<w:rPr>" + pr + "</w:rPr>" : "") + '<w:t xml:space="preserve">' + x(text) + "</w:t></w:r>";
  }
  function multi(text, o) {           // ข้อความหลายบรรทัด (มี \n)
    return String(text || "").split(/\r?\n/).map(function (s) { return run(s, o); }).join("<w:r><w:br/></w:r>");
  }
  var TAB = "<w:r><w:tab/></w:r>";
  function val(v) { return v ? run("\u00A0" + v) : ""; }   // ไม่มีเส้นใต้/จุด และไม่ตัดบรรทัดระหว่างหัวข้อกับคำตอบ
  function radio(on) { return run(on ? "◉" : "○", { sym: true, sz: 26 }) + run(" "); }
  // p(content, {tabs:[[pos, leader]], num, hang, align, before, sz, keep})
  function p(content, o) {
    o = o || {};
    var tabs = (o.tabs || []).map(function (t) {
      return '<w:tab w:val="' + (t[2] || "left") + '"' + (t[1] ? ' w:leader="' + t[1] + '"' : "") + ' w:pos="' + t[0] + '"/>';
    }).join("");
    var ind = o.num ? '<w:ind w:left="' + NUM + '" w:hanging="' + NUM + '"/>' : o.indent ? '<w:ind w:left="' + o.indent + '"/>' : "";
    var pPr = (o.bdr || "") + (tabs || o.num ? "<w:tabs>" + (o.num ? '<w:tab w:val="left" w:pos="' + NUM + '"/>' : "") + tabs + "</w:tabs>" : "") +
      '<w:spacing w:before="' + (o.before || 0) + '" w:after="0" w:line="' + (o.line || LINE) + '" w:lineRule="exact"/>' + ind +
      (o.align ? '<w:jc w:val="' + o.align + '"/>' : "") +
      (o.sz ? '<w:rPr><w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/></w:rPr>' : "");
    return "<w:p><w:pPr>" + pPr + "</w:pPr>" + (o.num ? run(o.num + ".") + TAB : "") + content + "</w:p>";
  }
  function img(rid, id, cxCm, cyCm, name) {
    var cx = Math.round(cxCm * 360000), cy = Math.round(cyCm * 360000);
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="' + id + '" name="' + name + '"/>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + id + '" name="' + name + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  function cell(w, content, o) {
    o = o || {};
    return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (o.span ? '<w:gridSpan w:val="' + o.span + '"/>' : "") +
      (o.vMerge ? '<w:vMerge w:val="' + o.vMerge + '"/>' : "") +
      (o.borders ? "<w:tcBorders>" + ["top", "left", "bottom", "right"].map(function (s) { return "<w:" + s + ' w:val="single" w:sz="6" w:space="0" w:color="000000"/>'; }).join("") + "</w:tcBorders>" : "") +
      '<w:vAlign w:val="' + (o.v || "top") + '"/></w:tcPr>' + content + "</w:tc>";
  }
  function table(widths, rows, o) {
    o = o || {};
    return '<w:tbl><w:tblPr><w:tblW w:w="' + widths.reduce(function (a, b) { return a + b; }, 0) + '" w:type="dxa"/>' + (o.jc ? '<w:jc w:val="' + o.jc + '"/>' : "") +
      '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="' + (o.pad == null ? 57 : o.pad) + '" w:type="dxa"/><w:right w:w="' + (o.pad == null ? 57 : o.pad) + '" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
      "<w:tblGrid>" + widths.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join("") + "</w:tblGrid>" +
      rows.map(function (r) { return "<w:tr>" + r + "</w:tr>"; }).join("") + "</w:tbl>";
  }
  function small(text, o) { o = o || {}; return p(run(text, { sz: 24, b: o.b }), { align: "center", line: 250, sz: 24 }); }

  function documentXml(d, hasQr) {
    var f = d.f12 || {}, rep = d.kind === "replace", ned = f.ned_list || "", inNed = ned && ned !== "NED", g = f.group || "";
    // กรอบชื่อแบบฟอร์ม: ตารางช่องเดียว ขอบบน/ซ้าย 1.5pt ขอบขวา/ล่าง 4.5pt ให้ดูเป็นเงาเหมือนแบบเดิม
    var tb = function (side, sz) { return "<w:" + side + ' w:val="single" w:sz="' + sz + '" w:space="0" w:color="000000"/>'; };
    var title = '<w:tbl><w:tblPr><w:tblW w:w="5300" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/>' +
      '<w:tblCellMar><w:left w:w="85" w:type="dxa"/><w:right w:w="85" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="5300"/></w:tblGrid>' +
      '<w:tr><w:tc><w:tcPr><w:tcW w:w="5300" w:type="dxa"/><w:tcBorders>' + tb("top", 12) + tb("left", 12) + tb("bottom", 36) + tb("right", 36) + '</w:tcBorders></w:tcPr>' +
      p(run("ใบคำร้องขอนำยาเข้าและออก", { b: true, sz: 40 }), { align: "center", line: 440, sz: 40 }) +
      p(run("จากรายการประจำโรงพยาบาล", { b: true, sz: 40 }), { align: "center", line: 440, sz: 40 }) +
      "</w:tc></w:tr></w:tbl>" + p("", { line: 20, sz: 2 });
    var rcv = table([1500, 1500], [
      cell(3000, p(run("เฉพาะเจ้าหน้าที่", { sz: 22 }), { align: "center", line: 230, sz: 22 }), { span: 2, borders: true }),
      cell(1500, small("เลขที่รับ") + p(run(d.code || "", { b: true, sz: 28 }), { align: "center", line: 300 }), { borders: true }) +
        cell(1500, small("ผู้รับเอกสาร") + p("", { line: 300 }), { borders: true }),
      cell(1500, small("ยื่นออนไลน์") + small(P.thDateShort(d.created_at)), { borders: true }) +
        cell(1500, small("วันที่รับแฟ้ม") + small(""), { borders: true })
    ], { jc: "right" });
    var head = table([1300, 6038, 3000], [
      cell(1300, p(img("rLogo", 1, 2.0, 2.0, "logo"), { line: 1200 }), { v: "center" }) +
      cell(6038, title, { v: "center" }) +
      cell(3000, rcv + p("", { line: 20, sz: 2 }))
    ], { pad: 0 });

    /* คำตอบต่อท้ายหัวข้อเลย ไม่มีจุด/ช่องว่าง (หัวข้อถัดไปในบรรทัดเดียวกันต่อท้ายคำตอบ) */
    var GAP = "   ";
    var body = [
      p(run("ผู้เสนอ") + val(f.proposer) + run(GAP + "หน่วยงาน") + val(d.dept), { num: 1, before: 80 }),
      p(run("ชื่อการค้า (ระบุลักษณะ ขนาด)") + val(f.trade), { num: 2 }),
      p(run("ชื่อสามัญทางยา") + val(f.generic), { num: 3 }),
      p(run("รหัสมาตรฐานยา 24 หลัก") + val(f.tmt24) + run(GAP + "รหัส TPU") + val(f.tpu) + run(GAP + "รหัส GPU") + val(f.gpu), { num: 4 }),
      p(radio(!rep) + run("เสนอเป็นยาเข้าใหม่") + TAB + radio(false) + run("เสนอออกจากโรงพยาบาล (ข้ามไปตอบข้อ 12.)"), { num: 5, tabs: [[3900]] }),
      p(radio(rep) + run("เสนอเพื่อทดแทนยาเดิม (ระบุชื่อยาเดิม)") + val(rep ? f.old_drug : ""), { indent: NUM }),
      p(run("สถานะในบัญชียาหลักแห่งชาติฉบับปัจจุบัน"), { num: 6 }),
      p(radio(inNed) + run("อยู่ในบัญชียาหลักแห่งชาติ บัญชี") + val(inNed ? ned : "") + run(GAP) + radio(ned === "NED") + run("ไม่อยู่ในบัญชียาหลักแห่งชาติ"), { indent: NUM }),
      p(run("เสนอเข้าอยู่ในบัญชียา รพจ. กลุ่ม") + TAB + radio(g === "1") + run("1") + TAB + radio(g === "3") + run("3") + TAB + radio(g === "4") + run("4") + TAB + radio(g === "5") + run("5"),
        { num: 7, tabs: [[3900], [5100], [6300], [7500]] }),
      p(TAB + radio(g === "2") + run("2  ระบุข้อบ่งใช้ (indication)") + val(g === "2" ? f.group2_cond : ""), { indent: NUM, tabs: [[3900]] }),
      p(run("บริษัทผู้ผลิต") + val(f.manufacturer) + run(GAP + "ประเทศ") + val(f.country), { num: 8 }),
      p(run("บริษัทผู้จำหน่ายในประเทศไทย") + val(f.distributor), { indent: NUM }),
      p(run("ราคาต่อหน่วย หรือต่อบรรจุภัณฑ์ (ราคารวมภาษีมูลค่าเพิ่ม)") + val(f.price), { num: 9 })
    ];
    // ข้อ 10-12: จบคำตอบแล้วขึ้นข้อถัดไปเลย (ไม่เว้นบรรทัดว่าง) จำกัดความยาวไว้ที่ P.BOX_LINES บรรทัดตอนกรอก
    [[10, P.BOX_LABEL.indication, "indication"], [11, P.BOX_LABEL.compare, "compare"], [12, P.BOX_LABEL.reason, "reason"]].forEach(function (b) {
      var text = f[b[2]] || "";
      body.push(p(run(b[1]) + (text ? run("  ") + multi(text) : ""), { num: b[0] }));
    });
    body.push(p("", { line: 240 }));

    /* ช่องเซ็น (เรียงบน-ล่างชิดขวาแบบฟอร์มเดิม): เส้นจุดกว้างคงที่ 9 cm และวงเล็บ ( ) อยู่ที่ปลายเส้นจุดพอดี ชื่อจัดกลาง
       คอลัมน์: QR | ว่าง | ลงชื่อ | เส้นจุด | ตำแหน่ง (ต้องตรงกับหน้าเว็บ .p12 table.sig) */
    var SW = [1600, 738, 800, 5000, 2200], DW = SW[3];
    function sc(i, content, o) { return cell(SW[i], content, o); }
    var SIGN_GAP = 560;   // ที่ว่างเหนือบรรทัดลงชื่อ (28pt) ให้มีที่เซ็น
    var dotLine = p('<w:r><w:tab/></w:r>', { tabs: [[DW, "dot", "right"]], before: SIGN_GAP });
    function paren(name) { return p(run("(") + TAB + run(name || "") + TAB + run(")"), { tabs: [[DW / 2, null, "center"], [DW, null, "right"]] }); }
    function signRow(role, first) {
      return (first ? sc(0, hasQr ? p(img("rQr", 2, 1.5, 1.5, "qr"), { line: 900 }) + p(run("สแกนดูสถานะ", { sz: 16 }), { line: 220 }) : p(""), { v: "top", vMerge: "restart" })
                    : sc(0, p(""), { vMerge: "continue" })) +
        sc(1, p("")) + sc(2, p(run("ลงชื่อ"), { before: SIGN_GAP }), { v: "bottom" }) + sc(3, dotLine, { v: "bottom" }) + sc(4, p(run(" " + role), { before: SIGN_GAP }), { v: "bottom" });
    }
    function nameRow(name) { return sc(0, p(""), { vMerge: "continue" }) + sc(1, p("")) + sc(2, p("")) + sc(3, paren(name)) + sc(4, p("")); }
    var sig = table(SW, [signRow("ผู้เสนอ", true), nameRow(f.proposer), signRow("หัวหน้ากลุ่มงาน"), nameRow("")], { pad: 0 });

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>' +
      head + body.join("") + sig +
      '<w:sectPr><w:footerReference w:type="default" r:id="rFoot"/><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="454" w:right="717" w:bottom="567" w:left="851" w:header="284" w:footer="227" w:gutter="0"/></w:sectPr></w:body></w:document>';
  }

  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + FONT + '" w:eastAsia="' + FONT + '" w:hAnsi="' + FONT + '" w:cs="' + FONT + '"/>' +
    '<w:sz w:val="32"/><w:szCs w:val="32"/><w:lang w:val="th-TH" w:eastAsia="en-US" w:bidi="th-TH"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="' + LINE + '" w:lineRule="exact"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/>' +
    '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="57" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="57" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>';
  var FOOTER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>FM-PHA-042 rev.05</w:t></w:r></w:p></w:ftr>';

  /* ---------- zip แบบไม่บีบอัด (Word เปิดได้ปกติ) ---------- */
  var CRC = (function () { var t = [], c; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {               // files: [[name, Uint8Array]]
    var enc = new TextEncoder(), parts = [], central = [], off = 0;
    function u16(n) { return [n & 255, (n >>> 8) & 255]; }
    function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = enc.encode(f[0]), data = f[1], crc = crc32(data);
      var common = [].concat(u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      var local = new Uint8Array([].concat(u32(0x04034b50), common));
      parts.push(local, name, data);
      central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), common, u16(0), u16(0), u16(0), u32(0), u32(off))), name);
      off += local.length + name.length + data.length;
    });
    var cdSize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var endRec = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(off), u16(0)));
    return new Blob(parts.concat(central, [endRec]), { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }
  function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

  var logoBytes = null;
  async function logo() {
    if (logoBytes) return logoBytes;
    var r = await fetch(P.base() + "img/logo-form.png");
    return (logoBytes = new Uint8Array(await r.arrayBuffer()));
  }

  /* d เหมือน render12: {code, created_at, kind, dept, f12, statusUrl} */
  P.docx12 = async function (d) {
    var enc = new TextEncoder(), qr = null;
    if (d.statusUrl && window.qrcode) {
      var q = window.qrcode(0, "M"); q.addData(d.statusUrl); q.make();
      qr = b64(q.createDataURL(4, 0).split(",")[1]);
    }
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rFoot" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' +
      '<Relationship Id="rLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>' +
      (qr ? '<Relationship Id="rQr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/qr.gif"/>' : "") + "</Relationships>";
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Default Extension="png" ContentType="image/png"/><Default Extension="gif" ContentType="image/gif"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>';
    var root = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    var files = [
      ["[Content_Types].xml", enc.encode(ct)], ["_rels/.rels", enc.encode(root)],
      ["word/document.xml", enc.encode(documentXml(d, !!qr))], ["word/styles.xml", enc.encode(STYLES)],
      ["word/footer1.xml", enc.encode(FOOTER)], ["word/_rels/document.xml.rels", enc.encode(rels)],
      ["word/media/logo.png", await logo()]
    ];
    if (qr) files.push(["word/media/qr.gif", qr]);
    return zip(files);
  };
  P.downloadDocx12 = async function (d, filename) {
    var blob = await P.docx12(d);
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename + ".docx";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
})();
