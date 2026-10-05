const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncSofian() {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: "042a667c-b988-4849-9097-b7fccc7312b9",
      nama: "Sofian",
      role: "kepala_sekolah"
    })
    .select()
    .single();

  if (error) {
    console.error("GAGAL:", error.message);
    process.exit(1);
  }

  console.log("BERHASIL SINKRON SOFIAN");
  console.log(data);
}

syncSofian();