
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
  const [editingItem, setEditingItem] = useState<MasterData | null>(null);

  const findValue = (row: any, keywords: string[]) => {
    const keys = Object.keys(row);
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().trim();
      if (keywords.some(kw => normalizedKey === kw.toLowerCase() || normalizedKey.includes(kw.toLowerCase()))) {
        return row[key];
      }
    }
    return null;
  };

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
          skpd: String(findValue(row, ['SKPD', 'Satuan Kerja']) || '').trim(),
          kode_skpd: String(findValue(row, ['Kode SKPD', 'Kd SKPD', 'Kd_SKPD']) || '').trim(),
          program: String(findValue(row, ['Program', 'Nama Program']) || '').trim(),
          kode_program: String(findValue(row, ['Kode Program', 'Kd Program', 'Kd_Prog']) || '').trim(),
          kegiatan: String(findValue(row, ['Kegiatan', 'Nama Kegiatan']) || '').trim(),
          kode_kegiatan: String(findValue(row, ['Kode Kegiatan', 'Kd Kegiatan', 'Kd_Keg']) || '').trim(),
          sub_kegiatan: String(findValue(row, ['Sub Kegiatan', 'Sub_Kegiatan']) || '').trim(),
          kode_sub_kegiatan: String(findValue(row, ['Kode Sub Kegiatan', 'Kd Sub Kegiatan', 'Kd_Sub_Keg']) || '').trim(),
          belanja: String(findValue(row, ['Belanja', 'Uraian', 'Nama Belanja']) || '').trim(),
          kode_belanja: String(findValue(row, ['Kode Belanja', 'Kd Belanja', 'Kd_Rek', 'Rekening']) || '').trim(),
          anggaran: Number(findValue(row, ['Anggaran', 'Pagu', 'Nilai Anggaran']) || 0),
          realisasi: 0,
          pagu_spd: Number(findValue(row, ['SPD', 'Pagu SPD', 'Pagu_SPD']) || 0),
        }));

        setData([...data, ...formattedData]);
        setImportStatus(`Berhasil mengimpor ${formattedData.length} baris data master.`);
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        console.error(err);
        setImportStatus('Error saat memproses Excel. Periksa format file.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAllData = () => {
    if (window.confirm('Hapus SELURUH data master?')) {
      setData([]);
      setImportStatus('Berhasil: Semua data dihapus.');
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  const deleteRow = (id: string) => {
    if (window.confirm('Hapus baris ini?')) {
      setData(data.filter(item => item.id !== id));
    }
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setData(data.map(item => item.id === editingItem.id ? editingItem : item));
    setEditingItem(null);
  };

  const filteredData = data.filter(item => 
    item.skpd.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.belanja.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kode_belanja.includes(searchTerm)
  );

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  return (
    <div className="space-y-6">
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold">Edit Data Master</h3>
              <button onClick={() => setEditingItem(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <input className="border p-2 rounded" placeholder="SKPD" value={editingItem.skpd} onChange={e => setEditingItem({...editingItem, skpd: e.target.value})} />
                <input className="border p-2 rounded" placeholder="Kode SKPD" value={editingItem.kode_skpd} onChange={e => setEditingItem({...editingItem, kode_skpd: e.target.value})} />
                <input className="border p-2 rounded col-span-2" placeholder="Sub Kegiatan" value={editingItem.sub_kegiatan} onChange={e => setEditingItem({...editingItem, sub_kegiatan: e.target.value})} />
                <input className="border p-2 rounded" placeholder="Kode Belanja" value={editingItem.kode_belanja} onChange={e => setEditingItem({...editingItem, kode_belanja: e.target.value})} />
                <input className="border p-2 rounded" placeholder="Uraian" value={editingItem.belanja} onChange={e => setEditingItem({...editingItem, belanja: e.target.value})} />
                <input className="border p-2 rounded" type="number" placeholder="Anggaran" value={editingItem.anggaran} onChange={e => setEditingItem({...editingItem, anggaran: Number(e.target.value)})} />
                <input className="border p-2 rounded" type="number" placeholder="Pagu SPD" value={editingItem.pagu_spd} onChange={e => setEditingItem({...editingItem, pagu_spd: Number(e.target.value)})} />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                <Save size={18} /> Simpan
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls"/>
          <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Upload size={18} /> Import Master</button>
          <button onClick={clearAllData} className="text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-lg flex items-center gap-2"><Trash2 size={18} /> Hapus Semua</button>
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
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Aksi</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">SKPD</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Program</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Sub Kegiatan</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Kode Belanja</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Uraian</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Anggaran</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Pagu SPD</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setEditingItem(row)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"><Pencil size={14} /></button>
                    <button onClick={() => deleteRow(row.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm truncate max-w-[150px]">{row.skpd}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[200px]">{row.program}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[200px]">{row.sub_kegiatan}</td>
                <td className="px-4 py-3 text-sm font-mono">{row.kode_belanja}</td>
                <td className="px-4 py-3 text-sm font-bold text-indigo-700 truncate max-w-[200px]">{row.belanja}</td>
                <td className="px-4 py-3 text-sm font-bold text-right">{formatIDR(row.anggaran)}</td>
                <td className="px-4 py-3 text-sm font-bold text-right text-blue-600">{formatIDR(row.pagu_spd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MasterDataPage;
