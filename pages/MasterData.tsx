
import React, { useRef, useState } from 'react';
import { Upload, Trash2, Search, FileSpreadsheet, AlertCircle, Pencil, X, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterData } from '../types';

interface Props {
  data: MasterData[];
  setData: (data: MasterData[]) => void;
  replaceData: (data: MasterData[]) => void;
  deleteRow: (id: string) => void;
  clearAll: () => void;
}

const MasterDataPage: React.FC<Props> = ({ data, setData, replaceData, deleteRow, clearAll }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MasterData | null>(null);

  const parseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    // Clean string: remove dots (thousand separators), replace comma with dot (decimal), remove non-numeric except minus and dot
    const cleaned = String(val).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const findValue = (row: any, keywords: string[]) => {
    const keys = Object.keys(row);
    // Priority 1: Exact match (case insensitive)
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().trim();
      if (keywords.some(kw => normalizedKey === kw.toLowerCase())) {
        return row[key];
      }
    }
    // Priority 2: Partial match
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

    setImportStatus('Memproses file master...');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const sanitizeId = (id: string) => id.replace(/[\/\.#$\[\]]/g, '_').replace(/\s+/g, '_');

        const formattedData: MasterData[] = jsonData.map((row, index) => {
          const kode_skpd = String(findValue(row, ['Kode SKPD', 'Kd SKPD', 'Kd_SKPD']) || '').trim();
          const kode_program = String(findValue(row, ['Kode Program', 'Kd Program', 'Kd_Prog']) || '').trim();
          const kode_kegiatan = String(findValue(row, ['Kode Kegiatan', 'Kd Kegiatan', 'Kd_Keg']) || '').trim();
          const kode_sub_kegiatan = String(findValue(row, ['Kode Sub Kegiatan', 'Kd Sub Kegiatan', 'Kd_Sub_Keg']) || '').trim();
          const kode_belanja = String(findValue(row, ['Kode Belanja', 'Kd Belanja', 'Kd_Rek', 'Rekening', 'Kode Rekening']) || '').trim();
          
          // Deterministic ID to prevent duplicates on re-upload
          const rawId = `m-${kode_skpd}-${kode_program}-${kode_kegiatan}-${kode_sub_kegiatan}-${kode_belanja}`;
          const id = sanitizeId(rawId);

          return {
            id: id || `master-${Date.now()}-${index}`,
            skpd: String(findValue(row, ['SKPD', 'Satuan Kerja', 'Nama SKPD']) || '').trim(),
            kode_skpd,
            program: String(findValue(row, ['Program', 'Nama Program']) || '').trim(),
            kode_program,
            kegiatan: String(findValue(row, ['Kegiatan', 'Nama Kegiatan']) || '').trim(),
            kode_kegiatan,
            sub_kegiatan: String(findValue(row, ['Sub Kegiatan', 'Sub_Kegiatan', 'Nama Sub Kegiatan']) || '').trim(),
            kode_sub_kegiatan,
            belanja: String(findValue(row, ['Nama Belanja', 'Uraian', 'Belanja', 'Uraian Rekening']) || '').trim(),
            kode_belanja,
            anggaran: parseNumber(findValue(row, ['Anggaran', 'Pagu', 'Nilai Anggaran', 'Pagu Anggaran', 'Pagu_Anggaran'])),
            realisasi: 0,
            pagu_spd: parseNumber(findValue(row, ['SPD', 'Pagu SPD', 'Pagu_SPD', 'Nilai SPD', 'Nilai_SPD'])),
          };
        });

        // Deduplicate locally before setting state
        const combinedData = [...data];
        formattedData.forEach(newItem => {
          const existingIndex = combinedData.findIndex(item => item.id === newItem.id);
          if (existingIndex > -1) {
            combinedData[existingIndex] = newItem;
          } else {
            combinedData.push(newItem);
          }
        });
        setData(combinedData);

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
      clearAll();
      setImportStatus('Berhasil: Semua data dihapus.');
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  const handleDeleteRow = (id: string) => {
    if (window.confirm('Hapus baris ini?')) {
      deleteRow(id);
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Edit Data Master</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white p-1 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <input className="bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg outline-none focus:border-emerald-500" placeholder="SKPD" value={editingItem.skpd} onChange={e => setEditingItem({...editingItem, skpd: e.target.value})} />
                <input className="bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg outline-none focus:border-emerald-500" placeholder="Kode SKPD" value={editingItem.kode_skpd} onChange={e => setEditingItem({...editingItem, kode_skpd: e.target.value})} />
                <input className="bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg col-span-2 outline-none focus:border-emerald-500" placeholder="Kegiatan" value={editingItem.kegiatan} onChange={e => setEditingItem({...editingItem, kegiatan: e.target.value})} />
                <input className="bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg outline-none focus:border-emerald-500" placeholder="Kode Kegiatan" value={editingItem.kode_kegiatan} onChange={e => setEditingItem({...editingItem, kode_kegiatan: e.target.value})} />
                <input className="bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg outline-none focus:border-emerald-500" placeholder="Sub Kegiatan" value={editingItem.sub_kegiatan} onChange={e => setEditingItem({...editingItem, sub_kegiatan: e.target.value})} />
                <input className="bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg outline-none focus:border-emerald-500" placeholder="Kode Sub Kegiatan" value={editingItem.kode_sub_kegiatan} onChange={e => setEditingItem({...editingItem, kode_sub_kegiatan: e.target.value})} />
                <input className="bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg outline-none focus:border-emerald-500" placeholder="Kode Belanja" value={editingItem.kode_belanja} onChange={e => setEditingItem({...editingItem, kode_belanja: e.target.value})} />
                <input className="bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg outline-none focus:border-emerald-500" placeholder="Uraian" value={editingItem.belanja} onChange={e => setEditingItem({...editingItem, belanja: e.target.value})} />
                <input className="bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg outline-none focus:border-emerald-500" type="text" placeholder="Anggaran" value={editingItem.anggaran ? formatIDR(editingItem.anggaran) : ''} onChange={e => setEditingItem({...editingItem, anggaran: parseNumber(e.target.value)})} />
                <input className="bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg outline-none focus:border-emerald-500" type="text" placeholder="Pagu SPD" value={editingItem.pagu_spd ? formatIDR(editingItem.pagu_spd) : ''} onChange={e => setEditingItem({...editingItem, pagu_spd: parseNumber(e.target.value)})} />
              </div>
              <button type="submit" className="w-full bg-[#064e3b] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#047857] transition-all shadow-lg shadow-emerald-950 border border-emerald-600/40">
                <Save size={18} /> Simpan Perubahan
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls"/>
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#064e3b] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#047857] transition-all shadow-sm border border-emerald-600/40 font-medium text-sm">
            <Upload size={18} /> Import Master
          </button>
          <button onClick={clearAllData} className="text-rose-200 bg-[#4c0519] border border-[#881337]/60 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#5c0617] transition-all shadow-sm font-medium text-sm">
            <Trash2 size={18} /> Hapus Semua
          </button>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Baris</p>
            <p className="text-sm font-bold text-white">{data.length}</p>
          </div>
          <div className="bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Anggaran</p>
            <p className="text-sm font-bold text-emerald-400">{formatIDR(data.reduce((acc, curr) => acc + (curr.anggaran || 0), 0))}</p>
          </div>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Cari master..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm" />
        </div>
      </div>

      {importStatus && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${importStatus.includes('Berhasil') ? 'bg-[#064e3b]/50 text-emerald-200 border-emerald-700/60' : 'bg-[#4c0519]/50 text-rose-200 border-[#881337]/60'}`}>
          <AlertCircle size={18} className="inline mr-2" /> {importStatus}
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1200px]">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Aksi</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">SKPD</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Program</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kegiatan</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kode Kegiatan</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Sub Kegiatan</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kode Sub Kegiatan</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kode Belanja</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Uraian</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase text-right">Anggaran</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase text-right">Pagu SPD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 text-slate-200">
            {filteredData.map((row) => (
              <tr key={row.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditingItem(row)} className="p-1.5 text-emerald-400 hover:bg-[#064e3b]/50 rounded-lg transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 text-rose-400 hover:bg-[#4c0519]/50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm truncate max-w-[150px] text-slate-300">{row.skpd}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[200px] text-slate-300">{row.program}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[200px] text-slate-300">{row.kegiatan}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-400">{row.kode_kegiatan}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[200px] text-slate-300">{row.sub_kegiatan}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-400">{row.kode_sub_kegiatan}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-400">{row.kode_belanja}</td>
                <td className="px-4 py-3 text-sm font-bold text-emerald-300 truncate max-w-[200px]">{row.belanja}</td>
                <td className="px-4 py-3 text-sm font-bold text-white text-right">{formatIDR(row.anggaran)}</td>
                <td className="px-4 py-3 text-sm font-bold text-right text-emerald-400">{formatIDR(row.pagu_spd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MasterDataPage;
