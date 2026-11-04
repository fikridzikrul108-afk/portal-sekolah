const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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