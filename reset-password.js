
require("dotenv").config({ path: ".env.local" });

console.log("URL terbaca:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SERVICE KEY terbaca:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("URL atau SERVICE ROLE KEY belum terbaca.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function resetPassword() {
  const { data, error } =
    await supabase.auth.admin.updateUserById(
      "418e3a7a-ac1a-483d-afc5-b77b6e9f2f9a",
      { password: "@SDIslamAlb_1426" }
    );

  if (error) {
    console.error("GAGAL:", error.message);
    process.exit(1);
  }

  console.log("BERHASIL RESET PASSWORD");
  console.log("Email:", data.user.email);
}

resetPassword();
