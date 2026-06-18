import React, { useState, useMemo, useRef } from 'react';
import { FileText, Download, User, Users, TrendingUp, AlertCircle, Scale, Receipt, CheckCircle2, ArrowUpRight, ArrowDownLeft, Printer, Briefcase } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { fmt, fmtDate } from '@/lib/utils';
import { MEMBROS, MESES } from '@/lib/constants';
import { calcParteMembro, calcResumoFinanceiroMembro } from '@/lib/calculations';

type TabType = 'individual' | 'mensal' | 'anual';

// --- SUB-COMPONENTES PARA ORGANIZAÇÃO E KEYS ---

const StatCard = ({ label, value, subtext, icon: Icon, colorClass = "text-gold" }: any) => (
  <div className="bg-[#141414] border border-[#242424] p-6 rounded-2xl space-y-2">
    <p className="text-[10px] uppercase font-bold text-[#8A8580] tracking-widest flex items-center gap-2">
      {Icon && <Icon size={12} className={colorClass} />} {label}
    </p>
    <p className={`text-3xl font-serif font-bold ${colorClass.startsWith('text-') ? colorClass : 'text-white'}`}>{value}</p>
    {subtext && <p className="text-[9px] text-[#5A5650] italic">{subtext}</p>}
  </div>
);

