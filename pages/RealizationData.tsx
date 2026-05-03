
import React, { useRef, useState, useMemo } from 'react';
import { Upload, Trash2, Search, FileSpreadsheet, AlertCircle, CircleDollarSign, Plus, Save, Edit2, X as CloseIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { RealizationData, MasterData } from '../types';
import SearchableSelect from '../components/SearchableSelect';

interface Props {
  data: RealizationData[];
  setData: (data: RealizationData[]) => void;
  replaceData: (data: RealizationData[]) => void;
  deleteRow: (id: string) => void;
  clearAll: () => void;
  masterData: MasterData[];
}

const RealizationDataPage: React.FC<Props> = ({ data, setData, replaceData, deleteRow, clearAll, masterData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    sub_kegiatan: '',
    kode_sub_kegiatan: '',
    belanja: '',
    kode_belanja: '',
    realisasi: 0,
    keterangan_dokumen: ''
  });

  const subKegiatanOptions = useMemo(() => {
    return Array.from(new Set(masterData.map(m => m.sub_kegiatan))).sort();
  }, [masterData]);

  const belanjaOptions = useMemo(() => {
    if (!formData.sub_kegiatan) return [];
    return Array.from(new Set(
      masterData
        .filter(m => m.sub_kegiatan === formData.sub_kegiatan)
        .map(m => m.belanja)
    )).sort();
  }, [masterData, formData.sub_kegiatan]);

  const handleSubKegiatanChange = (val: string) => {
    const match = masterData.find(m => m.sub_kegiatan === val);
    setFormData({
      ...formData,
      sub_kegiatan: val,
      kode_sub_kegiatan: match ? match.kode_sub_kegiatan : '',
      belanja: '',
      kode_belanja: ''
    });
  };

  const handleBelanjaChange = (val: string) => {
    const match = masterData.find(m => 
      m.sub_kegiatan === formData.sub_kegiatan && 
      m.belanja === val
    );
    setFormData({
      ...formData,
      belanja: val,
      kode_belanja: match ? match.kode_belanja : ''
    });
  };

  const sisaSpd = useMemo(() => {
    if (!formData.sub_kegiatan) return { total: 0, specific: 0, showSpecific: false };
    
    // 1. Calculate for the entire Sub Kegiatan
    const masterSubItems = masterData.filter(m => m.sub_kegiatan === formData.sub_kegiatan);
    const paguSpdSub = masterSubItems.reduce((sum, m) => sum + (m.pagu_spd || 0), 0);
    const totalRealisasiSub = data
      .filter(r => r.sub_kegiatan === formData.sub_kegiatan && r.id !== editingId)
      .reduce((sum, r) => sum + (r.realisasi || 0), 0);
    const sisaSub = paguSpdSub - totalRealisasiSub;

    if (!formData.belanja) return { total: sisaSub, specific: 0, showSpecific: false };

    // 2. Calculate specifically for the selected Belanja
    const masterMatch = masterSubItems.find(m => m.belanja === formData.belanja);
    const paguSpdSpec = masterMatch ? masterMatch.pagu_spd : 0;
    
    const totalRealisasiSpec = data
      .filter(r => 
        r.sub_kegiatan === formData.sub_kegiatan && 
        r.belanja === formData.belanja &&
        r.id !== editingId
      )
      .reduce((sum, r) => sum + (r.realisasi || 0), 0);
      
    return { 
      total: sisaSub, 
      specific: paguSpdSpec - totalRealisasiSpec, 
      showSpecific: true 
    };
  }, [formData.sub_kegiatan, formData.belanja, masterData, data, editingId]);

  const currentSisa = sisaSpd.showSpecific ? sisaSpd.specific : sisaSpd.total;

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sub_kegiatan || !formData.belanja || formData.realisasi <= 0) {
      alert('Mohon lengkapi semua field dan pastikan realisasi lebih dari 0');
      return;
    }

    const match = masterData.find(m => 
      m.sub_kegiatan === formData.sub_kegiatan && 
      m.belanja === formData.belanja
    );

    if (!match) {
      alert('Data tidak ditemukan di Master Data');
      return;
    }

    if (editingId) {
      const updatedData = data.map(item => {
        if (item.id === editingId) {
          return {
            ...item,
            skpd: match.skpd,
            kode_skpd: match.kode_skpd,
            program: match.program,
            kode_program: match.kode_program,
            kegiatan: match.kegiatan,
            kode_kegiatan: match.kode_kegiatan,
            sub_kegiatan: match.sub_kegiatan,
            kode_sub_kegiatan: match.kode_sub_kegiatan,
            belanja: match.belanja,
            kode_belanja: match.kode_belanja,
            realisasi: formData.realisasi,
            keterangan_dokumen: formData.keterangan_dokumen
          };
        }
        return item;
      });
      setData(updatedData);
      setEditingId(null);
    } else {
      const newItem: RealizationData = {
        id: `realization-${Date.now()}`,
        skpd: match.skpd,
        kode_skpd: match.kode_skpd,
        program: match.program,
        kode_program: match.kode_program,
        kegiatan: match.kegiatan,
        kode_kegiatan: match.kode_kegiatan,
        sub_kegiatan: match.sub_kegiatan,
        kode_sub_kegiatan: match.kode_sub_kegiatan,
        belanja: match.belanja,
        kode_belanja: match.kode_belanja,
        realisasi: formData.realisasi,
        keterangan_dokumen: formData.keterangan_dokumen
      };
      setData([newItem, ...data]);
    }

    setFormData({
      sub_kegiatan: '',
      kode_sub_kegiatan: '',
      belanja: '',
      kode_belanja: '',
      realisasi: 0,
      keterangan_dokumen: ''
    });
    setShowForm(false);
  };

  const startEdit = (row: RealizationData) => {
    setFormData({
      sub_kegiatan: row.sub_kegiatan,
      kode_sub_kegiatan: row.kode_sub_kegiatan,
      belanja: row.belanja,
      kode_belanja: row.kode_belanja,
      realisasi: row.realisasi,
      keterangan_dokumen: row.keterangan_dokumen || ''
    });
    setEditingId(row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      sub_kegiatan: '',
      kode_sub_kegiatan: '',
      belanja: '',
      kode_belanja: '',
      realisasi: 0,
      keterangan_dokumen: ''
    });
    setShowForm(false);
  };

  const tableRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  const handleTopScroll = () => {
    if (topScrollRef.current && tableRef.current) {
      tableRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (topScrollRef.current && tableRef.current) {
      topScrollRef.current.scrollLeft = tableRef.current.scrollLeft;
    }
  };

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

        const sanitizeId = (id: string) => id.replace(/[\/\.#$\[\]]/g, '_').replace(/\s+/g, '_');
        const importSessionId = Date.now();

        const formattedData: RealizationData[] = jsonData.map((row, index) => {
          const kode_skpd = String(findValue(row, ['Kode SKPD', 'Kd SKPD', 'Kd_SKPD']) || '').trim();
          const kode_program = String(findValue(row, ['Kode Program', 'Kd Program', 'Kd_Prog']) || '').trim();
          const kode_kegiatan = String(findValue(row, ['Kode Kegiatan', 'Kd Kegiatan', 'Kd_Keg']) || '').trim();
          const kode_sub_kegiatan = String(findValue(row, ['Kode Sub Kegiatan', 'Kd Sub Kegiatan', 'Kd_Sub_Keg']) || '').trim();
          const kode_belanja = String(findValue(row, ['Kode Belanja', 'Kd Belanja', 'Kd_Rek', 'Rekening', 'Kode Rekening']) || '').trim();
          const realisasi = parseNumber(findValue(row, ['Realisasi', 'Jumlah Realisasi', 'Nilai Realisasi', 'Total Realisasi']));
          const keterangan_dokumen = String(findValue(row, ['Keterangan Dokumen', 'Keterangan', 'Ket Dokumen', 'Ket_Dokumen']) || '').trim();
          
          // Use import session timestamp + index to ensure uniqueness across different uploads
          const rawId = `r-${importSessionId}-${index}`;
          const id = sanitizeId(rawId);

          return {
            id,
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
            realisasi,
            keterangan_dokumen,
          };
        });

        // Always append new data to existing data
        setData([...data, ...formattedData]);

        setImportStatus(`Berhasil menambah ${formattedData.length} baris realisasi baru.`);
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
      clearAll();
    }
  };

  const handleDeleteRow = (id: string) => {
    if (window.confirm('Hapus baris realisasi ini?')) {
      deleteRow(id);
    }
  };

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls"/>
          <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm">
            <Plus size={18} /> {showForm ? 'Tutup Form' : 'Input Manual'}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"><Upload size={18} /> Import Realisasi</button>
          <button onClick={clearData} className="text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-100 transition-colors shadow-sm"><Trash2 size={18} /> Hapus Semua</button>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Baris</p>
            <p className="text-sm font-bold text-gray-900">{data.length}</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Realisasi</p>
            <p className="text-sm font-bold text-emerald-600">{formatIDR(data.reduce((acc, curr) => acc + (curr.realisasi || 0), 0))}</p>
          </div>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 animate-in slide-in-from-top duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {editingId ? <Edit2 className="text-indigo-600" size={20} /> : <Plus className="text-emerald-600" size={20} />}
              {editingId ? 'Edit Realisasi' : 'Input Realisasi Manual'}
            </h3>
            <button onClick={cancelEdit} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
              <CloseIcon size={20} />
            </button>
          </div>
          <form onSubmit={handleAddManual} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-1 lg:col-span-3">
              <SearchableSelect 
                label="Sub Kegiatan"
                placeholder="Pilih Sub Kegiatan"
                options={subKegiatanOptions}
                value={formData.sub_kegiatan}
                onChange={handleSubKegiatanChange}
                showAll={false}
              />
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode Sub Kegiatan</label>
              <input 
                type="text" 
                value={formData.kode_sub_kegiatan}
                readOnly
                className="w-full p-2 border rounded-xl text-sm bg-gray-100 text-gray-500 outline-none"
                placeholder="Otomatis..."
              />
            </div>

            <div className="md:col-span-1 lg:col-span-3">
              <SearchableSelect 
                label="Belanja"
                placeholder="Pilih Belanja"
                options={belanjaOptions}
                value={formData.belanja}
                onChange={handleBelanjaChange}
                showAll={false}
              />
            </div>

            <div className="lg:col-span-4 space-y-1">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jumlah Realisasi</label>
                {formData.sub_kegiatan && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${currentSisa <= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                    {sisaSpd.showSpecific ? 'Sisa Akun:' : 'Total Sisa Sub:'} Rp {formatIDR(currentSisa)}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">Rp</span>
                <input 
                  type="text" 
                  value={formData.realisasi ? formatIDR(formData.realisasi) : ''}
                  onChange={(e) => setFormData({...formData, realisasi: parseNumber(e.target.value)})}
                  className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 font-bold ${formData.realisasi > currentSisa ? 'border-red-300 bg-red-50 text-red-600 focus:ring-red-500' : 'focus:ring-indigo-500 text-emerald-600'}`}
                  placeholder="0"
                />
              </div>
              {formData.realisasi > currentSisa && currentSisa > 0 && (
                <p className="text-[9px] text-red-500 font-bold italic mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> Melebihi sisa SPD!
                </p>
              )}
            </div>

            <div className="lg:col-span-8 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan Dokumen</label>
              <input 
                type="text" 
                value={formData.keterangan_dokumen}
                onChange={(e) => setFormData({...formData, keterangan_dokumen: e.target.value})}
                className="w-full p-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50"
                placeholder="Contoh: SP2D No. XXX / Kuitansi No. YYY"
              />
            </div>

            <div className="lg:col-span-4">
              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
              >
                <Save size={18} /> Simpan Realisasi
              </button>
            </div>
          </form>
        </div>
      )}

      {importStatus && (
        <div className={`p-4 rounded-lg text-sm font-medium ${importStatus.includes('Berhasil') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          <AlertCircle size={18} className="inline mr-2" /> {importStatus}
        </div>
      )}

      <div className="space-y-0.5">
        <div 
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto h-5 bg-gray-50/50 rounded-t-xl border border-b-0 border-gray-200"
        >
          <div className="min-w-[1500px] h-1"></div>
        </div>
        <div 
          ref={tableRef}
          onScroll={handleTableScroll}
          className="bg-white rounded-b-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto relative"
        >
          <table className="w-full text-left min-w-[1500px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Aksi</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">SKPD</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Program</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Kode Kegiatan</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Kegiatan</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Kode Sub Kegiatan</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Sub Kegiatan</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Kode Belanja</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Belanja</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Realisasi</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Keterangan Dokumen</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.filter(i => 
              i.skpd.toLowerCase().includes(searchTerm.toLowerCase()) ||
              i.belanja.toLowerCase().includes(searchTerm.toLowerCase()) ||
              i.program.toLowerCase().includes(searchTerm.toLowerCase()) ||
              i.kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (i.keterangan_dokumen && i.keterangan_dokumen.toLowerCase().includes(searchTerm.toLowerCase())) ||
              i.kode_kegiatan.includes(searchTerm) ||
              i.kode_belanja.includes(searchTerm)
            ).map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(row)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit"><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteRow(row.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Hapus"><Trash2 size={14} /></button>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm truncate max-w-[150px]">{row.skpd}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[200px]">{row.program}</td>
                <td className="px-4 py-3 text-sm font-mono">{row.kode_kegiatan}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[200px]">{row.kegiatan}</td>
                <td className="px-4 py-3 text-sm font-mono">{row.kode_sub_kegiatan}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[200px]">{row.sub_kegiatan}</td>
                <td className="px-4 py-3 text-sm font-mono">{row.kode_belanja}</td>
                <td className="px-4 py-3 text-sm font-bold text-indigo-700 truncate max-w-[200px]">{row.belanja}</td>
                <td className="px-4 py-3 text-sm font-bold text-right text-emerald-600">{formatIDR(row.realisasi)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 italic truncate max-w-[250px]">{row.keterangan_dokumen || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
};

export default RealizationDataPage;
