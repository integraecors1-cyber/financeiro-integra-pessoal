#!/bin/bash
# =============================================================
#  Script de migração: Google OAuth → Magic Link (e-mail)
#  Cole e execute no terminal do seu Codespace na raiz do projeto
# =============================================================

set -e  # Para se qualquer comando falhar

echo "🔄 Aplicando mudanças no sistema de login..."

# ── 1. app/login/page.tsx ─────────────────────────────────────
cat > app/login/page.tsx << 'ENDOFFILE'
'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const FOTO_ESCRITORIO = "https://daasnwnaieadvbiqpazy.supabase.co/storage/v1/object/public/assets/DSC08643.jpg";
  const LOGO = "https://daasnwnaieadvbiqpazy.supabase.co/storage/v1/object/public/assets/Integra%202.png?v=2";

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accessClosed = process.env.NEXT_PUBLIC_ACCESS_CLOSED === 'true';

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // Quando acesso fechado, não cria novos usuários
          shouldCreateUser: accessClosed ? false : true,
        },
      });

      if (error) {
        if (
          error.message.includes('Signups not allowed') ||
          error.message.includes('User not found') ||
          error.status === 400
        ) {
          setError('Este e-mail não está autorizado. O acesso ao sistema foi encerrado para novos usuários.');
        } else {
          setError(error.message);
        }
        return;
      }

      setSent(true);
    } catch (err: any) {
      setError('Erro ao enviar o link de acesso. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${FOTO_ESCRITORIO}")` }}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      <div
        className="relative z-10 w-full max-w-md mx-4 flex flex-col items-center"
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '24px',
          padding: '36px 40px 36px 40px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.4)',
          gap: '0',
        }}
      >
        <img
          src={LOGO}
          alt="Integra&Co"
          style={{ height: '224px', objectFit: 'contain', width: '100%', marginBottom: '8px' }}
        />
        <div
          style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '4px', marginBottom: '24px' }}
          className="uppercase font-bold"
        >
          Sistema Financeiro
        </div>

        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 text-left mb-6">
            <AlertCircle className="text-red-400 shrink-0" size={18} />
            <p className="text-red-400 text-xs font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {sent ? (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="w-full bg-green-500/10 border border-green-500/30 p-5 rounded-xl flex flex-col items-center gap-3 text-center">
              <CheckCircle className="text-green-400" size={32} />
              <p className="text-white text-sm font-medium leading-relaxed">
                Link de acesso enviado!
              </p>
              <p className="text-white/60 text-xs leading-relaxed">
                Verifique sua caixa de entrada em{' '}
                <span className="text-white/80 font-semibold">{email}</span>{' '}
                e clique no link para entrar.
              </p>
            </div>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-white/40 hover:text-white/70 text-xs transition-colors"
            >
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <>
            <div className="w-full mb-4">
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                  size={16}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl py-4 pl-11 pr-4 text-sm focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{ width: '100%', marginBottom: '20px' }}
              className="flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-gray-800 font-bold py-4 px-6 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <span className="uppercase tracking-widest text-xs">Enviar link de acesso</span>
              )}
            </button>
          </>
        )}

        <div
          style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}
          className="text-center uppercase font-bold"
        >
          Acesso restrito aos membros do escritório
        </div>
      </div>
    </div>
  );
}
ENDOFFILE

echo "✅ app/login/page.tsx atualizado"

# ── 2. app/auth/callback/route.ts ─────────────────────────────
cat > app/auth/callback/route.ts << 'ENDOFFILE'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )

  // Magic link (OTP) — token_hash + type=email
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
    if (!error) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }

  // OAuth code exchange (compatibilidade com fluxo anterior)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return new NextResponse(
        `<html>
           <body>
             <script>
               if (window.opener) {
                 window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                 window.close();
               } else {
                 window.location.href = '${origin}';
               }
             </script>
             <p>Autenticação bem-sucedida. Esta janela fechará automaticamente.</p>
           </body>
         </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
}
ENDOFFILE

echo "✅ app/auth/callback/route.ts atualizado"

# ── 3. Adiciona variável ao .env.example (se ainda não existir) ─
if ! grep -q "NEXT_PUBLIC_ACCESS_CLOSED" .env.example 2>/dev/null; then
  cat >> .env.example << 'ENDOFFILE'

# ACCESS_CLOSED: Quando 'true', bloqueia novos cadastros.
# Somente usuários já existentes no Supabase conseguem receber o magic link.
# Para fechar o acesso: defina como true e faça redeploy.
NEXT_PUBLIC_ACCESS_CLOSED=false
ENDOFFILE
  echo "✅ .env.example atualizado com NEXT_PUBLIC_ACCESS_CLOSED"
else
  echo "ℹ️  NEXT_PUBLIC_ACCESS_CLOSED já existe no .env.example, pulando"
fi

# ── 4. Adiciona ao .env.local se existir ──────────────────────
if [ -f .env.local ] && ! grep -q "NEXT_PUBLIC_ACCESS_CLOSED" .env.local; then
  echo "" >> .env.local
  echo "NEXT_PUBLIC_ACCESS_CLOSED=false" >> .env.local
  echo "✅ .env.local atualizado com NEXT_PUBLIC_ACCESS_CLOSED=false"
fi

echo ""
echo "✅ Todas as mudanças aplicadas com sucesso!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Próximos passos:"
echo ""
echo "  1. Teste localmente:   npm run dev"
echo ""
echo "  2. Para fechar acesso a novos usuários após todos entrarem:"
echo "     - Defina NEXT_PUBLIC_ACCESS_CLOSED=true no seu .env / painel de deploy"
echo "     - Faça redeploy"
echo ""
echo "  3. (Recomendado) No Supabase Dashboard:"
echo "     Authentication → Settings → desative 'Enable new user signups'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
