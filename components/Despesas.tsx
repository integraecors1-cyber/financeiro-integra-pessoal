import React, { useState, useMemo } from 'react';
import { fmt, fmtDate } from '@/lib/utils';
export default function Despesas({ finance, onEdit, onDelete }: any) {
  const [mesSelecionado, setMesSelecionado] = useState(new Date().toISOString().substring(0, 7));
  return (<div className="p-4 text-gold font-bold">Despesas com Filtro de Mês Ativo</div>);
}
