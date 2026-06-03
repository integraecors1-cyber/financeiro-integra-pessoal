import { Compensacao, Membro, Pagamento, Despesa, Receita } from './types';
import { MEMBROS } from './constants';
import { uid } from './utils';

export function isAluguel(cat: string): boolean {
  return cat?.toLowerCase().includes('aluguel');
}

export function getPesoMembro(membro: Membro, cat: string): number {
  if (isAluguel(cat)) {
    return (membro === 'Gustavo' || membro === 'Ricardo') ? 2 : 1;
  }
  return 1;
}

export function calcParteMembro(valor: number, cat: string, membro: Membro): number {
  if (isAluguel(cat)) {
    // Total pesos = 1 + 2 + 1 + 1 + 1 + 2 = 8
    const totalPesos = 8;
    const peso = getPesoMembro(membro, cat);
    return (valor / totalPesos) * peso;
  }
  return valor / 6;
}

export function calcCotaMembro(despesas: Despesa[], membro: Membro, mesFiltro: string): number {
  return despesas
    .filter(d => !d.deleted && d.data.startsWith(mesFiltro))
    .reduce((acc, d) => acc + calcParteMembro(d.valor, d.cat, membro), 0);
}

export function calcTotalCotaPaga(receitas: Receita[], membro: Membro, mesFiltro: string): number {
  return receitas
    .filter(r => !r.deleted && r.cat === 'Mensalidade' && r.membro === membro && r.data.startsWith(mesFiltro))
    .reduce((acc, r) => acc + r.valor, 0);
}

export interface FinanceiroResumo {
  cotaEsperada: number;
  totalJaPagoCota: number;
  saldoCota: number;
  totalCompsPendentes: number;
  balanceAcertoOutros: number;
  saldoFinalConsolidado: number;
}

export function calcResumoFinanceiroMembro(finance: any, membro: Membro, mesFiltro: string): FinanceiroResumo {
  const cotaEsperada = calcCotaMembro(finance.despesas, membro, mesFiltro);
  const totalJaPagoCota = calcTotalCotaPaga(finance.receitas, membro, mesFiltro);
  const saldoCota = totalJaPagoCota - cotaEsperada;

  const compsDevidas = finance.compensacoes
    .filter((c: any) => !c.deleted && c.de === membro && c.data.startsWith(mesFiltro));
  const totalCompsPendentes = compsDevidas.filter((c: any) => !c.pago).reduce((acc: number, c: any) => acc + c.valor, 0);

  const netBalances = calcNetBalance(finance.compensacoes, finance.pagamentos, mesFiltro);
  const balanceAcertoOutros = netBalances[membro] || 0;

  return {
    cotaEsperada,
    totalJaPagoCota,
    saldoCota,
    totalCompsPendentes,
    balanceAcertoOutros,
    saldoFinalConsolidado: saldoCota + balanceAcertoOutros
  };
}

export function geraCompensacoes(pagamentoId: string, pagador: Membro, valor: number, data: string, cat?: string): Compensacao[] {
  const comps: Compensacao[] = [];
  const category = cat || '';

  MEMBROS.filter(m => m !== pagador).forEach(m => {
    comps.push({
      id: uid(),
      de: m,
      para: pagador,
      valor: calcParteMembro(valor, category, m),
      data,
      pagamentoId,
      pago: false
    });
  });
  
  return comps;
}

export function calcSaldosBrutos(compensacoes: Compensacao[], pagamentos: Pagamento[], mesFiltro?: string): Compensacao[] {
  const pagsFiltrados = pagamentos.filter(p => !p.deleted && (!mesFiltro || p.data.substring(0, 7) === mesFiltro));
  const ids = new Set(pagsFiltrados.map(p => p.id));
  return compensacoes.filter(c => ids.has(c.pagamentoId) && !c.deleted);
}

export function calcNetBalance(compensacoes: Compensacao[], pagamentos: Pagamento[], mesFiltro?: string): Record<Membro, number> {
  const comps = calcSaldosBrutos(compensacoes, pagamentos, mesFiltro);
  const net: Record<string, number> = {};
  MEMBROS.forEach(m => net[m] = 0);
  comps.forEach(c => {
    if (!c.pago) {
      net[c.de] -= c.valor;
      net[c.para] += c.valor;
    }
  });
  return net as Record<Membro, number>;
}

export function calcPixMinimos(compensacoes: Compensacao[], pagamentos: Pagamento[], mesFiltro?: string) {
  const comps = calcSaldosBrutos(compensacoes, pagamentos, mesFiltro).filter(c => !c.pago);
  const saldo: Record<string, Record<string, number>> = {};
  
  MEMBROS.forEach(a => { 
    saldo[a] = {}; 
    MEMBROS.forEach(b => saldo[a][b] = 0); 
  });
  
  comps.forEach(c => { 
    saldo[c.de][c.para] += c.valor; 
  });
  
  // Netear pares
  MEMBROS.forEach((a, i) => {
    MEMBROS.forEach((b, j) => {
      if (i < j) {
        const net = saldo[a][b] - saldo[b][a];
        if (net > 0.01) { 
          saldo[a][b] = net; 
          saldo[b][a] = 0; 
        } else if (net < -0.01) { 
          saldo[b][a] = -net; 
          saldo[a][b] = 0; 
        } else { 
          saldo[a][b] = 0; 
          saldo[b][a] = 0; 
        }
      }
    });
  });
  
  return MEMBROS.flatMap(a => 
    MEMBROS.filter(b => saldo[a][b] > 0.01).map(b => ({ de: a, para: b, valor: saldo[a][b] }))
  );
}
