import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ShieldCheck, Lock, Eye, EyeOff, Loader2, ArrowRight, LogOut, Check, AlertCircle } from 'lucide-react';

interface ForcePasswordChangeViewProps {
  userEmail: string;
  userName?: string;
  onPasswordChanged: () => void;
  onLogout: () => void;
}

export default function ForcePasswordChangeView({
  userEmail,
  userName,
  onPasswordChanged,
  onLogout
}: ForcePasswordChangeViewProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isMinLength = newPassword.length >= 6;
  const isMatching = newPassword !== '' && newPassword === confirmPassword;
  const isValid = isMinLength && isMatching;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Atualiza a senha no Supabase Auth e desmarca a flag de primeiro acesso
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false
        }
      });

      if (error) throw error;

      setSuccessMsg('Senha definitiva cadastrada com sucesso! Entrando na plataforma...');
      
      setTimeout(() => {
        onPasswordChanged();
      }, 1200);

    } catch (err: any) {
      console.error('Erro ao atualizar senha:', err);
      setErrorMsg(err.message || 'Falha ao salvar a nova senha. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-600 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo / Badge */}
        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-700 to-indigo-500 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-200 mb-4 relative">
          <ShieldCheck size={32} />
        </div>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Primeiro Acesso Detectado
        </h2>
        <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
          Olá, <strong className="text-slate-800">{userName || 'Colaborador'}</strong>! Você está utilizando uma senha temporária.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-slate-200 sm:rounded-3xl sm:px-10 relative overflow-hidden">
          
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-6 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Por medidas de segurança corporativa, é <strong>obrigatório</strong> definir sua senha pessoal e definitiva para continuar navegando.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <Check size={16} className="text-emerald-600" />
                {successMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail Corporativo
              </label>
              <input
                type="text"
                disabled
                value={userEmail}
                className="block w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed select-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nova Senha Definitiva
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Checklist de Validação */}
            <div className="space-y-1.5 text-[11px] text-slate-500 pt-1">
              <div className={`flex items-center gap-1.5 ${isMinLength ? 'text-emerald-600 font-bold' : ''}`}>
                <Check size={12} className={isMinLength ? 'text-emerald-600' : 'text-slate-300'} />
                <span>Pelo menos 6 caracteres</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isMatching ? 'text-emerald-600 font-bold' : ''}`}>
                <Check size={12} className={isMatching ? 'text-emerald-600' : 'text-slate-300'} />
                <span>As senhas conferem</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition active:scale-[0.98] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Salvando Nova Senha...
                  </>
                ) : (
                  <>
                    Salvar Senha e Acessar Plataforma <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
              >
                <LogOut size={13} /> Sair da conta
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

