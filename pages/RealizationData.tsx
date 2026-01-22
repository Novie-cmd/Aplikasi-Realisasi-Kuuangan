
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
          skpd: row.SKPD || row.skpd || '',
          kode_skpd: row['Kode SKPD'] || row.kode_skpd || '',
          program: row.Program || row.program || '',
          kode_program: row['Kode Program'] || row.kode_program || '',
          kegiatan: row.Kegiatan || row.kegiatan || '',
          kode_kegiatan: row['Kode Kegiatan'] || row.kode_kegiatan || '',
          sub_kegiatan: row['Sub Kegiatan'] || row.sub_kegiatan || '',
          kode_sub_kegiatan: row['Kode Sub Kegiatan'] || row.kode_sub_kegiatan || '',
          belanja: row.Belanja || row.belanja || '',
          kode_belanja: row['Kode Belanja'] || row.kode_belanja || '',
          realisasi: Number(row.Realisasi || row.realisasi || 0),
        }));

        setData([...data, ...formattedData]);
        setImportStatus(`Berhasil mengimpor ${formattedData.length} baris data realisasi.`);
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        console.error(err);
        setImportStatus('Error saat memproses Excel Realisasi. Pastikan format kolom sesuai.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearData = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua data realisasi?')) {
      setData([]);
    }
  };

  const filteredData = data.filter(item => 
    item.skpd.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.belanja.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kode_belanja.includes(searchTerm) ||
    item.kode_skpd.includes(searchTerm)
  );

  const formatIDR = (val: number) => 
    new Intl.NumberFormat('id-ID').format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".xlsx, .xls"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
          >
            <Upload size={18} />
            Import Realisasi
          </button>
          <button 
            onClick={clearData}
            className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-lg hover:bg-red-100 transition"
          >
            <Trash2 size={18} />
            Hapus Semua
          </button>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Ketik SKPD, Belanja, atau Kode..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {importStatus && (
        <div className={`p-4 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm animate-in fade-in slide-in-from-top-2 ${importStatus.includes('Berhasil') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          <AlertCircle size={18} />
          {importStatus}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[2000px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kode SKPD</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">SKPD</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Program</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kegiatan</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kode Sub Kegiatan</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sub Kegiatan</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kode Belanja</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Belanja</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.length > 0 ? filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 text-sm font-mono text-gray-500">{row.kode_skpd}</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{row.skpd}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 truncate max-w-[200px]" title={row.program}>{row.program}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 truncate max-w-[200px]" title={row.kegiatan}>{row.kegiatan}</td>
                  <td className="px-4 py-4 text-sm font-mono text-gray-500">{row.kode_sub_kegiatan}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 truncate max-w-[250px]" title={row.sub_kegiatan}>{row.sub_kegiatan}</td>
                  <td className="px-4 py-4 text-sm font-mono text-gray-700 bg-indigo-50/30">{row.kode_belanja}</td>
                  <td className="px-4 py-4 text-sm font-bold text-indigo-700">{row.belanja}</td>
                  <td className="px-4 py-4 text-sm font-bold text-emerald-600 text-right">{formatIDR(row.realisasi)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <CircleDollarSign size={48} className="text-gray-200" />
                      <p>Tidak ada data realisasi. Silakan import file Excel.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RealizationDataPage;
