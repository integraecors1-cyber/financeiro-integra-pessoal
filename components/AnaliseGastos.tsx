import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Target, 
  Layers, 
  History, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Info,
  Calendar,
  Filter,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { fmt } from '@/lib/utils';
import { motion } from 'motion/react';

export default function AnaliseGastos({ finance }: any) {
  const [periodoMode, setPeriodoMode] = useState<'mensal' | 'acumulado'>('mensal');
  const [mesRef, setMesRef] = useState(new Date().toISOString().substring(0, 7));
  
  // Filtros de registros ativos (despesas + pagamentos integrais)
  const registrosAtivos = useMemo(() => [
    ...finance.despesas.filter((d: any) => !d.deleted),
    ...finance.pagamentos.filter((p: any) => !p.deleted)
  ], [finance.despesas, finance.pagamentos]);

  const filtradas = useMemo(() => {
    if (periodoMode === 'mensal') {
      return registrosAtivos.filter((d: any) => d.data.startsWith(mesRef));
    }
    return registrosAtivos;
  }, [registrosAtivos, periodoMode, mesRef]);

  // Bloco 1: Composição Geral
  const totalFixo = filtradas.filter((d: any) => d.natureza === 'fixo').reduce((acc: number, d: any) => acc + d.valor, 0);
  const totalVariavel = filtradas.filter((d: any) => d.natureza === 'variavel').reduce((acc: number, d: any) => acc + d.valor, 0);
  const totalEventual = filtradas.filter((d: any) => d.natureza === 'eventual').reduce((acc: number, d: any) => acc + d.valor, 0);
  const totalGeral = totalFixo + totalVariavel + totalEventual;

  const getPct = (val: number) => totalGeral > 0 ? (val / totalGeral) * 100 : 0;

  // Bloco 2: Essencialidade
  const porEssencialidade = [
    { label: 'Essencial', color: 'bg-[#E07070]', key: 'essencial', desc: 'Crítico para operação' },
    { label: 'Operacional', color: 'bg-gold', key: 'operacional', desc: 'Manutenção / Suporte' },
    { label: 'Discricionário', color: 'bg-[#7ABF8A]', key: 'discricionario', desc: 'Pode ser reduzido' },
  ].map(item => {
    const total = filtradas.filter((d: any) => d.essencialidade === item.key).reduce((acc: number, d: any) => acc + d.valor, 0);
    return { ...item, total, pct: getPct(total) };
  });

  // Bloco 3: Centro de Custo
  const porCentro = [
    { label: 'Estrutura', icon: '🏢', key: 'estrutura' },
    { label: 'Pessoal', icon: '👥', key: 'pessoal' },
    { label: 'Administrativo', icon: '⚙️', key: 'administrativo' },
    { label: 'Comercial', icon: '📣', key: 'comercial' },
  ].map(item => {
    const total = filtradas.filter((d: any) => d.centroCusto === item.key).reduce((acc: number, d: any) => acc + d.valor, 0);
    return { ...item, total, pct: getPct(total) };
  });

  // Bloco 4: Evolução Mensal (Últimos 12 meses)
  const evolucao = useMemo(() => {
    const meses = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date();
        d.setDate(1); // Evitar problemas com dias 31 em meses curtos
        d.setMonth(d.getMonth() - i);
        const mStr = d.toISOString().substring(0, 7);
        
        const mesOps = registrosAtivos.filter((op: any) => op.data.startsWith(mStr));
        const fixo = mesOps.filter((o: any) => o.natureza === 'fixo').reduce((s: number, o: any) => s + o.valor, 0);
        const var_ = mesOps.filter((o: any) => o.natureza === 'variavel').reduce((s: number, o: any) => s + o.valor, 0);
        const eve = mesOps.filter((o: any) => o.natureza === 'eventual').reduce((s: number, o: any) => s + o.valor, 0);
        
        meses.push({
          label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase(),
          fixo,
          variavel: var_,
          eventual: eve,
          total: fixo + var_ + eve
        });
    }
    return meses.reverse();
  }, [registrosAtivos]);

  // Bloco 5: Alertas de Gestão
  const alertas = useMemo(() => {
    const list = [];
    
    // Alerta 1: Aumento de Variáveis (comparar com mês anterior)
    if (evolucao.length >= 2) {
      const atual = evolucao[evolucao.length - 1].variavel;
      const anterior = evolucao[evolucao.length - 2].variavel;
      if (atual > anterior * 1.1 && anterior > 0) {
        list.push({
          tipo: 'danger',
          titulo: 'Custo Variável em Elevação',
          msg: `Os gastos variáveis subiram ${((atual/anterior - 1)*100).toFixed(0)}% este mês. Identifique desperdícios ou picos atípicos.`
        });
      }
    }

    // Alerta 2: Gastos Discricionários altos
    const disc = porEssencialidade.find(e => e.key === 'discricionario');
    if (disc && disc.pct > 25) {
      list.push({
        tipo: 'warning',
        titulo: 'Oportunidade de Enxugamento',
        msg: `Os gastos discricionários atingiram ${disc.pct.toFixed(0)}%. Em caso de crise, reduza 50% destes custos para oxigenar o caixa.`
      });
    }

    // Alerta 3: Custos Fixos Estáveis
    const fixoPct = getPct(totalFixo);
    if (fixoPct > 60) {
      list.push({
        tipo: 'info',
        titulo: 'Fidelidade de Custos Fixos',
        msg: `Sua estrutura é pesada (${fixoPct.toFixed(0)}% fixo). Mantenha as cobranças em dia para garantir a cobertura operacional básica.`
      });
    }

    // Alerta 4: Equilíbrio Operacional
    const totalReceitas = finance.receitas.filter((r: any) => !r.deleted && r.data.startsWith(mesRef)).reduce((s: number, r: any) => s + r.valor, 0);
    if (totalGeral > totalReceitas && totalReceitas > 0) {
      list.push({
        tipo: 'critical',
        titulo: 'Saldo Operacional Negativo',
        msg: 'As despesas superaram as receitas no período selecionado. O escritório depende de reservas ou aportes.'
      });
    }

    return list;
  }, [evolucao, porEssencialidade, totalFixo, totalGeral, finance.receitas, mesRef, getPct]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header com Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 bg-[#1A1A1A] p-1 rounded-xl border border-[#383838]">
          <button 
            onClick={() => setPeriodoMode('mensal')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${periodoMode === 'mensal' ? 'bg-gold text-[#0E0E0E]' : 'text-[#8A8580] hover:text-white'}`}
          >Por Mês</button>
          <button 
            onClick={() => setPeriodoMode('acumulado')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${periodoMode === 'acumulado' ? 'bg-gold text-[#0E0E0E]' : 'text-[#8A8580] hover:text-white'}`}
          >Todo Período</button>
        </div>

        {periodoMode === 'mensal' && (
          <div className="flex items-center gap-3">
             <Calendar size={18} className="text-gold" />
             <input 
              type="month" 
              value={mesRef} 
              onChange={e => setMesRef(e.target.value)}
              className="bg-[#1A1A1A] border border-[#383838] rounded-xl px-4 py-2 text-gold font-bold focus:outline-none focus:border-gold/50"
             />
          </div>
        )}
      </div>

      {/* Bloco 1: Composição Geral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card border-l-4 border-l-blue-500">
           <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase font-bold text-[#8A8580] tracking-widest">Gastos Fixos</p>
              <Info size={14} className="text-[#383838]" />
           </div>
           <p className="text-3xl font-serif font-bold text-white mb-1">{fmt(totalFixo)}</p>
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-500">{getPct(totalFixo).toFixed(1)}%</span>
              <span className="text-[9px] text-[#5A5650] uppercase font-bold">do volume total</span>
           </div>
        </div>

        <div className="card border-l-4 border-l-orange-500">
           <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase font-bold text-[#8A8580] tracking-widest">Gastos Variáveis</p>
              <Info size={14} className="text-[#383838]" />
           </div>
           <p className="text-3xl font-serif font-bold text-white mb-1">{fmt(totalVariavel)}</p>
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-orange-500">{getPct(totalVariavel).toFixed(1)}%</span>
              <span className="text-[9px] text-[#5A5650] uppercase font-bold">do volume total</span>
           </div>
        </div>

        <div className="card border-l-4 border-l-purple-500">
           <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase font-bold text-[#8A8580] tracking-widest">Gastos Eventuais</p>
              <Info size={14} className="text-[#383838]" />
           </div>
           <p className="text-3xl font-serif font-bold text-white mb-1">{fmt(totalEventual)}</p>
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-500">{getPct(totalEventual).toFixed(1)}%</span>
              <span className="text-[9px] text-[#5A5650] uppercase font-bold">do volume total</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bloco 2: Essencialidade */}
        <div className="space-y-6">
           <div className="flex items-center gap-2">
              <Target size={20} className="text-gold" />
              <h3 className="font-serif text-xl font-bold">Perfil de Essencialidade</h3>
           </div>
           
           <div className="card space-y-6">
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-[#242424]">
                 {porEssencialidade.map(item => (
                   <div 
                    key={item.key} 
                    style={{ width: `${item.pct}%` }} 
                    className={`${item.color} h-full transition-all duration-500`}
                    title={`${item.label}: ${item.pct.toFixed(0)}%`}
                   />
                 ))}
              </div>

              <div className="grid grid-cols-1 gap-4">
                 {porEssencialidade.map(item => (
                   <div key={item.key} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                         <div className={`w-2 h-8 rounded-full ${item.color} flex-shrink-0`} />
                         <div>
                            <p className="text-xs font-bold text-[#F0EDE8]">{item.label}</p>
                            <p className="text-[9px] text-[#8A8580] uppercase tracking-wider">{item.desc}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-sm font-bold text-white">{fmt(item.total)}</p>
                         <p className="text-[10px] font-bold text-gold">{item.pct.toFixed(1)}%</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Bloco 3: Centro de Custo */}
        <div className="space-y-6">
           <div className="flex items-center gap-2">
              <Layers size={20} className="text-gold" />
              <h3 className="font-serif text-xl font-bold">Alocação por Centro de Custo</h3>
           </div>

           <div className="grid grid-cols-2 gap-4">
              {porCentro.map(item => (
                <div key={item.key} className="card p-5 group hover:border-gold/30 transition-all">
                   <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded">{item.pct.toFixed(0)}%</span>
                   </div>
                   <p className="text-[#8A8580] text-[9px] uppercase font-bold tracking-widest">{item.label}</p>
                   <p className="text-lg font-serif font-bold text-white mt-0.5">{fmt(item.total)}</p>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Bloco 4: Evolução Mensal */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <History size={20} className="text-gold" />
          <h3 className="font-serif text-xl font-bold">Evolução Mensal (Natureza do Gasto)</h3>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="text-left">Período</th>
                  <th className="text-center">Fixo</th>
                  <th className="text-center">Variável</th>
                  <th className="text-center">Eventual</th>
                  <th className="text-right">Total Mensal</th>
                </tr>
              </thead>
              <tbody>
                {evolucao.map((mes, idx) => (
                  <tr key={mes.label} className={idx === evolucao.length - 1 ? 'bg-gold/5' : ''}>
                    <td className="font-bold text-gold/80">{mes.label}</td>
                    <td className="text-center text-blue-400/80 text-xs font-medium">{fmt(mes.fixo)}</td>
                    <td className="text-center text-orange-400/80 text-xs font-medium">{fmt(mes.variavel)}</td>
                    <td className="text-center text-purple-400/80 text-xs font-medium">{fmt(mes.eventual)}</td>
                    <td className="text-right font-serif font-bold text-white">{fmt(mes.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#242424]">
                <tr>
                  <td className="font-bold uppercase tracking-widest text-[10px] text-[#8A8580]">Médias 12m</td>
                  <td className="text-center text-xs font-bold text-blue-400">{fmt(evolucao.reduce((a, b) => a + b.fixo, 0) / 12)}</td>
                  <td className="text-center text-xs font-bold text-orange-400">{fmt(evolucao.reduce((a, b) => a + b.variavel, 0) / 12)}</td>
                  <td className="text-center text-xs font-bold text-purple-400">{fmt(evolucao.reduce((a, b) => a + b.eventual, 0) / 12)}</td>
                  <td className="text-right text-lg font-serif font-bold text-gold">{fmt(evolucao.reduce((a, b) => a + b.total, 0) / 12)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Bloco 5: Alertas de Gestão */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-gold" />
          <h3 className="font-serif text-xl font-bold">Insights e Alertas de Gestão</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {alertas.map((alerta, idx) => (
             <div key={idx} className={`p-5 rounded-2xl border flex gap-4 ${
               alerta.tipo === 'critical' ? 'bg-red-500/5 border-red-500/20' : 
               alerta.tipo === 'danger' ? 'bg-orange-500/5 border-orange-500/20' :
               alerta.tipo === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
               'bg-blue-500/5 border-blue-500/20'
             }`}>
                <div className={`mt-1 flex-shrink-0 ${
                  alerta.tipo === 'critical' ? 'text-red-500' : 
                  alerta.tipo === 'danger' ? 'text-orange-500' :
                  alerta.tipo === 'warning' ? 'text-yellow-500' :
                  'text-blue-500'
                }`}>
                  {alerta.tipo === 'critical' ? <AlertCircle size={20} /> : <Info size={20} />}
                </div>
                <div>
                   <h4 className="text-sm font-bold text-[#F0EDE8] mb-1">{alerta.titulo}</h4>
                   <p className="text-xs text-[#8A8580] leading-relaxed">{alerta.msg}</p>
                </div>
             </div>
           ))}
           {alertas.length === 0 && (
             <div className="col-span-full py-10 bg-[#1A1A1A] border border-dashed border-[#383838] rounded-2xl flex flex-col items-center gap-3">
               <ShieldCheck size={32} className="text-[#7ABF8A]" />
               <p className="text-xs text-[#8A8580] italic">Sua gestão financeira está operando dentro dos parâmetros de segurança.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
