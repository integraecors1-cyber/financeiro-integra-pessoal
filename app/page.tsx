'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  TrendingUp, 
  Scale, 
  FileText, 
  Settings,
  Plus,
  BarChart3,
  LogOut,
  User as UserIcon
} from 'lucide-react';

import { useFinanceiro } from '@/hooks/useFinanceiro';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { fmt } from '@/lib/utils';
import DashboardView from '@/components/Dashboard';
import DespesasView from '@/components/Despesas';
import PagamentosView from '@/components/Pagamentos';
import ReceitasView from '@/components/Receitas';
import SaldosView from '@/components/Saldos';
import RelatoriosView from '@/components/Relatorios';
import ConfigView from '@/components/Config';
import AnaliseGastosView from '@/components/AnaliseGastos';
import ModalManager from '@/components/modals/ModalManager';

export default function Page() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [modal, setModal] = useState<{ type: string; data?: any } | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  
  const finance = useFinanceiro();

  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const exp = finance.despesas
      .filter((d: any) => !d.deleted && d.data.startsWith(currentMonth))
      .reduce((acc: number, d: any) => acc + d.valor, 0);
    const pag = finance.pagamentos
      .filter((p: any) => !p.deleted && p.data.startsWith(currentMonth))
      .reduce((acc: number, p: any) => acc + p.valor, 0);
    return {
      total: exp + pag,
      despesasSub: exp,
      pagamentosSub: pag
    };
  }, [finance.despesas, finance.pagamentos]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!finance.isLoaded) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0E0E0E]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full"
      />
    </div>
  );

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'despesas', label: 'Despesas', icon: Receipt },
    { id: 'analise', label: 'Análise de Gastos', icon: BarChart3 },
    { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
    { id: 'receitas', label: 'Receitas', icon: TrendingUp },
    { id: 'saldos', label: 'Saldos & Pix', icon: Scale },
    { id: 'relatorios', label: 'Relatórios', icon: FileText },
    { id: 'config', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0E0E0E]">
      {/* Sidebar Navigation */}
      <aside 
        className="w-full md:w-64 flex flex-col"
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.05), 4px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        <div className="p-8 border-b border-[#383838]">
          <img
            src="https://daasnwnaieadvbiqpazy.supabase.co/storage/v1/object/public/assets/Integra%202.png"
            alt="Integra&Co"
            width={160}
            height={48}
            style={{ objectFit: 'contain' }}
          />
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                activeTab === item.id 
                ? 'bg-[#C9A96E] text-[#0E0E0E]' 
                : 'text-[#8A8580] hover:bg-[#242424] hover:text-[#F0EDE8]'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-[#0E0E0E]' : 'group-hover:text-gold'} />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-[#383838] space-y-4">
          <div className="flex items-center gap-3 p-3 bg-[#242424] rounded-xl border border-[#383838]">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-full" alt="User avatar" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center font-bold text-[#0E0E0E] text-xs">
                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-[#F0EDE8] truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Membro'}
              </p>
              <p className="text-[10px] text-[#8A8580] uppercase tracking-wider font-bold truncate">
                {user?.email || 'Acesso Autorizado'}
              </p>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-[#8A8580] hover:text-[#E07070] text-[10px] uppercase font-bold tracking-widest transition-colors"
          >
            <LogOut size={14} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-[#F0EDE8]">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
            <p className="text-sm text-[#8A8580] mt-1">
              Gerencie as finanças do escritório com precisão premium.
            </p>
          </div>

          <div className="flex items-center gap-3">
             <div className="text-right mr-4 hidden md:block">
                <p className="text-[10px] text-[#8A8580] font-bold uppercase tracking-widest mb-0.5">Custo Total do Escritório</p>
                <p className="text-2xl font-serif font-bold text-[#E07070] leading-none">{fmt(stats.total)}</p>
                <p className="text-[10px] text-[#8A8580] font-medium mt-1">
                  Despesas: <span className="text-[#F0EDE8]">{fmt(stats.despesasSub)}</span>  ·  Pagamentos: <span className="text-[#F0EDE8]">{fmt(stats.pagamentosSub)}</span>
                </p>
             </div>
             
             {['despesas', 'pagamentos', 'receitas'].includes(activeTab) && (
               <button 
                onClick={() => setModal({ type: activeTab })}
                className="btn btn-primary"
               >
                 <Plus size={18} />
                 <span>Novo Registro</span>
               </button>
             )}
          </div>
        </header>

        <section className="p-8 pt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <DashboardView finance={finance} onSelectMember={(m: string) => setModal({ type: 'membro_detalhe', data: m })} />}
              {activeTab === 'despesas' && <DespesasView finance={finance} onEdit={(d: any) => setModal({ type: 'despesas', data: d })} onDelete={(d: any) => setModal({ type: 'delete', data: { type: 'despesa', item: d } })} />}
              {activeTab === 'analise' && <AnaliseGastosView finance={finance} />}
              {activeTab === 'pagamentos' && <PagamentosView finance={finance} onEdit={(p: any) => setModal({ type: 'pagamentos', data: p })} onDelete={(p: any) => setModal({ type: 'delete', data: { type: 'pagamento', item: p } })} />}
              {activeTab === 'receitas' && <ReceitasView finance={finance} onEdit={(r: any) => setModal({ type: 'receitas', data: r })} onDelete={(r: any) => setModal({ type: 'delete', data: { type: 'receita', item: r } })} />}
              {activeTab === 'saldos' && <SaldosView finance={finance} />}
              {activeTab === 'relatorios' && <RelatoriosView finance={finance} />}
              {activeTab === 'config' && <ConfigView finance={finance} />}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
      
      {/* Modals */}
      <ModalManager 
        modal={modal} 
        onClose={() => setModal(null)} 
        onOpenModal={(m: any) => setModal(m)}
        finance={finance}
      />
    </div>
  );
}
