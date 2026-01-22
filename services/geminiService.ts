
import { GoogleGenAI } from "@google/genai";
import { MasterData, ExpenditureData } from "../types";

// Always initialize the client with process.env.API_KEY directly as a named parameter.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getFinancialInsights = async (master: MasterData[], spending: ExpenditureData[]) => {
  const totalAnggaran = master.reduce((acc, curr) => acc + (curr.anggaran || 0), 0);
  // Fix: Property 'realisasi' does not exist on 'ExpenditureData'. Using 'master' which contains financial data.
  const totalRealisasi = master.reduce((acc, curr) => acc + (curr.realisasi || 0), 0);
  const sisa = totalAnggaran - totalRealisasi;
  const percentage = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;

  const prompt = `
    Analisis data keuangan berikut dan berikan ringkasan eksekutif dalam Bahasa Indonesia:
    - Total Anggaran: Rp ${totalAnggaran.toLocaleString('id-ID')}
    - Total Realisasi: Rp ${totalRealisasi.toLocaleString('id-ID')}
    - Sisa Anggaran: Rp ${sisa.toLocaleString('id-ID')}
    - Persentase Realisasi: ${percentage.toFixed(2)}%

    Berikan 3 poin utama mengenai performa keuangan ini dan saran tindakan.
  `;

  try {
    // Correct usage of generateContent with model name and prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // The text property returns the generated string output directly.
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, sistem AI sedang tidak dapat dijangkau saat ini.";
  }
};
