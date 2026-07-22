import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Key, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
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
  const [licenses, setLicenses] = useState<OsLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeysText, setNewKeysText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLicenses();
    
    // Subscribe to changes
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
      setLoading(true);
      const { data, error } = await supabase
        .from('os_licenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLicenses(data || []);
    } catch (err) {
      console.error('Error fetching licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeys = async () => {
    if (!newKeysText.trim()) return;
    
    // Extract keys separated by lines or commas
    const keys = newKeysText
      .split(/[\n,]+/)
      .map(k => k.trim().toUpperCase())
      .filter(k => k.length > 0);

    if (keys.length === 0) return;

    setSaving(true);
    try {
      const inserts = keys.map(k => ({ product_key: k }));
      const { error } = await supabase.from('os_licenses').insert(inserts);
      if (error) {
        if (error.code === '23505') {
          alert('Algumas chaves já estão cadastradas e foram ignoradas.');
        } else {
          throw error;
        }
      }
      setNewKeysText('');
      await fetchLicenses();
    } catch (err: any) {
      console.error('Error adding keys:', err);
      alert('Erro ao adicionar chaves. ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente remover esta chave?')) return;
    try {
      const { error } = await supabase.from('os_licenses').delete().eq('id', id);
      if (error) throw error;
      await fetchLicenses();
    } catch (err: any) {
      console.error('Error deleting key:', err);
      alert('Erro ao remover chave.');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Key className="w-6 h-6 text-indigo-600" />
          Licenças Windows
        </h1>
        <p className="text-slate-600 mt-1">Gerencie as chaves de ativação e visualize em quais máquinas estão instaladas.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Adicionar Chaves em Lote</h2>
        <textarea
          className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Cole as chaves aqui (uma por linha ou separadas por vírgula)..."
          value={newKeysText}
          onChange={(e) => setNewKeysText(e.target.value)}
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAddKeys}
            disabled={saving || !newKeysText.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Adicionando...' : 'Adicionar Chaves'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Chave do SO</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Máquina Vinculada</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    Carregando licenças...
                  </td>
                </tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma licença cadastrada.
                  </td>
                </tr>
              ) : (
                licenses.map((license) => {
                  const linkedAsset = assets.find(a => a.id === license.asset_id);
                  const isAvailable = !license.asset_id;

                  return (
                    <tr key={license.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-slate-800">
                        {license.product_key}
                      </td>
                      <td className="px-6 py-4">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Disponível
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            <Key className="w-3.5 h-3.5" />
                            Em Uso
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isAvailable ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">
                              {linkedAsset ? linkedAsset.name : 'Ativo Desconhecido'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {linkedAsset ? linkedAsset.patrimonio : license.asset_id}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(license.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
