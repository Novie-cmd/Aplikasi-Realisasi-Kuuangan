
import React, { useRef, useState } from 'react';
import { Upload, Trash2, Search, FileSpreadsheet, AlertCircle, Pencil, X, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterData } from '../types';

interface Props {
  data: MasterData[];
  setData: (data: MasterData[]) => void;
}

const MasterDataPage: React.FC<Props> = ({ data, setData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  
  // State untuk Edit Modal
  const [editingItem, setEditingItem] = useState<MasterData | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Memproses file master...');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const formattedData: MasterData[] = jsonData.map((row, index) => ({
          id: `master-${Date.now()}-${index}`,
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
          anggaran: Number(row.Anggaran || row.anggaran || 0),
          realisasi: 0,
          pagu_spd: Number(row['Pagu SPD'] || row.pagu_spd || 0),
        }));

        setData([...data, ...formattedData]);
        setImportStatus(`Berhasil mengimpor ${formattedData.length} baris data master.`);
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        console.error(err);
        setImportStatus('Error saat memproses Excel Master. Pastikan format kolom sesuai.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAllData = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus SELURUH data master?')) {
      setData([]);
      setImportStatus('Berhasil: Semua data master telah dihapus.');
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  const deleteRow = (id: string) => {
    if (window.confirm('Hapus baris data ini?')) {
      const newData = data.filter(item => item.id !== id);
      setData(newData);
    }
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const newData = data.map(item => item.id === editingItem.id ? editingItem : item);
    setData(newData);
    setEditingItem(null);
    setImportStatus('Berhasil: Data master diperbarui.');
    setTimeout(() => setImportStatus(null), 3000);
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
      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">Edit Data Master</h3>
              <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">SKPD</label>
                  <input 
                    type="text" 
                    value={editingItem.skpd}
                    onChange={e => setEditingItem({...editingItem, skpd: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Kode SKPD</label>
                  <input 
                    type="text" 
                    value={editingItem.kode_skpd}
                    onChange={e => setEditingItem({...editingItem, kode_skpd: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Sub Kegiatan</label>
                  <input 
                    type="text" 
                    value={editingItem.sub_kegiatan}
                    onChange={e => setEditingItem({...editingItem, sub_kegiatan: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Kode Belanja</label>
                  <input 
                    type="text" 
                    value={editingItem.kode_belanja}
                    onChange={e => setEditingItem({...editingItem, kode_belanja: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Uraian Belanja</label>
                  <input 
                    type="text" 
                    value={editingItem.belanja}
                    onChange={e => setEditingItem({...editingItem, belanja: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Anggaran (Rp)</label>
                  <input 
                    type="number" 
                    value={editingItem.anggaran}
                    onChange={e => setEditingItem({...editingItem, anggaran: Number(e.target.value)})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Pagu SPD (Rp)</label>
                  <input 
                    type="number" 
                    value={editingItem.pagu_spd}
                    onChange={e => setEditingItem({...editingItem, pagu_spd: Number(e.target.value)})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-blue-600"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
                >
                  <Save size={18} /> Simpan Perubahan
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            Import Master
          </button>
          <button 
            onClick={clearAllData}
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
            placeholder="Cari SKPD, Belanja, atau Kode..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {importStatus && (
        <div className={`p-4 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm animate-in fade-in slide-in-from-top-2 ${importStatus.includes('Berhasil') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700'}`}>
          <AlertCircle size={18} />
          {importStatus}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1600px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kode SKPD</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">SKPD</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Program</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kode Kegiatan</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kegiatan</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kode Sub Kegiatan</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sub Kegiatan</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kode Belanja</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Belanja</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Anggaran</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Pagu SPD</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.length > 0 ? filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingItem(row)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Edit Data"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => deleteRow(row.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Data"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-mono text-gray-500">{row.kode_skpd}</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{row.skpd}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 truncate max-w-[200px]" title={row.program}>{row.program}</td>
                  <td className="px-4 py-4 text-sm font-mono text-gray-500">{row.kode_kegiatan}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 truncate max-w-[200px]" title={row.kegiatan}>{row.kegiatan}</td>
                  <td className="px-4 py-4 text-sm font-mono text-gray-500">{row.kode_sub_kegiatan}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 truncate max-w-[200px]" title={row.sub_kegiatan}>{row.sub_kegiatan}</td>
                  <td className="px-4 py-4 text-sm font-mono text-gray-700 bg-indigo-50/30">{row.kode_belanja}</td>
                  <td className="px-4 py-4 text-sm font-bold text-indigo-700">{row.belanja}</td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-900 text-right">{formatIDR(row.anggaran)}</td>
                  <td className="px-4 py-4 text-sm font-bold text-blue-600 text-right">{formatIDR(row.pagu_spd)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet size={48} className="text-gray-200" />
                      <p>Data Master kosong. Klik 'Import Master' untuk memuat data Excel.</p>
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

export default MasterDataPage;
