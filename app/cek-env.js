
require("dotenv").config({ path: ".env.local" });

console.log("Folder kerja:", process.cwd());
console.log("URL terbaca:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SERVICE KEY terbaca:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log(
  "Nama variabel:",
  Object.keys(process.env).filter(k => k.includes("SUPABASE"))
);
