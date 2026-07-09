import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Calendar, CheckCircle2, ClipboardCheck, Clock, FileSpreadsheet, MapPin, Play, Plus, Trash2 } from 'lucide-react';
import { AuditSchedule } from '../types';

interface AuditsManagementViewProps {
  units: { id: string; name: string }[];
}

export default function AuditsManagementView({ units }: AuditsManagementViewProps) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [newUnitId, setNewUnitId] = useState('');
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_schedules')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Erro ao buscar agendamentos:", error);
    }
      
    if (data) {
      setSchedules(data);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitId || !newDate) return;

    const { error } = await supabase.from('audit_schedules').insert([{
      unit_id: newUnitId,
      scheduled_date: newDate,
      status: 'agendado'
    }]);

    if (!error) {
      setIsCreating(false);
      fetchSchedules();
    } else {
      console.error("Supabase error:", error);
      alert("Erro ao criar agendamento: " + error.message);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const updateData: any = { status: newStatus };
    if (newStatus === 'concluido') {
      updateData.completed_at = new Date().toISOString();
    }
    
    await supabase.from('audit_schedules').update(updateData).eq('id', id);
    fetchSchedules();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este agendamento?")) {
      await supabase.from('audit_schedules').delete().eq('id', id);
      fetchSchedules();
    }
  };

  // Funções para ver o relatório poderiam ser implementadas aqui
  // Onde buscaria na tabela `audit_progress`

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <ClipboardCheck className="text-indigo-600" size={32} />
            Gestão de Conferências
          </h2>
          <p className="text-slate-500 mt-1">Agende e gerencie o inventário cíclico das unidades.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
        >
          {isCreating ? 'Cancelar' : <><Plus size={20}/> Novo Agendamento</>}
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 mb-4">Agendar Nova Conferência</h3>
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Unidade Alvo</label>
              <select 
                value={newUnitId} 
                onChange={e => setNewUnitId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                required
              >
                <option value="">Selecione a Unidade</option>
                {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Data da Liberação</label>
              <input 
                type="date" 
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold">
              Confirmar Agendamento
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-4 px-6 font-semibold text-slate-600">Unidade</th>
              <th className="py-4 px-6 font-semibold text-slate-600">Data Agendada</th>
              <th className="py-4 px-6 font-semibold text-slate-600">Status</th>
              <th className="py-4 px-6 font-semibold text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="py-8 text-center text-slate-400">Carregando...</td></tr>
            ) : schedules.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-slate-400">Nenhum agendamento encontrado.</td></tr>
            ) : schedules.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/50">
                <td className="py-4 px-6 font-medium text-slate-800">{s.unit_id}</td>
                <td className="py-4 px-6 text-slate-600">{new Date(s.scheduled_date).toLocaleDateString('pt-BR')}</td>
                <td className="py-4 px-6">
                  {s.status === 'agendado' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock size={14}/> Agendado</span>}
                  {s.status === 'ativo' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800"><Play size={14}/> Ativo / Liberado</span>}
                  {s.status === 'concluido' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 size={14}/> Concluído</span>}
                </td>
                <td className="py-4 px-6 text-right space-x-2">
                  {s.status === 'agendado' && (
                    <button onClick={() => updateStatus(s.id, 'ativo')} className="px-3 py-1.5 text-sm font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg">Liberar Agora</button>
                  )}
                  {s.status === 'ativo' && (
                    <button onClick={() => updateStatus(s.id, 'concluido')} className="px-3 py-1.5 text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg">Encerrar Manualmente</button>
                  )}
                  <button 
                    onClick={() => handleDelete(s.id)} 
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Excluir Agendamento"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
