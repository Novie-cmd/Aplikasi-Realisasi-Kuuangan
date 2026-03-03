
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
}

const SearchableSelect: React.FC<Props> = ({ options, value, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLabel = value === 'all' ? `Semua ${label}` : value;

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
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
        {label}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 cursor-pointer flex items-center justify-between"
      >
        <span className={value === 'all' ? 'text-gray-400' : 'text-gray-900 font-medium truncate'}>
          {selectedLabel}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-white border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
            <Search size={14} className="text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Ketik untuk mencari..."
              className="w-full bg-transparent text-sm outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }}>
                <X size={14} className="text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            <div
              onClick={() => {
                onChange('all');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-indigo-50 ${value === 'all' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-gray-700'}`}
            >
              Semua {label}
              {value === 'all' && <Check size={14} />}
            </div>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, i) => (
                <div
                  key={i}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-indigo-50 ${value === option ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-gray-700'}`}
                >
                  <span className="truncate">{option}</span>
                  {value === option && <Check size={14} />}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-gray-400 text-center italic">
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
