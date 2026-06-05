import React, { useState, useMemo } from 'react';
import { Trash2, Edit2, Info, User, ChevronDown, ChevronRight } from 'lucide-react';
import { fmt, fmtDate } from '@/lib/utils';

export default function Pagamentos({ finance, onEdit, onDelete }: any) {

  // IDs dos grupos expandidos
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Separar parcelados (têm grupoParcelamento) dos avulsos
  const { grupos, avulsos } = useMemo(() => {
    const all = finance.pagamentos.slice().sort((a: any, b: any) => b.data.localeCompare(a.data));

    const grupoMap: Record<string, any[]> = {};
    const avulsoList: any[] = [];

    for (const p of all) {
      if (p.grupoParcelamento) {
        if (!grupoMap[p.grupoParcelamento]) grupoMap[p.grupoParcelamento] = [];
        grupoMap[p.grupoParcelamento].push(p);
      } else {
        avulsoList.push(p);
      }
    }

    // Montar resumo de cada grupo
    const grupoList = Object.entries(grupoMap).map(([gId, parcelas]) => {
      const sorted = parcelas.slice().sort((a: any, b: any) => a.parcelaNum - b.parcelaNum);
      const total = sorted.reduce((s: number, p: any) => s + p.valor, 0);
      const pagas = sorted.filter((p: any) => {
        const comps = finance.compensacoes.filter((c: any) => c.pagamentoId === p.id && !c.deleted);
        return comps.length > 0 && comps.every((c: any) => c.pago);
      }).length;
      const proxima = sorted.find((p: any) => {
        const comps = finance.compensacoes.filter((c: any) => c.pagamentoId === p.id && !c.deleted);
        return comps.length === 0 || comps.some((c: any) => !c.pago);
      });
      return { gId, parcelas: sorted, total, pagas, proxima };
    });

    // Ordenar grupos pela data da primeira parcela (mais recente primeiro)
    grupoList.sort((a, b) => b.parcelas[0].data.localeCompare(a.parcelas[0].data));

    return { grupos: grupoList, avulsos: avulsoList };
  }, [finance.pagamentos, finance.compensacoes]);

  const getStatus = (p: any) => {
    const comps = finance.compensacoes.filter((c: any) => c.pagamentoId === p.id && !c.deleted);
    const total = comps.length;
    const pagas = comps.filter((c: any) => c.pago).length;
    if (p.deleted) return { label: 'Cancelado', color: 'bg-[#E07070]/10 text-[#E07070]' };
    if (total === 0) return { label: 'Registrado', color: 'bg-blue-500/10 text-blue-400' };
    if (pagas === total) return { label: 'Quitado', color: 'bg-[#7ABF8A]/10 text-[#7ABF8A]' };
    if (pagas > 0) return { label: 'Parcial', color: 'bg-[#E3A008]/10 text-[#E3A008]' };
    return { label: 'Em Aberto', color: 'bg-[#8A8580]/10 text-[#8A8580]' };
  };

  const PagadorAvatar = ({ nome }: { nome: string }) => (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-[#242424] flex items-center justify-center text-[10px] font-bold text-gold border border-[#383838]">
        {nome?.[0] ?? '?'}
      </div>
      <span className="font-medium">{nome}</span>
    </div>
  );

  const totalItens = grupos.length + avulsos.length;

  return (
    <div className="space-y-6">
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 28 }} />
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

              {/* ── GRUPOS PARCELADOS ── */}
              {grupos.map(({ gId, parcelas, total, pagas, proxima }) => {
                const primeiro = parcelas[0];
                const isOpen = expanded.has(gId);
                const progresso = `${pagas}/${parcelas.length}`;
                const tudo = pagas === parcelas.length;

                return (
                  <React.Fragment key={gId}>
                    {/* Linha resumo do grupo */}
                    <tr
                      className="cursor-pointer hover:bg-[#1E1E1E] transition-colors bg-[#181818]"
                      onClick={() => toggle(gId)}
                    >
                      <td className="pl-3">
                        {isOpen
                          ? <ChevronDown size={14} className="text-gold" />
                          : <ChevronRight size={14} className="text-[#8A8580]" />
                        }
                      </td>
                      <td className="whitespace-nowrap">{fmtDate(primeiro.data)}</td>
                      <td className="whitespace-nowrap text-[11px] font-bold text-[#8A8580]">
                        {proxima?.vencimento ? fmtDate(proxima.vencimento) : '--'}
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{primeiro.desc}</span>
                            {(primeiro.comprovante || primeiro.comprovanteUrl) && (
                              <a href={primeiro.comprovanteUrl || primeiro.comprovante} target="_blank" rel="noreferrer" title="Ver Comprovante" className="text-gold hover:scale-110 transition-transform" onClick={e => e.stopPropagation()}>
                                <Info size={14} />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[#8A8580] uppercase tracking-wider font-bold">{primeiro.cat}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${tudo ? 'bg-[#7ABF8A]/10 text-[#7ABF8A]' : 'bg-blue-500/10 text-blue-400'}`}>
                              P {progresso}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td><PagadorAvatar nome={primeiro.pagador} /></td>
                      <td className="font-serif font-bold">{fmt(total)}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${tudo ? 'bg-[#7ABF8A]/10 text-[#7ABF8A]' : 'bg-blue-500/10 text-blue-400'}`}>
                          {tudo ? 'Quitado' : `${pagas} quitada${pagas !== 1 ? 's' : ''}`}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="text-[10px] text-[#8A8580] pr-2">{isOpen ? 'fechar' : 'expandir'}</span>
                      </td>
                    </tr>

                    {/* Linhas de cada parcela (visíveis só quando expandido) */}
                    {isOpen && parcelas.map((p: any) => {
                      const st = getStatus(p);
                      return (
                        <tr key={p.id} className={`bg-[#101010] border-l-2 border-gold/20 ${p.deleted ? 'opacity-50 grayscale italic' : ''}`}>
                          <td />
                          <td className="whitespace-nowrap pl-6 text-[#8A8580]">{fmtDate(p.data)}</td>
                          <td className="whitespace-nowrap text-[11px] font-bold text-[#8A8580]">
                            {p.vencimento ? fmtDate(p.vencimento) : '--'}
                          </td>
                          <td>
                            <div className="flex flex-col pl-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm ${p.deleted ? 'line-through' : ''} text-[#C0BDB8]`}>{p.desc}</span>
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400 mt-0.5">
                                Parcela {p.parcelaNum}/{p.parcelaTotal}
                              </span>
                            </div>
                          </td>
                          <td><PagadorAvatar nome={p.pagador} /></td>
                          <td className="font-serif text-[#C0BDB8]">{fmt(p.valor)}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!p.deleted && (
                                <button onClick={() => onEdit(p)} className="p-2 text-[#8A8580] hover:text-gold hover:bg-[#242424] rounded-lg transition-colors">
                                  <Edit2 size={16} />
                                </button>
                              )}
                              <button onClick={() => onDelete(p)} disabled={p.deleted} className={`p-2 text-[#8A8580] hover:text-[#E07070] hover:bg-[#242424] rounded-lg transition-colors ${p.deleted ? 'cursor-not-allowed' : ''}`}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* ── PAGAMENTOS AVULSOS ── */}
              {avulsos.map((p: any) => {
                const st = getStatus(p);
                return (
                  <tr key={p.id} className={p.deleted ? 'opacity-50 grayscale italic' : ''}>
                    <td />
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
                        <span className="text-[10px] text-[#8A8580] uppercase tracking-wider font-bold mt-0.5">{p.cat}</span>
                      </div>
                    </td>
                    <td><PagadorAvatar nome={p.pagador} /></td>
                    <td className="font-serif font-bold">{fmt(p.valor)}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!p.deleted && (
                          <button onClick={() => onEdit(p)} className="p-2 text-[#8A8580] hover:text-gold hover:bg-[#242424] rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                        )}
                        <button onClick={() => onDelete(p)} disabled={p.deleted} className={`p-2 text-[#8A8580] hover:text-[#E07070] hover:bg-[#242424] rounded-lg transition-colors ${p.deleted ? 'cursor-not-allowed' : ''}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {totalItens === 0 && (
                <tr key="empty-pagamentos">
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <User size={48} className="text-[#383838]" />
                      <p className="text-[#8A8580] text-sm italic">Nenhum pagamento registrado.</p>
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
