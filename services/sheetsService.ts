import { MasterData, RealizationData, ExpenditureData, HibahData } from "../types";

const VAL_OPTION = "USER_ENTERED";

export interface PullResult {
  masterData: MasterData[];
  realizationData: RealizationData[];
  spendingData: ExpenditureData[];
  hibahData: HibahData[];
}

export const SheetsService = {
  /**
   * Menguji koneksi dan ketersediaan spreadsheet
   */
  async checkSpreadsheet(accessToken: string, spreadsheetId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.ok;
    } catch (e) {
      console.error("Gagal memeriksa spreadsheet:", e);
      return false;
    }
  },

  /**
   * Membuat Spreadsheet baru khusus FinRealize di Google Drive pengguna
   */
  async createSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
    const body = {
      properties: {
        title: "FinRealize Cloud Database",
      },
      sheets: [
        { properties: { title: "Master_Data" } },
        { properties: { title: "Realisasi" } },
        { properties: { title: "Data_Belanja" } },
        { properties: { title: "Dana_Hibah" } },
      ],
    };

    const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gagal membuat spreadsheet: ${err}`);
    }

    const data = await res.json();
    const spreadsheetId = data.spreadsheetId;
    const spreadsheetUrl = data.spreadsheetUrl;

    // Inisialisasi header untuk masing-masing sheet
    await this.initHeaders(accessToken, spreadsheetId);

    return { id: spreadsheetId, url: spreadsheetUrl };
  },

  /**
   * Menulis header default ke masing-masing sheet
   */
  async initHeaders(accessToken: string, spreadsheetId: string): Promise<void> {
    const masterHeaders = ["id", "skpd", "kode_skpd", "program", "kode_program", "kegiatan", "kode_kegiatan", "sub_kegiatan", "kode_sub_kegiatan", "belanja", "kode_belanja", "anggaran", "realisasi", "pagu_spd"];
    const realizationHeaders = ["id", "skpd", "kode_skpd", "program", "kode_program", "kegiatan", "kode_kegiatan", "sub_kegiatan", "kode_sub_kegiatan", "belanja", "kode_belanja", "realisasi", "keterangan_dokumen"];
    const spendingHeaders = ["id", "kode_belanja", "belanja"];
    const hibahHeaders = ["id", "kegiatan", "kode_kegiatan", "sub_kegiatan", "kode_sub_kegiatan", "kode_rekening", "uraian", "penerima_hibah", "anggaran", "spd", "realisasi", "sisa_spd", "sisa_realisasi"];

    const data = [
      { range: "Master_Data!A1:N1", values: [masterHeaders] },
      { range: "Realisasi!A1:M1", values: [realizationHeaders] },
      { range: "Data_Belanja!A1:C1", values: [spendingHeaders] },
      { range: "Dana_Hibah!A1:M1", values: [hibahHeaders] },
    ];

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: VAL_OPTION,
        data,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gagal menginisialisasi header spreadsheet: ${err}`);
    }
  },

  /**
   * Mengirim (Push) data lokal ke spreadsheet
   */
  async pushData(
    accessToken: string,
    spreadsheetId: string,
    masterData: MasterData[],
    realizationData: RealizationData[],
    spendingData: ExpenditureData[],
    hibahData: HibahData[]
  ): Promise<void> {
    // 1. Bersihkan semua baris data lama (mengosongkan sheet di bawah header secara massal)
    // Range A2:Z1000000 dikosongkan terlebih dahulu
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ranges: ["Master_Data!A2:Z100000", "Realisasi!A2:Z100000", "Data_Belanja!A2:Z100000", "Dana_Hibah!A2:Z100000"],
      }),
    });

    // 2. Format baris-baris data
    const masterRows = masterData.map((m) => [
      m.id || "",
      m.skpd || "",
      m.kode_skpd || "",
      m.program || "",
      m.kode_program || "",
      m.kegiatan || "",
      m.kode_kegiatan || "",
      m.sub_kegiatan || "",
      m.kode_sub_kegiatan || "",
      m.belanja || "",
      m.kode_belanja || "",
      m.anggaran || 0,
      m.realisasi || 0,
      m.pagu_spd || 0,
    ]);

    const realizationRows = realizationData.map((r) => [
      r.id || "",
      r.skpd || "",
      r.kode_skpd || "",
      r.program || "",
      r.kode_program || "",
      r.kegiatan || "",
      r.kode_kegiatan || "",
      r.sub_kegiatan || "",
      r.kode_sub_kegiatan || "",
      r.belanja || "",
      r.kode_belanja || "",
      r.realisasi || 0,
      r.keterangan_dokumen || "",
    ]);

    const spendingRows = spendingData.map((s) => [
      s.id || "",
      s.kode_belanja || "",
      s.belanja || "",
    ]);

    const hibahRows = hibahData.map((h) => [
      h.id || "",
      h.kegiatan || "",
      h.kode_kegiatan || "",
      h.sub_kegiatan || "",
      h.kode_sub_kegiatan || "",
      h.kode_rekening || "",
      h.uraian || "",
      h.penerima_hibah || "",
      h.anggaran || 0,
      h.spd || 0,
      h.realisasi || 0,
      h.sisa_spd || 0,
      h.sisa_realisasi || 0,
    ]);

    // 3. Gabungkan payload update
    const dataUpdate = [];
    if (masterRows.length > 0) dataUpdate.push({ range: `Master_Data!A2:N${masterRows.length + 1}`, values: masterRows });
    if (realizationRows.length > 0) dataUpdate.push({ range: `Realisasi!A2:M${realizationRows.length + 1}`, values: realizationRows });
    if (spendingRows.length > 0) dataUpdate.push({ range: `Data_Belanja!A2:C${spendingRows.length + 1}`, values: spendingRows });
    if (hibahRows.length > 0) dataUpdate.push({ range: `Dana_Hibah!A2:M${hibahRows.length + 1}`, values: hibahRows });

    if (dataUpdate.length === 0) return; // tidak ada data untuk dipush

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: VAL_OPTION,
        data: dataUpdate,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gagal mengirim data ke spreadsheet: ${err}`);
    }
  },

  /**
   * Menarik (Pull) data dari spreadsheet
   */
  async pullData(accessToken: string, spreadsheetId: string): Promise<PullResult> {
    const ranges = ["Master_Data!A2:N100000", "Realisasi!A2:M100000", "Data_Belanja!A2:C100000", "Dana_Hibah!A2:M100000"];

    const queryParams = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryParams}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gagal mengambil data dari spreadsheet: ${err}`);
    }

    const { valueRanges } = await res.json();

    const masterData: MasterData[] = [];
    const realizationData: RealizationData[] = [];
    const spendingData: ExpenditureData[] = [];
    const hibahData: HibahData[] = [];

    // Parse Master_Data
    const masterVals = valueRanges[0]?.values || [];
    masterVals.forEach((row: any[]) => {
      if (!row[0]) return; // lewati jika id kosong
      masterData.push({
        id: row[0],
        skpd: row[1] || "",
        kode_skpd: row[2] || "",
        program: row[3] || "",
        kode_program: row[4] || "",
        kegiatan: row[5] || "",
        kode_kegiatan: row[6] || "",
        sub_kegiatan: row[7] || "",
        kode_sub_kegiatan: row[8] || "",
        belanja: row[9] || "",
        kode_belanja: row[10] || "",
        anggaran: Number(row[11]) || 0,
        realisasi: Number(row[12]) || 0,
        pagu_spd: Number(row[13]) || 0,
      });
    });

    // Parse Realisasi
    const realizationVals = valueRanges[1]?.values || [];
    realizationVals.forEach((row: any[]) => {
      if (!row[0]) return;
      realizationData.push({
        id: row[0],
        skpd: row[1] || "",
        kode_skpd: row[2] || "",
        program: row[3] || "",
        kode_program: row[4] || "",
        kegiatan: row[5] || "",
        kode_kegiatan: row[6] || "",
        sub_kegiatan: row[7] || "",
        kode_sub_kegiatan: row[8] || "",
        belanja: row[9] || "",
        kode_belanja: row[10] || "",
        realisasi: Number(row[11]) || 0,
        keterangan_dokumen: row[12] || "",
      });
    });

    // Parse Data_Belanja
    const spendingVals = valueRanges[2]?.values || [];
    spendingVals.forEach((row: any[]) => {
      if (!row[0]) return;
      spendingData.push({
        id: row[0],
        kode_belanja: row[1] || "",
        belanja: row[2] || "",
      });
    });

    // Parse Dana_Hibah
    const hibahVals = valueRanges[3]?.values || [];
    hibahVals.forEach((row: any[]) => {
      if (!row[0]) return;
      hibahData.push({
        id: row[0],
        kegiatan: row[1] || "",
        kode_kegiatan: row[2] || "",
        sub_kegiatan: row[3] || "",
        kode_sub_kegiatan: row[4] || "",
        kode_rekening: row[5] || "",
        uraian: row[6] || "",
        penerima_hibah: row[7] || "",
        anggaran: Number(row[8]) || 0,
        spd: Number(row[9]) || 0,
        realisasi: Number(row[10]) || 0,
        sisa_spd: Number(row[11]) || 0,
        sisa_realisasi: Number(row[12]) || 0,
      });
    });

    return { masterData, realizationData, spendingData, hibahData };
  },
};
