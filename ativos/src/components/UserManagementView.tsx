import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Profile, UserRole } from '../types';
import { 
  Users, 
  Search, 
  Filter, 
  Edit2, 
  Shield, 
  MapPin, 
  Mail, 
  Calendar,
  X, 
  Check, 
  AlertCircle,
  Loader2,
  UserPlus,
  CheckCircle2,
  Copy,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserManagementViewProps {
  units: any[];
}

export default function UserManagementView({ units }: UserManagementViewProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');
  
  // States for Edit Modal
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [newUnit, setNewUnit] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  // States for Create User Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFullName, setCreateFullName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createTempPassword, setCreateTempPassword] = useState('');
  const [createRole, setCreateRole] = useState<UserRole>('employee');
  const [createUnit, setCreateUnit] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(true);
  const [createdSuccessData, setCreatedSuccessData] = useState<{ email: string; tempPassword: string; fullName: string } | null>(null);
  const [isCopiedCreds, setIsCopiedCreds] = useState(false);

  const generateRandomPassword = () => {
    const prefixes = ['Apoio', 'Mudar', 'Acesso', 'Ativo'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${randomPrefix}@${randomNum}`;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim() || !createTempPassword.trim() || !createFullName.trim()) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (createTempPassword.length < 6) {
      alert("A senha temporária deve conter no mínimo 6 caracteres.");
      return;
    }

    setIsCreating(true);
    try {
      // Cliente isolado com persistSession: false para não afetar o login do administrador atual
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: createEmail.trim(),
        password: createTempPassword,
        options: {
          data: {
            full_name: createFullName.trim(),
            role: createRole,
            unit: createUnit || null,
            must_change_password: true
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Assegura o registro atualizado na tabela profiles
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: createEmail.trim(),
          full_name: createFullName.trim(),
          role: createRole,
          unit: createUnit || null
        });
      }

      setCreatedSuccessData({
        email: createEmail.trim(),
        tempPassword: createTempPassword,
        fullName: createFullName.trim()
      });

      await fetchProfiles();

    } catch (err: any) {
      console.error("Erro ao cadastrar usuário:", err);
      alert(`Falha ao cadastrar: ${err.message || 'Verifique se o e-mail já existe.'}`);
    } finally {
      setIsCreating(false);
    }
  };


  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setProfiles(data as Profile[]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar perfis:', err);
      setMessage({ text: 'Falha ao carregar perfis de usuários.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleEditClick = (profile: Profile) => {
    setEditingProfile(profile);
    setNewRole(profile.role);
    setNewUnit(profile.unit || '');
    setNewFullName(profile.full_name || '');
    setMessage(null);
  };

  const handleSave = async () => {
    if (!editingProfile) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: newFullName,
          role: newRole,
          unit: newUnit || null
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      // Update local state
      setProfiles(prev => 
        prev.map(p => p.id === editingProfile.id ? { ...p, full_name: newFullName, role: newRole, unit: newUnit || undefined } : p)
      );

      setMessage({ text: `Perfil de ${newFullName || editingProfile.email} atualizado com sucesso.`, type: 'success' });
      
      // Auto close modal after a brief moment
      setTimeout(() => {
        setEditingProfile(null);
        setMessage(null);
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err);
      setMessage({ text: `Erro ao salvar: ${err.message || 'Verifique as permissões de administrador.'}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter logic
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = 
      (profile.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRoleFilter === 'all' || profile.role === selectedRoleFilter;
    const matchesUnit = selectedUnitFilter === 'all' || (profile.unit || 'Sem Unidade') === selectedUnitFilter;

    return matchesSearch && matchesRole && matchesUnit;
  });

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-900/50';
      case 'noc':
        return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/50';
      case 'conferente':
        return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-900/50';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'noc':
        return 'Operador NOC';
      case 'conferente':
        return 'Conferente';
      default:
        return 'Colaborador';
    }
  };

  return (
    <div id="users-management-view" className="space-y-6 max-w-7xl mx-auto pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="text-indigo-700 dark:text-indigo-400" size={28} />
            Gestão de Usuários e Permissões
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Controle de papéis, privilégios de acesso e alocação de polos de trabalho.
          </p>
        </div>

        <button 
          id="btn-add-new-user"
          onClick={() => {
            setCreateFullName('');
            setCreateEmail('');
            setCreateTempPassword(generateRandomPassword());
            setCreateRole('employee');
            setCreateUnit('');
            setCreatedSuccessData(null);
            setIsCopiedCreds(false);
            setIsCreateModalOpen(true);
          }}
          className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <UserPlus size={18} />
          + Novo Colaborador
        </button>
      </header>

      {/* Control panel containing Search, Filter options */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:focus:bg-slate-800 outline-none text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1.5 text-xs text-slate-500">
            <Filter size={14} />
            <span className="font-bold uppercase tracking-wider">Filtros</span>
          </div>

          <select 
            value={selectedRoleFilter}
            onChange={e => setSelectedRoleFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">Todas as Funções</option>
            <option value="admin">Administrador</option>
            <option value="noc">Operador NOC</option>
            <option value="employee">Colaborador</option>
            <option value="conferente">Conferente</option>
          </select>

          <select 
            value={selectedUnitFilter}
            onChange={e => setSelectedUnitFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">Todos os Polos</option>
            <option value="Sem Unidade">Sem Polo</option>
            {units.map(unit => (
              <option key={unit.id} value={unit.name}>{unit.name}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Main user list table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-indigo-700" size={36} />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Carregando usuários cadastrados...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-20 text-center text-slate-400 dark:text-slate-500">
            Nenhum usuário correspondente aos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-widest select-none">
                  <th className="py-4 px-6">Nome Completo</th>
                  <th className="py-4 px-6">E-mail</th>
                  <th className="py-4 px-6">Função</th>
                  <th className="py-4 px-6">Polo Alocado</th>
                  <th className="py-4 px-6">Cadastro</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredProfiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 duration-150">
                    <td className="py-4.5 px-6 font-bold text-slate-800 dark:text-slate-100">
                      {profile.full_name || (
                        <span className="text-slate-400 font-normal italic">Não informado</span>
                      )}
                    </td>
                    <td className="py-4.5 px-6 text-slate-600 dark:text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" />
                        {profile.email}
                      </div>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getRoleBadgeColor(profile.role)}`}>
                        {getRoleLabel(profile.role)}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 font-semibold text-slate-700 dark:text-slate-300">
                      {profile.unit ? (
                        <div className="flex items-center gap-1">
                          <MapPin size={13} className="text-indigo-600 dark:text-indigo-400" />
                          <span>{profile.unit}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-normal italic">Geral / Não Definido</span>
                      )}
                    </td>
                    <td className="py-4.5 px-6 text-slate-500 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        <span>
                          {profile.created_at 
                            ? new Date(profile.created_at).toLocaleDateString('pt-BR') 
                            : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      <button 
                        onClick={() => handleEditClick(profile)}
                        className="p-1.5 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer"
                        title="Editar Papel e Polo"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <UserPlus className="text-indigo-600 dark:text-indigo-400" size={22} />
                <h3 className="font-black text-slate-800 dark:text-white text-lg">
                  {createdSuccessData ? 'Acesso Criado com Sucesso' : 'Cadastrar Novo Usuário'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setCreatedSuccessData(null);
                }} 
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            {createdSuccessData ? (
              <div className="p-6 space-y-5 text-center">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <h4 className="text-lg font-black text-slate-800 dark:text-white">
                    Conta criada para {createdSuccessData.fullName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Repasse os dados de acesso abaixo para o colaborador:
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-left space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">E-mail de Login</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white text-sm">{createdSuccessData.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Senha Temporária</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">{createdSuccessData.tempPassword}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-amber-700 dark:text-amber-400">
                    ℹ️ O colaborador será obrigado a definir sua senha definitiva logo após entrar.
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `🔐 *Acesso ao Sistema Ativos Apoio*\nOlá, *${createdSuccessData.fullName}*! Seu acesso ao sistema corporativo de patrimônio foi criado com sucesso.\n\n🌐 *Link de Acesso:* ${window.location.origin}\n👤 *E-mail:* ${createdSuccessData.email}\n🔑 *Senha Temporária:* ${createdSuccessData.tempPassword}\n\n⚠️ _Importante: No primeiro acesso, o sistema exigirá que você defina sua senha definitiva pessoal._`;
                      navigator.clipboard.writeText(msg);
                      setIsCopiedCreds(true);
                      setTimeout(() => setIsCopiedCreds(false), 2000);
                    }}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    <Copy size={15} />
                    <span>{isCopiedCreds ? 'Dados Copiados!' : 'Copiar para WhatsApp'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreatedSuccessData(null);
                    }}
                    className="py-3 px-5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateUser}>
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Nome Completo *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={createFullName}
                      onChange={e => setCreateFullName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-white font-semibold transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Endereço de E-mail *
                    </label>
                    <input 
                      type="email" 
                      required
                      value={createEmail}
                      onChange={e => setCreateEmail(e.target.value)}
                      placeholder="joao.silva@redesaoroque.com.br"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-white font-semibold transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Senha Temporária *
                      </label>
                      <button
                        type="button"
                        onClick={() => setCreateTempPassword(generateRandomPassword())}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={11} /> Gerar Aleatória
                      </button>
                    </div>

                    <div className="relative">
                      <input 
                        type={showTempPassword ? 'text' : 'password'} 
                        required
                        value={createTempPassword}
                        onChange={e => setCreateTempPassword(e.target.value)}
                        placeholder="Ex: Apoio@2026"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-white font-mono font-semibold transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTempPassword(!showTempPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showTempPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      O usuário será obrigado a criar sua senha definitiva pessoal logo no primeiro acesso.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Função (Permissão)</label>
                      <select 
                        value={createRole}
                        onChange={e => setCreateRole(e.target.value as UserRole)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-indigo-600 text-slate-800 dark:text-white"
                      >
                        <option value="employee">Colaborador</option>
                        <option value="conferente">Conferente</option>
                        <option value="noc">Operador NOC</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Polo de Trabalho</label>
                      <select 
                        value={createUnit}
                        onChange={e => setCreateUnit(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-indigo-600 text-slate-800 dark:text-white"
                      >
                        <option value="">Acesso Geral (Todos)</option>
                        {units.map(unit => (
                          <option key={unit.id} value={unit.name}>{unit.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                  <button 
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isCreating}
                    className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isCreating}
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Criando Usuário...
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        Criar Usuário
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Edit User Modal Overlay */}
      {editingProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Shield className="text-indigo-600 dark:text-indigo-400" size={20} />
                <h3 className="font-black text-slate-800 dark:text-white text-lg">Alterar Privilégios</h3>
              </div>
              <button 
                onClick={() => setEditingProfile(null)} 
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* User Metadata / Form Input fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-755 text-slate-700 dark:text-slate-300 uppercase tracking-wider">Nome Completo</label>
                  <input 
                    type="text" 
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    placeholder="Nome completo do colaborador"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-white font-semibold transition-all"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{editingProfile.email}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nível de Permissão (Função)</label>
                  <select 
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-white"
                  >
                    <option value="employee">Colaborador (Visualização e Inventário)</option>
                    <option value="conferente">Conferente (Auditorias em Campo)</option>
                    <option value="noc">Operador NOC (Apenas Monitoramento do Painel NOC)</option>
                    <option value="admin">Administrador (Controle Total)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Unidade Administrativa Principal</label>
                  <select 
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-white"
                  >
                    <option value="">Acesso Geral (Sem restrição de Polo)</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.name}>{unit.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Alert Feedback messaging */}
              {message && (
                <div className={`p-4 rounded-2xl flex items-start gap-3 border text-xs font-medium animate-fade-in ${
                  message.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400' 
                    : 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400'
                }`}>
                  {message.type === 'success' ? <Check size={16} className="shrink-0 text-emerald-600" /> : <AlertCircle size={16} className="shrink-0 text-rose-600" />}
                  <span>{message.text}</span>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <button 
                onClick={() => setEditingProfile(null)}
                disabled={isSaving}
                className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-1/2 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow inline-flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
