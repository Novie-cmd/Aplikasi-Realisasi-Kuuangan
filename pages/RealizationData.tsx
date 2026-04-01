
import React, { useRef, useState, useMemo } from 'react';
import { Upload, Trash2, Search, FileSpreadsheet, AlertCircle, CircleDollarSign, Plus, Save, Edit2, X as CloseIcon } from 'lucide-react';
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
    realisasi: 0
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
            realisasi: formData.realisasi
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
        realisasi: formData.realisasi
      };
      setData([newItem, ...data]);
    }

    setFormData({
      sub_kegiatan: '',
      kode_sub_kegiatan: '',
      belanja: '',
      kode_belanja: '',
      realisasi: 0
    });
    setShowForm(false);
  };

  const startEdit = (row: RealizationData) => {
    setFormData({
      sub_kegiatan: row.sub_kegiatan,
      kode_sub_kegiatan: row.kode_sub_kegiatan,
      belanja: row.belanja,
      kode_belanja: row.kode_belanja,
      realisasi: row.realisasi
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
      realisasi: 0
    });
    setShowForm(false);
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

        const formattedData: RealizationData[] = jsonData.map((row, index) => {
          const kode_skpd = String(findValue(row, ['Kode SKPD', 'Kd SKPD', 'Kd_SKPD']) || '').trim();
          const kode_program = String(findValue(row, ['Kode Program', 'Kd Program', 'Kd_Prog']) || '').trim();
          const kode_kegiatan = String(findValue(row, ['Kode Kegiatan', 'Kd Kegiatan', 'Kd_Keg']) || '').trim();
          const kode_sub_kegiatan = String(findValue(row, ['Kode Sub Kegiatan', 'Kd Sub Kegiatan', 'Kd_Sub_Keg']) || '').trim();
          const kode_belanja = String(findValue(row, ['Kode Belanja', 'Kd Belanja', 'Kd_Rek', 'Rekening', 'Kode Rekening']) || '').trim();
          const realisasi = parseNumber(findValue(row, ['Realisasi', 'Jumlah Realisasi', 'Nilai Realisasi', 'Total Realisasi']));
          
          // Deterministic ID for realization if possible, otherwise use index
          const id = `r-${kode_skpd}-${kode_program}-${kode_kegiatan}-${kode_sub_kegiatan}-${kode_belanja}-${realisasi}-${index}`.replace(/\s+/g, '_');

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
          };
        });

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
          <form onSubmit={handleAddManual} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sub Kegiatan</label>
              <select 
                value={formData.sub_kegiatan}
                onChange={(e) => handleSubKegiatanChange(e.target.value)}
                className="w-full p-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50"
              >
                <option value="">Pilih Sub Kegiatan</option>
                {subKegiatanOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode Sub Kegiatan</label>
              <input 
                type="text" 
                value={formData.kode_sub_kegiatan}
                readOnly
                className="w-full p-2 border rounded-xl text-sm bg-gray-100 text-gray-500 outline-none"
                placeholder="Otomatis..."
              />
            </div>

            <SearchableSelect 
              label="Belanja"
              placeholder="Pilih Belanja"
              options={belanjaOptions}
              value={formData.belanja}
              onChange={handleBelanjaChange}
              showAll={false}
            />

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jumlah Realisasi</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">Rp</span>
                <input 
                  type="number" 
                  value={formData.realisasi || ''}
                  onChange={(e) => setFormData({...formData, realisasi: parseNumber(e.target.value)})}
                  className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-emerald-600"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-end">
              <button 
                type="submit"
                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1200px]">
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
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.filter(i => 
              i.skpd.toLowerCase().includes(searchTerm.toLowerCase()) ||
              i.belanja.toLowerCase().includes(searchTerm.toLowerCase()) ||
              i.program.toLowerCase().includes(searchTerm.toLowerCase()) ||
              i.kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RealizationDataPage;
