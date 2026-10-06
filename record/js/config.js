/* ค่าการเชื่อมต่อ Supabase
   SUPABASE_ANON_KEY = "anon public" หรือ "Publishable key" (Project Settings → API Keys)
   key นี้ออกแบบให้ฝังในหน้าเว็บได้ สิทธิ์ถูกจำกัดด้วย RLS ใน supabase-schema.sql
   ห้ามใส่ service_role / secret key ในไฟล์นี้เด็ดขาด */
window.DIS_CONFIG = {
  SUPABASE_URL: "https://efqmongloynswrhfrssz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_cgacnUqP8OYD3IEnb1zJOw_C6lxQusP",
};
