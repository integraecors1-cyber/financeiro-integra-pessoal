import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Users, Wallet, Receipt, CreditCard, Scale, ChevronLeft, ChevronRight } from 'lucide-react';
import { fmt } from '@/lib/utils';
import { calcNetBalance, calcResumoFinanceiroMembro } from '@/lib/calculations';
import { MEMBROS } from '@/lib/constants';

function yyyymm(date: Date) {
  return date.toISOString().substring(0, 7);
}

function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return yyyymm(d);
}

function labelMes(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function Dashboard({ finance, onSelectMember }: any) {
  const hoje = yyyymm(new Date());
  const [mesSelecionado, setMesSelecionado] = useState(hoje);
  const isHoje = mesSelecionado === hoje;

  const totalReceitas = useMemo(() =>
    finance.receitas
      .filter((r: any) => !r.deleted && r.data.startsWith(mesSelecionado))
      .reduce((acc: number, r: any) => acc + r.valor, 0)
  , [finance.receitas, mesSelecionado]);

  const totalDespesas = useMemo(() =>
    finance.despesas
      .filter((d: any) => !d.deleted && d.data.startsWith(mesSelecionado))
      .reduce((acc: number, d: any) => acc + d.valor, 0)
  , [finance.despesas, mesSelecionado]);

  const totalPagamentos = useMemo(() =>
    finance.pagamentos
      .filter((p: any) => !p.deleted && p.data.startsWith(mesSelecionado))
      .reduce((acc: number, p: any) => acc + p.valor, 0)
  , [finance.pagamentos, mesSelecionado]);

  const stats = useMemo(() => [
    { label: 'Custo Escritório', value: totalDespesas, icon: Receipt, color: 'text-orange-400' },
    { label: 'Receitas', value: totalReceitas, icon: TrendingUp, color: 'text-[#7ABF8A]' },
    { label: 'Sobra Mensal', value: totalReceitas - totalDespesas, icon: Scale, color: 'text-gold-light' },
    { label: 'Total Pagamentos', value: totalPagamentos, icon: CreditCard, color: 'text-blue-400' },
  ], [totalDespesas, totalReceitas, totalPagamentos]);

  return (
    <div className="space-y-8">

      {/* Seletor de mês */}
      <div className="flex items-center justify-between bg-[#1A1A1A] border border-[#383838] rounded-2xl px-5 py-3">
        <button
          onClick={() => setMesSelecionado(m => addMonths(m, -1))}
          className="p-1.5 rounded-lg hover:bg-[#242424] text-[#8A8580] hover:text-gold transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#F0EDE8] capitalize">{labelMes(mesSelecionado)}</span>
          {!isHoje && (
            <button
              onClick={() => setMesSelecionado(hoje)}
              className="text-[10px] font-bold uppercase tracking-widest text-gold border border-gold/30 rounded-lg px-2 py-0.5 hover:bg-gold/10 transition-colors"
            >
              Hoje
            </button>
          )}
        </div>

        <button
          onClick={() => setMesSelecionado(m => addMonths(m, 1))}
          disabled={isHoje}
          className={`p-1.5 rounded-lg transition-colors ${isHoje ? 'text-[#383838] cursor-not-allowed' : 'hover:bg-[#242424] text-[#8A8580] hover:text-gold'}`}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card group hover:border-gold transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[#242424] rounded-lg group-hover:bg-gold/10 transition-colors">
                <stat.icon size={20} className={stat.color} />
              </div>
              <span className="text-[10px] font-bold text-[#8A8580] uppercase tracking-widest capitalize">
                {labelMes(mesSelecionado)}
              </span>
            </div>
            <p className="text-[#8A8580] text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-serif font-bold">{fmt(stat.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-serif font-bold text-gold flex items-center gap-2">
            <Users size={20} />
            Resumo Financeiro por Membro
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {MEMBROS.map((membro) => {
              const res = calcResumoFinanceiroMembro(finance, membro, mesSelecionado);

              let cotaStatus = 'Pendente';
              let cotaColor = 'text-[#E07070]';
              if (res.saldoCota > 0.01) { cotaStatus = 'Pago a Mais'; cotaColor = 'text-[#7ABF8A]'; }
              else if (res.saldoCota >= -0.01) { cotaStatus = 'Quitado'; cotaColor = 'text-[#7ABF8A]'; }

              return (
                <div
                  key={membro}
                  onClick={() => onSelectMember(membro)}
                  className={`card group hover:border-gold transition-all duration-300 relative overflow-hidden cursor-pointer active:scale-[0.98] ${res.saldoCota >= -0.01 && res.totalCompsPendentes <= 0.01 ? 'border-[#7ABF8A]/20' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#242424] flex items-center justify-center font-bold text-lg text-gold border border-gold/20 group-hover:border-gold/50 transition-colors">
                        {membro[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#F0EDE8] text-lg truncate">{membro}</p>
                        <p className="text-[9px] uppercase text-[#8A8580] tracking-[0.2em] font-bold truncate">Resumo Financeiro</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-tight whitespace-nowrap ${cotaColor.replace('text-', 'bg-').replace(']', ']/10]')} ${cotaColor}`}>
                        Cota: {cotaStatus}
                      </div>
                      {res.totalCompsPendentes > 0.01 && (
                        <div className="px-2 py-1 rounded text-[9px] font-bold uppercase tracking-tight bg-[#E3A008]/10 text-[#E3A008] whitespace-nowrap">
                          Comps: {fmt(res.totalCompsPendentes)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 py-4 border-y border-[#383838]/50">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                      <span className="text-[#8A8580]">Cota do Escritório</span>
                      <span className="text-white">{fmt(res.cotaEsperada)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                      <span className="text-[#8A8580]">Acertos/Compensações</span>
                      <span className={res.balanceAcertoOutros > 0 ? 'text-[#7ABF8A]' : res.balanceAcertoOutros < 0 ? 'text-[#E07070]' : 'text-[#8A8580]'}>
                        {res.balanceAcertoOutros > 0 ? '+' : ''}{fmt(res.balanceAcertoOutros)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] uppercase font-bold tracking-wider pt-2 border-t border-[#383838]/30">
                      <span className="text-gold">Total Esperado</span>
                      <span className="text-gold font-serif text-lg">{fmt(res.cotaEsperada - res.balanceAcertoOutros)}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <p className="text-[9px] text-[#8A8580] uppercase font-bold">Valor Pago (Mensalidade)</p>
                        <p className="text-lg font-serif font-bold text-[#7ABF8A]">{fmt(res.totalJaPagoCota)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <p className={`text-xl font-serif font-bold whitespace-nowrap ${res.saldoFinalConsolidado > 0.01 ? 'text-[#7ABF8A]' : res.saldoFinalConsolidado < -0.01 ? 'text-[#E07070]' : 'text-gold'}`}>
                          {res.saldoFinalConsolidado > 0.01 ? '+' : ''}{fmt(res.saldoFinalConsolidado)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <p className={`text-[9px] uppercase font-bold ${res.saldoFinalConsolidado > 0.01 ? 'text-[#7ABF8A]' : res.saldoFinalConsolidado < -0.01 ? 'text-[#E07070]' : 'text-[#5A5650]'}`}>
                        {res.saldoFinalConsolidado > 0.01 ? 'Crédito' : res.saldoFinalConsolidado < -0.01 ? 'Em Aberto' : 'Quitado'}
                      </p>
                      <div className={`w-1.5 h-1.5 rounded-full ${Math.abs(res.saldoFinalConsolidado) > 0.01 ? 'animate-pulse' : ''} ${res.saldoFinalConsolidado > 0.01 ? 'bg-[#7ABF8A]' : res.saldoFinalConsolidado < -0.01 ? 'bg-[#E07070]' : 'bg-[#5A5650]'}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold text-gold flex items-center gap-2">
            <Receipt size={20} />
            Últimas Operações
          </h3>

          <div className="card p-0 overflow-hidden divide-y divide-[#383838]">
            {[...finance.despesas, ...finance.pagamentos, ...finance.receitas]
              .filter(i => !i.deleted)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 6)
              .map((item: any) => (
                <div key={`${item.pagador ? 'pag' : item.origem ? 'rec' : 'desp'}-${item.id}`} className="p-4 flex items-center justify-between hover:bg-[#242424] transition-colors cursor-default">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.pagador ? 'bg-gold/10 text-gold' : item.origem ? 'bg-[#7ABF8A]/10 text-[#7ABF8A]' : 'bg-[#E07070]/10 text-[#E07070]'}`}>
                      {item.pagador ? <CreditCard size={14} /> : item.origem ? <TrendingUp size={14} /> : <Receipt size={14} />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-[#F0EDE8] truncate max-w-[120px]">{item.desc}</p>
                      <p className="text-[10px] text-[#8A8580] uppercase tracking-wider">{new Date(item.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-serif font-bold">{fmt(item.valor)}</p>
                    <p className="text-[9px] text-[#8A8580] font-bold uppercase tracking-tighter">{item.cat}</p>
                  </div>
                </div>
              ))}

            {(finance.despesas.length + finance.pagamentos.length + finance.receitas.length === 0) && (
              <div key="empty-ops" className="p-8 text-center">
                <p className="text-xs text-[#8A8580] italic">Nenhuma operação registrada ainda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
