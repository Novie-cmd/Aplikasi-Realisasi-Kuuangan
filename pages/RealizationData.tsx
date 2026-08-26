
import React, { useRef, useState, useMemo } from 'react';
import { Upload, Trash2, Search, FileSpreadsheet, AlertCircle, CircleDollarSign, Plus, Save, Edit2, X as CloseIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { RealizationData, MasterData } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { parseDateSafe, formatDateIndo, formatIDR } from '../components/reportUtils';

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
    keterangan_dokumen: '',
    tanggal: new Date().toISOString().substring(0, 10)
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
            keterangan_dokumen: formData.keterangan_dokumen,
            tanggal: formData.tanggal || new Date().toISOString().substring(0, 10)
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
        keterangan_dokumen: formData.keterangan_dokumen,
        tanggal: formData.tanggal || new Date().toISOString().substring(0, 10)
      };
      setData([newItem, ...data]);
    }

    setFormData({
      sub_kegiatan: '',
      kode_sub_kegiatan: '',
      belanja: '',
      kode_belanja: '',
      realisasi: 0,
      keterangan_dokumen: '',
      tanggal: new Date().toISOString().substring(0, 10)
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
      keterangan_dokumen: row.keterangan_dokumen || '',
      tanggal: row.tanggal || new Date().toISOString().substring(0, 10)
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
      keterangan_dokumen: '',
      tanggal: new Date().toISOString().substring(0, 10)
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

  const parseExcelDate = (val: any): string => {
    const parsed = parseDateSafe(val);
    if (parsed.iso) {
      return parsed.iso;
    }
    return new Date().toISOString().substring(0, 10);
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
          const cleanText = (v: any) => String(v || '')
            .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          const cleanCode = (v: any) => String(v || '')
            .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
            .replace(/\s+/g, '')
            .trim();

          const kode_skpd = cleanCode(findValue(row, ['Kode SKPD', 'Kd SKPD', 'Kd_SKPD']));
          const kode_program = cleanCode(findValue(row, ['Kode Program', 'Kd Program', 'Kd_Prog']));
          const kode_kegiatan = cleanCode(findValue(row, ['Kode Kegiatan', 'Kd Kegiatan', 'Kd_Keg']));
          const kode_sub_kegiatan = cleanCode(findValue(row, ['Kode Sub Kegiatan', 'Kd Sub Kegiatan', 'Kd_Sub_Keg']));
          const kode_belanja = cleanCode(findValue(row, ['Kode Belanja', 'Kd Belanja', 'Kd_Rek', 'Rekening', 'Kode Rekening']));
          const realisasi = parseNumber(findValue(row, ['Realisasi', 'Jumlah Realisasi', 'Nilai Realisasi', 'Total Realisasi']));
          const keterangan_dokumen = cleanText(findValue(row, ['Keterangan Dokumen', 'Keterangan', 'Ket Dokumen', 'Ket_Dokumen']));
          
          const rawTanggal = findValue(row, ['Tanggal', 'Tgl', 'Tanggal SP2D', 'Tgl SP2D', 'Tanggal Dokumen', 'Tgl Dokumen', 'Tanggal Bukti', 'Tgl Bukti', 'Tanggal Realisasi', 'Tgl Realisasi', 'Date']);
          const tanggal = parseExcelDate(rawTanggal);
          
          // Use import session timestamp + index to ensure uniqueness across different uploads
          const rawId = `r-${importSessionId}-${index}`;
          const id = sanitizeId(rawId);

          return {
            id,
            skpd: cleanText(findValue(row, ['SKPD', 'Satuan Kerja', 'Nama SKPD'])),
            kode_skpd,
            program: cleanText(findValue(row, ['Program', 'Nama Program'])),
            kode_program,
            kegiatan: cleanText(findValue(row, ['Kegiatan', 'Nama Kegiatan'])),
            kode_kegiatan,
            sub_kegiatan: cleanText(findValue(row, ['Sub Kegiatan', 'Sub_Kegiatan', 'Nama Sub Kegiatan'])),
            kode_sub_kegiatan,
            belanja: cleanText(findValue(row, ['Nama Belanja', 'Uraian', 'Belanja', 'Uraian Rekening'])),
            kode_belanja,
            realisasi,
            keterangan_dokumen,
            tanggal,
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
          <button onClick={() => setShowForm(!showForm)} className="bg-[#064e3b] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#047857] transition-all shadow-sm border border-emerald-600/40 font-medium text-sm">
            <Plus size={18} /> {showForm ? 'Tutup Form' : 'Input Manual'}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-700 transition-all shadow-sm font-medium text-sm">
            <Upload size={18} /> Import Realisasi
          </button>
          <button onClick={clearData} className="text-rose-200 bg-[#4c0519] border border-[#881337]/60 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#5c0617] transition-all shadow-sm font-medium text-sm">
            <Trash2 size={18} /> Hapus Semua
          </button>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Baris</p>
            <p className="text-sm font-bold text-white">{data.length}</p>
          </div>
          <div className="bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Realisasi</p>
            <p className="text-sm font-bold text-emerald-400">{formatIDR(data.reduce((acc, curr) => acc + (curr.realisasi || 0), 0))}</p>
          </div>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Cari realisasi..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm" />
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-700 animate-in slide-in-from-top duration-300">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {editingId ? <Edit2 className="text-emerald-400" size={20} /> : <Plus className="text-emerald-400" size={20} />}
              {editingId ? 'Edit Realisasi' : 'Input Realisasi Manual'}
            </h3>
            <button onClick={cancelEdit} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
              <CloseIcon size={20} />
            </button>
          </div>
          <form onSubmit={handleAddManual} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-1 lg:col-span-4">
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Sub Kegiatan</label>
              <input 
                type="text" 
                value={formData.kode_sub_kegiatan}
                readOnly
                className="w-full p-2.5 border border-slate-700 rounded-xl text-sm bg-slate-800/60 text-slate-400 outline-none font-mono"
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

            <div className="lg:col-span-3 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Realisasi</label>
              <input 
                type="date" 
                value={formData.tanggal}
                onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 font-medium text-white"
              />
            </div>

            <div className="lg:col-span-4 space-y-1">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Realisasi</label>
                {formData.sub_kegiatan && (
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${currentSisa <= 0 ? 'bg-[#4c0519] text-rose-300 border border-rose-900' : 'bg-[#064e3b] text-emerald-300 border border-emerald-800'}`}>
                    {sisaSpd.showSpecific ? 'Sisa Akun:' : 'Total Sisa Sub:'} Rp {formatIDR(currentSisa)}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                <input 
                  type="text" 
                  value={formData.realisasi ? formatIDR(formData.realisasi) : ''}
                  onChange={(e) => setFormData({...formData, realisasi: parseNumber(e.target.value)})}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800 border rounded-xl text-sm outline-none font-bold transition-all ${formData.realisasi > currentSisa ? 'border-rose-500/80 bg-[#4c0519]/30 text-rose-300 focus:border-rose-500' : 'border-slate-700 focus:border-emerald-500 text-emerald-400'}`}
                  placeholder="0"
                />
              </div>
              {formData.realisasi > currentSisa && currentSisa > 0 && (
                <p className="text-[9px] text-rose-400 font-bold italic mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> Melebihi sisa SPD!
                </p>
              )}
            </div>

            <div className="lg:col-span-5 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan Dokumen</label>
              <input 
                type="text" 
                value={formData.keterangan_dokumen}
                onChange={(e) => setFormData({...formData, keterangan_dokumen: e.target.value})}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 text-white placeholder-slate-500"
                placeholder="Contoh: SP2D No. XXX / Kuitansi No. YYY"
              />
            </div>

            <div className="lg:col-span-3">
              <button 
                type="submit"
                className="w-full bg-[#064e3b] text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#047857] shadow-lg shadow-emerald-950 border border-emerald-600/40 transition-all text-sm"
              >
                <Save size={18} /> Simpan Realisasi
              </button>
            </div>
          </form>
        </div>
      )}

      {importStatus && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${importStatus.includes('Berhasil') ? 'bg-[#064e3b]/50 text-emerald-200 border-emerald-700/60' : 'bg-[#4c0519]/50 text-rose-200 border-[#881337]/60'}`}>
          <AlertCircle size={18} className="inline mr-2" /> {importStatus}
        </div>
      )}

      <div className="space-y-0.5">
        <div 
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto h-5 bg-slate-900/60 rounded-t-xl border border-b-0 border-slate-700"
        >
          <div className="min-w-[1500px] h-1"></div>
        </div>
        <div 
          ref={tableRef}
          onScroll={handleTableScroll}
          className="bg-slate-800 rounded-b-xl shadow-sm border border-slate-700 overflow-hidden overflow-x-auto relative"
        >
          <table className="w-full text-left min-w-[1500px]">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Aksi</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Tanggal</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">SKPD</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Program</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kode Kegiatan</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kegiatan</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kode Sub Kegiatan</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Sub Kegiatan</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kode Belanja</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Belanja</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase text-right">Realisasi</th>
              <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Keterangan Dokumen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 text-slate-200">
            {data.filter(i => {
              const q = searchTerm.toLowerCase().trim();
              if (!q) return true;
              return (
                (i.skpd || '').toLowerCase().includes(q) ||
                (i.belanja || '').toLowerCase().includes(q) ||
                (i.program || '').toLowerCase().includes(q) ||
                (i.kegiatan || '').toLowerCase().includes(q) ||
                (i.sub_kegiatan || '').toLowerCase().includes(q) ||
                (i.keterangan_dokumen && i.keterangan_dokumen.toLowerCase().includes(q)) ||
                (i.tanggal && i.tanggal.includes(q)) ||
                formatDateIndo(i.tanggal || '').toLowerCase().includes(q) ||
                (i.kode_kegiatan || '').toLowerCase().includes(q) ||
                (i.kode_sub_kegiatan || '').toLowerCase().includes(q) ||
                (i.kode_belanja || '').toLowerCase().includes(q) ||
                (i.nomor_sp2d && i.nomor_sp2d.toLowerCase().includes(q))
              );
            }).map((row) => (
              <tr key={row.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => startEdit(row)} className="p-1.5 text-emerald-400 hover:bg-[#064e3b]/50 rounded-lg transition-colors" title="Edit"><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 text-rose-400 hover:bg-[#4c0519]/50 rounded-lg transition-colors" title="Hapus"><Trash2 size={14} /></button>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-emerald-300 whitespace-nowrap">{formatDateIndo(row.tanggal || '')}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[150px] text-slate-300">{row.skpd}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[200px] text-slate-300">{row.program}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-400">{row.kode_kegiatan}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[200px] text-slate-300">{row.kegiatan}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-400">{row.kode_sub_kegiatan}</td>
                <td className="px-4 py-3 text-sm truncate max-w-[200px] text-slate-300">{row.sub_kegiatan}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-400">{row.kode_belanja}</td>
                <td className="px-4 py-3 text-sm font-bold text-emerald-300 truncate max-w-[200px]">{row.belanja}</td>
                <td className="px-4 py-3 text-sm font-bold text-right text-emerald-400">{formatIDR(row.realisasi)}</td>
                <td className="px-4 py-3 text-sm text-slate-300 italic truncate max-w-[250px]">{row.keterangan_dokumen || '-'}</td>
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
