'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FOTO_ESCRITORIO = "https://daasnwnaieadvbiqpazy.supabase.co/storage/v1/object/public/assets/DSC08643.jpg"
  const LOGO = "https://daasnwnaieadvbiqpazy.supabase.co/storage/v1/object/public/assets/Integra%202.png?v=2"

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Use a popup as Google blocks redirects within iframes (AI Studio preview)
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url,
          'google_auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          setError('O bloqueador de popups impediu a autenticação. Por favor, permita popups.');
          setLoading(false);
          return;
        }

        // Poll for popup closing or session success
        const timer = setInterval(async () => {
          if (popup.closed) {
            clearInterval(timer);
            setLoading(false);
            // Verify if session was established
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              window.location.href = '/';
            }
          }
        }, 1000);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Erro ao conectar com Google. Verifique se as chaves API estão configuradas.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s]" 
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
          gap: '0'
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

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ width: '100%', marginBottom: '20px' }}
          className="flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-gray-800 font-bold py-4 px-6 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              <span className="uppercase tracking-widest text-xs">Entrar com Google</span>
            </>
          )}
        </button>
        
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }} className="text-center uppercase font-bold">
          Acesso restrito aos membros do escritório
        </div>
      </div>
    </div>
  );
}
