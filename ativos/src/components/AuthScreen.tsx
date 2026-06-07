import React, { useState } from 'react';
import { Briefcase, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg('Conta criada! Verifique seu e-mail para confirmar (caso esteja habilitado).');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6 select-none">
          <span className="bg-gradient-to-tr from-indigo-700 to-indigo-500 w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold shadow-lg relative overflow-hidden">
            <Briefcase size={24} />
            <span className="absolute inset-0 bg-white/10 animate-pulse duration-1000" />
          </span>
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">Ativos Apoio</h1>
            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-0.5">Controladoria Técnica</p>
          </div>
        </div>

        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          {isLogin ? 'Acesso ao Sistema' : 'Criar Nova Conta'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {isLogin ? 'Ou ' : 'Já possui conta? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="font-bold text-indigo-600 hover:text-indigo-500 hover:underline transition-all outline-none"
          >
            {isLogin ? 'cadastre sua conta agora' : 'fazer login'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-200 sm:rounded-3xl sm:px-10 animate-fade-in relative overflow-hidden">
          {/* Decal background */}
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-50 rounded-full blur-2xl opacity-50 pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-50 rounded-full blur-2xl opacity-50 pointer-events-none" />

          <form className="space-y-6 relative z-10" onSubmit={handleAuth}>
            
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {successMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Endereço de E-mail
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-sm font-semibold transition-all"
                  placeholder="admin@ativosapoio.com.br"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Senha de Acesso
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-sm font-semibold transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600 cursor-pointer">
                    Lembrar de mim
                  </label>
                </div>

                <div className="text-xs">
                  <a href="#" className="font-bold text-indigo-600 hover:text-indigo-500 hover:underline">
                    Esqueceu a senha?
                  </a>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Processando...
                  </>
                ) : (
                  <>
                    {isLogin ? 'Acessar Plataforma' : 'Finalizar Cadastro'} <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
