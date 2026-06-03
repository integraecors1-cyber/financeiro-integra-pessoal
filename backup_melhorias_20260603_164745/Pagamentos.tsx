import React from 'react';
import { Trash2, Edit2, Info, User } from 'lucide-react';
import { fmt, fmtDate } from '@/lib/utils';

export default function Pagamentos({ finance, onEdit, onDelete }: any) {
  const list = finance.pagamentos.sort((a: any, b: any) => b.data.localeCompare(a.data));

  return (
    <div className="space-y-6">
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Vencimento</th>
                <th>Descrição</th>
                <th>Pagador</th>
                <th>Valor Total</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p: any) => {
                const comps = finance.compensacoes.filter((c: any) => c.pagamentoId === p.id && !c.deleted);
                const totalComps = comps.length;
                const paidComps = comps.filter((c: any) => c.pago).length;
                
                let status = 'Em Aberto';
                let statusColor = 'bg-[#8A8580]/10 text-[#8A8580]';

                if (p.deleted) {
                  status = 'Cancelado';
                  statusColor = 'bg-[#E07070]/10 text-[#E07070]';
                } else if (totalComps > 0) {
                  if (paidComps === totalComps) {
                    status = 'Quitado';
                    statusColor = 'bg-[#7ABF8A]/10 text-[#7ABF8A]';
                  } else if (paidComps > 0) {
                    status = 'Parcial';
                    statusColor = 'bg-[#E3A008]/10 text-[#E3A008]';
                  }
                } else {
                  status = 'Registrado';
                  statusColor = 'bg-blue-500/10 text-blue-400';
                }

                return (
                <tr key={p.id} className={p.deleted ? 'opacity-50 grayscale italic' : ''}>
                  <td className="whitespace-nowrap">{fmtDate(p.data)}</td>
                  <td className="whitespace-nowrap text-[11px] font-bold text-[#8A8580]">
                    {p.vencimento ? fmtDate(p.vencimento) : '--'}
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${p.deleted ? 'line-through' : ''}`}>{p.desc}</span>
                        {(p.comprovante || p.comprovanteUrl) && (
                          <a href={p.comprovanteUrl || p.comprovante} target="_blank" rel="noreferrer" title="Ver Comprovante" className="text-gold hover:scale-110 transition-transform">
                            <Info size={14} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#8A8580] uppercase tracking-wider font-bold">{p.cat}</span>
                        {p.parcelado && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">P {p.parcelaNum}/{p.parcelaTotal}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-[#242424] flex items-center justify-center text-[10px] font-bold text-gold border border-[#383838]">
                         {p.pagador[0]}
                       </div>
                       <span className="font-medium">{p.pagador}</span>
                    </div>
                  </td>
                  <td className="font-serif font-bold">{fmt(p.valor)}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${statusColor}`}>
                      {status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       {!p.deleted && (
                         <button 
                          onClick={() => onEdit(p)}
                          className="p-2 text-[#8A8580] hover:text-gold hover:bg-[#242424] rounded-lg transition-colors"
                         >
                           <Edit2 size={16} />
                         </button>
                       )}
                       <button 
                        onClick={() => onDelete(p)}
                        disabled={p.deleted}
                        className={`p-2 text-[#8A8580] hover:text-[#E07070] hover:bg-[#242424] rounded-lg transition-colors ${p.deleted ? 'cursor-not-allowed' : ''}`}
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              )})}
              {list.length === 0 && (
                <tr key="empty-pagamentos">
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <User size={48} className="text-[#383838]" />
                       <p className="text-[#8A8580] text-sm italic">Nenhum pagamento integral registrado.</p>
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
