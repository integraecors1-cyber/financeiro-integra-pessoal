'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FOTO_ESCRITORIO = "https://daasnwnaieadvbiqpazy.supabase.co/storage/v1/object/public/assets/DSC08643.jpg";
  const LOGO = "https://daasnwnaieadvbiqpazy.supabase.co/storage/v1/object/public/assets/Integra%202.png?v=2";

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      // Mensagem genérica — não revela se o e-mail existe ou não
      setError('E-mail ou senha incorretos.');
      setLoading(false);
      return;
    }

    // Supabase atualiza a sessão — middleware redireciona para /
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
          padding: '36px 40px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.4)',
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
          <div className="w-full bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 text-left mb-4">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
            <p className="text-red-400 text-xs font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* E-mail */}
        <div className="w-full mb-3">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
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

        {/* Senha */}
        <div className="w-full mb-5">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="senha"
              autoComplete="current-password"
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl py-4 pl-11 pr-12 text-sm focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-gray-800 font-bold py-4 px-6 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 mb-5"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <span className="uppercase tracking-widest text-xs">Entrar</span>
          )}
        </button>

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
