import React, { useState } from 'react';
import { Tags, Plus, Edit2, Trash2, X, Laptop, Monitor, Printer, Cpu, Wifi, Archive, AlertCircle } from 'lucide-react';
import { Category, Asset } from '../types';

interface CategoriesViewProps {
  categories: Category[];
  assets: Asset[];
  onCreateCategory: (cat: Omit<Category, 'id'>) => Promise<void>;
  onUpdateCategory: (cat: Category) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export default function CategoriesView({ categories, assets, onCreateCategory, onUpdateCategory, onDeleteCategory }: CategoriesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'Tags'
  });

  const [errorMsg, setErrorMsg] = useState('');

  const getIconComponent = (iconName: string = 'Tags') => {
    switch (iconName) {
      case 'Laptop': return <Laptop size={18} />;
      case 'Monitor': return <Monitor size={18} />;
      case 'Printer': return <Printer size={18} />;
      case 'Cpu': return <Cpu size={18} />;
      case 'Wifi': return <Wifi size={18} />;
      case 'Archive': return <Archive size={18} />;
      default: return <Tags size={18} />;
    }
  };

  const availableIcons = ['Tags', 'Laptop', 'Monitor', 'Printer', 'Cpu', 'Wifi', 'Archive'];

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon: 'Tags' });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, description: cat.description || '', icon: cat.icon || 'Tags' });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleDelete = async (cat: Category) => {
    // Check if in use
    const inUse = assets.some(a => a.category === cat.name);
    if (inUse) {
      alert(`Não é possível excluir a categoria "${cat.name}" porque existem ativos vinculados a ela.`);
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja excluir a categoria "${cat.name}"?`)) {
      await onDeleteCategory(cat.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingCategory) {
        await onUpdateCategory({ ...editingCategory, ...formData });
      } else {
        await onCreateCategory(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg('Erro ao salvar categoria. O nome pode já existir.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Tags className="text-indigo-700" size={28} />
            Categorias de Inventário
          </h2>
          <p className="text-slate-500 mt-1">Gerencie os níveis e divisórios corporativos regulados para depreciação fiscal.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Nova Categoria
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 tracking-wider">
              <th className="p-4 font-bold">Categoria</th>
              <th className="p-4 font-bold">Descrição</th>
              <th className="p-4 font-bold text-center">Ativos Vinculados</th>
              <th className="p-4 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {categories.map(cat => {
              const count = assets.filter(a => a.category === cat.name).length;
              return (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        {getIconComponent(cat.icon)}
                      </div>
                      <span className="font-bold text-slate-800">{cat.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">{cat.description || '-'}</td>
                  <td className="p-4 text-center">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                      {count} ativos
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenEdit(cat)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(cat)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  Nenhuma categoria cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={16} /></button>
            </div>

            {errorMsg && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-start gap-2 border border-red-100">
                <AlertCircle size={16} className="mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nome da Categoria *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none min-h-[80px]"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Ícone Representativo</label>
                <div className="flex flex-wrap gap-2">
                  {availableIcons.map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon: iconName }))}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-colors ${
                        formData.icon === iconName 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {getIconComponent(iconName)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-4 border-t border-slate-100 mt-6">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="w-1/2 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200"
              >
                Salvar Categoria
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
