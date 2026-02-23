
import React, { useRef, useState } from 'react';
import { Upload, Trash2, Search, FileSpreadsheet, AlertCircle, CircleDollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';
import { RealizationData } from '../types';

interface Props {
  data: RealizationData[];
  setData: (data: RealizationData[]) => void;
}

const RealizationDataPage: React.FC<Props> = ({ data, setData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const parseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const findValue = (row: any, keywords: string[]) => {
    const keys = Object.keys(row);
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().trim();
      if (keywords.some(kw => normalizedKey === kw.toLowerCase())) {
        return row[key];
      }
    }
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().trim();
      if (keywords.some(kw => normalizedKey.includes(kw.toLowerCase()))) {
        return row[key];
      }
    }
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Memproses file realisasi...');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const formattedData: RealizationData[] = jsonData.map((row, index) => ({
          id: `realization-${Date.now()}-${index}`,
          skpd: String(findValue(row, ['SKPD', 'Satuan Kerja', 'Nama SKPD']) || '').trim(),
          kode_skpd: String(findValue(row, ['Kode SKPD', 'Kd SKPD', 'Kd_SKPD']) || '').trim(),
          program: String(findValue(row, ['Program', 'Nama Program']) || '').trim(),
          kode_program: String(findValue(row, ['Kode Program', 'Kd Program', 'Kd_Prog']) || '').trim(),
          kegiatan: String(findValue(row, ['Kegiatan', 'Nama Kegiatan']) || '').trim(),
          kode_kegiatan: String(findValue(row, ['Kode Kegiatan', 'Kd Kegiatan', 'Kd_Keg']) || '').trim(),
          sub_kegiatan: String(findValue(row, ['Sub Kegiatan', 'Sub_Kegiatan', 'Nama Sub Kegiatan']) || '').trim(),
          kode_sub_kegiatan: String(findValue(row, ['Kode Sub Kegiatan', 'Kd Sub Kegiatan', 'Kd_Sub_Keg']) || '').trim(),
          belanja: String(findValue(row, ['Nama Belanja', 'Uraian', 'Belanja', 'Uraian Rekening']) || '').trim(),
          kode_belanja: String(findValue(row, ['Kode Belanja', 'Kd Belanja', 'Kd_Rek', 'Rekening', 'Kode Rekening']) || '').trim(),
          realisasi: parseNumber(findValue(row, ['Realisasi', 'Jumlah Realisasi', 'Nilai Realisasi', 'Total Realisasi'])),
        }));

        setData([...data, ...formattedData]);
        setImportStatus(`Berhasil mengimpor ${formattedData.length} baris realisasi.`);
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        console.error(err);
        setImportStatus('Error saat memproses Excel. Periksa format file.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearData = () => {
    if (window.confirm('Hapus seluruh data realisasi?')) {
      setData([]);
    }
  };

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls"/>
          <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Upload size={18} /> Import Realisasi</button>
          <button onClick={clearData} className="text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-lg flex items-center gap-2"><Trash2 size={18} /> Hapus Semua</button>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" />
        </div>
      </div>

      {importStatus && (
        <div className={`p-4 rounded-lg text-sm font-medium ${importStatus.includes('Berhasil') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          <AlertCircle size={18} className="inline mr-2" /> {importStatus}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1200px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">SKPD</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Sub Kegiatan</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Kode Belanja</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Uraian Belanja</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Realisasi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.filter(i => i.skpd.toLowerCase().includes(searchTerm.toLowerCase())).map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm truncate max-w-[200px]">{row.skpd}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[250px]">{row.sub_kegiatan}</td>
                <td className="px-4 py-3 text-sm font-mono">{row.kode_belanja}</td>
                <td className="px-4 py-3 text-sm font-bold text-indigo-700">{row.belanja}</td>
                <td className="px-4 py-3 text-sm font-bold text-right text-emerald-600">{formatIDR(row.realisasi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RealizationDataPage;
