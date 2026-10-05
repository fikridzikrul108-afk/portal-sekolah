const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetPassword() {
  const { data, error } =
    await supabase.auth.admin.updateUserById(
      "fbda56b5-fcab-43bd-a0fe-26901ca36526",
      { password: "23091998" }
    );

  if (error) {
    console.error("GAGAL:", error.message);
    process.exit(1);
  }

  console.log("BERHASIL RESET PASSWORD");
  console.log("Email:", data.user.email);
}

resetPassword();