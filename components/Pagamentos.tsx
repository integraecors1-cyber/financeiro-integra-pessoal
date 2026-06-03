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
    const all = finance.pagamentos.filter((p: any) => !p.deleted).sort((a: any, b: any) => b.data.localeCompare(a.data));
    const grupoMap: Record<string, any[]> = {};
    const avulsoList: any[] = [];
    all.forEach((p: any) => {
      if (p.grupoParcelamento) {
        if (!grupoMap[p.grupoParcelamento]) grupoMap[p.grupoParcelamento] = [];
        grupoMap[p.grupoParcelamento].push(p);
      } else {
        avulsoList.push(p);
      }
    });
    const grupoList = Object.entries(grupoMap).map(([gId, parcelas]) => {
      const sorted = parcelas.sort((a: any, b: any) => a.parcelaNum - b.parcelaNum);
      const total = sorted.reduce((s: number, p: any) => s + p.valor, 0);
      return { gId, parcelas: sorted, total };
    });
    return { grupos: grupoList, avulsos: avulsoList };
  }, [finance.pagamentos]);

  return (
    <div className="space-y-4">
      {grupos.map((g: any) => (
        <div key={g.gId} className="bg-[#1A1A1A] border border-[#383838] rounded-xl p-4">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggle(g.gId)}>
            <div className="font-bold text-[#F0EDE8]">Grupo: {g.gId}</div>
            <div className="text-gold font-bold">{fmt(g.total)}</div>
          </div>
          {expanded.has(g.gId) && (
            <div className="mt-4 space-y-2 border-t border-[#383838] pt-2">
              {g.parcelas.map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm text-[#8A8580]">
                  <span>Parcela {p.parcelaNum} - {fmtDate(p.data)}</span>
                  <span>{fmt(p.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {avulsos.map((p: any) => (
        <div key={p.id} className="flex justify-between bg-[#1A1A1A] border border-[#383838] rounded-xl p-4">
          <span className="text-[#F0EDE8]">{p.descricao}</span>
          <span className="text-gold font-bold">{fmt(p.valor)}</span>
        </div>
      ))}
    </div>
  );
}
