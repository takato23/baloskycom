import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Eye, EyeOff, Wand2 } from 'lucide-react';
import { api } from '@/services/api';
import { Campaign, SupporterMessage, Product, Membership, Idea } from '@/types';
import { Modal } from '@/components/Modal';

export default function AdminDashboard({ defaultTab = 'overview' }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [messages, setMessages] = useState<SupporterMessage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Partial<Membership> | null>(null);

  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Partial<Idea> | null>(null);
  const [ideaTagsInput, setIdeaTagsInput] = useState('');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, m, p, mem, i] = await Promise.all([
          api.getCampaigns(),
          api.getMessages(),
          api.getProducts(),
          api.getMemberships(),
          api.getIdeas()
        ]);
        setCampaigns(c);
        setMessages(m);
        setProducts(p);
        setMemberships(mem);
        setIdeas(i);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleApproveMessage = async (id: string, isApproved: boolean) => {
    try {
      await api.approveMessage(id, isApproved);
      setMessages(messages.map(m => m.id === id ? { ...m, isApproved } : m));
    } catch (error) {
      console.error('Error approving message:', error);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    try {
      if (editingCampaign.id) {
        const updated = await api.updateCampaign(editingCampaign.id, editingCampaign);
        setCampaigns(campaigns.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await api.createCampaign(editingCampaign);
        setCampaigns([...campaigns, created]);
      }
      setIsCampaignModalOpen(false);
      setEditingCampaign(null);
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      if (editingProduct.id) {
        const updated = await api.updateProduct(editingProduct.id, editingProduct);
        setProducts(products.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await api.createProduct(editingProduct);
        setProducts([...products, created]);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleSaveMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMembership) return;
    try {
      if (editingMembership.id) {
        const updated = await api.updateMembership(editingMembership.id, editingMembership);
        setMemberships(memberships.map(m => m.id === updated.id ? updated : m));
      } else {
        const created = await api.createMembership(editingMembership);
        setMemberships([...memberships, created]);
      }
      setIsMembershipModalOpen(false);
      setEditingMembership(null);
    } catch (error) {
      console.error('Error saving membership:', error);
    }
  };

  const openIdeaModal = (idea: Partial<Idea> | null) => {
    if (idea === null) {
      setEditingIdea({ active: true, featured: false, sortOrder: 0 });
      setIdeaTagsInput('');
    } else {
      setEditingIdea(idea);
      setIdeaTagsInput((idea.tags || []).join(', '));
    }
    setIsIdeaModalOpen(true);
  };

  const handleSaveIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdea) return;
    try {
      const payload: Partial<Idea> = {
        ...editingIdea,
        tags: ideaTagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      };
      if (editingIdea.id) {
        const updated = await api.updateIdea(editingIdea.id, payload);
        setIdeas(ideas.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        const created = await api.createIdea(payload);
        setIdeas([...ideas, created]);
      }
      setIsIdeaModalOpen(false);
      setEditingIdea(null);
      setIdeaTagsInput('');
    } catch (error) {
      console.error('Error saving idea:', error);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (window.confirm('¿Eliminar esta idea?')) {
      try {
        await api.deleteIdea(id);
        setIdeas(ideas.filter((i) => i.id !== id));
      } catch (error) {
        console.error('Error deleting idea:', error);
      }
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta misión?')) {
      try {
        await api.deleteCampaign(id);
        setCampaigns(campaigns.filter(c => c.id !== id));
      } catch (error) {
        console.error('Error deleting campaign:', error);
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        await api.deleteProduct(id);
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleDeleteMembership = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta membresía?')) {
      try {
        await api.deleteMembership(id);
        setMemberships(memberships.filter(m => m.id !== id));
      } catch (error) {
        console.error('Error deleting membership:', error);
      }
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
      try {
        await api.deleteMessage(id);
        setMessages(messages.filter(m => m.id !== id));
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  if (isLoading) {
    return <div className="text-white">Cargando...</div>;
  }

  return (
    <div className="space-y-8">
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold text-white">Resumen</h2>
          <p className="text-sm text-zinc-400 max-w-3xl">
            Usá este panel para manejar campañas, productos, membresías, mensajes y la configuración pública del sitio.
            El acceso admin ahora se configura aparte y ya no se mezcla con una sección falsa de usuarios.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-zinc-400 font-medium mb-2">Recaudación Total</h3>
              <p className="text-3xl font-bold text-white">
                ${campaigns.reduce((sum, c) => sum + c.currentAmount, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-zinc-400 font-medium mb-2">Mensajes Pendientes</h3>
              <p className="text-3xl font-bold text-white">
                {messages.filter(m => !m.isApproved).length}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-zinc-400 font-medium mb-2">Misiones Activas</h3>
              <p className="text-3xl font-bold text-white">
                {campaigns.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-white">Misiones</h2>
            <button 
              onClick={() => { setEditingCampaign({}); setIsCampaignModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Misión
            </button>
          </div>
          
          <div className="grid gap-4">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{campaign.title}</h3>
                  <p className="text-zinc-400 text-sm mt-1">
                    ${campaign.currentAmount.toLocaleString()} de ${campaign.targetAmount.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingCampaign(campaign); setIsCampaignModalOpen(true); }}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-white">Productos</h2>
            <button 
              onClick={() => { setEditingProduct({}); setIsProductModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Producto
            </button>
          </div>
          
          <div className="grid gap-4">
            {products.map(product => (
              <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{product.title}</h3>
                  <p className="text-zinc-400 text-sm mt-1">
                    ${product.price.toLocaleString()} • {product.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memberships Tab */}
      {activeTab === 'memberships' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-white">Membresías</h2>
            <button 
              onClick={() => { setEditingMembership({}); setIsMembershipModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Membresía
            </button>
          </div>
          
          <div className="grid gap-4">
            {memberships.map(membership => (
              <div key={membership.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{membership.name}</h3>
                  <p className="text-zinc-400 text-sm mt-1">
                    ${membership.price.toLocaleString()} / {membership.billingPeriod === 'monthly' ? 'mes' : 'año'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingMembership(membership); setIsMembershipModalOpen(true); }}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteMembership(membership.id)}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ideas Tab */}
      {activeTab === 'ideas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-bold text-white">Ideas</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Webapps, investigaciones de ChatGPT, experimentos — cada idea es una tarjeta que linkea afuera.
              </p>
            </div>
            <button
              onClick={() => openIdeaModal(null)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Idea
            </button>
          </div>

          <div className="grid gap-4">
            {ideas.map(idea => (
              <div key={idea.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white truncate">{idea.title}</h3>
                    {idea.featured && (
                      <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-[10px] font-bold rounded-full uppercase tracking-wide">Destacada</span>
                    )}
                    {!idea.active && (
                      <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-full uppercase tracking-wide">Oculta</span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm mt-1 truncate">
                    {idea.category ? `${idea.category} • ` : ''}{idea.url}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={idea.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Abrir"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => openIdeaModal(idea)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteIdea(idea.id)}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {ideas.length === 0 && (
              <div className="border border-dashed border-zinc-800 rounded-2xl p-10 text-center text-sm text-zinc-500">
                Todavía no publicaste ninguna idea.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold text-white">Mensajes</h2>
          <div className="grid gap-4">
            {messages.map(msg => (
              <div key={msg.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-white">{msg.isAnonymous ? 'Anónimo' : msg.supporterName}</span>
                      <span className="text-violet-400 font-medium">${msg.amount.toLocaleString()}</span>
                      {!msg.isApproved && (
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded-full">
                          Pendiente
                        </span>
                      )}
                      {msg.message.includes('[ENCARGO MÁGICO]') && (
                        <span className="px-2 py-0.5 bg-fuchsia-500/20 text-fuchsia-400 text-xs font-bold rounded-full flex items-center gap-1">
                          <Wand2 className="w-3 h-3" />
                          Encargo
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {msg.isApproved ? (
                      <button 
                        onClick={() => handleApproveMessage(msg.id, false)}
                        className="p-2 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                        title="Ocultar"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleApproveMessage(msg.id, true)}
                        className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                        title="Aprobar"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Creator Response Section */}
                <div className="mt-2 pt-4 border-t border-zinc-800">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-400">Tu respuesta:</label>
                    <textarea 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                      rows={2}
                      placeholder="Escribe una respuesta pública a este mensaje..."
                      defaultValue={msg.creatorResponse || ''}
                      onBlur={async (e) => {
                        const newResponse = e.target.value;
                        if (newResponse !== msg.creatorResponse) {
                          try {
                            await api.updateMessageResponse(msg.id, newResponse);
                            setMessages(messages.map(m => m.id === msg.id ? { ...m, creatorResponse: newResponse } : m));
                          } catch (error) {
                            console.error('Error updating response:', error);
                          }
                        }
                      }}
                    />
                    <p className="text-xs text-zinc-500">La respuesta se guardará automáticamente al salir del campo de texto.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      <Modal 
        isOpen={isCampaignModalOpen} 
        onClose={() => { setIsCampaignModalOpen(false); setEditingCampaign(null); }}
        title={editingCampaign?.id ? 'Editar Misión' : 'Nueva Misión'}
      >
        <form onSubmit={handleSaveCampaign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Título</label>
            <input 
              type="text" 
              required
              value={editingCampaign?.title || ''}
              onChange={e => setEditingCampaign({ ...editingCampaign, title: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
            <textarea 
              required
              value={editingCampaign?.shortDescription || ''}
              onChange={e => setEditingCampaign({ ...editingCampaign, shortDescription: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Meta ($)</label>
              <input 
                type="number" 
                required
                value={editingCampaign?.targetAmount || ''}
                onChange={e => setEditingCampaign({ ...editingCampaign, targetAmount: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Recaudado ($)</label>
              <input 
                type="number" 
                value={editingCampaign?.currentAmount || 0}
                onChange={e => setEditingCampaign({ ...editingCampaign, currentAmount: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Product Modal */}
      <Modal 
        isOpen={isProductModalOpen} 
        onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
        title={editingProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Título</label>
            <input 
              type="text" 
              required
              value={editingProduct?.title || ''}
              onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
            <textarea 
              required
              value={editingProduct?.description || ''}
              onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Precio ($)</label>
              <input 
                type="number" 
                required
                value={editingProduct?.price || ''}
                onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría</label>
              <input 
                type="text" 
                required
                value={editingProduct?.category || ''}
                onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">URL de la Imagen</label>
            <input 
              type="text" 
              required
              value={editingProduct?.coverImage || ''}
              onChange={e => setEditingProduct({ ...editingProduct, coverImage: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Membership Modal */}
      <Modal 
        isOpen={isMembershipModalOpen} 
        onClose={() => { setIsMembershipModalOpen(false); setEditingMembership(null); }}
        title={editingMembership?.id ? 'Editar Membresía' : 'Nueva Membresía'}
      >
        <form onSubmit={handleSaveMembership} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre</label>
            <input 
              type="text" 
              required
              value={editingMembership?.name || ''}
              onChange={e => setEditingMembership({ ...editingMembership, name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
            <textarea 
              required
              value={editingMembership?.description || ''}
              onChange={e => setEditingMembership({ ...editingMembership, description: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Precio ($)</label>
              <input 
                type="number" 
                required
                value={editingMembership?.price || ''}
                onChange={e => setEditingMembership({ ...editingMembership, price: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Periodo</label>
              <select 
                value={editingMembership?.billingPeriod || 'monthly'}
                onChange={e => setEditingMembership({ ...editingMembership, billingPeriod: e.target.value as 'monthly' | 'yearly' })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              >
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsMembershipModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Idea Modal */}
      <Modal
        isOpen={isIdeaModalOpen}
        onClose={() => { setIsIdeaModalOpen(false); setEditingIdea(null); setIdeaTagsInput(''); }}
        title={editingIdea?.id ? 'Editar Idea' : 'Nueva Idea'}
      >
        <form onSubmit={handleSaveIdea} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Título</label>
            <input
              type="text"
              required
              value={editingIdea?.title || ''}
              onChange={e => setEditingIdea({ ...editingIdea, title: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              placeholder="Simulador de Fases Lunares"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
            <textarea
              required
              rows={3}
              value={editingIdea?.description || ''}
              onChange={e => setEditingIdea({ ...editingIdea, description: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white resize-none"
              placeholder="De qué va esta idea, por qué la hiciste, qué vas a encontrar si entrás..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">URL externa</label>
            <input
              type="url"
              required
              value={editingIdea?.url || ''}
              onChange={e => setEditingIdea({ ...editingIdea, url: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              placeholder="https://..."
            />
            <p className="text-xs text-zinc-500 mt-1">A dónde manda el click en la tarjeta (Vercel, ChatGPT share, Notion, etc.).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">URL de la imagen (opcional)</label>
            <input
              type="url"
              value={editingIdea?.coverImage || ''}
              onChange={e => setEditingIdea({ ...editingIdea, coverImage: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría</label>
              <input
                type="text"
                value={editingIdea?.category || ''}
                onChange={e => setEditingIdea({ ...editingIdea, category: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
                placeholder="Webapp, Investigación, Experimento..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Orden</label>
              <input
                type="number"
                value={editingIdea?.sortOrder ?? 0}
                onChange={e => setEditingIdea({ ...editingIdea, sortOrder: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Tags (separados por coma)</label>
            <input
              type="text"
              value={ideaTagsInput}
              onChange={e => setIdeaTagsInput(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white"
              placeholder="astronomía, experimento, vercel"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={editingIdea?.active !== false}
                onChange={e => setEditingIdea({ ...editingIdea, active: e.target.checked })}
              />
              Visible en el sitio
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={Boolean(editingIdea?.featured)}
                onChange={e => setEditingIdea({ ...editingIdea, featured: e.target.checked })}
              />
              Destacada
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => { setIsIdeaModalOpen(false); setEditingIdea(null); setIdeaTagsInput(''); }} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl">Guardar</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
