import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Upload, Trash2, Search, FileSpreadsheet, AlertCircle, CircleDollarSign, Plus, Save, Edit2, X as CloseIcon, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { HibahData, MasterData } from '../types';
import SearchableSelect from '../components/SearchableSelect';

interface Props {
  data: HibahData[];
  setData: (data: HibahData[]) => void;
  replaceData: (data: HibahData[]) => void;
  deleteRow: (id: string) => void;
  clearAll: () => void;
  masterData: MasterData[];
}

const HibahDataPage: React.FC<Props> = ({ data, setData, replaceData, deleteRow, clearAll, masterData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    kegiatan: '',
    kode_kegiatan: '',
    sub_kegiatan: '',
    kode_sub_kegiatan: '',
    kode_rekening: '',
    uraian: '',
    penerima_hibah: '',
    anggaran: 0,
    spd: 0,
    realisasi: 0,
  });

  const uniqueKegiatan = useMemo(() => {
    return Array.from(new Set(masterData.map(m => m.kegiatan).filter(Boolean))).sort();
  }, [masterData]);

  const subKegiatanOptions = useMemo(() => {
    if (!formData.kegiatan) {
      return Array.from(new Set(masterData.map(m => m.sub_kegiatan).filter(Boolean))).sort();
    }
    return Array.from(new Set(
      masterData
        .filter(m => m.kegiatan === formData.kegiatan)
        .map(m => m.sub_kegiatan)
        .filter(Boolean)
    )).sort();
  }, [masterData, formData.kegiatan]);

  const uraianSuggestions = useMemo(() => {
    let filteredMaster = masterData;
    if (formData.sub_kegiatan) {
      filteredMaster = masterData.filter(m => m.sub_kegiatan === formData.sub_kegiatan);
    } else if (formData.kegiatan) {
      filteredMaster = masterData.filter(m => m.kegiatan === formData.kegiatan);
    }
    
    const uniqueMap = new Map<string, string>();
    
    // First, populate from masterData
    filteredMaster.forEach(m => {
      if (m.belanja && m.kode_belanja) {
        uniqueMap.set(m.belanja.trim(), m.kode_belanja.trim());
      }
    });

    // Blend in from existing HibahData if not present
    data.forEach(item => {
      if (item.uraian && !uniqueMap.has(item.uraian.trim())) {
        uniqueMap.set(item.uraian.trim(), item.kode_rekening || '');
      }
    });

    return Array.from(uniqueMap.entries()).map(([belanja, kode_belanja]) => ({
      belanja,
      kode_belanja
    })).sort((a, b) => a.belanja.localeCompare(b.belanja));
  }, [masterData, formData.sub_kegiatan, formData.kegiatan, data]);

  const uraianComboRef = useRef<HTMLDivElement>(null);
  const [showUraianSuggestions, setShowUraianSuggestions] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (uraianComboRef.current && !uraianComboRef.current.contains(event.target as Node)) {
        setShowUraianSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKegiatanChange = (val: string) => {
    if (val === 'all') val = '';
    const match = masterData.find(m => m.kegiatan === val);
    setFormData(prev => ({
      ...prev,
      kegiatan: val,
      kode_kegiatan: match ? match.kode_kegiatan : '',
      sub_kegiatan: '',
      kode_sub_kegiatan: '',
    }));
  };

  const handleSubKegiatanChange = (val: string) => {
    if (val === 'all') val = '';
    const match = masterData.find(m => 
      (formData.kegiatan ? m.kegiatan === formData.kegiatan : true) && 
      m.sub_kegiatan === val
    );
    setFormData(prev => ({
      ...prev,
      sub_kegiatan: val,
      kode_sub_kegiatan: match ? match.kode_sub_kegiatan : '',
      kegiatan: match && !prev.kegiatan ? match.kegiatan : prev.kegiatan,
      kode_kegiatan: match && !prev.kode_kegiatan ? match.kode_kegiatan : prev.kode_kegiatan,
    }));
  };

  // Sisa SPD & Sisa Realisasi calculated on the fly
  const sisaSpd = Math.max(0, formData.spd - formData.realisasi);
  const sisaRealisasi = Math.max(0, formData.anggaran - formData.realisasi);

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID').format(val);

  const parseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kegiatan || !formData.sub_kegiatan) {
      alert('Mohon pilih Kegiatan dan Sub Kegiatan');
      return;
    }

    if (formData.anggaran <= 0) {
      alert('Anggaran harus lebih dari 0');
      return;
    }

    if (formData.spd < 0 || formData.realisasi < 0) {
      alert('Angka SPD dan Realisasi tidak boleh kurang dari 0');
      return;
    }

    const sSpd = formData.spd - formData.realisasi;
    const sReal = formData.anggaran - formData.realisasi;

    if (editingId) {
      const updatedData = data.map(item => {
        if (item.id === editingId) {
          return {
            ...item,
            kegiatan: formData.kegiatan,
            kode_kegiatan: formData.kode_kegiatan,
            sub_kegiatan: formData.sub_kegiatan,
            kode_sub_kegiatan: formData.kode_sub_kegiatan,
            kode_rekening: formData.kode_rekening,
            uraian: formData.uraian,
            penerima_hibah: formData.penerima_hibah,
            anggaran: formData.anggaran,
            spd: formData.spd,
            realisasi: formData.realisasi,
            sisa_spd: sSpd,
            sisa_realisasi: sReal,
          };
        }
        return item;
      });
      setData(updatedData);
      setEditingId(null);
    } else {
      const newItem: HibahData = {
        id: `hibah-${Date.now()}`,
        kegiatan: formData.kegiatan,
        kode_kegiatan: formData.kode_kegiatan,
        sub_kegiatan: formData.sub_kegiatan,
        kode_sub_kegiatan: formData.kode_sub_kegiatan,
        kode_rekening: formData.kode_rekening,
        uraian: formData.uraian,
        penerima_hibah: formData.penerima_hibah,
        anggaran: formData.anggaran,
        spd: formData.spd,
        realisasi: formData.realisasi,
        sisa_spd: sSpd,
        sisa_realisasi: sReal,
      };
      setData([newItem, ...data]);
    }

    setFormData({
      kegiatan: '',
      kode_kegiatan: '',
      sub_kegiatan: '',
      kode_sub_kegiatan: '',
      kode_rekening: '',
      uraian: '',
      penerima_hibah: '',
      anggaran: 0,
      spd: 0,
      realisasi: 0,
    });
    setShowForm(false);
  };

  const startEdit = (row: HibahData) => {
    setFormData({
      kegiatan: row.kegiatan,
      kode_kegiatan: row.kode_kegiatan,
      sub_kegiatan: row.sub_kegiatan,
      kode_sub_kegiatan: row.kode_sub_kegiatan,
      kode_rekening: row.kode_rekening || '',
      uraian: row.uraian || '',
      penerima_hibah: row.penerima_hibah || '',
      anggaran: row.anggaran,
      spd: row.spd,
      realisasi: row.realisasi,
    });
    setEditingId(row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      kegiatan: '',
      kode_kegiatan: '',
      sub_kegiatan: '',
      kode_sub_kegiatan: '',
      kode_rekening: '',
      uraian: '',
      penerima_hibah: '',
      anggaran: 0,
      spd: 0,
      realisasi: 0,
    });
    setShowForm(false);
  };

  // Double scrollbars refs
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

  // Searching / filtering
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(item => 
      item.kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sub_kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kode_kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kode_sub_kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.kode_rekening || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.uraian || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.penerima_hibah || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  // Totals calculations
  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      anggaran: acc.anggaran + curr.anggaran,
      spd: acc.spd + curr.spd,
      realisasi: acc.realisasi + curr.realisasi,
      sisa_spd: acc.sisa_spd + curr.sisa_spd,
      sisa_realisasi: acc.sisa_realisasi + curr.sisa_realisasi
    }), { anggaran: 0, spd: 0, realisasi: 0, sisa_spd: 0, sisa_realisasi: 0 });
  }, [filteredData]);

  // Excel parsing
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

    setImportStatus('Memproses file Hibah...');
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

        const formattedData: HibahData[] = jsonData.map((row, index) => {
          const kegiatan = String(findValue(row, ['Kegiatan', 'Keg', 'Nama Kegiatan']) || '').trim();
          const kode_kegiatan = String(findValue(row, ['Kode Kegiatan', 'Kd Kegiatan', 'Kd_Keg']) || '').trim();
          const sub_kegiatan = String(findValue(row, ['Sub Kegiatan', 'Sub_Keg', 'Nama Sub Kegiatan']) || '').trim();
          const kode_sub_kegiatan = String(findValue(row, ['Kode Sub Kegiatan', 'Kd Sub Kegiatan', 'Kd_Sub_Keg']) || '').trim();
          const kode_rekening = String(findValue(row, ['Kode Rekening', 'Kd Rekening', 'Kd_Rek', 'Rekening']) || '').trim();
          const uraian = String(findValue(row, ['Uraian', 'Keterangan', 'Uraian Hibah', 'Deskripsi']) || '').trim();
          const penerima_hibah = String(findValue(row, ['Penerima Hibah', 'Penerima', 'Penerima_Hibah', 'Nama Penerima', 'Recipient']) || '').trim();
          
          const anggaran = parseNumber(findValue(row, ['Anggaran', 'Pagu Anggaran', 'Angg_Hibah', 'Nilai Anggaran']));
          const spd = parseNumber(findValue(row, ['SPD', 'Pagu SPD', 'Nilai SPD', 'Jumlah SPD']));
          const realisasi = parseNumber(findValue(row, ['Realisasi', 'Jumlah Realisasi', 'Nilai Realisasi']));

          const sSpd = spd - realisasi;
          const sReal = anggaran - realisasi;

          const rawId = `h-${importSessionId}-${index}`;
          const id = sanitizeId(rawId);

          return {
            id,
            kegiatan,
            kode_kegiatan,
            sub_kegiatan,
            kode_sub_kegiatan,
            kode_rekening,
            uraian,
            penerima_hibah,
            anggaran,
            spd,
            realisasi,
            sisa_spd: sSpd,
            sisa_realisasi: sReal
          };
        });

        setData([...formattedData, ...data]);
        setImportStatus(`Berhasil menambah ${formattedData.length} data hibah baru.`);
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        console.error(err);
        setImportStatus('Error saat memproses Excel. Periksa format file.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-slate-800 border border-slate-700 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-700 rounded-xl text-slate-200">
            <CircleDollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Total Anggaran</p>
            <h4 className="text-sm font-black text-white mt-1">Rp {formatIDR(totals.anggaran)}</h4>
          </div>
        </div>

        <div className="p-4 bg-slate-800 border border-slate-700 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#064e3b]/50 rounded-xl text-emerald-300">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Total SPD</p>
            <h4 className="text-sm font-black text-emerald-400 mt-1">Rp {formatIDR(totals.spd)}</h4>
          </div>
        </div>

        <div className="p-4 bg-slate-800 border border-slate-700 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#064e3b] rounded-xl text-emerald-200">
            <CircleDollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Total Realisasi</p>
            <h4 className="text-sm font-black text-emerald-400 mt-1">Rp {formatIDR(totals.realisasi)}</h4>
          </div>
        </div>

        <div className="p-4 bg-slate-800 border border-slate-700 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-700/60 rounded-xl text-slate-300">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Total Sisa SPD</p>
            <h4 className="text-sm font-black text-slate-200 mt-1">Rp {formatIDR(totals.sisa_spd)}</h4>
          </div>
        </div>

        <div className="p-4 bg-slate-800 border border-slate-700 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#4c0519]/70 rounded-xl text-rose-300">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Total Sisa Angg</p>
            <h4 className="text-sm font-black text-rose-400 mt-1">Rp {formatIDR(totals.sisa_realisasi)}</h4>
          </div>
        </div>
      </div>

      {/* Header and Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-[#064e3b] hover:bg-[#047857] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 border border-emerald-600/40 transition-all"
          >
            {editingId ? <Save size={16} /> : <Plus size={16} />} 
            {showForm ? 'Sembunyikan Form' : (editingId ? 'Edit Hibah' : 'Tambah Hibah Manual')}
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
          >
            <Upload size={16} /> Import Excel
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />

          {data.length > 0 && (
            <button 
              onClick={() => {
                if(confirm('Hapus semua data hibah?')) {
                  clearAll();
                }
              }}
              className="px-4 py-2.5 bg-[#4c0519] hover:bg-[#5c0617] text-rose-200 border border-[#881337]/60 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ml-auto md:ml-0"
            >
              <Trash2 size={16} /> Hapus Semua
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari hibah kegiatan/sub..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all"
          />
        </div>
      </div>

      {importStatus && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border ${importStatus.includes('Berhasil') ? 'bg-[#064e3b]/50 text-emerald-200 border-emerald-700/60' : 'bg-[#4c0519]/50 text-rose-200 border-[#881337]/60'}`}>
          <FileSpreadsheet size={18} />
          {importStatus}
        </div>
      )}

      {/* Form Input */}
      {showForm && (
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-6 max-w-4xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="font-black text-white uppercase tracking-tight">
              {editingId ? 'Edit Data Hibah' : 'Input Data Hibah Baru'}
            </h3>
            <button onClick={cancelEdit} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <CloseIcon size={20} />
            </button>
          </div>

          <form onSubmit={handleAddManual} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kegiatan */}
              <SearchableSelect 
                options={uniqueKegiatan}
                value={formData.kegiatan}
                onChange={handleKegiatanChange}
                placeholder="Pilih Kegiatan"
                label="Kegiatan"
                showAll={false}
              />

              {/* Kode Kegiatan */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Kode Kegiatan
                </label>
                <input 
                  type="text"
                  disabled
                  value={formData.kode_kegiatan}
                  className="w-full p-2.5 border border-slate-700 bg-slate-800/60 text-slate-400 rounded-xl text-sm outline-none font-bold font-mono"
                  placeholder="Terisi otomatis..."
                />
              </div>

              {/* Sub Kegiatan */}
              <SearchableSelect 
                options={subKegiatanOptions}
                value={formData.sub_kegiatan}
                onChange={handleSubKegiatanChange}
                placeholder="Pilih Sub Kegiatan"
                label="Sub Kegiatan"
                showAll={false}
              />

              {/* Kode Sub Kegiatan */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Kode Sub Kegiatan
                </label>
                <input 
                  type="text"
                  disabled
                  value={formData.kode_sub_kegiatan}
                  className="w-full p-2.5 border border-slate-700 bg-slate-800/60 text-slate-400 rounded-xl text-sm outline-none font-bold font-mono"
                  placeholder="Terisi otomatis..."
                />
              </div>

              {/* Uraian with Combobox list */}
              <div className="space-y-1 relative" ref={uraianComboRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Uraian
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    value={formData.uraian}
                    onChange={(e) => setFormData({...formData, uraian: e.target.value})}
                    onFocus={() => setShowUraianSuggestions(true)}
                    className="w-full p-2.5 pr-8 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 text-white font-bold"
                    placeholder="Pilih/ketik uraian..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowUraianSuggestions(prev => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white focus:outline-none"
                  >
                    <ChevronDown size={16} className={`transition-transform ${showUraianSuggestions ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {showUraianSuggestions && uraianSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800">
                    {uraianSuggestions
                      .filter(item => 
                        item.belanja.toLowerCase().includes((formData.uraian || '').toLowerCase()) ||
                        item.kode_belanja.toLowerCase().includes((formData.uraian || '').toLowerCase())
                      )
                      .map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              uraian: item.belanja,
                              kode_rekening: item.kode_belanja
                            });
                            setShowUraianSuggestions(false);
                          }}
                          className="px-4 py-2.5 text-sm hover:bg-slate-800 cursor-pointer text-slate-200 flex flex-col gap-0.5 transition-colors"
                        >
                          <span className="font-bold truncate text-white">{item.belanja}</span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">{item.kode_belanja}</span>
                        </div>
                      ))}
                    {uraianSuggestions.filter(item => 
                      item.belanja.toLowerCase().includes((formData.uraian || '').toLowerCase()) ||
                      item.kode_belanja.toLowerCase().includes((formData.uraian || '').toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-2.5 text-xs text-slate-500 italic">
                        Tidak ada pencocokan (ketik untuk membuat baru)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Kode Rekening (dibawa Kode Sub Kegiatan) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Kode Rekening
                </label>
                <input 
                  type="text"
                  value={formData.kode_rekening}
                  onChange={(e) => setFormData({...formData, kode_rekening: e.target.value})}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 text-white font-bold font-mono"
                  placeholder="Kode Rekening..."
                />
              </div>

              {/* Penerima Hibah */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Penerima Hibah
                </label>
                <input 
                  type="text"
                  value={formData.penerima_hibah}
                  onChange={(e) => setFormData({...formData, penerima_hibah: e.target.value})}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 text-white font-bold"
                  placeholder="Nama Penerima Hibah..."
                />
              </div>

              {/* Anggaran */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Anggaran
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                  <input 
                    type="text" 
                    value={formData.anggaran ? formatIDR(formData.anggaran) : ''}
                    onChange={(e) => setFormData({...formData, anggaran: parseNumber(e.target.value)})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 text-white font-bold"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Pagu SPD */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Pagu SPD
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                  <input 
                    type="text" 
                    value={formData.spd ? formatIDR(formData.spd) : ''}
                    onChange={(e) => setFormData({...formData, spd: parseNumber(e.target.value)})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 text-white font-bold"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Realisasi */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Realisasi
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                  <input 
                    type="text" 
                    value={formData.realisasi ? formatIDR(formData.realisasi) : ''}
                    onChange={(e) => setFormData({...formData, realisasi: parseNumber(e.target.value)})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 text-emerald-400 font-bold"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Sisa SPD (Calculated) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Sisa SPD (Otomatis)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                  <input 
                    type="text" 
                    disabled 
                    value={formatIDR(sisaSpd)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-700 bg-slate-800/60 text-slate-300 rounded-xl text-sm outline-none font-bold"
                  />
                </div>
              </div>

              {/* Sisa Realisasi (Calculated) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Sisa Realisasi / Anggaran (Otomatis)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                  <input 
                    type="text" 
                    disabled 
                    value={formatIDR(sisaRealisasi)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-700 bg-slate-800/60 text-rose-400 rounded-xl text-sm outline-none font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button 
                type="button" 
                onClick={cancelEdit}
                className="px-5 py-2.5 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-[#064e3b] hover:bg-[#047857] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 border border-emerald-600/40 transition-all"
              >
                <Save size={16} /> {editingId ? 'Simpan Perubahan' : 'Simpan Data'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table Data */}
      <div className="space-y-2">
        <div 
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto h-5 bg-slate-900/60 rounded-t-xl border border-b-0 border-slate-700"
        >
          <div className="min-w-[1850px] h-1 animate-in fade-in"></div>
        </div>
 
        <div 
          ref={tableRef}
          onScroll={handleTableScroll}
          className="bg-slate-800 rounded-b-xl shadow-sm border border-slate-700 overflow-hidden overflow-x-auto relative"
        >
          <table className="w-full text-left min-w-[1850px]">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase w-28">Aksi</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kegiatan</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kode Kegiatan</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Sub Kegiatan</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kode Sub</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Kode Rekening</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Uraian</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase">Penerima Hibah</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase text-right">Anggaran</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase text-right">SPD</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase text-right">Realisasi</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase text-center">% Realisasi</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase text-right">Sisa SPD</th>
                <th className="px-4 py-3.5 text-xs font-bold text-slate-300 uppercase text-right">Sisa Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-slate-200">
              {filteredData.length > 0 ? (
                filteredData.map((row) => {
                  const persenRealisasi = row.anggaran > 0 ? (row.realisasi / row.anggaran) * 100 : 0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 flex items-center gap-1.5">
                        <button 
                          onClick={() => startEdit(row)}
                          className="p-1.5 text-emerald-400 hover:bg-[#064e3b]/50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            if(confirm('Hapus baris data hibah ini?')) {
                              deleteRow(row.id);
                            }
                          }}
                          className="p-1.5 text-rose-400 hover:bg-[#4c0519]/50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-white max-w-xs truncate" title={row.kegiatan}>{row.kegiatan}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono font-medium">{row.kode_kegiatan}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 max-w-xs truncate" title={row.sub_kegiatan}>{row.sub_kegiatan}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono font-medium">{row.kode_sub_kegiatan}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono font-medium">{row.kode_rekening || '-'}</td>
                      <td className="px-4 py-3 text-sm text-emerald-300 font-medium max-w-xs truncate" title={row.uraian}>{row.uraian || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-200 font-medium max-w-xs truncate" title={row.penerima_hibah}>{row.penerima_hibah || '-'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-white">Rp {formatIDR(row.anggaran)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-emerald-400">Rp {formatIDR(row.spd)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-emerald-400">Rp {formatIDR(row.realisasi)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black select-none border ${
                          persenRealisasi >= 90 ? 'bg-[#064e3b] text-emerald-300 border-emerald-700' :
                          persenRealisasi >= 50 ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-[#4c0519] text-rose-300 border-rose-900'
                        }`}>
                          {persenRealisasi.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-slate-300">Rp {formatIDR(row.sisa_spd)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-rose-400">Rp {formatIDR(row.sisa_realisasi)}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-sm text-center text-slate-500 italic">
                    Belum ada data hibah atau tidak ditemukan hasil pencarian.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Total Footer row */}
            {filteredData.length > 0 && (
              <tfoot className="bg-slate-900 border-t-2 border-slate-700">
                <tr className="font-black text-white">
                  <td className="px-4 py-3">Total</td>
                  <td colSpan={7} className="px-4 py-3 text-xs text-slate-400 tracking-wider">KESELURUHAN DATA HIBAH</td>
                  <td className="px-4 py-3 text-sm text-right text-white">Rp {formatIDR(totals.anggaran)}</td>
                  <td className="px-4 py-3 text-sm text-right text-emerald-400">Rp {formatIDR(totals.spd)}</td>
                  <td className="px-4 py-3 text-sm text-right text-emerald-400">Rp {formatIDR(totals.realisasi)}</td>
                  <td className="px-4 py-3 text-sm text-center text-emerald-300">
                    {totals.anggaran > 0 ? ((totals.realisasi / totals.anggaran) * 100).toFixed(1) : '0.0'}%
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-300">Rp {formatIDR(totals.sisa_spd)}</td>
                  <td className="px-4 py-3 text-sm text-right text-rose-400">Rp {formatIDR(totals.sisa_realisasi)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default HibahDataPage;
