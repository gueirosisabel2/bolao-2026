-- ==========================================================
-- BOLÃO 2026: DANI ALONSO & CAPITÃO AUGUSTO
-- Script SQL para criação das tabelas no Supabase
-- ==========================================================

-- 1. TABELA DE PARTICIPANTES (com trava única de WhatsApp)
CREATE TABLE IF NOT EXISTS public.participantes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  whatsapp_raw TEXT NOT NULL UNIQUE,
  capitao BIGINT NOT NULL,
  dani BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único para busca instantânea e garantia de não-duplicação
CREATE UNIQUE INDEX IF NOT EXISTS idx_participantes_whatsapp_raw 
ON public.participantes (whatsapp_raw);

-- 2. TABELA DE CONFIGURAÇÃO & APURAÇÃO OFICIAL
CREATE TABLE IF NOT EXISTS public.configuracao (
  id INT PRIMARY KEY DEFAULT 1,
  title TEXT NOT NULL DEFAULT 'PALPITE VOTOS DANI E CAPITÃO',
  deadline TIMESTAMPTZ NOT NULL DEFAULT '2026-10-04T08:00:00-03:00',
  admin_pin TEXT NOT NULL DEFAULT 'Gueiroo2$',
  simulate_closed BOOLEAN NOT NULL DEFAULT false,
  official_capitao BIGINT,
  official_dani BIGINT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ
);

-- Inserir registro inicial de configuração
INSERT INTO public.configuracao (id, title, deadline, admin_pin, simulate_closed, published)
VALUES (1, 'PALPITE VOTOS DANI E CAPITÃO', '2026-10-04T08:00:00-03:00', 'Gueiroo2$', false, false)
ON CONFLICT (id) DO NOTHING;

-- 3. POLÍTICAS DE SEGURANÇA (Row Level Security)
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública (SELECT) para visualização dos palpites
DROP POLICY IF EXISTS "Leitura publica participantes" ON public.participantes;
CREATE POLICY "Leitura publica participantes" ON public.participantes 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura publica configuracao" ON public.configuracao;
CREATE POLICY "Leitura publica configuracao" ON public.configuracao 
FOR SELECT USING (true);

-- As operações de INSERT, UPDATE e DELETE pelo servidor usam a SECRET_KEY do backend
-- garantindo segurança total contra alterações não autorizadas.
