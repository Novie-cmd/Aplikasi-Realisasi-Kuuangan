
import React, { useRef, useState } from 'react';
import { Upload, Trash2, Search, FileSpreadsheet, AlertCircle, CreditCard, Hash } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExpenditureData } from '../types';

interface Props {
  data: ExpenditureData[];
  setData: (data: ExpenditureData[]) => void;
}

const ExpenditureDataPage: React.FC<Props> = ({ data, setData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Memproses data belanja...');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const formattedData: ExpenditureData[] = jsonData.map((row, index) => ({
          id: `spend-${Date.now()}-${index}`,
          kode_belanja: row['Kode Belanja'] || row.kode_belanja || '',
          belanja: row.Belanja || row.belanja || '',
        }));

        setData([...data, ...formattedData]);
        setImportStatus(`Berhasil mengimpor ${formattedData.length} baris data belanja.`);
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        console.error(err);
        setImportStatus('Error import data. Pastikan file valid.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearData = () => {
    if (confirm('Hapus semua data belanja?')) {
      setData([]);
    }
  };

  // Fungsi pencarian yang memfilter berdasarkan nama belanja ATAU kode belanja saat user mengetik
  const filteredData = data.filter(item => 
    item.belanja.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kode_belanja.includes(searchTerm)
  );

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
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition shadow-sm font-medium"
          >
            <Upload size={18} />
            Import Excel Belanja
          </button>
          <button 
            onClick={clearData}
            className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-lg hover:bg-red-100 transition"
          >
            <Trash2 size={18} />
            Hapus Semua
          </button>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
          <input 
            type="text" 
            placeholder="Ketik Nama Belanja atau Kode untuk mencari..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border-2 border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {importStatus && (
        <div className={`p-4 rounded-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 ${importStatus.includes('Berhasil') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          <AlertCircle size={18} />
          {importStatus}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-indigo-50/50 border-b border-indigo-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-indigo-900 uppercase tracking-widest w-1/4">
                  <div className="flex items-center gap-2">
                    <Hash size={14} />
                    Kode Belanja
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-indigo-900 uppercase tracking-widest">
                  Nama Belanja (Uraian)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-indigo-50/20 transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-indigo-600">
                    <span className="bg-white px-2 py-1 rounded border border-indigo-100 shadow-sm">
                      {row.kode_belanja}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800 group-hover:text-indigo-900">
                    {row.belanja}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={2} className="px-6 py-20 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gray-50 rounded-full border-2 border-dashed border-gray-200">
                        <CreditCard size={48} className="text-gray-300" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-500">Belum ada data belanja.</p>
                        <p className="text-sm">Silakan ketik di kotak pencarian atau import file Excel.</p>
                      </div>
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

export default ExpenditureDataPage;
