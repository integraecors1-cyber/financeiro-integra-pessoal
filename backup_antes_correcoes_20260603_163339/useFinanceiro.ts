import { useState, useEffect, useCallback } from 'react';
import { Despesa, Pagamento, Compensacao, Receita, DespesaFixa, Membro } from '../lib/types';
import { DEFAULT_CATS_DESPESA, DEFAULT_CATS_RECEITA } from '../lib/constants';
import { supabase } from '../lib/supabase';

export function useFinanceiro() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [compensacoes, setCompensacoes] = useState<Compensacao[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixa[]>([]);
  const [catsDespesa, setCatsDespesa] = useState<string[]>(DEFAULT_CATS_DESPESA);
  const [catsReceita, setCatsReceita] = useState<string[]>(DEFAULT_CATS_RECEITA);
  const [pixChaves, setPixChaves] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    console.log('Iniciando sincronização com Supabase...');
    try {
      const [
        dResp,
        pResp,
        cResp,
        rResp,
        dfResp,
        cfgResp
      ] = await Promise.all([
        supabase.from('despesas').select('*').order('data', { ascending: false }),
        supabase.from('pagamentos').select('*').order('data', { ascending: false }),
        supabase.from('compensacoes').select('*'),
        supabase.from('receitas').select('*').order('data', { ascending: false }),
        supabase.from('despesas_fixas').select('*'),
        supabase.from('config').select('*').eq('id', 'global').maybeSingle()
      ]);

      if (dResp.error) console.error('Erro (despesas):', dResp.error.message);
      if (pResp.error) console.error('Erro (pagamentos):', pResp.error.message);
      if (cResp.error) console.error('Erro (compensacoes):', cResp.error.message);
      if (rResp.error) console.error('Erro (receitas):', rResp.error.message);
      
      if (dResp.data) {
        const mapped = dResp.data.map(mapDespesaFromDB);
        setDespesas(mapped);
        localStorage.setItem('ic_despesas', JSON.stringify(mapped));
      }
      if (pResp.data) {
        const mapped = pResp.data.map(mapPagamentoFromDB);
        setPagamentos(mapped);
        localStorage.setItem('ic_pagamentos', JSON.stringify(mapped));
      }
      if (cResp.data) {
        const mapped = cResp.data.map(mapCompensacaoFromDB);
        setCompensacoes(mapped);
        localStorage.setItem('ic_compensacoes', JSON.stringify(mapped));
      }
      if (rResp.data) {
        const mapped = rResp.data.map(mapReceitaFromDB);
        setReceitas(mapped);
        localStorage.setItem('ic_receitas', JSON.stringify(mapped));
      }
      if (dfResp.data) {
        setDespesasFixas(dfResp.data as any);
        localStorage.setItem('ic_despesas_fixas', JSON.stringify(dfResp.data));
      }
      if (cfgResp && 'data' in cfgResp && cfgResp.data) {
        setCatsDespesa(cfgResp.data.cats_despesa);
        setCatsReceita(cfgResp.data.cats_receita);
        setPixChaves(cfgResp.data.pix_chaves || {});
        localStorage.setItem('ic_cats_despesa', JSON.stringify(cfgResp.data.cats_despesa));
        localStorage.setItem('ic_cats_receita', JSON.stringify(cfgResp.data.cats_receita));
      }
      setIsLoaded(true);
      console.log('Sincronização concluída com sucesso!');
    } catch (error) {
      console.error('Falha crítica na busca de dados:', error);
      // Fallback
      const lDespesas = localStorage.getItem('ic_despesas');
      const lPagamentos = localStorage.getItem('ic_pagamentos');
      const lCompensacoes = localStorage.getItem('ic_compensacoes');
      const lReceitas = localStorage.getItem('ic_receitas');
      
      if (lDespesas) setDespesas(JSON.parse(lDespesas));
      if (lPagamentos) setPagamentos(JSON.parse(lPagamentos));
      if (lCompensacoes) setCompensacoes(JSON.parse(lCompensacoes));
      if (lReceitas) setReceitas(JSON.parse(lReceitas));
      
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    
    // Subscriptions for real-time
    const subDespesas = supabase.channel('despesas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'despesas' }, () => fetchData())
      .subscribe();
    
    const subPagamentos = supabase.channel('pagamentos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamentos' }, () => fetchData())
      .subscribe();

    const subCompensacoes = supabase.channel('compensacoes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compensacoes' }, () => fetchData())
      .subscribe();

    const subReceitas = supabase.channel('receitas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receitas' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(subDespesas);
      supabase.removeChannel(subPagamentos);
      supabase.removeChannel(subCompensacoes);
      supabase.removeChannel(subReceitas);
    };
  }, [fetchData]);

  // Persistencia: em um app real, faríamos inserts/updates específicos. 
  // Para manter compatibilidade com o código atual que usa setX, 
  // vamos adicionar useEffects que sincronizam mudanças. 
  // Nota: Isso é um padrao de "prototipagem rápida" e pode ter problemas em concorrência.

  useEffect(() => {
    if (!isLoaded) return;
    // Debounce ou comparação profunda seria ideal aqui, mas vamos simplificar para o applet
  }, [despesas, pagamentos, compensacoes, receitas, despesasFixas, catsDespesa, catsReceita, isLoaded]);

  // Funções de manipulação que agora salvam no Supabase
  const addDespesa = async (item: Despesa) => {
    setDespesas(prev => {
      const novas = [item, ...prev];
      localStorage.setItem('ic_despesas', JSON.stringify(novas));
      return novas;
    });
    const res = await supabase.from('despesas').insert([mapDespesaToDB(item)]);
    if (res.error) console.error('ERRO SUPABASE (addDespesa):', res.error.message, res.error.details, res.error.hint);
    return { error: res.error };
  };

  const updateDespesa = async (item: Despesa) => {
    setDespesas(prev => {
      const novas = prev.map(d => d.id === item.id ? item : d);
      localStorage.setItem('ic_despesas', JSON.stringify(novas));
      return novas;
    });
    const res = await supabase.from('despesas').update(mapDespesaToDB(item)).eq('id', item.id);
    if (res.error) console.error('ERRO SUPABASE (updateDespesa):', res.error.message, res.error.details, res.error.hint);
    return { error: res.error };
  };

  const addPagamento = async (item: Pagamento) => {
    setPagamentos(prev => {
      const novas = [item, ...prev];
      localStorage.setItem('ic_pagamentos', JSON.stringify(novas));
      return novas;
    });
    const res = await supabase.from('pagamentos').insert([mapPagamentoToDB(item)]);
    if (res.error) console.error('ERRO SUPABASE (addPagamento):', res.error.message, res.error.details, res.error.hint);
    return { error: res.error };
  };

  const updatePagamento = async (item: Pagamento) => {
    setPagamentos(prev => {
      const novas = prev.map(p => p.id === item.id ? item : p);
      localStorage.setItem('ic_pagamentos', JSON.stringify(novas));
      return novas;
    });
    const res = await supabase.from('pagamentos').update(mapPagamentoToDB(item)).eq('id', item.id);
    if (res.error) console.error('ERRO SUPABASE (updatePagamento):', res.error.message, res.error.details, res.error.hint);
    return { error: res.error };
  };

  const addCompensacao = async (item: Compensacao) => {
    setCompensacoes(prev => {
      const novas = [item, ...prev];
      localStorage.setItem('ic_compensacoes', JSON.stringify(novas));
      return novas;
    });
    const res = await supabase.from('compensacoes').insert([mapCompensacaoToDB(item)]);
    if (res.error) console.error('ERRO SUPABASE (addCompensacao):', res.error.message, res.error.details, res.error.hint);
    return { error: res.error };
  };

  const updateCompensacao = async (comp: Compensacao) => {
    // Atualização otimista do estado local
    setCompensacoes(prev => {
      const novas = prev.map(c => c.id === comp.id ? comp : c);
      localStorage.setItem('ic_compensacoes', JSON.stringify(novas));
      return novas;
    });

    const res = await supabase
      .from('compensacoes')
      .update(mapCompensacaoToDB(comp))
      .eq('id', comp.id);

    if (res.error) {
      console.error('ERRO SUPABASE (updateCompensacao):', res.error.message, res.error.details, res.error.hint);
    }
    return { error: res.error };
  };

  const addReceita = async (item: Receita) => {
    setReceitas(prev => {
      const novas = [item, ...prev];
      localStorage.setItem('ic_receitas', JSON.stringify(novas));
      return novas;
    });
    const res = await supabase.from('receitas').insert([mapReceitaToDB(item)]);
    if (res.error) console.error('ERRO SUPABASE (addReceita):', res.error.message, res.error.details, res.error.hint);
    return { error: res.error };
  };

  const updateReceita = async (item: Receita) => {
    setReceitas(prev => {
      const novas = prev.map(r => r.id === item.id ? item : r);
      localStorage.setItem('ic_receitas', JSON.stringify(novas));
      return novas;
    });
    const res = await supabase.from('receitas').update(mapReceitaToDB(item)).eq('id', item.id);
    if (res.error) console.error('ERRO SUPABASE (updateReceita):', res.error.message, res.error.details, res.error.hint);
    return { error: res.error };
  };

  const addDespesaFixa = async (item: DespesaFixa) => {
    setDespesasFixas(prev => {
      const novas = [...prev, item];
      localStorage.setItem('ic_despesas_fixas', JSON.stringify(novas));
      return novas;
    });
    const { error } = await supabase.from('despesas_fixas').insert([item]);
    if (error) console.error('Erro ao adicionar despesa fixa no Supabase:', error);
    return { error };
  };

  const updateDespesaFixa = async (item: DespesaFixa) => {
    setDespesasFixas(prev => {
      const novas = prev.map(d => d.id === item.id ? item : d);
      localStorage.setItem('ic_despesas_fixas', JSON.stringify(novas));
      return novas;
    });
    const { error } = await supabase.from('despesas_fixas').update(item).eq('id', item.id);
    if (error) console.error('Erro ao atualizar despesa fixa no Supabase:', error);
    return { error };
  };

  const deleteDespesaFixa = async (id: string) => {
    setDespesasFixas(prev => {
      const novas = prev.filter(d => d.id !== id);
      localStorage.setItem('ic_despesas_fixas', JSON.stringify(novas));
      return novas;
    });
    const { error } = await supabase.from('despesas_fixas').delete().eq('id', id);
    if (error) console.error('Erro ao excluir despesa fixa no Supabase:', error);
    return { error };
  };

  return {
    despesas, setDespesas,
    pagamentos, setPagamentos,
    compensacoes, setCompensacoes,
    receitas, setReceitas,
    despesasFixas, setDespesasFixas,
    catsDespesa, setCatsDespesa,
    catsReceita, setCatsReceita,
    pixChaves, setPixChaves,
    updatePixChaves: async (chaves: Record<string, string>) => {
      setPixChaves(chaves);
      const { error } = await supabase.from('config').update({ pix_chaves: chaves }).eq('id', 'global');
      if (error) console.error('Erro ao salvar Pix no Supabase:', error);
      return { error };
    },
    addDespesa, updateDespesa,
    addPagamento, updatePagamento,
    addCompensacao, updateCompensacao,
    addReceita, updateReceita,
    addDespesaFixa, updateDespesaFixa, deleteDespesaFixa,
    uploadArquivo: async (bucket: string, path: string, file: File) => {
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true
      });
      if (error) return { data: null, error };
      
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return { data: { ...data, publicUrl }, error: null };
    },
    clearAllData: async () => {
      try {
        const tables = ['despesas', 'pagamentos', 'compensacoes', 'receitas', 'despesas_fixas'];
        try { await Promise.all(tables.map(table => supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'))); } catch(e) {}
        
        localStorage.removeItem('ic_despesas');
        localStorage.removeItem('ic_pagamentos');
        localStorage.removeItem('ic_compensacoes');
        localStorage.removeItem('ic_receitas');
        localStorage.removeItem('ic_despesas_fixas');
        localStorage.removeItem('ic_cats_despesa');
        localStorage.removeItem('ic_cats_receita');

        setDespesas([]);
        setPagamentos([]);
        setCompensacoes([]);
        setReceitas([]);
        setDespesasFixas([]);
        return { error: null };
      } catch (error) {
        console.error('Error clearing data:', error);
        return { error };
      }
    },
    isLoaded
  };
}

// Helpers Mapping
function mapDespesaToDB(d: Despesa) {
  return {
    id: d.id,
    data: d.data,
    valor: d.valor,
    desc: d.desc,
    cat: d.cat,
    natureza: d.natureza,
    essencialidade: d.essencialidade,
    centro_custo: d.centroCusto,
    vencimento: d.vencimento || null,
    comprovante: d.comprovante || null,
    comprovante_nome: d.comprovanteNome || null,
    obs: d.obs || null,
    deleted: d.deleted || false,
    deleted_at: d.deletedAt || null,
    deleted_motivo: d.deletedMotivo || null,
    created_at: d.createdAt || new Date().toISOString(),
    parcelado: d.parcelado || false,
    parcela_num: d.parcelaNum || null,
    parcela_total: d.parcelaTotal || null,
    grupo_parcelamento: d.grupoParcelamento || null,
    fixa: d.fixa || false,
    fixa_id: d.fixaId || null
  };
}

function mapDespesaFromDB(d: any): Despesa {
  return {
    ...d,
    centroCusto: d.centro_custo,
    vencimento: d.vencimento || undefined,
    comprovante: d.comprovante || undefined,
    comprovanteNome: d.comprovante_nome,
    deletedAt: d.deleted_at,
    deletedMotivo: d.deleted_motivo,
    createdAt: d.created_at,
    parcelaNum: d.parcela_num,
    parcelaTotal: d.parcela_total,
    grupoParcelamento: d.grupo_parcelamento,
    fixaId: d.fixa_id
  };
}

function mapPagamentoToDB(p: Pagamento) {
  return {
    id: p.id,
    data: p.data,
    pagador: p.pagador,
    valor: p.valor,
    desc: p.desc,
    cat: p.cat,
    natureza: p.natureza,
    essencialidade: p.essencialidade,
    centro_custo: p.centroCusto,
    vencimento: p.vencimento || null,
    comprovante: p.comprovante || null,
    comprovante_nome: p.comprovanteNome || null,
    comprovante_url: p.comprovanteUrl || null,
    comprovante_path: p.comprovantePath || null,
    comprovante_tipo: p.comprovanteTipo || null,
    obs: p.obs || null,
    deleted: p.deleted || false,
    deleted_at: p.deletedAt || null,
    deleted_motivo: p.deletedMotivo || null,
    created_at: p.createdAt || new Date().toISOString(),
    parcelado: p.parcelado || false,
    parcela_num: p.parcelaNum || null,
    parcela_total: p.parcelaTotal || null,
    grupo_parcelamento: p.grupoParcelamento || null
  };
}

function mapPagamentoFromDB(p: any): Pagamento {
  return {
    ...p,
    centroCusto: p.centro_custo,
    vencimento: p.vencimento || undefined,
    comprovante: p.comprovante || undefined,
    comprovanteNome: p.comprovante_nome,
    comprovanteUrl: p.comprovante_url,
    comprovantePath: p.comprovante_path,
    comprovanteTipo: p.comprovante_tipo,
    deletedAt: p.deleted_at,
    deletedMotivo: p.deleted_motivo,
    createdAt: p.created_at,
    parcelaNum: p.parcela_num,
    parcelaTotal: p.parcela_total,
    grupoParcelamento: p.grupo_parcelamento
  };
}

function mapCompensacaoToDB(c: Compensacao) {
  return {
    id: c.id,
    de: c.de,
    para: c.para,
    valor: c.valor,
    data: c.data,
    pagamento_id: c.pagamentoId,
    pago: c.pago || false,
    pago_em: c.pagoEm || null,
    forma_pag: c.formaPag || null,
    obs_pag: c.obsPag || null,
    comprovante: c.comprovante || null,
    comprovante_nome: c.comprovanteNome || null,
    comprovante_url: c.comprovanteUrl || null,
    comprovante_path: c.comprovantePath || null,
    comprovante_tipo: c.comprovanteTipo || null,
    deleted: c.deleted || false,
    status_conferencia: c.statusConferencia || 'pendente',
    observacao_conferencia: c.observacaoConferencia || null,
    confirmado_por: c.confirmadoPor || null,
    confirmado_em: c.confirmadoEm || null
  };
}

function mapCompensacaoFromDB(c: any): Compensacao {
  return {
    ...c,
    pagamentoId: c.pagamento_id,
    pagoEm: c.pago_em,
    formaPag: c.forma_pag,
    obsPag: c.obs_pag,
    comprovanteNome: c.comprovante_nome,
    comprovanteUrl: c.comprovante_url,
    comprovantePath: c.comprovante_path,
    comprovanteTipo: c.comprovante_tipo,
    statusConferencia: c.status_conferencia || 'pendente',
    observacaoConferencia: c.observacao_conferencia,
    confirmadoPor: c.confirmado_por,
    confirmadoEm: c.confirmado_em
  };
}

function mapReceitaToDB(r: Receita) {
  return {
    id: r.id,
    data: r.data,
    valor: r.valor,
    desc: r.desc,
    cat: r.cat,
    membro: r.membro || null,
    origem: r.origem || null,
    comprovante: r.comprovante || null,
    comprovante_nome: r.comprovanteNome || null,
    comprovante_url: r.comprovanteUrl || null,
    comprovante_path: r.comprovantePath || null,
    comprovante_tipo: r.comprovanteTipo || null,
    obs: r.obs || null,
    deleted: r.deleted || false,
    deleted_at: r.deletedAt || null,
    deleted_motivo: r.deletedMotivo || null,
    created_at: r.createdAt || new Date().toISOString()
  };
}

function mapReceitaFromDB(r: any): Receita {
  return {
    ...r,
    comprovante: r.comprovante || undefined,
    comprovanteNome: r.comprovante_nome,
    comprovanteUrl: r.comprovante_url,
    comprovantePath: r.comprovante_path,
    comprovanteTipo: r.comprovante_tipo,
    deletedAt: r.deleted_at,
    deletedMotivo: r.deleted_motivo,
    createdAt: r.created_at
  };
}
