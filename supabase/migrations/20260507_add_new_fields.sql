-- Nova migration para ajustes financeiros
ALTER TABLE public.config 
  ADD COLUMN IF NOT EXISTS pix_chaves JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.despesas 
  ADD COLUMN IF NOT EXISTS vencimento DATE,
  ADD COLUMN IF NOT EXISTS comprovante TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_nome TEXT;

ALTER TABLE public.pagamentos 
  ADD COLUMN IF NOT EXISTS vencimento DATE,
  ADD COLUMN IF NOT EXISTS natureza TEXT CHECK (natureza IN ('fixo', 'variavel', 'eventual')),
  ADD COLUMN IF NOT EXISTS essencialidade TEXT CHECK (essencialidade IN ('essencial', 'operacional', 'discricionario')),
  ADD COLUMN IF NOT EXISTS centro_custo TEXT CHECK (centro_custo IN ('estrutura', 'pessoal', 'administrativo', 'comercial')),
  ADD COLUMN IF NOT EXISTS comprovante TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_nome TEXT;

ALTER TABLE public.receitas 
  ADD COLUMN IF NOT EXISTS membro TEXT,
  ADD COLUMN IF NOT EXISTS comprovante TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_nome TEXT;
