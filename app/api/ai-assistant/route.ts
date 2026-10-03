import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const role = typeof body.role === "string" ? body.role : "Pengguna";

    if (!question) {
      return NextResponse.json(
        { error: "Pertanyaan tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (question.length > 4000) {
      return NextResponse.json(
        { error: "Pertanyaan terlalu panjang. Maksimal 4000 karakter." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY belum dipasang di environment server." },
        { status: 500 }
      );
    }

    const instructions = `
Kamu adalah AI Assistant untuk Portal Akademik SD Islam Al-Barkah.

Peran pengguna saat ini: ${role}.

Tugasmu:
- Membantu kebutuhan akademik dan administrasi sekolah.
- Gunakan bahasa Indonesia yang jelas, sopan, dan mudah dipahami.
- Untuk guru, bantu materi, pembelajaran, penilaian, dan administrasi.
- Untuk admin, bantu administrasi dan pengelolaan sekolah.
- Untuk siswa, jelaskan materi dengan bahasa yang mudah dipahami.
- Untuk orang tua, berikan penjelasan yang mudah dipahami.
- Jangan mengarang data sekolah yang tidak diberikan.
- Jangan mengaku memiliki akses ke database sekolah jika data tersebut tidak diberikan dalam percakapan.
- Jika pertanyaan membutuhkan data aktual sekolah, jelaskan bahwa data tersebut perlu diambil dari sistem.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        instructions,
        input: question,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return NextResponse.json(
        { error: data?.error?.message || "AI gagal memproses pertanyaan." },
        { status: response.status }
      );
    }

    const answer =
      typeof data.output_text === "string" ? data.output_text.trim() : "";

    if (!answer) {
      return NextResponse.json(
        { error: "AI tidak menghasilkan jawaban." },
        { status: 502 }
      );
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("AI Assistant error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server AI." },
      { status: 500 }
    );
  }
}
