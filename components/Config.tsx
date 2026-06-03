import React, { useState } from 'react';
import { Settings, Tag, Plus, Trash2, Calendar, RefreshCcw, Wallet } from 'lucide-react';
import { fmt } from '@/lib/utils';
import { uid } from '@/lib/utils';
import { MEMBROS } from '@/lib/constants';

export default function Config({ finance }: any) {
  const [newCatDesp, setNewCatDesp] = useState('');
  const [newCatRec, setNewCatRec] = useState('');
  
  const [newFixa, setNewFixa] = useState({ nome: '', valor: '', cat: '' });
  const [internalPix, setInternalPix] = useState<Record<string, string>>(finance.pixChaves || {});

  const handlePixChange = (membro: string, val: string) => {
    const next = { ...internalPix, [membro]: val };
    setInternalPix(next);
  };

  const savePix = async () => {
    await finance.updatePixChaves(internalPix);
    alert('Chaves Pix salvas com sucesso!');
  };

  const addCatDespesa = async () => {
    if (!newCatDesp.trim()) return;
    const novaLista = [...finance.catsDespesa, newCatDesp.trim()];
    finance.setCatsDespesa(novaLista);
    setNewCatDesp('');
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('config').update({ cats_despesa: novaLista }).eq('id', 'global');
    if (error) alert('Erro ao salvar categoria. Tente novamente.');
  };

  const addCatReceita = async () => {
    if (!newCatRec.trim()) return;
    const novaLista = [...finance.catsReceita, newCatRec.trim()];
    finance.setCatsReceita(novaLista);
    setNewCatRec('');
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('config').update({ cats_receita: novaLista }).eq('id', 'global');
    if (error) alert('Erro ao salvar categoria. Tente novamente.');
  };

  const addDespesaFixa = async () => {
    if (!newFixa.nome || !newFixa.valor || !newFixa.cat) return;
    const item = {
      id: uid(),
      nome: newFixa.nome,
      valor: parseFloat(newFixa.valor),
      cat: newFixa.cat
    };
    const { error } = await finance.addDespesaFixa(item);
    if (error) {
      alert('Erro ao salvar despesa fixa. Tente novamente.');
      return;
    }
    setNewFixa({ nome: '', valor: '', cat: '' });
  };

  const registrarFixasNoMes = async () => {
    if (!confirm('Deseja registrar todas as despesas fixas para o mês atual?')) return;
    const now = new Date();
    const data = now.toISOString().split('T')[0];
    const mesAno = `${now.getMonth() + 1}/${now.getFullYear()}`;

    let erros = 0;
    for (const f of finance.despesasFixas) {
      const item = {
        id: uid(),
        data,
        valor: f.valor,
        desc: `${f.nome} — ${mesAno}`,
        cat: f.cat,
        deleted: false,
        createdAt: new Date().toISOString(),
        fixa: true,
        fixaId: f.id,
        natureza: 'fixo' as const,
        essencialidade: 'essencial' as const,
        centroCusto: 'estrutura' as const
      };
      const { error } = await finance.addDespesa(item);
      if (error) erros++;
    }

    if (erros > 0) {
      alert(`Atenção: ${erros} despesa(s) não puderam ser salvas. Verifique sua conexão e tente novamente.`);
    } else {
      alert(`${finance.despesasFixas.length} despesas fixas registradas com sucesso!`);
    }
  };

  return (
    <div className="space-y-12">
      {/* Despesas Fixas */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold text-gold flex items-center gap-2">
            <RefreshCcw size={20} />
            Despesas Fixas Mensais
          </h3>
          <button 
            onClick={registrarFixasNoMes}
            className="btn btn-primary"
          >
            Registrar Todas no Mês Atual
          </button>
        </div>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
            <div className="space-y-2">
              <label className="label">Nome da Despesa</label>
              <input 
                type="text" 
                value={newFixa.nome}
                onChange={e => setNewFixa({...newFixa, nome: e.target.value})}
                placeholder="Ex: Aluguel" 
                className="input-field py-2 text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="label">Valor (R$)</label>
              <input 
                type="number" 
                value={newFixa.valor}
                onChange={e => setNewFixa({...newFixa, valor: e.target.value})}
                placeholder="0,00" 
                className="input-field py-2 text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="label">Categoria</label>
              <select 
                value={newFixa.cat}
                onChange={e => setNewFixa({...newFixa, cat: e.target.value})}
                className="input-field py-2 text-sm"
              >
                <option value="">Selecione</option>
                {finance.catsDespesa.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={addDespesaFixa} className="btn btn-ghost h-[42px] w-full">
              <Plus size={18} /> Adicionar
            </button>
          </div>

          <div className="space-y-2">
            {finance.despesasFixas.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between p-4 bg-[#242424] rounded-lg border border-[#383838]">
                <div className="flex items-center gap-4">
                  <span className="font-bold">{f.nome}</span>
                  <span className="badge badge-gold">{f.cat}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-serif font-bold text-gold">{fmt(f.valor)}</span>
                  <button 
                    onClick={() => finance.setDespesasFixas((prev: any[]) => prev.filter(x => x.id !== f.id))}
                    className="text-[#8A8580] hover:text-[#E07070]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Chaves Pix */}
        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold text-gold flex items-center gap-2">
            <Wallet size={20} />
            Chaves Pix dos Membros
          </h3>
          <div className="card space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {MEMBROS.map(m => (
                <div key={m} className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-[#8A8580]">{m}</label>
                   <input 
                    type="text" 
                    value={internalPix[m] || ''} 
                    onChange={e => handlePixChange(m, e.target.value)}
                    placeholder="Chave Pix ou CNPJ/CPF/Email..."
                    className="input-field py-2 text-xs"
                   />
                </div>
              ))}
            </div>
            <button onClick={savePix} className="btn btn-primary w-full mt-4">Salvar Chaves Pix</button>
          </div>
        </div>

        {/* Categorias Despesa */}
        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold text-gold flex items-center gap-2">
            <Tag size={20} />
            Categorias de Despesa
          </h3>
          <div className="card space-y-6">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newCatDesp}
                onChange={e => setNewCatDesp(e.target.value)}
                placeholder="Nova categoria..." 
                className="input-field py-2 text-xs" 
              />
              <button 
                onClick={addCatDespesa}
                className="btn btn-primary px-4"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {finance.catsDespesa.map((cat: string) => (
                <div key={cat} className="group flex items-center gap-2 bg-[#242424] px-3 py-1.5 rounded-full border border-[#383838] hover:border-gold transition-colors">
                  <span className="text-[10px] uppercase font-bold tracking-widest">{cat}</span>
                  <button 
                    onClick={() => finance.setCatsDespesa((prev: string[]) => prev.filter(c => c !== cat))}
                    className="text-[#8A8580] group-hover:text-[#E07070] transition-colors"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Categorias Receita */}
        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold text-[#7ABF8A] flex items-center gap-2">
            <Tag size={20} />
            Categorias de Receita
          </h3>
          <div className="card space-y-6">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newCatRec}
                onChange={e => setNewCatRec(e.target.value)}
                placeholder="Nova categoria..." 
                className="input-field py-2 text-xs" 
              />
              <button 
                onClick={addCatReceita}
                className="btn bg-[#7ABF8A] text-[#0E0E0E] px-4"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {finance.catsReceita.map((cat: string) => (
                <div key={cat} className="group flex items-center gap-2 bg-[#242424] px-3 py-1.5 rounded-full border border-[#383838] hover:border-[#7ABF8A] transition-colors">
                  <span className="text-[10px] uppercase font-bold tracking-widest">{cat}</span>
                  <button 
                    onClick={() => finance.setCatsReceita((prev: string[]) => prev.filter(c => c !== cat))}
                    className="text-[#8A8580] group-hover:text-[#E07070] transition-colors"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-12 border-t border-red-500/20">
        <h3 className="text-xl font-serif font-bold text-red-500 flex items-center gap-2 mb-6">
          <Trash2 size={20} />
          Zona de Perigo
        </h3>
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-red-400">Limpar Todos os Dados</p>
              <p className="text-xs text-[#8A8580] mt-1">
                Esta ação irá apagar permanentemente todas as despesas, receitas, pagamentos e despesas fixas cadastradas. Esta ação não pode ser desfeita.
              </p>
            </div>
            <button 
              onClick={async () => {
                if (confirm('TEM CERTEZA? Esta ação apagará TODOS os registros do sistema (despesas, receitas, pagamentos e fixas) permanentemente.')) {
                  const { error } = await finance.clearAllData();
                  if (!error) alert('Sistema zerado com sucesso!');
                  else alert('Erro ao zerar sistema.');
                }
              }}
              className="btn bg-red-600 hover:bg-red-700 text-white border-none whitespace-nowrap"
            >
              Zerar Todo o Sistema
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
