export type Membro = 'Evelyn' | 'Gustavo' | 'Juliana' | 'Marlon' | 'Patrick' | 'Ricardo';

export interface Despesa {
  id: string;
  data: string;         // 'YYYY-MM-DD'
  valor: number;
  desc: string;
  cat: string;
  natureza: 'fixo' | 'variavel' | 'eventual';
  essencialidade: 'essencial' | 'operacional' | 'discricionario';
  centroCusto: 'estrutura' | 'pessoal' | 'administrativo' | 'comercial';
  vencimento?: string;
  comprovante?: string;
  comprovanteNome?: string;
  obs?: string;
  deleted: boolean;
  deletedAt?: string;
  deletedMotivo?: string;
  createdAt: string;
  parcelado?: boolean;
  parcelaNum?: number;
  parcelaTotal?: number;
  grupoParcelamento?: string;
  fixa?: boolean;
  fixaId?: string;
}

export interface Pagamento {
  id: string;
  data: string;
  pagador: Membro;
  valor: number;
  desc: string;
  cat: string;
  natureza: 'fixo' | 'variavel' | 'eventual';
  essencialidade: 'essencial' | 'operacional' | 'discricionario';
  centroCusto: 'estrutura' | 'pessoal' | 'administrativo' | 'comercial';
  vencimento?: string;
  comprovante?: string;
  comprovanteNome?: string;
  comprovanteUrl?: string;
  comprovantePath?: string;
  comprovanteTipo?: string;
  obs?: string;
  deleted: boolean;
  deletedAt?: string;
  deletedMotivo?: string;
  createdAt: string;
  parcelado?: boolean;
  parcelaNum?: number;
  parcelaTotal?: number;
  grupoParcelamento?: string;
}

export interface Compensacao {
  id: string;
  de: Membro;
  para: Membro;
  valor: number;
  data: string;          // mês de referência do pagamento original
  pagamentoId: string;
  pago: boolean;
  pagoEm?: string;
  formaPag?: string;     // 'Pix' | 'Dinheiro' | 'Transferência' | 'Débito' | 'Crédito' | 'Outro'
  obsPag?: string;
  comprovante?: string;  // base64 data URL (fallback)
  comprovanteNome?: string;
  comprovanteUrl?: string;   // Supabase Storage URL
  comprovantePath?: string;  // Supabase Storage Path
  comprovanteTipo?: string;  // mime type
  deleted?: boolean;     // Se o pagamento for deletado, as compensações também são desativadas
  statusConferencia?: 'pendente' | 'confirmado' | 'recusado';
  observacaoConferencia?: string;
  confirmadoPor?: Membro;
  confirmadoEm?: string;
}

export interface Receita {
  id: string;
  data: string;
  valor: number;
  desc: string;
  cat: string;
  membro?: Membro;
  origem?: string;
  comprovante?: string;
  comprovanteNome?: string;
  comprovanteUrl?: string;
  comprovantePath?: string;
  comprovanteTipo?: string;
  obs?: string;
  deleted: boolean;
  deletedAt?: string;
  deletedMotivo?: string;
  createdAt: string;
}

export interface DespesaFixa {
  id: string;
  nome: string;
  valor: number;
  cat: string;
}

export interface AppConfig {
  id: string;
  cats_despesa: string[];
  cats_receita: string[];
  pix_chaves?: Record<Membro, string>;
}