const ReportTable = ({ title, headers, rows, footer, emptyMessage, colorBorder = "border-gold" }: any) => (
  <div className="space-y-6">
    <h3 className={`text-xl font-serif font-bold border-l-4 ${colorBorder} pl-4 text-[#F0EDE8]`}>{title}</h3>
    <div className="overflow-hidden border border-[#242424] rounded-xl bg-[#0E0E0E]">
      <table className="w-full text-left">
        <thead className="bg-[#1A1A1A] border-b border-[#242424]">
          <tr>
            {headers.map((h: string, i: number) => (
              <th key={i} className="px-6 py-3 text-[10px] uppercase font-bold text-[#8A8580]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#242424]">
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="px-6 py-12 text-center text-xs text-[#5A5650] italic">{emptyMessage}</td></tr>
          ) : (
            rows.map((row: any, i: number) => (
              <tr key={row.id || i}>
                {row.cells.map((cell: any, j: number) => (
                  <td key={j} className={`px-6 py-4 text-xs ${cell.className || 'text-[#8A8580]'}`}>{cell.content}</td>
                ))}
              </tr>
            ))
          )}
          {footer && (
            <tr className="bg-[#141414]">
              <td colSpan={headers.length - 1} className="px-6 py-4 text-xs font-bold text-[#8A8580] uppercase">{footer.label}</td>
              <td className={`px-6 py-4 text-lg font-serif font-bold text-right ${footer.colorClass || 'text-gold'}`}>{footer.value}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---

const StatusBadge = ({ pago }: { pago: boolean }) => (
  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${pago ? 'bg-[#7ABF8A]/10 text-[#7ABF8A]' : 'bg-[#E3A008]/10 text-[#E3A008]'}`}>
    {pago ? '✅ Pago' : '⏳ Pendente'}
  </span>
);

export default function Relatorios({ finance }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('mensal');
  const [filtros, setFiltros] = useState({
    membro: MEMBROS[0],
    mes: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    ano: new Date().getFullYear().toString()
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const reportData = useMemo(() => {
    const { membro, mes, ano } = filtros;
    const periodPrefix = activeTab === 'anual' ? ano : (mes === 'all' ? ano : `${ano}-${mes}`);

    const filterFn = (items: any[]) => items.filter((item: any) => !item.deleted && item.data.startsWith(periodPrefix));
    
    const despAtivas = filterFn(finance.despesas);
    const pagAtivos = filterFn(finance.pagamentos);
    const receitasAtivas = filterFn(finance.receitas);
    
    const deletados = [
      ...finance.despesas.filter((d: any) => d.deleted && d.data.startsWith(periodPrefix)).map((d: any) => ({ ...d, type: 'Despesa' })),
      ...finance.pagamentos.filter((p: any) => p.deleted && p.data.startsWith(periodPrefix)).map((p: any) => ({ ...p, type: 'Pagamento' })),
      ...finance.receitas.filter((r: any) => r.deleted && r.data.startsWith(periodPrefix)).map((r: any) => ({ ...r, type: 'Receita' }))
    ];

    // Cálculos Individuais
    const res = calcResumoFinanceiroMembro(finance, membro as any, periodPrefix);

    const parteDespSimples = despAtivas.reduce((s: number, d: any) => s + calcParteMembro(d.valor, d.cat, membro as any), 0);
    const pagFez = pagAtivos.filter(p => p.pagador === membro);
    const totalAdiantado = pagFez.reduce((s: number, p: any) => s + p.valor, 0);
    
    // Total a receber dos outros 5 membros
    const totalAReceber = pagFez.reduce((s: number, p: any) => {
      const meuGasto = calcParteMembro(p.valor, p.cat, membro as any);
      return s + (p.valor - meuGasto);
    }, 0);

    const pagOutros = pagAtivos.filter(p => p.pagador !== membro);
    const parteIntegrais = pagOutros.reduce((s: number, p: any) => s + calcParteMembro(p.valor, p.cat, membro as any), 0);
    const individualComps = finance.compensacoes.filter((c: any) => !c.deleted && (c.de === membro || c.para === membro) && (activeTab === 'anual' || c.data.startsWith(periodPrefix)));
    const individualDeve = individualComps.filter((c: any) => c.de === membro);
    const individualReceber = individualComps.filter((c: any) => c.para === membro);
    const pendenteDeve = individualDeve.filter((c: any) => !c.pago).reduce((s: number, c: any) => s + c.valor, 0);
    const pendenteReceber = individualReceber.filter((c: any) => !c.pago).reduce((s: number, c: any) => s + c.valor, 0);
    const saldoLiquidoIndividual = individualReceber.reduce((s: number, c: any) => s + c.valor, 0) - individualDeve.reduce((s: number, c: any) => s + c.valor, 0);

    // Cálculos Coletivos
    const totalReceitas = receitasAtivas.reduce((s: number, r: any) => s + r.valor, 0);
    const totalDespesasIntegris = pagAtivos.reduce((s: number, p: any) => s + p.valor, 0);
    const totalDespesasSimples = despAtivas.reduce((s: number, d: any) => s + d.valor, 0);
    const totalDespesas = totalDespesasIntegris + totalDespesasSimples;

    const compsAtivas = finance.compensacoes.filter((c: any) => !c.deleted && c.data.startsWith(periodPrefix));
    const totalCompPagas = compsAtivas.filter((c: any) => c.pago).reduce((s: number, c: any) => s + c.valor, 0);
    const totalCompPendente = compsAtivas.filter((c: any) => !c.pago).reduce((s: number, c: any) => s + c.valor, 0);

    const hashSeed = JSON.stringify(filtros) + activeTab + (finance.despesas.length + finance.pagamentos.length + finance.receitas.length);
    let h = 0;
    for (let i = 0; i < hashSeed.length; i++) h = Math.imul(31, h) + hashSeed.charCodeAt(i) | 0;
    const hash = Math.abs(h).toString(36).toUpperCase().padStart(8, '0');

    return {
      despAtivas, pagAtivos, receitasAtivas, deletados, hash, compsAtivas,
      individual: { 
        parteDespSimples, totalAdiantado, totalAReceber, parteIntegrais, 
        saldoComp: pendenteReceber - pendenteDeve, saldoLiquidoIndividual,
        pagFez, pagOutros, individualComps, individualDeve, individualReceber 
      },
      coletivo: { totalReceitas, totalDespesas, totalDespesasSimples, totalDespesasIntegris, totalCompPagas, totalCompPendente }
    };
  }, [finance, filtros, activeTab]);

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const el = reportRef.current;
      const width = el.scrollWidth;
      const height = el.scrollHeight;

      // Opções de captura: fundo branco para impressão em papel A4
      const toPngOptions = {
        width,
        height,
        pixelRatio: 2,
        skipFonts: false,
        filter: (node: HTMLElement) => node.tagName !== 'IMG',
        backgroundColor: '#FFFFFF',
        style: {
          overflow:        'visible',
          background:      '#FFFFFF',
          backgroundColor: '#FFFFFF',
          color:           '#1A1A1A',
        },
      };

      // Primeira chamada: aquece cache de fontes/recursos
      await toPng(el, toPngOptions);
      // Segunda chamada: captura final com tudo carregado
      const dataUrl = await toPng(el, toPngOptions);

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', putOnlyUsedFonts: true });
      pdf.setFillColor(255, 255, 255);
      const pdfWidth  = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Dimensões da imagem em mm
      const imgWidthMM  = pdfWidth;
      const imgHeightMM = (height / width) * pdfWidth * 2; // pixelRatio:2

      const pageHeightMM = pdfHeight;
      let rendered = 0;
      let firstPage = true;

      while (rendered < imgHeightMM) {
        if (!firstPage) pdf.addPage();
        firstPage = false;
        // Fundo branco em cada página antes de inserir a imagem
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
        pdf.addImage(dataUrl, 'PNG', 0, -rendered, imgWidthMM, imgHeightMM);
        rendered += pageHeightMM;
      }

      const mesLabel = activeTab === 'anual' ? 'anual' : filtros.mes;
      pdf.save(`Relatorio-${activeTab}-${filtros.ano}-${mesLabel}.pdf`);
    } catch (e) {
      console.error('PDF Error:', e);
      alert('Erro ao gerar PDF. Verifique o console para detalhes.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="card flex flex-wrap items-end gap-4 no-print">
        <div className="flex bg-[#242424] p-1 rounded-lg border border-[#383838]">
          {(['individual', 'mensal', 'anual'] as TabType[]).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${activeTab === t ? 'bg-gold text-[#0E0E0E]' : 'text-[#8A8580] hover:text-[#F0EDE8]'}`}>
              {t === 'individual' ? 'Membro' : t === 'mensal' ? 'Mensal' : 'Anual'}
            </button>
          ))}
        </div>

        {activeTab === 'individual' && (
          <select value={filtros.membro} onChange={e => setFiltros({...filtros, membro: e.target.value as any})} className="input-field py-1.5 h-[36px] bg-[#242424] text-xs">
            {MEMBROS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}

        {activeTab !== 'anual' && (
          <select value={filtros.mes} onChange={e => setFiltros({...filtros, mes: e.target.value})} className="input-field py-1.5 h-[36px] bg-[#242424] text-xs">
            {activeTab === 'individual' && <option value="all">Todos</option>}
            {MESES.map((m, i) => <option key={m} value={(i+1).toString().padStart(2, '0')}>{m}</option>)}
          </select>
        )}

        <select value={filtros.ano} onChange={e => setFiltros({...filtros, ano: e.target.value})} className="input-field py-1.5 h-[36px] bg-[#242424] text-xs">
          {['2026', '2025'].map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <button onClick={generatePDF} disabled={isGenerating} className="btn btn-secondary h-[36px] ml-auto">
          {isGenerating ? <TrendingUp className="animate-spin" size={16} /> : <Download size={16} />}
          {isGenerating ? 'Gerando...' : 'PDF'}
        </button>
      </div>

      {/* Relatório */}
      <div 
        ref={reportRef} 
        id="report-container" 
        className="bg-[#0E0E0E] rounded-xl space-y-12 relative overflow-hidden text-white"
        style={{ 
          padding: '32px 40px',
          width: '900px',
          maxWidth: '900px',
          boxSizing: 'border-box'
        }}
      >
        {/* Anti-oklab styles para o PDF */}
        <style dangerouslySetInnerHTML={{ __html: `
          #report-container { 
            color-scheme: dark;
          }
          #report-container * { 
            color-interpolation-filters: sRGB !important; 
            box-sizing: border-box !important;
            max-width: 100% !important;
          }
          #report-container table {
            width: 100% !important;
            table-layout: fixed !important;
            word-break: break-word !important;
          }
          #report-container .grid {
            width: 100% !important;
            overflow: hidden !important;
          }
          .text-gold { color: #C9A96E !important; }
          .bg-gold { background-color: #C9A96E !important; }
          .text-[#7ABF8A] { color: #7ABF8A !important; }
          .text-[#E07070] { color: #E07070 !important; }
        `}} />

        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gold pb-10">
          <div className="flex items-center gap-3">
            <svg width="160" height="48" viewBox="0 0 160 48" xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="34" fontFamily="Georgia, serif" fontSize="28" fontWeight="bold" fill="#C9A96E" letterSpacing="1">Integra</text>
              <text x="108" y="34" fontFamily="Georgia, serif" fontSize="28" fontWeight="bold" fill="#F0EDE8">&amp;Co</text>
            </svg>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-gold uppercase mb-1">RELATÓRIO FINANCEIRO</p>
            <h2 className="text-2xl font-serif font-bold">
              {activeTab === 'individual' ? filtros.membro : activeTab === 'mensal' ? `${MESES[parseInt(filtros.mes)-1]} / ${filtros.ano}` : filtros.ano}
            </h2>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8">
          {activeTab === 'individual' ? (
            <>
              <StatCard label="Parte no Período" value={fmt(reportData.individual.parteDespSimples + reportData.individual.parteIntegrais)} icon={User} />
              <StatCard label="Adiantou ao Escritório" value={fmt(reportData.individual.totalAdiantado)} icon={ArrowUpRight} colorClass="text-[#7ABF8A]" subtext={`A receber: ${fmt(reportData.individual.totalAReceber)}`} />
              <StatCard label="Saldo Compensações" value={fmt(reportData.individual.saldoComp)} icon={Scale} colorClass={reportData.individual.saldoComp >= 0 ? "text-[#7ABF8A]" : "text-[#E07070]"} />
            </>
          ) : (
            <>
              <StatCard label="Receitas Totais" value={fmt(reportData.coletivo.totalReceitas)} icon={TrendingUp} colorClass="text-[#7ABF8A]" />
              <StatCard 
                label="Despesas Totais" 
                value={fmt(reportData.coletivo.totalDespesas)} 
                icon={ArrowDownLeft} 
                colorClass="text-[#E07070]" 
                subtext={`Simples: ${fmt(reportData.coletivo.totalDespesasSimples)} + Integrais: ${fmt(reportData.coletivo.totalDespesasIntegris)}`}
              />
              <StatCard label="Saldo Líquido" value={fmt(reportData.coletivo.totalReceitas - reportData.coletivo.totalDespesas)} icon={Scale} colorClass="text-gold" />
            </>
          )}
        </div>

        {/* Tabelas de Conteúdo */}
        <div className="space-y-12">
          {activeTab === 'individual' ? (
            <>
              <ReportTable 
                title="Despesas Simples" 
                headers={["Data", "Descrição", "Total", "Sua Parte"]} 
                emptyMessage="Sem registros" 
                footer={{ label: "Subtotal Parte Simples", value: fmt(reportData.individual.parteDespSimples) }} 
                rows={reportData.despAtivas.map(d => ({ 
                  id: d.id, 
                  cells: [
                    { content: fmtDate(d.data) }, 
                    { content: d.desc, className: "font-bold text-white" }, 
                    { content: fmt(d.valor) }, 
                    { content: fmt(calcParteMembro(d.valor, d.cat, filtros.membro as any)), className: "font-bold text-white text-right" }
                  ] 
                }))} 
              />
              <ReportTable 
                title="Pagamentos Integrais (Efetuados)" 
                headers={["Data", "Descrição", "Total", "A Receber"]} 
                emptyMessage="Sem registros" 
                footer={{ label: "Total a Receber", value: fmt(reportData.individual.totalAReceber), colorClass: "text-[#7ABF8A]" }} 
                colorBorder="border-[#7ABF8A]" 
                rows={reportData.individual.pagFez.map(p => ({ 
                  id: p.id, 
                  cells: [
                    { content: fmtDate(p.data) }, 
                    { content: p.desc, className: "font-bold text-white" }, 
                    { content: fmt(p.valor) }, 
                    { content: fmt(p.valor - calcParteMembro(p.valor, p.cat, filtros.membro as any)), className: "font-bold text-[#7ABF8A] text-right" }
                  ] 
                }))} 
              />
              
              <div className="space-y-8">
                <h3 className="text-xl font-serif font-bold border-l-4 border-gold pl-4 text-[#F0EDE8]">Minhas Compensações</h3>
                <div className="grid grid-cols-2 gap-8">
                  <StatCard label="Saldo Líquido Compensações" value={fmt(reportData.individual.saldoLiquidoIndividual)} colorClass={reportData.individual.saldoLiquidoIndividual >= 0 ? "text-[#7ABF8A]" : "text-[#E07070]"} subtext="Diferença entre o que tem a receber e o que deve" />
                  <StatCard label="Pendente Agora" value={fmt(reportData.individual.saldoComp)} icon={Scale} colorClass={reportData.individual.saldoComp >= 0 ? "text-[#7ABF8A]" : "text-[#E07070]"} />
                </div>
                
                <ReportTable 
                  title="O que devo para outros" 
                  headers={["Para", "Valor", "Status", "Forma", "Data"]} 
                  emptyMessage="Não deve nada" 
                  rows={reportData.individual.individualDeve.map((c: any) => ({
                    id: c.id,
                    cells: [{ content: c.para, className: "font-bold text-white" }, { content: fmt(c.valor) }, { content: <StatusBadge pago={c.pago} /> }, { content: c.formaPag || "-" }, { content: c.pagoEm ? fmtDate(c.pagoEm) : "-" }]
                  }))} 
                />
                
                <ReportTable 
                  title="O que outros me devem" 
                  headers={["De", "Valor", "Status", "Forma", "Data"]} 
                  emptyMessage="Ninguém te deve nada" 
                  rows={reportData.individual.individualReceber.map((c: any) => ({
                    id: c.id,
                    cells: [{ content: c.de, className: "font-bold text-white" }, { content: fmt(c.valor) }, { content: <StatusBadge pago={c.pago} /> }, { content: c.formaPag || "-" }, { content: c.pagoEm ? fmtDate(c.pagoEm) : "-" }]
                  }))} 
                />
              </div>
            </>
          ) : (
            <>
              <ReportTable 
                title="Histórico de Receitas" 
                headers={["Data", "Descrição", "Origem", "Valor"]} 
                emptyMessage="Sem receitas" 
                footer={{ label: "Total Receitas", value: fmt(reportData.coletivo.totalReceitas), colorClass: "text-[#7ABF8A]" }} 
                colorBorder="border-[#7ABF8A]" 
                rows={reportData.receitasAtivas.map(r => ({ id: r.id, cells: [{ content: fmtDate(r.data) }, { content: r.desc, className: "font-bold text-white" }, { content: r.origem, className: "uppercase font-bold" }, { content: fmt(r.valor), className: "font-bold text-[#7ABF8A] text-right" }] }))} 
              />
              
              <ReportTable 
                title="Despesas Simples do Escritório" 
                headers={["Data", "Descrição", "Categoria", "Total"]} 
                emptyMessage="Sem despesas simples" 
                footer={{ label: "Subtotal Despesas Simples", value: fmt(reportData.coletivo.totalDespesasSimples), colorClass: "text-[#E07070]" }} 
                colorBorder="border-[#E07070]" 
                rows={reportData.despAtivas.map(d => ({ id: d.id, cells: [{ content: fmtDate(d.data) }, { content: d.desc, className: "font-bold text-white" }, { content: d.cat, className: "uppercase font-bold" }, { content: fmt(d.valor), className: "font-bold text-[#E07070] text-right" }] }))} 
              />

              <ReportTable 
                title="Pagamentos Integrais (Adiantamentos)" 
                headers={["Data", "Descrição", "Pagador", "Total"]} 
                emptyMessage="Sem pagamentos integrais" 
                footer={{ label: "Subtotal Pagamentos Integrais", value: fmt(reportData.coletivo.totalDespesasIntegris), colorClass: "text-[#E07070]" }} 
                colorBorder="border-[#E07070]" 
                rows={reportData.pagAtivos.map(p => ({ id: p.id, cells: [{ content: fmtDate(p.data) }, { content: p.desc, className: "font-bold text-white" }, { content: p.pagador, className: "text-gold font-bold" }, { content: fmt(p.valor), className: "font-bold text-[#E07070] text-right" }] }))} 
              />

              <div className="space-y-6">
                <h3 className="text-xl font-serif font-bold border-l-4 border-gold pl-4 text-[#F0EDE8]">Compensações entre Membros</h3>
                <div className="grid grid-cols-2 gap-8">
                  <StatCard label="Total Compensado" value={fmt(reportData.coletivo.totalCompPagas)} icon={CheckCircle2} colorClass="text-[#7ABF8A]" />
                  <StatCard label="Total Pendente" value={fmt(reportData.coletivo.totalCompPendente)} icon={AlertCircle} colorClass="text-[#E3A008]" />
                </div>
                <ReportTable 
                  title="Detalhamento das Compensações" 
                  headers={["De", "Para", "Valor", "Status", "Forma", "Data"]} 
                  emptyMessage="Nenhuma compensação no período" 
                  rows={reportData.compsAtivas.map((c: any) => ({
                    id: c.id,
                    cells: [
                      { content: c.de, className: "font-bold text-[#E07070]" },
                      { content: c.para, className: "font-bold text-[#7ABF8A]" },
                      { content: fmt(c.valor), className: "font-bold text-white" },
                      { content: <StatusBadge pago={c.pago} /> },
                      { content: c.formaPag || "-" },
                      { content: c.pagoEm ? fmtDate(c.pagoEm) : "-" }
                    ]
                  }))} 
                />
              </div>
            </>
          )}

          {/* Auditoria */}
          {reportData.deletados.length > 0 && (
            <ReportTable title="Registros Auditados (Cancelados)" colorBorder="border-[#E07070]" headers={["Tipo", "Descrição", "Valor", "Motivo"]} emptyMessage="" rows={reportData.deletados.map((d, i) => ({ id: i, cells: [{ content: d.type, className: "uppercase font-bold" }, { content: d.desc }, { content: fmt(d.valor) }, { content: d.deletedMotivo || "Não informado", className: "text-[#E07070] italic" }] }))} />
          )}

          {/* Footer */}
          <div className="pt-12 text-center border-t border-[#242424] opacity-50">
            <p className="text-[10px] uppercase tracking-widest font-bold">Documento Eletrônico • Integra&Co Financeiro</p>
            <p className="text-[9px] mt-1">Hash: {reportData.hash} • Gerado em {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}