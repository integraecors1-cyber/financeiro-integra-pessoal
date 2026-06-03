'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle, Trash2, Camera, Upload, FileCheck, ChevronDown, ChevronUp, CreditCard as CardIcon, Receipt as ReceiptIcon, TrendingUp as TrendingIcon, Wallet as WalletIcon, Scale, Users, Check, XCircle, Eye, Info, Copy } from 'lucide-react';
import { uid, addMonths, fmt, fmtDate } from '@/lib/utils';
import { MEMBROS } from '@/lib/constants';
import { geraCompensacoes, calcResumoFinanceiroMembro, calcParteMembro, calcCotaMembro, calcTotalCotaPaga } from '@/lib/calculations';
import type { Despesa, Compensacao, Membro } from '@/lib/types';

interface PairSummary {
  outro: Membro;
  aPagar: number;
  aReceber: number;
  saldoLiq: number;
  quemPaga: Membro;
  quemRecebe: Membro;
  comps: Compensacao[];
}

export default function ModalManager({ modal, onClose, onOpenModal, finance }: any) {
  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-[#1A1A1A] border border-[#383838] rounded-2xl w-full max-w-[580px] shadow-2xl overflow-hidden"
      >
        {modal.type === 'despesas' && <ModalDespesa onSave={onClose} finance={finance} data={modal.data} />}
        {modal.type === 'pagamentos' && <ModalPagamento onSave={onClose} finance={finance} data={modal.data} />}
        {modal.type === 'receitas' && <ModalReceita onSave={onClose} finance={finance} data={modal.data} />}
        {modal.type === 'baixa' && <ModalBaixa onSave={onClose} finance={finance} data={modal.data} />}
        {modal.type === 'delete' && <ModalDelete onSave={onClose} finance={finance} data={modal.data} />}
        {modal.type === 'membro_detalhe' && <ModalMembroDetalhe onOpenBaixa={(d: any) => onOpenModal({ type: 'baixa', data: d })} finance={finance} membro={modal.data} />}
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8A8580] hover:text-gold transition-colors z-10"
        >
          <X size={20} />
        </button>
      </motion.div>
    </div>
  );
}

