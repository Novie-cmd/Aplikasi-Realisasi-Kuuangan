
import { GoogleGenAI } from "@google/genai";
import { MasterData, ExpenditureData } from "../types";

// Fungsi untuk mendapatkan instance AI secara aman
const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key tidak ditemukan. Pastikan environment variable API_KEY sudah diatur.");
  }
  return new GoogleGenAI({ apiKey });
};

export const getFinancialInsights = async (master: MasterData[], spending: ExpenditureData[]) => {
  try {
    const ai = getAIInstance();
    const totalAnggaran = master.reduce((acc, curr) => acc + (curr.anggaran || 0), 0);
    const totalRealisasi = master.reduce((acc, curr) => acc + (curr.realisasi || 0), 0);
    const sisa = totalAnggaran - totalRealisasi;
    const percentage = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;

    const prompt = `
      Analisis data keuangan berikut dan berikan ringkasan eksekutif dalam Bahasa Indonesia:
      - Total Anggaran: Rp ${totalAnggaran.toLocaleString('id-ID')}
      - Total Realisasi: Rp ${totalRealisasi.toLocaleString('id-ID')}
      - Sisa Anggaran: Rp ${sisa.toLocaleString('id-ID')}
      - Persentase Realisasi: ${percentage.toFixed(2)}%

      Berikan 3 poin utama mengenai performa keuangan ini dan saran tindakan singkat.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, sistem AI sedang tidak dapat memberikan analisis saat ini. Periksa konfigurasi API Key Anda.";
  }
};
