/* ตัวเลือกของแบบบันทึก (ภาคผนวก จ add_pro4_12 + lookup จาก Access DIS.accdb เดิม)
   [ค่าที่เก็บในฐานข้อมูล, ป้ายที่แสดง] — แก้/เพิ่มตัวเลือกที่นี่ที่เดียว */
window.DIS_LOOKUPS = {
  req: [["แพทย์ทั่วไป","แพทย์ทั่วไป"],["แพทย์เฉพาะทาง","แพทย์เฉพาะทาง"],["ทันตแพทย์","ทันตแพทย์"],["เภสัชกร","เภสัชกร"],["พยาบาล","พยาบาล"],["นักวิทย์","นักวิทย์"],["นักสาธารณสุข","นักสาธารณสุข"],["เจ้าพนักงานเภสัชกรรม","เจ้าพนักงานเภสัชกรรม"],["นักศึกษา","นักศึกษา"],["ประชาชน/ผู้ป่วย","ประชาชน/ผู้ป่วย"],["อื่นๆ","อื่นๆ"]],
  chan: [["วาจา","วาจา"],["แบบขอรับบริการ","แบบขอรับบริการ"],["โทรศัพท์/โทรสาร","โทรศัพท์/โทรสาร"],["e-mail","e-mail"],["LINE","LINE"],["ไปรษณีย์","ไปรษณีย์"],["เว็บ DIS","เว็บ DIS"],["อื่นๆ","อื่นๆ"]],
  purp: [["patient_problem","เพื่อแก้ปัญหาผู้ป่วย"],["practice","เพื่อประโยชน์ในการปฏิบัติงาน"],["knowledge","เพื่อเพิ่มเติมความรู้"],["research","เพื่อศึกษา/วิจัย"],["other","อื่นๆ"]],
  urg: [["immediate_10min","ทันที (ภายใน 10 นาที)"],["within_1day","ภายใน 1 วัน"],["other","อื่นๆ"]],
  srcType: [["primary","เอกสารปฐมภูมิ (1°)"],["secondary","เอกสารทุติยภูมิ (2°)"],["tertiary","เอกสารตติยภูมิ (3°)"],["dis_db","DIS Database ของ รพ."],["internet","On-line (Internet)"],["package_insert","เอกสารกำกับยา"],["no_search","ไม่ต้องสืบค้น"]],
  ansCh: [["วาจา","วาจา"],["ลายลักษณ์อักษร","ลายลักษณ์อักษร"],["โทรศัพท์/โทรสาร","โทรศัพท์/โทรสาร"],["e-mail","e-mail"],["LINE","LINE"],["เว็บ DIS","เว็บ DIS"],["อื่นๆ","อื่นๆ"]],
  outcome: [["resolved","เข้าใจ/คลี่คลายปัญหา"],["partial","เข้าใจบางส่วน"],["unresolved","ไม่คลี่คลาย"],["lost","ติดตามไม่ได้"]],
  use: [["used","นำไปใช้"],["not_used","ไม่นำไปใช้"],["unknown","ประเมินไม่ได้"]],
  sat: [["very","พอใจมาก"],["satisfied","พอใจ"],["not","ไม่พอใจ"],["not_asked","ไม่ได้ถาม"]],
  cat: ["Identification","Availability","Pharmacokinetics","Pregnancy/Nursing","Interaction","Formulation","ADR/Side effects","Toxicity/Poisoning","Dosage/Administration","Therapeutic use/Efficacy/Indication","Compatibility/Stability","Herbal/Conventional medicines","Storage","Contraindication/Precaution","Legal/Regulatory/Law","Cost/Pharmacoeconomics","Pharmacology/Mechanism of action","Alternative medicine","Compounding","Others","ทะเบียนยาและเงื่อนไขการสั่งใช้ (รพ.)","สินค้าคงคลัง (รพ.)","Off-label regimen (รพ.)"],
  status: { draft: ["ร่าง", "p-bad"], answered: ["ตอบแล้ว", "p-info"], followup: ["ติดตามผล", "p-info"], qa: ["รอตรวจ QA", "p-gold"], closed: ["ปิดแล้ว", "p-ok"] },
  reqStatus: { new: ["ใหม่", "p-bad"], in_progress: ["กำลังทำ", "p-info"], answered: ["ตอบแล้ว", "p-ok"], closed: ["ปิด", "p-muted"] },
  reqType: { question: "ถามข้อมูลยา", document: "ขอเอกสาร/monograph", media_training: "ขอทำสื่อ/อบรม" },
};
