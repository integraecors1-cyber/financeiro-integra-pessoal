import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, ChevronRight, CheckCircle2, QrCode, FileCheck, Info } from 'lucide-react';
import { Membro, Compensacao } from '@/lib/types';
import { MEMBROS } from '@/lib/constants';
import { fmt, fmtDate, yyyymm } from '@/lib/utils';
import { calcNetBalance, calcPixMinimos, calcSaldosBrutos } from '@/lib/calculations';
import ModalManager from './modals/ModalManager';

export default function Saldos({ finance }: any) {
  const [mesFiltro, setMesFiltro] = useState(yyyymm(new Date().toISOString().split('T')[0]));
  const [selectedMembro, setSelectedMembro] = useState<Membro | null>(null);
  const [modalBaixa, setModalBaixa] = useState<{ de: Membro; para: Membro; comps: Compensacao[] } | null>(null);

  const netBalances = useMemo(() => 
    calcNetBalance(finance.compensacoes, finance.pagamentos, mesFiltro)
  , [finance.compensacoes, finance.pagamentos, mesFiltro]);

  const pixMinimos = useMemo(() => 
    calcPixMinimos(finance.compensacoes, finance.pagamentos, mesFiltro)
  , [finance.compensacoes, finance.pagamentos, mesFiltro]);

  const filteredComps = useMemo(() => 
    calcSaldosBrutos(finance.compensacoes, finance.pagamentos, mesFiltro)
  , [finance.compensacoes, finance.pagamentos, mesFiltro]);

  const currentPairData = useMemo(() => {
    if (!selectedMembro) return [];
    
    return MEMBROS.filter(m => m !== selectedMembro).map(outro => {
      const compsDe = filteredComps.filter(c => c.de === selectedMembro && c.para === outro);
      const compsPara = filteredComps.filter(c => c.de === outro && c.para === selectedMembro);
      
      const totalDe = compsDe.filter(c => !c.pago).reduce((acc: number, c: any) => acc + c.valor, 0);
      const totalPara = compsPara.filter(c => !c.pago).reduce((acc: number, c: any) => acc + c.valor, 0);
      
      const net = totalDe - totalPara;
      
      return {
        membro: outro,
        net,
        totalDe,
        totalPara,
        comps: [...compsDe, ...compsPara].sort((a, b) => b.data.localeCompare(a.data))
      };
    }).filter(pair => pair.comps.length > 0);
  }, [selectedMembro, filteredComps]);

  return (
    <div className="space-y-8">
      {/* Header Filtro */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="label">Mês de Referência (Mês do Pagamento Original)</label>
          <input 
            type="month" 
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="input-field py-1 px-3 text-sm max-w-[180px]"
          />
        </div>
        <div className="bg-[#1A1A1A] border border-[#383838] px-6 py-3 rounded-xl flex items-center gap-6">
           <div className="flex flex-col">
             <span className="text-[9px] uppercase tracking-widest text-[#8A8580] font-bold">Total Pendente</span>
             <span className="text-xl font-serif font-bold text-gold">
               {fmt(filteredComps.filter(c => !c.pago).reduce((acc: number, c: any) => acc + c.valor, 0))}
             </span>
           </div>
           <div className="w-px h-8 bg-[#383838]" />
           <div className="flex flex-col">
             <span className="text-[9px] uppercase tracking-widest text-[#8A8580] font-bold">Total Quitado</span>
             <span className="text-xl font-serif font-bold text-[#7ABF8A]">
               {fmt(filteredComps.filter(c => c.pago).reduce((acc: number, c: any) => acc + c.valor, 0))}
             </span>
           </div>
        </div>
      </div>

      {/* Grid de Balanço Geral */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {MEMBROS.map(m => {
          const bal = netBalances[m] || 0;
          return (
            <button
              key={m}
              onClick={() => setSelectedMembro(selectedMembro === m ? null : m)}
              className={`card p-4 text-center transition-all duration-300 border-2 ${
                selectedMembro === m ? 'border-gold bg-gold/5' : 'border-transparent'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-[#242424] flex items-center justify-center font-bold text-gold border border-[#383838] mx-auto mb-3">
                {m[0]}
              </div>
              <p className="text-sm font-bold truncate mb-1">{m}</p>
              <p className={`text-sm font-serif font-bold ${bal > 0.01 ? 'text-[#7ABF8A]' : bal < -0.01 ? 'text-[#E07070]' : 'text-[#8A8580]'}`}>
                {fmt(Math.abs(bal))}
              </p>
              <p className="text-[9px] uppercase font-bold text-[#5A5650] tracking-tighter mt-1 leading-none">
                {bal > 0.01 ? 'Receber' : bal < -0.01 ? 'Pagar' : 'Zerado'}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Detalhamento Agrupado */}
        <div className="lg:col-span-2 space-y-4">
           {selectedMembro ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-serif font-bold text-gold">Agrupado por Contraparte: {selectedMembro}</h3>
                  <button onClick={() => setSelectedMembro(null)} className="text-xs text-[#8A8580] hover:text-gold uppercase tracking-widest font-bold">Fechar</button>
                </div>

                {currentPairData.map(pair => (
                  <div key={pair.membro} className="card p-0 overflow-hidden group">
                    <div className="p-4 bg-[#242424] flex items-center justify-between border-b border-[#383838]">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center font-bold text-gold text-xs">{pair.membro[0]}</div>
                         <span className="font-bold">{pair.membro}</span>
                      </div>
                      
                      <div className="flex items-center gap-6">
                         <div className="text-right">
                           <p className={`text-lg font-serif font-bold ${pair.net > 0.01 ? 'text-[#E07070]' : pair.net < -0.01 ? 'text-[#7ABF8A]' : 'text-[#8A8580]'}`}>
                             {fmt(Math.abs(pair.net))}
                           </p>
                           <p className="text-[9px] uppercase font-bold text-[#8A8580] tracking-widest leading-none mt-1">
                             {pair.net > 0.01 ? `${selectedMembro} PAGA` : pair.net < -0.01 ? `${selectedMembro} RECEBE` : 'QUITADO'}
                           </p>
                         </div>

                         {pair.net < -0.01 && finance.pixChaves?.[pair.membro] && (
                           <button 
                             onClick={() => {
                               navigator.clipboard.writeText(finance.pixChaves[pair.membro]);
                               alert('Pix copiado: ' + finance.pixChaves[pair.membro]);
                             }}
                             className="p-3 bg-[#242424] border border-[#383838] rounded-xl text-gold hover:border-gold transition-colors flex flex-col items-center gap-1 group/pix"
                             title="Copiar Pix"
                           >
                             <QrCode size={18} className="group-hover/pix:scale-110 transition-transform" />
                             <span className="text-[7px] uppercase font-bold tracking-tighter">Copiar Pix</span>
                           </button>
                         )}

                         {Math.abs(pair.net) > 0.01 && (
                           <button 
                            onClick={() => setModalBaixa({ 
                              de: pair.net > 0 ? selectedMembro : pair.membro, 
                              para: pair.net > 0 ? pair.membro : selectedMembro, 
                              comps: pair.comps.filter(c => !c.pago)
                            })}
                            className="btn btn-primary py-2 px-4 text-xs font-bold uppercase tracking-widest"
                           >
                             Baixa
                           </button>
                         )}
                      </div>
                    </div>

                    <div className="divide-y divide-[#383838]">
                      {pair.comps.map(c => {
                        const originalPag = finance.pagamentos.find((p: any) => p.id === c.pagamentoId);
                        return (
                          <div key={c.id} className="p-4 pl-12 flex items-center justify-between hover:bg-[#242424] transition-colors">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${c.de === selectedMembro ? 'text-[#E07070]' : 'text-[#7ABF8A]'}`}>
                                  {c.de === selectedMembro ? 'Pagar' : 'Receber'}
                                </span>
                                {originalPag?.parcelado && (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                                    Parcela {originalPag.parcelaNum}/{originalPag.parcelaTotal}
                                  </span>
                                )}
                                {!originalPag?.parcelado && (
                                  <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20">
                                    À Vista
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-bold text-[#F0EDE8]">{originalPag?.desc || 'Despesa Compartilhada'}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#8A8580] font-medium tracking-wide">
                                  Ref: {new Date(c.data).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase()}
                                </span>
                                <span className="text-[10px] text-[#5A5650]">• {fmtDate(originalPag?.createdAt || '')}</span>
                              </div>
                            </div>
                            <div className="text-right">
                               <p className={`font-serif font-bold text-[16px] ${c.pago ? 'line-through text-[#5A5650]' : ''}`}>{fmt(c.valor)}</p>
                               {c.pago && (
                                 <span className="text-[10px] text-[#7ABF8A] font-bold flex items-center justify-end gap-1 mt-1">
                                   <CheckCircle2 size={10} /> {c.formaPag} em {fmtDate(c.pagoEm || '')}
                                 </span>
                               )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {currentPairData.length === 0 && (
                  <div className="card text-center py-16 opacity-50">
                     <p className="text-[#8A8580] italic text-sm">Nenhuma compensação no período filtrado.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="card flex flex-col items-center justify-center py-32 gap-6 opacity-30">
                 <Scale size={64} strokeWidth={1} />
                 <p className="text-[#F0EDE8] text-sm font-medium text-center max-w-sm tracking-wide">
                   Selecione um membro no grid para visualizar as compensações pendentes e realizar baixas em lote.
                 </p>
              </div>
            )}
        </div>

        {/* Neteamento Sugerido */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Scale size={20} className="text-gold" />
            <h3 className="text-xl font-serif font-bold text-gold underline decoration-gold/20 underline-offset-8">Pix Sugeridos</h3>
          </div>
          
          <div className="card bg-[#141414] border-gold/10">
             <div className="flex items-start gap-4 p-4 bg-gold/5 border border-gold/10 rounded-xl mb-6">
                <Info size={18} className="text-gold shrink-0 mt-1" />
                <p className="text-[10px] text-gold-light/70 font-medium leading-[1.6]">
                  Netting Total: Esta lista consolida todas as dívidas pendentes entre todos os membros para sugerir o menor número de transferências necessárias.
                </p>
             </div>

             <div className="space-y-3">
                {pixMinimos.map((pix) => (
                  <div key={`${pix.de}-${pix.para}`} className="flex flex-col p-4 bg-[#242424] border border-[#383838] rounded-xl hover:border-gold transition-all duration-300 group gap-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <span className="font-bold text-xs uppercase tracking-wider">{pix.de}</span>
                           <div className="w-6 h-px bg-gold/30 group-hover:bg-gold transition-colors" />
                           <span className="font-bold text-xs uppercase tracking-wider text-gold-light">{pix.para}</span>
                        </div>
                        <span className="font-serif font-bold text-lg text-gold group-hover:scale-105 transition-transform">
                          {fmt(pix.valor)}
                        </span>
                     </div>
                     
                     <div className="flex items-center justify-between pt-3 border-t border-[#383838]">
                        <div className="flex flex-col">
                           <span className="text-[8px] uppercase font-bold text-[#8A8580] tracking-widest">Chave Pix ({pix.para})</span>
                           <span className="text-[10px] font-bold text-gold-light truncate max-w-[120px]">
                              {finance.pixChaves?.[pix.para] || 'Pix não cadastrado'}
                           </span>
                        </div>
                        {finance.pixChaves?.[pix.para] ? (
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(finance.pixChaves[pix.para]);
                              alert('Pix copiado: ' + finance.pixChaves[pix.para]);
                            }}
                            className="bg-gold px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest text-[#0E0E0E] hover:bg-gold-light transition-colors"
                          >
                            Copiar Pix
                          </button>
                        ) : (
                          <span className="text-[8px] uppercase font-bold text-[#5A5650] italic">Pendente</span>
                        )}
                     </div>
                  </div>
                ))}
               
               {pixMinimos.length === 0 && (
                 <div className="text-center py-12 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#7ABF8A]/5 flex items-center justify-center">
                       <FileCheck size={32} className="text-[#7ABF8A] opacity-40" />
                    </div>
                    <p className="text-[#8A8580] text-xs font-bold uppercase tracking-widest">Tudo regularizado</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>

      {modalBaixa && (
        <ModalManager 
          modal={{ type: 'baixa', data: modalBaixa }}
          onClose={() => setModalBaixa(null)}
          finance={finance}
        />
      )}
    </div>
  );
}