function ModalMembroDetalhe({ membro, onOpenBaixa, finance }: any) {
  const [expandedMembro, setExpandedMembro] = useState<string | null>(null);
  const currentMonth = new Date().toISOString().substring(0, 7);

  const res = calcResumoFinanceiroMembro(finance, membro as any, currentMonth);
  
  // Compensações de interesse: não deletadas que estão pendentes, ou são do mês atual, ou possuem comprovante pendente de conferência
  const compsInteresse = finance.compensacoes.filter((c: any) => 
    !c.deleted && (c.data.startsWith(currentMonth) || !c.pago || c.statusConferencia === 'pendente')
  );
  
  const despesasDaCota: Despesa[] = finance.despesas.filter((d: any) => !d.deleted && d.data.startsWith(currentMonth));

  // Acertos GroupBy usuário
  const pairData: PairSummary[] = (MEMBROS.filter(m => m !== membro) as Membro[]).map(outro => {
    const aPagar = compsInteresse.filter((c: any) => c.de === membro && c.para === outro && !c.pago).reduce((s: number, c: any) => s + c.valor, 0);
    const aReceber = compsInteresse.filter((c: any) => c.de === outro && c.para === membro && !c.pago).reduce((s: number, c: any) => s + c.valor, 0);
    const saldoLiq = Math.abs(aPagar - aReceber);
    const quemPaga = aPagar > aReceber ? membro : outro;
    const quemRecebe = aPagar > aReceber ? outro : membro;
    
    const compsDoPar: Compensacao[] = compsInteresse.filter((c: any) => (c.de === membro && c.para === outro) || (c.de === outro && c.para === membro))
      .sort((a: any, b: any) => b.data.localeCompare(a.data));

    return {
      outro,
      aPagar,
      aReceber,
      saldoLiq,
      quemPaga: quemPaga as Membro,
      quemRecebe: quemRecebe as Membro,
      comps: compsDoPar
    };
  }).filter(p => p.comps.length > 0);

  const handleConferencia = async (compId: string, status: 'confirmado' | 'recusado') => {
    const comp = finance.compensacoes.find((c: any) => c.id === compId);
    if (!comp) return;
    
    let obs = comp.observacaoConferencia || '';
    if (status === 'recusado') {
      const resp = prompt('Motivo da recusa:', obs);
      if (resp === null) return;
      obs = resp;
    }

    const updated = {
      ...comp,
      statusConferencia: status,
      observacaoConferencia: obs,
      confirmadoPor: membro,
      confirmadoEm: new Date().toISOString()
    };
    await finance.updateCompensacao(updated);
  };

  const recData = pairData.filter(p => p.quemRecebe === membro && p.comps.some(c => c.statusConferencia === 'pendente' && (c.comprovante || c.comprovanteUrl)));

  return (
    <div className="p-10 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center font-bold text-2xl text-gold shadow-gold/5">
          {membro[0]}
        </div>
        <div className="min-w-0">
          <h3 className="font-serif text-3xl font-bold text-[#F0EDE8] truncate">{membro}</h3>
          <p className="text-[10px] uppercase text-[#8A8580] tracking-[0.2em] font-bold truncate">Resumo Consolidado do Mês</p>
        </div>
      </div>

      {/* Seção 0: Conferência de Recebimentos (Apenas se houver algo para conferir) */}
      {recData.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7ABF8A] flex items-center gap-2">
            <FileCheck size={14} />
            Comprovantes recebidos para conferência
          </h4>
          <div className="space-y-2">
            {recData.map(pair => pair.comps.filter(c => c.statusConferencia === 'pendente' && (c.comprovante || c.comprovanteUrl)).map(c => {
               const pag = finance.pagamentos.find((p: any) => p.id === c.pagamentoId);
               return (
                <div key={c.id} className="bg-[#7ABF8A]/5 border border-[#7ABF8A]/20 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center font-bold text-xs text-gold">
                       {c.de[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{c.de} pagou {fmt(c.valor)}</p>
                      <p className="text-[9px] text-[#8A8580] truncate">{pag?.desc || 'Compensação'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                      onClick={() => {
                        const url = c.comprovanteUrl || c.comprovante;
                        if (url) window.open(url, "_blank", c.comprovanteUrl ? "noopener,noreferrer" : "");
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[#242424] border border-[#383838] text-[9px] font-bold uppercase text-gold hover:border-gold transition-all"
                    >
                      <Eye size={10} /> Abrir
                    </button>
                    <button 
                      onClick={() => handleConferencia(c.id, 'confirmado')}
                      className="px-2 py-1 rounded bg-[#7ABF8A] text-[#0E0E0E] text-[9px] font-bold uppercase hover:opacity-90"
                    >
                      Confirmar
                    </button>
                    <button 
                      onClick={() => handleConferencia(c.id, 'recusado')}
                      className="px-2 py-1 rounded bg-[#E07070] text-white text-[9px] font-bold uppercase hover:opacity-90"
                    >
                      Recusar
                    </button>
                  </div>
                </div>
               );
            }))}
          </div>
        </div>
      )}

      {/* Resumo Financeiro Consolidado */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <div className="bg-[#242424] border border-[#383838] p-3 rounded-xl min-w-0">
          <p className="text-[10px] uppercase font-bold text-[#8A8580] tracking-widest truncate">Cota</p>
          <p className="text-[8px] text-[#8A8580] mb-1 font-medium truncate">Escritório</p>
          <p className="text-base font-serif font-bold text-white whitespace-nowrap">{fmt(res.cotaEsperada)}</p>
        </div>
        <div className="bg-[#242424] border border-[#383838] p-3 rounded-xl min-w-0">
          <p className="text-[10px] uppercase font-bold text-[#8A8580] tracking-widest truncate">Acertos</p>
          <p className="text-[8px] text-[#8A8580] mb-1 font-medium truncate">Compensações</p>
          <p className={`text-base font-serif font-bold whitespace-nowrap ${res.balanceAcertoOutros > 0 ? 'text-[#7ABF8A]' : res.balanceAcertoOutros < 0 ? 'text-[#E07070]' : 'text-white'}`}>
            {res.balanceAcertoOutros > 0 ? '+' : ''}{fmt(res.balanceAcertoOutros)}
          </p>
        </div>
        <div className="bg-[#242424]/40 border border-gold/20 p-3 rounded-xl min-w-0 shadow-lg shadow-gold/5">
          <p className="text-[10px] uppercase font-bold text-gold tracking-widest truncate">Total</p>
          <p className="text-[8px] text-gold/40 mb-1 font-medium truncate">Devido</p>
          <p className="text-lg font-serif font-bold text-gold whitespace-nowrap">{fmt(res.cotaEsperada - res.balanceAcertoOutros)}</p>
        </div>
        <div className="bg-[#242424] border border-[#383838] p-3 rounded-xl min-w-0">
          <p className="text-[10px] uppercase font-bold text-[#8A8580] tracking-widest truncate">Pago</p>
          <p className="text-[8px] text-[#8A8580] mb-1 font-medium truncate">No mês</p>
          <p className="text-base font-serif font-bold text-[#7ABF8A] whitespace-nowrap">{fmt(res.totalJaPagoCota)}</p>
        </div>
        <div className="bg-gold/5 border border-gold/40 p-3 rounded-xl min-w-0">
          <p className="text-[10px] uppercase font-bold text-gold tracking-widest truncate">Saldo</p>
          <p className="text-[8px] text-gold/60 mb-1 font-medium truncate">Final</p>
          <p className={`text-lg font-serif font-bold whitespace-nowrap ${res.saldoFinalConsolidado > 0.01 ? 'text-[#7ABF8A]' : res.saldoFinalConsolidado < -0.01 ? 'text-[#E07070]' : 'text-gold'}`}>
            {res.saldoFinalConsolidado > 0.01 ? '+' : ''}{fmt(res.saldoFinalConsolidado)}
          </p>
        </div>
      </div>

      {/* Objetivo 1: Despesas que compõem sua cota */}
      <div className="space-y-4">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A8580] flex items-center gap-2">
          <ReceiptIcon size={14} />
          Despesas que compõem sua cota
        </h4>
        <div className="card overflow-x-auto p-0 border-[#383838] custom-scrollbar">
          <table className="w-full text-left table-fixed">
             <thead className="bg-[#242424]">
                <tr>
                  <th className="w-[80px] px-4 py-3 text-[9px] font-bold uppercase text-[#8A8580] tracking-widest whitespace-nowrap">Data</th>
                  <th className="px-4 py-3 text-[9px] font-bold uppercase text-[#8A8580] tracking-widest">Descrição</th>
                  <th className="w-[100px] px-4 py-3 text-[9px] font-bold uppercase text-[#8A8580] tracking-widest whitespace-nowrap">Total</th>
                  <th className="w-[110px] px-4 py-3 text-[9px] font-bold uppercase text-[#8A8580] tracking-widest text-right whitespace-nowrap">Sua Parte</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-[#242424]">
                {despesasDaCota.map((d: Despesa) => (
                  <tr key={d.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-[#8A8580] whitespace-nowrap">{fmtDate(d.data)}</td>
                    <td className="px-4 py-3 min-w-0">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white truncate" title={d.desc}>{d.desc}</span>
                        <span className="text-[9px] font-bold text-[#8A8580] uppercase tracking-wider mt-0.5 truncate">{d.cat}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-[#8A8580] whitespace-nowrap font-medium">{fmt(d.valor)}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-gold text-right whitespace-nowrap">{fmt(calcParteMembro(d.valor, d.cat, membro as any))}</td>
                  </tr>
                ))}
                {despesasDaCota.length === 0 && (
                   <tr>
                     <td colSpan={4} className="px-4 py-8 text-center text-[10px] text-[#5A5650] italic">Nenhuma despesa registrada para este mês.</td>
                   </tr>
                )}
             </tbody>
             <tfoot className="bg-[#1D1D1D]">
                <tr>
                   <td colSpan={3} className="px-4 py-3 text-[10px] font-bold uppercase text-[#8A8580] text-right">Subtotal Cota Escritório</td>
                   <td className="px-4 py-3 text-sm font-bold text-white text-right">{fmt(res.cotaEsperada)}</td>
                </tr>
             </tfoot>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A8580] flex items-center gap-2">
            <Scale size={14} />
            Acertos e Compensações
          </h4>
          <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider">
            <span className="text-[#7ABF8A]">Receber: {fmt(pairData.reduce((acc: number, p: PairSummary) => acc + p.aReceber, 0))}</span>
            <span className="text-[#E07070]">Pagar: {fmt(pairData.reduce((acc: number, p: PairSummary) => acc + p.aPagar, 0))}</span>
            <span className={res.balanceAcertoOutros > 0 ? 'text-[#7ABF8A]' : res.balanceAcertoOutros < 0 ? 'text-[#E07070]' : 'text-[#8A8580]'}> Saldo: {fmt(res.balanceAcertoOutros)}</span>
          </div>
        </div>

        {pairData.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-[#242424] rounded-2xl text-center">
            <p className="text-xs text-[#5A5650] italic font-medium">Nenhuma compensação pendente para este membro.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pairData.map((pair: PairSummary) => (
              <div key={pair.outro} className="bg-[#1D1D1D] border border-[#383838] rounded-2xl overflow-hidden group">
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#242424] border border-[#383838] flex items-center justify-center font-bold text-gold text-sm group-hover:border-gold/30 transition-colors">
                      {pair.outro[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#F0EDE8] truncate">{pair.outro}</p>
                      <div className="flex items-center gap-3 mt-1 overflow-hidden">
                        <span className="text-[9px] text-[#7ABF8A] font-bold flex items-center gap-1 opacity-80 whitespace-nowrap">
                          <ChevronUp size={10} className="stroke-[3]" /> RECEBER {fmt(pair.aReceber)}
                        </span>
                        <span className="text-[9px] text-[#E07070] font-bold flex items-center gap-1 opacity-80 whitespace-nowrap">
                          <ChevronDown size={10} className="stroke-[3]" /> PAGAR {fmt(pair.aPagar)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                       <p className={`text-xl font-serif font-bold ${pair.quemPaga === membro ? 'text-[#E07070]' : 'text-[#7ABF8A]'}`}>
                         {fmt(pair.saldoLiq)}
                       </p>
                       <p className={`text-[9px] font-bold uppercase tracking-widest ${pair.quemPaga === membro ? 'text-[#E07070]/50' : 'text-[#7ABF8A]/50'}`}>
                         {pair.quemPaga === membro ? 'Você Paga' : 'Você Recebe'}
                       </p>
                    </div>

                    <button 
                      onClick={() => onOpenBaixa({ 
                        de: pair.quemPaga, 
                        para: pair.quemRecebe, 
                        comps: pair.comps 
                      })}
                      className="bg-gold px-4 py-2 rounded-lg text-[#0E0E0E] text-[10px] font-bold uppercase tracking-widest hover:bg-gold-light transition-colors"
                    >
                      Baixa
                    </button>
                    
                    <button 
                      onClick={() => setExpandedMembro(expandedMembro === pair.outro ? null : pair.outro)}
                      className="p-2 text-[#8A8580] hover:text-white transition-colors"
                    >
                      {expandedMembro === pair.outro ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedMembro === pair.outro && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-[#161616] border-t border-[#383838]"
                    >
                      <div className="divide-y divide-[#242424]">
                        {pair.comps.map((c: any) => {
                          const pag = finance.pagamentos.find((p: any) => p.id === c.pagamentoId);
                          return (
                            <div key={c.id} className="p-4 pl-16 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                               <div className="space-y-1 col-span-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                     <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border whitespace-nowrap ${c.de === membro ? 'bg-[#E07070]/10 border-[#E07070]/20 text-[#E07070]' : 'bg-[#7ABF8A]/10 border-[#7ABF8A]/20 text-[#7ABF8A]'}`}>
                                        {c.de === membro ? 'Para Pagar' : 'Para Receber'}
                                     </span>
                                  </div>
                                  <p className="text-xs font-bold text-[#F0EDE8] truncate">{pag?.desc || 'Despesa Coletiva'}</p>
                                  <p className="text-[9px] text-[#5A5650] font-bold uppercase tracking-wider truncate">
                                    Ref: {new Date(c.data).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase()}
                                  </p>
                               </div>

                               <div className="flex items-center gap-4 col-span-1">
                                  {!c.pago && !c.comprovante && !c.comprovanteUrl ? (
                                    <button 
                                      onClick={() => onOpenBaixa({ de: c.de, para: c.para, comps: [c] })}
                                      className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-[9px] font-bold uppercase tracking-widest text-gold hover:bg-gold hover:text-[#0E0E0E] transition-all"
                                    >
                                      Baixa
                                    </button>
                                  ) : (c.comprovante || c.comprovanteUrl) ? (
                                    <div className="flex flex-col gap-2">
                                       <div className="flex items-center gap-2">
                                          <button 
                                            onClick={() => {
                                              if (c.comprovanteUrl) {
                                                window.open(c.comprovanteUrl, "_blank", "noopener,noreferrer");
                                              } else if (c.comprovante) {
                                                window.open(c.comprovante, "_blank");
                                              }
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242424] border border-[#383838] text-[9px] font-bold uppercase tracking-widest text-[#8A8580] hover:text-gold hover:border-gold transition-all"
                                          >
                                             <Eye size={12} /> Abrir
                                          </button>
                                          
                                          <div className="flex items-center gap-1">
                                             {c.statusConferencia === 'confirmado' ? (
                                               <span className="flex items-center gap-1 text-[8px] font-bold uppercase text-[#7ABF8A] bg-[#7ABF8A]/10 px-2 py-1 rounded">
                                                 <Check size={10} /> Confirmado
                                               </span>
                                             ) : c.statusConferencia === 'recusado' ? (
                                               <span className="flex items-center gap-1 text-[8px] font-bold uppercase text-[#E07070] bg-[#E07070]/10 px-2 py-1 rounded" title={c.observacaoConferencia}>
                                                 <XCircle size={10} /> Recusado <Info size={10} className="cursor-help ml-1" />
                                               </span>
                                             ) : (
                                               <span className="text-[8px] font-bold uppercase text-[#E3A008] bg-[#E3A008]/10 px-2 py-1 rounded italic">
                                                 Aguardando conferência
                                               </span>
                                             )}
                                          </div>
                                       </div>

                                       {/* Ações de conferência (Apenas para quem recebe) */}
                                       {c.para === membro && c.statusConferencia === 'pendente' && (
                                         <div className="flex items-center gap-1">
                                            <button 
                                              onClick={() => handleConferencia(c.id, 'confirmado')}
                                              className="p-1 px-2 rounded-md bg-[#7ABF8A]/10 text-[#7ABF8A] hover:bg-[#7ABF8A] hover:text-[#0E0E0E] transition-all text-[8px] font-bold uppercase flex items-center gap-1"
                                              title="Confirmar"
                                            >
                                              <Check size={10} /> Confirmar
                                            </button>
                                            <button 
                                              onClick={() => handleConferencia(c.id, 'recusado')}
                                              className="p-1 px-2 rounded-md bg-[#E07070]/10 text-[#E07070] hover:bg-[#E07070] hover:text-[#0E0E0E] transition-all text-[8px] font-bold uppercase flex items-center gap-1"
                                              title="Recusar"
                                            >
                                              <XCircle size={10} /> Recusar
                                            </button>
                                         </div>
                                       )}
                                    </div>
                                  ) : c.pago ? (
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#7ABF8A] bg-[#7ABF8A]/10 border border-[#7ABF8A]/20 px-2 py-1 rounded">
                                      {c.formaPag || 'Pago'}
                                    </span>
                                  ) : null}
                               </div>

                               <div className="text-right col-span-1 min-w-0">
                                  <p className="font-serif font-bold text-lg whitespace-nowrap">{fmt(c.valor)}</p>
                                  {c.observacaoConferencia && (
                                    <p className="text-[8px] italic text-[#E07070] max-w-full truncate" title={c.observacaoConferencia}>
                                      Obs: {c.observacaoConferencia}
                                    </p>
                                  )}
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS: Record<string, any> = {
  'Aluguel': { natureza: 'fixo', essencialidade: 'essencial', centroCusto: 'estrutura' },
  'Condomínio': { natureza: 'fixo', essencialidade: 'essencial', centroCusto: 'estrutura' },
  'Água': { natureza: 'fixo', essencialidade: 'essencial', centroCusto: 'estrutura' },
  'Luz': { natureza: 'fixo', essencialidade: 'essencial', centroCusto: 'estrutura' },
  'Internet': { natureza: 'fixo', essencialidade: 'essencial', centroCusto: 'estrutura' },
  'Limpeza': { natureza: 'fixo', essencialidade: 'essencial', centroCusto: 'estrutura' },
  'Material de Escritório': { natureza: 'variavel', essencialidade: 'operacional', centroCusto: 'administrativo' },
  'Manutenção / Reparos': { natureza: 'eventual', essencialidade: 'operacional', centroCusto: 'estrutura' },
  'Café / Copa': { natureza: 'variavel', essencialidade: 'discricionario', centroCusto: 'administrativo' },
  'Contabilidade': { natureza: 'fixo', essencialidade: 'essencial', centroCusto: 'administrativo' },
  'Telefone': { natureza: 'fixo', essencialidade: 'essencial', centroCusto: 'administrativo' },
  'Seguro': { natureza: 'fixo', essencialidade: 'essencial', centroCusto: 'administrativo' },
  'Estacionamento': { natureza: 'fixo', essencialidade: 'operacional', centroCusto: 'administrativo' },
};

function ModalDespesa({ onSave, finance, data }: any) {
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [form, setForm] = useState(data || {
    data: new Date().toISOString().split('T')[0],
    vencimento: new Date().toISOString().split('T')[0],
    valor: '',
    desc: '',
    cat: '',
    natureza: 'fixo',
    essencialidade: 'essencial',
    centroCusto: 'estrutura',
    obs: '',
    comprovante: '',
    comprovanteNome: '',
    parcelado: false,
    parcelas: 1
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setForm({ ...form, comprovante: reader.result as string, comprovanteNome: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCatChange = (cat: string) => {
    const sug = SUGGESTIONS[cat];
    if (sug) {
      setForm({
        ...form,
        cat,
        natureza: sug.natureza,
        essencialidade: sug.essencialidade,
        centroCusto: sug.centroCusto
      });
    } else {
      setForm({ ...form, cat });
    }
  };

  const handleSave = async () => {
    setValidationError('');
    if (!form.data || !form.valor || !form.desc || !form.cat || !form.natureza || !form.essencialidade || !form.centroCusto) {
      setValidationError('Preencha todos os campos obrigatórios: data, valor, descrição e categoria.');
      return;
    }
    if (parseFloat(form.valor) <= 0) {
      setValidationError('O valor precisa ser maior que R$ 0,00.');
      return;
    }
    if (form.parcelado && (form.parcelas < 2 || form.parcelas > 60)) {
      setValidationError('O número de parcelas deve ser entre 2 e 60.');
      return;
    }
    setIsSaving(true);
    if (form.parcelado && form.parcelas > 1) {
      const gId = uid();
      const vParc = parseFloat(form.valor) / form.parcelas;
      for (let i = 1; i <= form.parcelas; i++) {
        const item = {
          id: uid(),
          data: addMonths(form.data, i - 1),
          valor: vParc,
          desc: form.desc,
          cat: form.cat,
          natureza: form.natureza,
          essencialidade: form.essencialidade,
          centroCusto: form.centroCusto,
          obs: form.obs,
          comprovante: form.comprovante,
          comprovanteNome: form.comprovanteNome,
          deleted: false,
          createdAt: new Date().toISOString(),
          parcelado: true,
          parcelaNum: i,
          parcelaTotal: form.parcelas,
          grupoParcelamento: gId
        };
        const { error } = await finance.addDespesa(item);
        if (error) {
          setValidationError('Erro ao salvar parcela ' + i + '. Verifique sua conexão e tente novamente.');
          setIsSaving(false);
          return;
        }
      }
    } else {
      const item = {
        ...form,
        id: data?.id || uid(),
        valor: parseFloat(form.valor),
        deleted: false,
        createdAt: data?.createdAt || new Date().toISOString()
      };
      const { error } = data ? await finance.updateDespesa(item) : await finance.addDespesa(item);
      if (error) {
        setValidationError('Erro ao salvar. Verifique sua conexão e tente novamente.');
        setIsSaving(false);
        return;
      }
    }
    setIsSaving(false);
    onSave();
  };

  return (
    <div className="p-10 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-serif text-2xl font-bold text-gold">Despesa do Escritório</div>
          <p className="text-[10px] text-[#8A8580] uppercase tracking-widest font-bold mt-1">Gasto pago com capital da Integra&Co</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label">Data de Lançamento</label>
          <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="input-field" />
        </div>
        <div className="space-y-2">
          <label className="label">Valor Total (R$)</label>
          <input type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="input-field" placeholder="0,00" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label">Vencimento</label>
          <input type="date" value={form.vencimento} onChange={e => setForm({...form, vencimento: e.target.value})} className="input-field" />
        </div>
        <div className="space-y-2">
          <label className="label">Comprovante</label>
          <div className="relative h-[42px] border border-[#383838] rounded-xl flex items-center px-4 cursor-pointer hover:border-gold transition-colors overflow-hidden">
            <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            <Camera size={16} className="text-[#8A8580] mr-2" />
            <span className="text-[11px] text-[#8A8580] truncate">
              {form.comprovanteNome || "Anexar Comprovante"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label">Descrição ou Fornecedor</label>
          <input type="text" value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} className="input-field" placeholder="Ex: Mobiliário Novo" />
        </div>
        <div className="space-y-2">
          <label className="label">Categoria</label>
          <select value={form.cat} onChange={e => handleCatChange(e.target.value)} className="input-field">
            <option value="">Selecione</option>
            {finance.catsDespesa.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="label">Natureza</label>
          <select value={form.natureza} onChange={e => setForm({...form, natureza: e.target.value})} className="input-field text-[11px]">
            <option value="fixo">📌 Fixo — valor previsível</option>
            <option value="variavel">📊 Variável — oscila mensalmente</option>
            <option value="eventual">⚡ Eventual — pontual</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="label">Essencialidade</label>
          <select value={form.essencialidade} onChange={e => setForm({...form, essencialidade: e.target.value})} className="input-field text-[11px]">
            <option value="essencial">🔴 Essencial — crítico</option>
            <option value="operacional">🟡 Operacional — necessário</option>
            <option value="discricionario">🟢 Discricionário — opcional</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="label">Centro de Custo</label>
          <select value={form.centroCusto} onChange={e => setForm({...form, centroCusto: e.target.value})} className="input-field text-[11px]">
            <option value="estrutura">🏢 Estrutura / Imóvel</option>
            <option value="pessoal">👥 Pessoal / Equipe</option>
            <option value="administrativo">⚙️ Administrativo</option>
            <option value="comercial">📣 Comercial / Mkt</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
         <label className="label">Tipo de Lançamento</label>
         <div className="flex bg-[#242424] p-1 rounded-lg border border-[#383838]">
            <button 
              onClick={() => setForm({...form, parcelado: false})}
              className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md ${!form.parcelado ? 'bg-gold text-[#0E0E0E]' : 'text-[#8A8580]'}`}
            >À Vista</button>
            <button 
              onClick={() => setForm({...form, parcelado: true})}
              className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md ${form.parcelado ? 'bg-blue-500 text-white' : 'text-[#8A8580]'}`}
            >Parcelado</button>
         </div>
      </div>

      {form.parcelado && (
        <div className="space-y-2 bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
           <label className="label text-blue-400">Número de Parcelas</label>
           <input 
            type="number" 
            value={form.parcelas} 
            onChange={e => setForm({...form, parcelas: parseInt(e.target.value)})} 
            className="input-field border-blue-500/30 focus:border-blue-500" 
           />
           <p className="text-[9px] text-blue-400/70 font-bold uppercase tracking-wider mt-2">Serão gerados {form.parcelas} registros automáticos</p>
        </div>
      )}

      <div className="pt-4 flex flex-col gap-3">
        {validationError && (
          <p className="text-xs text-[#E07070] bg-[#E07070]/10 border border-[#E07070]/20 rounded-xl px-4 py-2">{validationError}</p>
        )}
        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary py-4 text-sm tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isSaving ? (<><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Salvando...</>) : 'Salvar Registro'}
        </button>
        <p className="text-[10px] text-[#8A8580] text-center italic">Este registro documenta um gasto do escritório que será rateado entre os 6 membros conforme as regras oficiais.</p>
      </div>
    </div>
  );
}

function ModalPagamento({ onSave, finance, data }: any) {
  const [form, setForm] = useState(data || {
    data: new Date().toISOString().split('T')[0],
    vencimento: new Date().toISOString().split('T')[0],
    pagador: MEMBROS[0],
    valor: '',
    desc: '',
    cat: '',
    natureza: 'fixo',
    essencialidade: 'essencial',
    centroCusto: 'estrutura',
    comprovante: '',
    comprovanteNome: '',
    comprovanteUrl: '',
    comprovantePath: '',
    comprovanteTipo: '',
    parcelado: false,
    parcelas: 1
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 2MB.');
        return;
      }
      
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Formato inválido. Use PNG, JPG ou PDF.');
        return;
      }

      setSelectedFile(file);
      setForm({ ...form, comprovanteNome: file.name, comprovanteTipo: file.type });
    }
  };

  const handleCatChange = (cat: string) => {
    const sug = SUGGESTIONS[cat];
    if (sug) {
      setForm({
        ...form,
        cat,
        natureza: sug.natureza,
        essencialidade: sug.essencialidade,
        centroCusto: sug.centroCusto
      });
    } else {
      setForm({ ...form, cat });
    }
  };

  const handleSave = async () => {
    if (!form.data || !form.valor || !form.desc || !form.cat || !form.pagador || !form.natureza || !form.essencialidade || !form.centroCusto) return;
    
    setIsUploading(true);
    let storageFields: any = {};
    const pid = data?.id || uid();

    if (selectedFile) {
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const path = `pagamentos/${pid}/${timestamp}-${sanitizedName}`;
      
      const { data: uploadData, error } = await finance.uploadArquivo('comprovantes-pix', path, selectedFile);
      
      if (error) {
        alert('Erro ao enviar comprovante: ' + error.message);
        setIsUploading(false);
        return;
      }

      if (uploadData) {
        storageFields = {
          comprovanteUrl: uploadData.publicUrl,
          comprovantePath: uploadData.path,
          comprovanteNome: selectedFile.name,
          comprovanteTipo: selectedFile.type
        };
      }
    }

    if (form.parcelado && form.parcelas > 1) {
      const gId = uid();
      const vParc = parseFloat(form.valor) / form.parcelas;
      for (let i = 1; i <= form.parcelas; i++) {
        const dataVenc = addMonths(form.data, i - 1);
        const currentPid = i === 1 ? pid : uid();
        const item = {
          ...form,
          id: currentPid,
          data: dataVenc,
          pagador: form.pagador,
          valor: vParc,
          desc: form.desc,
          cat: form.cat,
          natureza: form.natureza,
          essencialidade: form.essencialidade,
          centroCusto: form.centroCusto,
          deleted: false,
          createdAt: new Date().toISOString(),
          parcelado: true,
          parcelaNum: i,
          parcelaTotal: form.parcelas,
          grupoParcelamento: gId,
          ...storageFields
        };
        await finance.addPagamento(item);
        const comps = geraCompensacoes(currentPid, form.pagador, vParc, dataVenc, form.cat);
        for (const c of comps) {
          await finance.addCompensacao(c);
        }
      }
    } else {
      const item = {
        ...form,
        id: pid,
        valor: parseFloat(form.valor),
        deleted: false,
        createdAt: data?.createdAt || new Date().toISOString(),
        ...storageFields
      };
      
      if (data) {
        await finance.updatePagamento(item);
      } else {
        await finance.addPagamento(item);
        const comps = geraCompensacoes(pid, form.pagador, parseFloat(form.valor), form.data, form.cat);
        for (const c of comps) {
          await finance.addCompensacao(c);
        }
      }
    }
    setIsUploading(false);
    onSave();
  };

  return (
    <div className="p-10 space-y-8">
      <div>
        <div className="font-serif text-2xl font-bold text-gold">Pagamento Coletivo</div>
        <p className="text-[10px] text-[#8A8580] uppercase tracking-widest font-bold mt-1">Membro pagou do bolso e deve ser reembolsado</p>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label">Quem Pagou?</label>
          <select value={form.pagador} onChange={e => setForm({...form, pagador: e.target.value})} className="input-field">
            {MEMBROS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="label">Data</label>
          <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="input-field" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label">Vencimento</label>
          <input type="date" value={form.vencimento} onChange={e => setForm({...form, vencimento: e.target.value})} className="input-field" />
        </div>
        <div className="space-y-2">
          <label className="label">Comprovante</label>
          <div className="relative h-[42px] border border-[#383838] rounded-xl flex items-center px-4 cursor-pointer hover:border-gold transition-colors overflow-hidden">
            <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            <Camera size={16} className="text-[#8A8580] mr-2" />
            <span className="text-[11px] text-[#8A8580] truncate">
              {form.comprovanteNome || "Anexar Comprovante"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label">Valor Total (R$)</label>
          <input type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="input-field" placeholder="0,00" />
        </div>
        <div className="space-y-2">
          <label className="label">Categoria</label>
          <select value={form.cat} onChange={e => handleCatChange(e.target.value)} className="input-field">
            <option value="">Selecione</option>
            {finance.catsDespesa.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="label">Natureza</label>
          <select value={form.natureza} onChange={e => setForm({...form, natureza: e.target.value})} className="input-field text-[11px]">
            <option value="fixo">📌 Fixo — valor previsível</option>
            <option value="variavel">📊 Variável — oscila mensalmente</option>
            <option value="eventual">⚡ Eventual — pontual</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="label">Essencialidade</label>
          <select value={form.essencialidade} onChange={e => setForm({...form, essencialidade: e.target.value})} className="input-field text-[11px]">
            <option value="essencial">🔴 Essencial — crítico</option>
            <option value="operacional">🟡 Operacional — necessário</option>
            <option value="discricionario">🟢 Discricionário — opcional</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="label">Centro de Custo</label>
          <select value={form.centroCusto} onChange={e => setForm({...form, centroCusto: e.target.value})} className="input-field text-[11px]">
            <option value="estrutura">🏢 Estrutura / Imóvel</option>
            <option value="pessoal">👥 Pessoal / Equipe</option>
            <option value="administrativo">⚙️ Administrativo</option>
            <option value="comercial">📣 Comercial / Mkt</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="label">Descrição do Gasto Coletivo</label>
        <input type="text" value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} className="input-field" placeholder="Ex: Consumo Almoço Equipe" />
      </div>

      <div className="flex bg-[#242424] p-1 rounded-lg border border-[#383838]">
          <button 
            onClick={() => setForm({...form, parcelado: false})}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md ${!form.parcelado ? 'bg-gold text-[#0E0E0E]' : 'text-[#8A8580]'}`}
          >Pagamento Único</button>
          <button 
            onClick={() => setForm({...form, parcelado: true})}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md ${form.parcelado ? 'bg-blue-500 text-white' : 'text-[#8A8580]'}`}
          >Parcelado</button>
      </div>

      {form.parcelado && (
        <div className="space-y-2 bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
           <label className="label text-blue-400">Parcelas</label>
           <input type="number" value={form.parcelas} onChange={e => setForm({...form, parcelas: parseInt(e.target.value)})} className="input-field border-blue-500/30" />
        </div>
      )}

      <div className="pt-4 flex flex-col gap-3">
        <button 
          onClick={handleSave} 
          disabled={isUploading}
          className="btn btn-primary py-4 text-sm tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Sincronizando...
            </>
          ) : 'Gerar Lançamento e Dividir'}
        </button>
        <p className="text-[10px] text-[#8A8580] text-center italic">O valor pago será dividido entre os membros (Gustavo/Ricardo peso 2 se for Aluguel, demais peso 1 ou split igual).</p>
      </div>
    </div>
  );
}

function ModalReceita({ onSave, finance, data }: any) {
  const [form, setForm] = useState(data || {
    data: new Date().toISOString().split('T')[0],
    valor: '',
    desc: '',
    cat: '',
    membro: '',
    origem: '',
    comprovante: '',
    comprovanteNome: '',
    comprovanteUrl: '',
    comprovantePath: '',
    comprovanteTipo: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 2MB.');
        return;
      }
      
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Formato inválido. Use PNG, JPG ou PDF.');
        return;
      }

      setSelectedFile(file);
      setForm({ ...form, comprovanteNome: file.name, comprovanteTipo: file.type });
    }
  };

  const recalculateCota = (data: string, cat: string, membro: string) => {
    if (cat === 'Mensalidade' && membro) {
      const month = data.substring(0, 7);
      const cota = calcCotaMembro(finance.despesas, membro as any, month);
      setForm((prev: any) => ({
        ...prev,
        data,
        cat,
        membro,
        valor: cota > 0 ? cota.toFixed(2) : prev.valor,
        desc: prev.desc || `Cota Mensal — ${membro}`
      }));
    } else {
      setForm((prev: any) => ({ ...prev, data, cat, membro }));
    }
  };

  const handleDataChange = (data: string) => {
    recalculateCota(data, form.cat, form.membro);
  };

  const handleCatChange = (cat: string) => {
    recalculateCota(form.data, cat, form.membro);
  };

  const handleMembroChange = (membro: string) => {
    recalculateCota(form.data, form.cat, membro);
  };

  const handleSave = async () => {
    if (!form.data || !form.valor || !form.desc || !form.cat) return;
    
    setIsUploading(true);
    let storageFields: any = {};
    const rid = data?.id || uid();

    if (selectedFile) {
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const path = `receitas/${rid}/${timestamp}-${sanitizedName}`;
      
      const { data: uploadData, error } = await finance.uploadArquivo('comprovantes-pix', path, selectedFile);
      
      if (error) {
        alert('Erro ao enviar comprovante: ' + error.message);
        setIsUploading(false);
        return;
      }

      if (uploadData) {
        storageFields = {
          comprovanteUrl: uploadData.publicUrl,
          comprovantePath: uploadData.path,
          comprovanteNome: selectedFile.name,
          comprovanteTipo: selectedFile.type
        };
      }
    }

    const item = {
      ...form,
      id: rid,
      valor: parseFloat(form.valor),
      deleted: false,
      createdAt: data?.createdAt || new Date().toISOString(),
      ...storageFields
    };

    if (data) {
      await finance.updateReceita(item);
    } else {
      await finance.addReceita(item);
    }
    setIsUploading(false);
    onSave();
  };

  return (
    <div className="p-10 space-y-8">
      <div className="font-serif text-2xl font-bold text-[#7ABF8A]">Nova Receita / Entrada</div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label">Quem está pagando?</label>
          <select 
            value={form.membro} 
            onChange={e => handleMembroChange(e.target.value)} 
            className="input-field"
          >
            <option value="">Selecione Membro (ou Externo)</option>
            {MEMBROS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="label">Data</label>
          <input type="date" value={form.data} onChange={e => handleDataChange(e.target.value)} className="input-field" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="label">Comprovante</label>
        <div className="relative h-[42px] border border-[#383838] rounded-xl flex items-center px-4 cursor-pointer hover:border-gold transition-colors overflow-hidden">
          <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
          <Camera size={16} className="text-[#8A8580] mr-2" />
          <span className="text-[11px] text-[#8A8580] truncate">
            {form.comprovanteNome || "Anexar Comprovante"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label flex justify-between">
            Valor (R$)
            {form.cat === 'Mensalidade' && (
              <span className="text-[9px] text-gold uppercase font-bold">Cota Auto-calculada</span>
            )}
          </label>
          <input 
            type="number" 
            step="0.01" 
            value={form.valor} 
            onChange={e => setForm({...form, valor: e.target.value})} 
            className="input-field font-serif font-bold text-lg" 
            placeholder="0,00" 
          />
        </div>
        <div className="space-y-2">
          <label className="label">Categoria</label>
          <select value={form.cat} onChange={e => handleCatChange(e.target.value)} className="input-field">
            <option value="">Selecione</option>
            {finance.catsReceita.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="label">Descrição / Referência</label>
        <input type="text" value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} className="input-field" placeholder="Ex: Mensalidade Maio - Ricardo" />
      </div>

      <div className="space-y-2">
        <label className="label">Meio de Recebimento / Origem</label>
        <input type="text" value={form.origem} onChange={e => setForm({...form, origem: e.target.value})} className="input-field" placeholder="Ex: Pix Itau" />
      </div>

      <div className="pt-2">
        <button 
          onClick={handleSave} 
          disabled={isUploading}
          className="btn bg-[#7ABF8A] text-[#0E0E0E] w-full py-4 text-sm tracking-widest uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-[#0E0E0E]/20 border-t-[#0E0E0E] rounded-full animate-spin" />
              Sincronizando...
            </>
          ) : 'Confirmar Entrada'}
        </button>
        {form.cat === 'Mensalidade' && (
           <p className="text-[10px] text-[#8A8580] text-center italic mt-3">
             Este valor de {fmt(parseFloat(form.valor || '0'))} foi calculado com base nas regras de rateio de despesas do mês.
           </p>
        )}
      </div>
    </div>
  );
}

function ModalBaixa({ onSave, finance, data }: any) {
  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    forma: 'Pix',
    obs: '',
    comprovante: '',
    comprovanteNome: '',
    comprovanteUrl: '',
    comprovantePath: '',
    comprovanteTipo: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 2MB.');
        return;
      }
      
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Formato inválido. Use PNG, JPG ou PDF.');
        return;
      }

      setSelectedFile(file);
      setForm({ ...form, comprovanteNome: file.name, comprovanteTipo: file.type });
    }
  };

  const handleBaixa = async () => {
    setIsUploading(true);
    let storageFields: any = {};

    if (selectedFile) {
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const compId = data.comps[0]?.id || 'unknown';
      const path = `compensacoes/${compId}/${timestamp}-${sanitizedName}`;
      
      const { data: uploadData, error } = await finance.uploadArquivo('comprovantes-pix', path, selectedFile);
      
      if (error) {
        alert('Erro ao enviar comprovante: ' + error.message);
        setIsUploading(false);
        return;
      }

      if (uploadData) {
        storageFields = {
          comprovanteUrl: uploadData.publicUrl,
          comprovantePath: uploadData.path,
          comprovanteNome: selectedFile.name,
          comprovanteTipo: selectedFile.type,
          statusConferencia: 'pendente'
        };
      }
    }

    for (const c of data.comps) {
      await finance.updateCompensacao({ 
        ...c, 
        pago: true, 
        pagoEm: form.data, 
        formaPag: form.forma, 
        obsPag: form.obs,
        comprovante: selectedFile ? null : (form.comprovante || c.comprovante), 
        comprovanteNome: selectedFile ? storageFields.comprovanteNome : (form.comprovanteNome || c.comprovanteNome),
        comprovanteUrl: storageFields.comprovanteUrl || c.comprovanteUrl,
        comprovantePath: storageFields.comprovantePath || c.comprovantePath,
        comprovanteTipo: storageFields.comprovanteTipo || c.comprovanteTipo,
        statusConferencia: (selectedFile || form.comprovante) ? 'pendente' : (c.statusConferencia || 'pendente'),
        observacaoConferencia: null,
        confirmadoPor: null,
        confirmadoEm: null
      });
    }
    setIsUploading(false);
    onSave();
  };

  const aPagar = data.comps.filter((c: any) => c.de === data.de).reduce((acc: number, c: any) => acc + c.valor, 0);
  const aReceber = data.comps.filter((c: any) => c.de === data.para).reduce((acc: number, c: any) => acc + c.valor, 0);
  const total = aPagar - aReceber;

  return (
    <div className="p-10 space-y-8">
      <div className="flex flex-col items-center text-center gap-2">
         <div className="p-3 bg-gold/10 rounded-full text-gold mb-2">
           <FileCheck size={32} />
         </div>
         <h3 className="font-serif text-2xl font-bold">Liquidando Dívida</h3>
         <p className="text-sm text-[#8A8580] max-w-sm">
           Confirmando que <span className="text-white font-bold">{data.de}</span> pagou para <span className="text-white font-bold">{data.para}</span> o valor correspondente a todas as pendências agrupadas.
         </p>
      </div>

      <div className="card bg-[#242424] border-gold/20 flex items-center justify-between py-4">
         <span className="text-[10px] uppercase tracking-widest font-bold text-[#8A8580]">Valor Total Liquidado</span>
         <span className="text-3xl font-serif font-bold text-gold">{fmt(total)}</span>
      </div>

      <div className="space-y-4 bg-[#242424] border border-[#383838] p-5 rounded-2xl">
         <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8580] flex items-center gap-2">
            <CardIcon size={14} className="text-gold" />
            Dados para pagamento PIX
         </h4>
         
         <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
               <span className="text-[#8A8580]">Receber:</span>
               <span className="font-bold text-white">{data.para}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
               <span className="text-[#8A8580]">Valor:</span>
               <span className="font-bold text-gold">{fmt(total)}</span>
            </div>
            
            <div className="pt-2 border-t border-[#383838]">
               <p className="text-[10px] text-[#8A8580] font-bold uppercase tracking-widest mb-1.5">Chave PIX ({data.para})</p>
               {finance.pixChaves?.[data.para] ? (
                 <div className="flex items-center gap-2">
                    <div className="flex-1 bg-black/30 p-3 rounded-lg border border-[#383838] font-mono text-[11px] text-gold truncate">
                       {finance.pixChaves[data.para]}
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(finance.pixChaves[data.para]);
                        alert('Chave PIX copiada!');
                      }}
                      className="p-3 bg-gold/10 border border-gold/20 rounded-lg text-gold hover:bg-gold hover:text-[#0E0E0E] transition-all"
                      title="Copiar Chave PIX"
                    >
                      <Copy size={16} />
                    </button>
                 </div>
               ) : (
                 <p className="text-[10px] text-[#E07070] italic font-medium">Este membro ainda não possui chave PIX cadastrada.</p>
               )}
            </div>
         </div>
         
         <p className="text-[9px] text-[#8A8580] italic">Copie a chave PIX, realize o pagamento no seu banco e depois anexe o comprovante abaixo.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label">Data do Pagamento</label>
          <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="input-field" />
        </div>
        <div className="space-y-2">
          <label className="label">Forma de Pagamento</label>
          <select value={form.forma} onChange={e => setForm({...form, forma: e.target.value})} className="input-field">
            {['Pix', 'Dinheiro', 'Transferência', 'Cartão Débito', 'Cartão Crédito', 'Outro'].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
         <label className="label">Comprovante (Opcional)</label>
         <div className="relative h-24 border-2 border-dashed border-[#383838] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-gold transition-colors group">
            <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            {form.comprovanteNome ? (
              <p className="text-xs text-gold flex items-center gap-2 font-bold"><Upload size={14} /> {form.comprovanteNome}</p>
            ) : (
              <>
                <Camera size={24} className="text-[#383838] group-hover:text-gold mb-2" />
                <p className="text-[10px] text-[#8A8580] font-bold uppercase tracking-wider">Clique ou arraste um arquivo</p>
              </>
            )}
         </div>
      </div>

      <div className="space-y-2">
        <label className="label">Observações</label>
        <textarea value={form.obs} onChange={e => setForm({...form, obs: e.target.value})} className="input-field h-24 resize-none" placeholder="Opcional..." />
      </div>

      <button 
        onClick={handleBaixa} 
        disabled={isUploading}
        className="btn bg-[#7ABF8A] text-[#0E0E0E] w-full py-4 text-sm tracking-widest uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isUploading ? (
          <>
            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            Sincronizando...
          </>
        ) : 'Confirmar Quitação'}
      </button>
    </div>
  );
}

function ModalDelete({ onSave, finance, data }: any) {
  const [motivo, setMotivo] = useState('');

  const handleDelete = async () => {
    if (!motivo.trim()) return;
    const now = new Date().toISOString();
    
    if (data.type === 'despesa') {
      await finance.updateDespesa({ ...data.item, deleted: true, deletedAt: now, deletedMotivo: motivo });
    } else if (data.type === 'pagamento') {
      await finance.updatePagamento({ ...data.item, deleted: true, deletedAt: now, deletedMotivo: motivo });
      // Se deletar pagamento, compensações associadas devem sumir
      for (const c of finance.compensacoes) {
        if (c.pagamentoId === data.item.id) {
          await finance.updateCompensacao({ ...c, deleted: true });
        }
      }
    } else {
      await finance.updateReceita({ ...data.item, deleted: true, deletedAt: now, deletedMotivo: motivo });
    }
    onSave();
  };

  return (
    <div className="p-10 space-y-8">
       <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-[#E07070]/10 border border-[#E07070]/20 rounded-full flex items-center justify-center text-[#E07070]">
             <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-2xl font-bold">Confirmar Exclusão</h3>
            <p className="text-sm text-[#8A8580]">Ao confirmar, o registro será mantido na base mas marcado como cancelado. Justificativa é obrigatória.</p>
          </div>
       </div>

       <div className="space-y-2">
          <label className="label text-[#E07070]">Motivo do Cancelamento</label>
          <textarea 
            value={motivo} 
            onChange={e => setMotivo(e.target.value)} 
            placeholder="Ex: Lançamento em duplicidade..." 
            className="input-field h-32 border-[#E07070]/20 focus:border-[#E07070]"
          />
       </div>

       <div className="flex gap-4">
          <button onClick={onSave} className="btn btn-ghost flex-1">Manter Registro</button>
          <button onClick={handleDelete} className="btn btn-danger flex-1">Confirmar Exclusão</button>
       </div>
    </div>
  );
}
