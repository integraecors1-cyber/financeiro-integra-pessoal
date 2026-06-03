import React from 'react';
import { Trash2, Edit2, TrendingUp, Tag } from 'lucide-react';
import { fmt, fmtDate } from '@/lib/utils';

export default function Receitas({ finance, onEdit, onDelete }: any) {
  const list = finance.receitas.sort((a: any, b: any) => b.data.localeCompare(a.data));

  return (
    <div className="space-y-6">
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Pagador / Origem</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r: any) => (
                <tr key={r.id} className={r.deleted ? 'opacity-50 grayscale italic' : ''}>
                  <td className="whitespace-nowrap">{fmtDate(r.data)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                       <span className={`font-bold ${r.deleted ? 'line-through' : ''}`}>{r.desc}</span>
                       {(r.comprovante || r.comprovanteUrl) && (
                          <a href={r.comprovanteUrl || r.comprovante} target="_blank" rel="noreferrer" title="Ver Comprovante" className="text-gold hover:scale-110 transition-transform">
                            <Tag size={14} />
                          </a>
                        )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-[#F0EDE8]">{r.membro || 'Externo'}</span>
                      <span className="text-[#8A8580] text-[10px] font-medium uppercase tracking-wider">{r.origem || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-green">{r.cat}</span>
                  </td>
                  <td className="font-serif font-bold text-gold">{fmt(r.valor)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       {!r.deleted && (
                         <button 
                          onClick={() => onEdit(r)}
                          className="p-2 text-[#8A8580] hover:text-gold hover:bg-[#242424] rounded-lg transition-colors"
                         >
                           <Edit2 size={16} />
                         </button>
                       )}
                       <button 
                        onClick={() => onDelete(r)}
                        disabled={r.deleted}
                        className={`p-2 text-[#8A8580] hover:text-[#E07070] hover:bg-[#242424] rounded-lg transition-colors ${r.deleted ? 'cursor-not-allowed' : ''}`}
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr key="empty-receitas">
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <TrendingUp size={48} className="text-[#383838]" />
                       <p className="text-[#8A8580] text-sm italic">Nenhuma receita registrada.</p>
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
