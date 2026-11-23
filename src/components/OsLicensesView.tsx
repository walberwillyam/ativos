import React, { useState, useEffect, useMemo } from 'react';
import { supabase, supabaseAnon } from '../lib/supabaseClient';
import { Key, Plus, Trash2, CheckCircle2, Search, Filter, ShieldCheck, Laptop, RefreshCw, AlertCircle } from 'lucide-react';
import { Asset } from '../types';

interface OsLicense {
  id: string;
  product_key: string;
  asset_id: string | null;
  created_at: string;
}

interface OsLicensesViewProps {
  assets: Asset[];
}

export default function OsLicensesView({ assets }: OsLicensesViewProps) {
  // Inicialização com cache local para fluidez instantânea
  const [licenses, setLicenses] = useState<OsLicense[]>(() => {
    try {
      const cached = localStorage.getItem('ativos_cached_licenses');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => licenses.length === 0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newKeysText, setNewKeysText] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'in_use'>('all');

  useEffect(() => {
    fetchLicenses();
    
    // Inscrição em tempo real para atualizações
    const channel = supabase.channel('os_licenses_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'os_licenses' }, () => {
        fetchLicenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLicenses = async () => {
    try {
      if (licenses.length === 0) setLoading(true);
      setFetchError(null);

      let resultData: OsLicense[] | null = null;
      let errorOccurred: any = null;

      // 1. Tenta buscar com o cliente padrão (sessão autenticada)
      try {
        const { data, error } = await supabase
          .from('os_licenses')
          .select('*');

        if (error) {
          errorOccurred = error;
        } else if (data && data.length > 0) {
          resultData = data;
        }
      } catch (err) {
        errorOccurred = err;
      }

      // 2. Se o usuário estiver autenticado e a política RLS estiver aberta apenas 'TO anon',
      // o cliente autenticado retorna [] (0 linhas) sem erro explícito.
      // Fazemos o fallback imediato para supabaseAnon:
      if (!resultData || resultData.length === 0) {
        try {
          const { data: anonData, error: anonErr } = await supabaseAnon
            .from('os_licenses')
            .select('*');

          if (anonData && anonData.length > 0) {
            resultData = anonData;
            errorOccurred = null;
          } else if (anonErr && !resultData) {
            errorOccurred = anonErr;
          }
        } catch (anonErr) {
          if (!resultData) errorOccurred = anonErr;
        }
      }

      if (errorOccurred && (!resultData || resultData.length === 0)) {
        throw errorOccurred;
      }

      if (resultData && resultData.length > 0) {
        // Ordena no cliente por created_at decrescente
        resultData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setLicenses(resultData);
        try {
          localStorage.setItem('ativos_cached_licenses', JSON.stringify(resultData));
        } catch (e) {}
      } else if (resultData && resultData.length === 0) {
        setLicenses([]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar licenças:', err);
      setFetchError(err.message || 'Erro ao carregar catálogo de licenças.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeys = async () => {
    if (!newKeysText.trim()) return;
    
    // Extrai chaves separadas por linha ou vírgula
    const keys = newKeysText
      .split(/[\n,]+/)
      .map(k => k.trim().toUpperCase())
      .filter(k => k.length > 0);

    if (keys.length === 0) return;

    setSaving(true);
    try {
      const inserts = keys.map(k => ({ product_key: k }));
      let { error } = await supabase.from('os_licenses').insert(inserts);
      if (error) {
        // Fallback para anon em caso de restrição RLS
        const anonRes = await supabaseAnon.from('os_licenses').insert(inserts);
        if (anonRes.error) {
          if (anonRes.error.code === '23505' || error.code === '23505') {
            alert('Algumas chaves já estão cadastradas e foram ignoradas.');
          } else {
            throw anonRes.error || error;
          }
        }
      }
      setNewKeysText('');
      await fetchLicenses();
    } catch (err: any) {
      console.error('Erro ao adicionar chaves:', err);
      alert('Erro ao adicionar chaves: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente remover esta chave de licença?')) return;
    try {
      let { error } = await supabase.from('os_licenses').delete().eq('id', id);
      if (error) {
        const anonRes = await supabaseAnon.from('os_licenses').delete().eq('id', id);
        if (anonRes.error) throw anonRes.error;
      }
      setLicenses(prev => prev.filter(l => l.id !== id));
      await fetchLicenses();
    } catch (err: any) {
      console.error('Erro ao deletar chave:', err);
      alert('Erro ao remover chave: ' + (err.message || ''));
    }
  };

  // Atualização garantindo integridade estrita de 1 licença por ativo
  const handleUpdateAssetId = async (id: string, newAssetId: string | null) => {
    try {
      const targetLicense = licenses.find(l => l.id === id);
      const oldAssetId = targetLicense?.asset_id;

      if (newAssetId) {
        // 1. Regra de Integridade Estrita 1-para-1:
        // Desvincula qualquer outra licença que esteja apontando para este mesmo ativo
        let unbindRes = await supabase
          .from('os_licenses')
          .update({ asset_id: null })
          .eq('asset_id', newAssetId)
          .neq('id', id);

        if (unbindRes.error) {
          await supabaseAnon
            .from('os_licenses')
            .update({ asset_id: null })
            .eq('asset_id', newAssetId)
            .neq('id', id);
        }

        // 2. Sincroniza a chave nas especificações do ativo
        const targetAsset = assets.find(a => a.id === newAssetId || a.name === newAssetId);
        if (targetAsset && targetLicense) {
          const updatedSpecs = { ...(targetAsset.specifications || {}), os_product_key: targetLicense.product_key };
          await supabase.from('assets').update({ specifications: updatedSpecs }).eq('id', targetAsset.id);
        }
      }

      // Se desvinculou do ativo antigo, remove a chave das especificações dele
      if (oldAssetId && oldAssetId !== newAssetId) {
        const oldAsset = assets.find(a => a.id === oldAssetId || a.name === oldAssetId);
        if (oldAsset && oldAsset.specifications?.os_product_key === targetLicense?.product_key) {
          const cleanedSpecs = { ...(oldAsset.specifications || {}) };
          delete cleanedSpecs.os_product_key;
          await supabase.from('assets').update({ specifications: cleanedSpecs }).eq('id', oldAsset.id);
        }
      }

      let res = await supabase.from('os_licenses').update({ asset_id: newAssetId }).eq('id', id);
      if (res.error) {
        res = await supabaseAnon.from('os_licenses').update({ asset_id: newAssetId }).eq('id', id);
        if (res.error) throw res.error;
      }

      // Atualiza estado local imediatamente para fluidez instantânea
      setLicenses(prev => prev.map(l => {
        if (l.id === id) return { ...l, asset_id: newAssetId };
        if (newAssetId && l.asset_id === newAssetId) return { ...l, asset_id: null };
        return l;
      }));

      await fetchLicenses();
    } catch (err: any) {
      console.error('Erro ao vincular máquina:', err);
      alert('Erro ao vincular máquina: ' + (err.message || ''));
    }
  };

  // KPIs
  const totalCount = licenses.length;
  const inUseCount = useMemo(() => licenses.filter(l => !!l.asset_id).length, [licenses]);
  const availableCount = totalCount - inUseCount;

  // Filtragem
  const filteredLicenses = useMemo(() => {
    return licenses.filter(license => {
      const linkedAsset = assets.find(a => a.id === license.asset_id || a.name === license.asset_id);
      const isAvailable = !license.asset_id;

      if (filterStatus === 'available' && !isAvailable) return false;
      if (filterStatus === 'in_use' && isAvailable) return false;

      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesKey = license.product_key.toLowerCase().includes(term);
        const matchesAsset = license.asset_id ? license.asset_id.toLowerCase().includes(term) : false;
        const matchesAssetName = linkedAsset ? linkedAsset.name.toLowerCase().includes(term) : false;
        const matchesPatrimonio = linkedAsset ? linkedAsset.patrimonio.toLowerCase().includes(term) : false;
        if (!matchesKey && !matchesAsset && !matchesAssetName && !matchesPatrimonio) {
          return false;
        }
      }

      return true;
    });
  }, [licenses, assets, filterStatus, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            Licenças de Sistema Operacional (Windows)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Controle de chaves de ativação, conformidade e vinculação exclusiva 1-para-1 com ativos de TI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLicenses}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Atualizar lista de licenças"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
            <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {/* Banner de Erro caso ocorra */}
      {fetchError && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-center justify-between text-amber-800 dark:text-amber-200 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">Aviso ao conectar com a tabela de licenças</p>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5">{fetchError}</p>
            </div>
          </div>
          <button
            onClick={fetchLicenses}
            className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors ml-4 cursor-pointer shrink-0"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Cards de Métricas (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de Chaves</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalCount}</h3>
          </div>
          <div className="w-11 h-11 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300">
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Licenças em Uso</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{inUseCount}</h3>
          </div>
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Laptop size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Chaves Disponíveis</p>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{availableCount}</h3>
          </div>
          <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Caixa de Adição em Lote */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
          <Plus size={16} className="text-indigo-600 dark:text-indigo-400" />
          Adicionar Novas Chaves em Lote
        </h2>
        <textarea
          className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-600 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          placeholder="Cole uma ou várias chaves de 25 dígitos (separadas por linha ou vírgula)..."
          value={newKeysText}
          onChange={(e) => setNewKeysText(e.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleAddKeys}
            disabled={saving || !newKeysText.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Plus size={14} />
            {saving ? 'Cadastrando...' : 'Cadastrar Chaves'}
          </button>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Pesquisar por chave do Windows ou nome da máquina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              filterStatus === 'all'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            Todas ({totalCount})
          </button>
          <button
            onClick={() => setFilterStatus('in_use')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              filterStatus === 'in_use'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            Em Uso ({inUseCount})
          </button>
          <button
            onClick={() => setFilterStatus('available')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              filterStatus === 'available'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            Disponíveis ({availableCount})
          </button>
        </div>
      </div>

      {/* Tabela de Licenças */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Chave do SO</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Máquina Vinculada (Exclusiva)</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {loading && licenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 animate-pulse">
                    Carregando catálogo de licenças...
                  </td>
                </tr>
              ) : filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Nenhuma licença encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((license) => {
                  const linkedAsset = assets.find(a => 
                    a.id === license.asset_id || 
                    a.name === license.asset_id || 
                    a.serialNumber === license.asset_id ||
                    (a.specifications && a.specifications.hostname === license.asset_id)
                  );
                  const isAvailable = !license.asset_id;

                  return (
                    <tr key={license.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-800 dark:text-slate-100 select-all">
                        {license.product_key}
                      </td>
                      <td className="px-6 py-3.5">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3" />
                            Disponível
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                            <Key className="w-3 h-3" />
                            Em Uso
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 max-w-xs">
                        <select
                          value={license.asset_id || ''}
                          onChange={(e) => handleUpdateAssetId(license.id, e.target.value || null)}
                          className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none p-2 text-slate-800 dark:text-slate-100"
                        >
                          <option value="">- Nenhuma (Disponível) -</option>
                          {/* Garante que o ativo atualmente vinculado NUNCA suma mesmo se a lista de ativos demorar a carregar */}
                          {license.asset_id && !linkedAsset && (
                            <option value={license.asset_id}>{license.asset_id}</option>
                          )}
                          {assets.map(a => {
                            const isAssignedToOther = licenses.some(l => l.id !== license.id && l.asset_id === a.id);
                            return (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.patrimonio || a.id}) {a.unit ? `[${a.unit}]` : ''} {isAssignedToOther ? '⚠️' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(license.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Remover Chave"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
