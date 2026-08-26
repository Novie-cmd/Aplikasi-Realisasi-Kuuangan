
import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface Props {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  showAll?: boolean;
}

const SearchableSelect: React.FC<Props> = ({ options, value, onChange, placeholder, label, showAll = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLabel = value === 'all' ? `Semua ${label}` : (value || placeholder);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative space-y-1" ref={containerRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        {label}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 cursor-pointer flex items-center justify-between transition-colors"
      >
        <span className={(!value || value === 'all') ? 'text-slate-400' : 'text-slate-100 font-medium truncate'}>
          {selectedLabel}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-2 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="Ketik untuk mencari..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-400 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }}>
                <X size={14} className="text-slate-400 hover:text-white" />
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-800">
            {showAll && (
              <div
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${value === 'all' ? 'bg-[#064e3b]/40 text-emerald-300 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                Semua {label}
                {value === 'all' && <Check size={14} className="text-emerald-400" />}
              </div>
            )}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, i) => (
                <div
                  key={i}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${value === option ? 'bg-[#064e3b]/40 text-emerald-300 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <span className="truncate">{option}</span>
                  {value === option && <Check size={14} className="text-emerald-400" />}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-slate-500 text-center italic">
                Tidak ada hasil ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
