-- Migration: Initial Schema for Financeiro App

-- 1. Tables for categories
CREATE TABLE IF NOT EXISTS public.config (
    id TEXT PRIMARY KEY,
    cats_despesa TEXT[] NOT NULL DEFAULT '{}',
    cats_receita TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Despesas
CREATE TABLE IF NOT EXISTS public.despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    valor NUMERIC(15, 2) NOT NULL,
    "desc" TEXT NOT NULL,
    cat TEXT NOT NULL,
    natureza TEXT CHECK (natureza IN ('fixo', 'variavel', 'eventual')),
    essencialidade TEXT CHECK (essencialidade IN ('essencial', 'operacional', 'discricionario')),
    centro_custo TEXT CHECK (centro_custo IN ('estrutura', 'pessoal', 'administrativo', 'comercial')),
    obs TEXT,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    parcelado BOOLEAN DEFAULT FALSE,
    parcela_num INTEGER,
    parcela_total INTEGER,
    grupo_parcelamento TEXT,
    fixa BOOLEAN DEFAULT FALSE,
    fixa_id TEXT
);

-- 3. Pagamentos
CREATE TABLE IF NOT EXISTS public.pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    pagador TEXT NOT NULL,
    valor NUMERIC(15, 2) NOT NULL,
    "desc" TEXT NOT NULL,
    cat TEXT NOT NULL,
    obs TEXT,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    parcelado BOOLEAN DEFAULT FALSE,
    parcela_num INTEGER,
    parcela_total INTEGER,
    grupo_parcelamento TEXT
);

-- 4. Compensações
CREATE TABLE IF NOT EXISTS public.compensacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "de" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    valor NUMERIC(15, 2) NOT NULL,
    data DATE NOT NULL,
    pagamento_id UUID,
    pago BOOLEAN DEFAULT FALSE,
    pago_em DATE,
    forma_pag TEXT,
    obs_pag TEXT,
    comprovante TEXT,
    comprovante_nome TEXT,
    deleted BOOLEAN DEFAULT FALSE
);

-- 5. Receitas
CREATE TABLE IF NOT EXISTS public.receitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    valor NUMERIC(15, 2) NOT NULL,
    "desc" TEXT NOT NULL,
    cat TEXT NOT NULL,
    membro TEXT,
    origem TEXT,
    obs TEXT,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Despesas Fixas
CREATE TABLE IF NOT EXISTS public.despesas_fixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    valor NUMERIC(15, 2) NOT NULL,
    cat TEXT NOT NULL
);

-- Seed Data
INSERT INTO public.config (id, cats_despesa, cats_receita)
VALUES ('global', 
    ARRAY['Aluguel', 'Condomínio', 'Água', 'Luz', 'Internet', 'Limpeza', 'Material de Escritório', 'Manutenção / Reparos', 'Café / Copa', 'Contabilidade', 'Telefone', 'Seguro', 'Estacionamento'],
    ARRAY['Projeto', 'Consultoria', 'Mensalidade', 'Reembolso', 'Outro']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (You might want to tighten this later)
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compensacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_fixas ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated/anon for now (for the sake of the applet)
-- Warning: In a real production app, restrict these to specific user_id
CREATE POLICY "Allow select for everyone" ON public.despesas FOR SELECT USING (true);
CREATE POLICY "Allow insert for everyone" ON public.despesas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for everyone" ON public.despesas FOR UPDATE USING (true);

CREATE POLICY "Allow select for everyone" ON public.pagamentos FOR SELECT USING (true);
CREATE POLICY "Allow insert for everyone" ON public.pagamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for everyone" ON public.pagamentos FOR UPDATE USING (true);

CREATE POLICY "Allow select for everyone" ON public.compensacoes FOR SELECT USING (true);
CREATE POLICY "Allow insert for everyone" ON public.compensacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for everyone" ON public.compensacoes FOR UPDATE USING (true);

CREATE POLICY "Allow select for everyone" ON public.receitas FOR SELECT USING (true);
CREATE POLICY "Allow insert for everyone" ON public.receitas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for everyone" ON public.receitas FOR UPDATE USING (true);

CREATE POLICY "Allow select for everyone" ON public.despesas_fixas FOR SELECT USING (true);
CREATE POLICY "Allow insert for everyone" ON public.despesas_fixas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for everyone" ON public.despesas_fixas FOR UPDATE USING (true);

CREATE POLICY "Allow select for everyone" ON public.config FOR SELECT USING (true);
CREATE POLICY "Allow update for everyone" ON public.config FOR ALL USING (true);
