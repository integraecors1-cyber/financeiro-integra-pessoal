import React, { useState, useMemo } from 'react';
import { Trash2, Edit2, Info, Receipt, Filter } from 'lucide-react';
import { fmt, fmtDate } from '@/lib/utils';

export default function Despesas({ finance, onEdit, onDelete }: any) {
  const [filterNatureza, setFilterNatureza] = useState('todas');
  const [filterEssencialidade, setFilterEssencialidade] = useState('todas');

  const filteredList = useMemo(() => {
    let result = finance.despesas.filter((d: any) => !d.deleted);
    
    if (filterNatureza !== 'todas') {
      result = result.filter((d: any) => d.natureza === filterNatureza);
    }
    
    if (filterEssencialidade !== 'todas') {
      result = result.filter((d: any) => d.essencialidade === filterEssencialidade);
    }

    return result.sort((a: any, b: any) => b.data.localeCompare(a.data));
  }, [finance.despesas, filterNatureza, filterEssencialidade]);

  const getNaturezaStyle = (nat: string) => {
    switch (nat) {
      case 'fixo': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'variavel': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'eventual': return 'bg-[#383838] border-[#383838] text-[#8A8580]';
      default: return 'bg-[#242424] border-[#383838] text-[#8A8580]';
    }
  };

  const getEssencialidadeStyle = (ess: string) => {
    switch (ess) {
      case 'essencial': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'operacional': return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      case 'discricionario': return 'bg-green-500/10 border-green-500/30 text-green-400';
      default: return 'bg-[#242424] border-[#383838] text-[#8A8580]';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end bg-[#1A1A1A] p-4 rounded-2xl border border-[#383838]">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] uppercase font-bold text-[#8A8580] tracking-widest flex items-center gap-2">
            <Filter size={12} className="text-gold" /> Filtrar por Natureza
          </label>
          <select 
            value={filterNatureza} 
            onChange={e => setFilterNatureza(e.target.value)}
            className="w-full bg-[#0E0E0E] border border-[#383838] rounded-xl px-4 py-2 text-gold font-bold focus:outline-none focus:border-gold/50 text-xs"
          >
            <option value="todas">Todas as Naturezas</option>
            <option value="fixo">📌 Fixo</option>
            <option value="variavel">📊 Variável</option>
            <option value="eventual">⚡ Eventual</option>
          </select>
        </div>

        <div className="flex-1 space-y-2">
          <label className="text-[10px] uppercase font-bold text-[#8A8580] tracking-widest flex items-center gap-2">
             <Filter size={12} className="text-gold" /> Filtrar por Essencialidade
          </label>
          <select 
            value={filterEssencialidade} 
            onChange={e => setFilterEssencialidade(e.target.value)}
            className="w-full bg-[#0E0E0E] border border-[#383838] rounded-xl px-4 py-2 text-gold font-bold focus:outline-none focus:border-gold/50 text-xs"
          >
            <option value="todas">Todas as Essencialidades</option>
            <option value="essencial">🔴 Essencial</option>
            <option value="operacional">🟡 Operacional</option>
            <option value="discricionario">🟢 Discricionário</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Vencimento</th>
                <th>Descrição</th>
                <th>Natureza</th>
                <th>Essencialidade</th>
                <th>C. Custo</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((d: any) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap">{fmtDate(d.data)}</td>
                  <td className="whitespace-nowrap text-[11px] font-bold text-[#8A8580]">
                    {d.vencimento ? fmtDate(d.vencimento) : '--'}
                  </td>
                  <td className="max-w-[200px]">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate" title={d.desc}>{d.desc}</span>
                        {d.comprovante && (
                          <a href={d.comprovante} target="_blank" rel="noreferrer" title="Ver Comprovante" className="text-gold hover:scale-110 transition-transform flex-shrink-0">
                            <Info size={14} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                        {d.parcelado && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400 whitespace-nowrap">Parcela {d.parcelaNum}/{d.parcelaTotal}</span>
                        )}
                        {d.obs && <span className="text-[10px] text-[#8A8580] truncate" title={d.obs}>{d.obs}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[150px]">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border truncate block text-center ${getNaturezaStyle(d.natureza)}`}>
                      {d.natureza}
                    </span>
                  </td>
                  <td>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getEssencialidadeStyle(d.essencialidade)}`}>
                      {d.essencialidade}
                    </span>
                  </td>
                  <td>
                    <span className="text-[10px] font-bold text-[#F0EDE8] bg-[#242424] px-2 py-1 rounded uppercase tracking-tighter">
                      {d.centroCusto}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-gold">{d.cat}</span>
                  </td>
                  <td className="font-serif font-bold text-white">{fmt(d.valor)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => onEdit(d)} className="p-2 text-[#8A8580] hover:text-gold hover:bg-[#242424] rounded-lg transition-colors">
                         <Edit2 size={16} />
                       </button>
                       <button onClick={() => onDelete(d)} className="p-2 text-[#8A8580] hover:text-[#E07070] hover:bg-[#242424] rounded-lg transition-colors">
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr key="empty-despesas">
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <Receipt size={48} className="text-[#383838]" />
                       <p className="text-[#8A8580] text-sm italic">Nenhuma despesa para os filtros selecionados.</p>
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
}
