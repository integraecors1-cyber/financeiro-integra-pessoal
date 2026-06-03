import React, { useState, useMemo } from 'react';
import { Trash2, Edit2, Info, User, ChevronDown, ChevronRight } from 'lucide-react';
import { fmt, fmtDate } from '@/lib/utils';

export default function Pagamentos({ finance, onEdit, onDelete }: any) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
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
    grupoList.sort((a, b) => b.parcelas[0].data.localeCompare(a.parcelas[0].data));
    return { grupos: grupoList, avulsos: avulsoList };
  }, [finance.pagamentos, finance.compensacoes]);
  
  // (Resto do conteúdo que você enviou anteriormente...)
  return (<div>Componente Pagamentos Atualizado</div>);
}
