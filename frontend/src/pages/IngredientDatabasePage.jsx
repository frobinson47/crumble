import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, Database, Loader2, Pencil, ScanBarcode } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import * as api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function IngredientDatabasePage() {
  useDocumentTitle('Ingredient Database');

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newIngredient, setNewIngredient] = useState({ name: '', category: '', avg_price: '', price_unit: '' });
  const [usdaQuery, setUsdaQuery] = useState('');
  const [usdaResults, setUsdaResults] = useState([]);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [showUsda, setShowUsda] = useState(false);
  const [usdaTarget, setUsdaTarget] = useState(null);
  const [showBarcode, setShowBarcode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');

  const fetchIngredients = useCallback(async () => {
    try {
      const data = await api.getIngredientData(search);
      setIngredients(data.ingredients || []);
    } catch {
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchIngredients, 300);
    return () => clearTimeout(timer);
  }, [fetchIngredients]);

  const handleEdit = (ing) => {
    setEditingId(ing.id);
    setEditValues({ ...ing });
  };

  const handleSave = async () => {
    try {
      await api.updateIngredientData(editingId, editValues);
      setEditingId(null);
      fetchIngredients();
    } catch { }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteIngredientData(id);
      fetchIngredients();
    } catch { }
  };

  const handleAdd = async () => {
    try {
      await api.createIngredientData(newIngredient);
      setNewIngredient({ name: '', category: '', avg_price: '', price_unit: '' });
      setShowAdd(false);
      fetchIngredients();
    } catch { }
  };

  const handleUsdaSearch = async () => {
    if (!usdaQuery.trim()) return;
    setUsdaLoading(true);
    try {
      const data = await api.searchUsda(usdaQuery);
      setUsdaResults(data.results || []);
    } catch {
      setUsdaResults([]);
    } finally {
      setUsdaLoading(false);
    }
  };

  const handleBarcodeLookup = async () => {
    if (!barcodeInput.trim()) return;
    setBarcodeLoading(true);
    setBarcodeError('');
    setBarcodeResult(null);
    try {
      const product = await api.lookupBarcode(barcodeInput.trim());
      if (product.error) {
        setBarcodeError(product.error);
      } else {
        setBarcodeResult(product);
      }
    } catch (err) {
      setBarcodeError(err.message || 'Product not found');
    }
    setBarcodeLoading(false);
  };

  const handleImportBarcode = async () => {
    if (!barcodeResult) return;
    const n = barcodeResult.nutrition;
    await api.createIngredientData({
      name: (barcodeResult.name || barcodeResult.brand || barcodeInput).toLowerCase(),
      category: barcodeResult.categories?.split(',')[0]?.trim() || '',
      calories_per_100g: n.calories_per_100g,
      protein_per_100g: n.protein_per_100g,
      carbs_per_100g: n.carbs_per_100g,
      fat_per_100g: n.fat_per_100g,
      fiber_per_100g: n.fiber_per_100g,
    });
    setShowBarcode(false);
    setBarcodeResult(null);
    setBarcodeInput('');
    fetchIngredients();
  };

  const handleApplyUsda = async (usdaItem) => {
    if (usdaTarget) {
      // Update existing ingredient
      await api.updateIngredientData(usdaTarget, {
        calories_per_100g: usdaItem.calories_per_100g,
        protein_per_100g: usdaItem.protein_per_100g,
        carbs_per_100g: usdaItem.carbs_per_100g,
        fat_per_100g: usdaItem.fat_per_100g,
        fiber_per_100g: usdaItem.fiber_per_100g,
      });
    } else {
      // Create new ingredient with USDA data
      await api.createIngredientData({
        name: usdaItem.name.toLowerCase(),
        category: usdaItem.category || '',
        calories_per_100g: usdaItem.calories_per_100g,
        protein_per_100g: usdaItem.protein_per_100g,
        carbs_per_100g: usdaItem.carbs_per_100g,
        fat_per_100g: usdaItem.fat_per_100g,
        fiber_per_100g: usdaItem.fiber_per_100g,
      });
    }
    setShowUsda(false);
    setUsdaResults([]);
    setUsdaTarget(null);
    fetchIngredients();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Database size={24} className="text-terracotta" />
          <h1 className="text-2xl font-bold text-brown font-display">Ingredient Database</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowBarcode(true); setBarcodeInput(''); setBarcodeResult(null); setBarcodeError(''); }}>
            <ScanBarcode size={16} />
            Barcode
          </Button>
          <Button variant="outline" onClick={() => { setShowUsda(true); setUsdaTarget(null); setUsdaQuery(''); setUsdaResults([]); }}>
            <Search size={16} />
            USDA
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" size={18} />
          <input
            type="text"
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-dark bg-surface text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl shadow-md border border-cream-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-dark/50 text-left">
                <th className="px-4 py-3 font-semibold text-brown">Name</th>
                <th className="px-3 py-3 font-semibold text-brown">Category</th>
                <th className="px-3 py-3 font-semibold text-brown text-right">Price</th>
                <th className="px-3 py-3 font-semibold text-brown text-right">Cal</th>
                <th className="px-3 py-3 font-semibold text-brown text-right">Protein</th>
                <th className="px-3 py-3 font-semibold text-brown text-right">Carbs</th>
                <th className="px-3 py-3 font-semibold text-brown text-right">Fat</th>
                <th className="px-3 py-3 font-semibold text-brown text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/50">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8"><Loader2 className="animate-spin mx-auto text-terracotta" size={24} /></td></tr>
              ) : ingredients.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-warm-gray">No ingredients found</td></tr>
              ) : ingredients.map(ing => (
                <tr key={ing.id} className="hover:bg-cream/50 transition-colors">
                  {editingId === ing.id ? (
                    <>
                      <td className="px-4 py-2"><Input value={editValues.name ?? ''} onChange={e => setEditValues({...editValues, name: e.target.value})} /></td>
                      <td className="px-3 py-2"><Input value={editValues.category ?? ''} onChange={e => setEditValues({...editValues, category: e.target.value})} /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Input type="number" step="0.01" value={editValues.avg_price ?? ''} onChange={e => setEditValues({...editValues, avg_price: e.target.value})} placeholder="$" />
                          <Input value={editValues.price_unit ?? ''} onChange={e => setEditValues({...editValues, price_unit: e.target.value})} placeholder="unit" className="w-16" />
                        </div>
                      </td>
                      <td className="px-3 py-2"><Input type="number" value={editValues.calories_per_100g ?? ''} onChange={e => setEditValues({...editValues, calories_per_100g: e.target.value})} /></td>
                      <td className="px-3 py-2"><Input type="number" step="0.1" value={editValues.protein_per_100g ?? ''} onChange={e => setEditValues({...editValues, protein_per_100g: e.target.value})} /></td>
                      <td className="px-3 py-2"><Input type="number" step="0.1" value={editValues.carbs_per_100g ?? ''} onChange={e => setEditValues({...editValues, carbs_per_100g: e.target.value})} /></td>
                      <td className="px-3 py-2"><Input type="number" step="0.1" value={editValues.fat_per_100g ?? ''} onChange={e => setEditValues({...editValues, fat_per_100g: e.target.value})} /></td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" onClick={handleSave}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-medium text-brown">{ing.name}</td>
                      <td className="px-3 py-2.5 text-warm-gray text-xs">{ing.category || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-brown">{ing.avg_price ? `$${Number(ing.avg_price).toFixed(2)}` : '—'}<span className="text-warm-gray text-xs ml-1">{ing.price_unit ? `/${ing.price_unit}` : ''}</span></td>
                      <td className="px-3 py-2.5 text-right text-brown">{ing.calories_per_100g ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right text-brown">{ing.protein_per_100g ? `${ing.protein_per_100g}g` : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-brown">{ing.carbs_per_100g ? `${ing.carbs_per_100g}g` : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-brown">{ing.fat_per_100g ? `${ing.fat_per_100g}g` : '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleEdit(ing)} className="p-1.5 rounded-lg text-warm-gray hover:text-terracotta hover:bg-terracotta/10 transition-colors" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => { setShowUsda(true); setUsdaTarget(ing.id); setUsdaQuery(ing.name); setUsdaResults([]); }} className="p-1.5 rounded-lg text-warm-gray hover:text-sage hover:bg-sage/10 transition-colors" title="USDA Lookup">
                            <Search size={14} />
                          </button>
                          <button onClick={() => handleDelete(ing.id)} className="p-1.5 rounded-lg text-warm-gray hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-cream-dark/30 text-xs text-warm-gray">
          {ingredients.length} ingredients • Nutrition values per 100g • Prices are US averages
        </div>
      </div>

      {/* Add Ingredient Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Ingredient">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-brown-light mb-1">Name</label>
            <Input value={newIngredient.name} onChange={e => setNewIngredient({...newIngredient, name: e.target.value})} placeholder="e.g., chicken breast" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-brown-light mb-1">Category</label>
              <Input value={newIngredient.category} onChange={e => setNewIngredient({...newIngredient, category: e.target.value})} placeholder="e.g., Meat & Seafood" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown-light mb-1">Price Unit</label>
              <Input value={newIngredient.price_unit} onChange={e => setNewIngredient({...newIngredient, price_unit: e.target.value})} placeholder="e.g., lb" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-light mb-1">Average Price ($)</label>
            <Input type="number" step="0.01" value={newIngredient.avg_price} onChange={e => setNewIngredient({...newIngredient, avg_price: e.target.value})} placeholder="0.00" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newIngredient.name.trim()}>Add Ingredient</Button>
          </div>
        </div>
      </Modal>

      {/* Barcode Lookup Modal */}
      <Modal isOpen={showBarcode} onClose={() => setShowBarcode(false)} title="Barcode / UPC Lookup" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-warm-gray">Enter a product barcode to look up nutrition data from Open Food Facts.</p>
          <form onSubmit={e => { e.preventDefault(); handleBarcodeLookup(); }} className="flex gap-2">
            <Input value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} placeholder="e.g. 3017620422003" autoFocus />
            <Button type="submit" disabled={barcodeLoading}>
              {barcodeLoading ? <Loader2 size={16} className="animate-spin" /> : <ScanBarcode size={16} />}
            </Button>
          </form>

          {barcodeError && <p className="text-sm text-red-500">{barcodeError}</p>}

          {barcodeResult && (
            <div className="p-4 rounded-xl border border-cream-dark bg-cream/50">
              <div className="flex gap-3">
                {barcodeResult.image_url && (
                  <img src={barcodeResult.image_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brown text-sm">{barcodeResult.name || 'Unknown product'}</p>
                  {barcodeResult.brand && <p className="text-xs text-warm-gray">{barcodeResult.brand}</p>}
                  {barcodeResult.quantity && <p className="text-xs text-warm-gray">{barcodeResult.quantity}</p>}
                  {barcodeResult.nutriscore && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      barcodeResult.nutriscore === 'a' ? 'bg-green-100 text-green-700' :
                      barcodeResult.nutriscore === 'b' ? 'bg-lime-100 text-lime-700' :
                      barcodeResult.nutriscore === 'c' ? 'bg-yellow-100 text-yellow-700' :
                      barcodeResult.nutriscore === 'd' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>Nutri-Score {barcodeResult.nutriscore}</span>
                  )}
                </div>
              </div>
              {barcodeResult.nutrition && (
                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-brown">{barcodeResult.nutrition.calories_per_100g ?? '—'}</p>
                    <p className="text-[10px] text-warm-gray">kcal</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brown">{barcodeResult.nutrition.protein_per_100g ?? '—'}g</p>
                    <p className="text-[10px] text-warm-gray">Protein</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brown">{barcodeResult.nutrition.carbs_per_100g ?? '—'}g</p>
                    <p className="text-[10px] text-warm-gray">Carbs</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brown">{barcodeResult.nutrition.fat_per_100g ?? '—'}g</p>
                    <p className="text-[10px] text-warm-gray">Fat</p>
                  </div>
                </div>
              )}
              {barcodeResult.allergens && (
                <p className="text-xs text-warm-gray mt-2">Allergens: {barcodeResult.allergens}</p>
              )}
              <Button onClick={handleImportBarcode} className="w-full mt-3">
                <Plus size={16} />
                Add to Ingredient Database
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* USDA Lookup Modal */}
      <Modal isOpen={showUsda} onClose={() => { setShowUsda(false); setUsdaResults([]); }} title="USDA Nutrition Lookup" size="lg">
        <div className="space-y-4">
          <form onSubmit={e => { e.preventDefault(); handleUsdaSearch(); }} className="flex gap-2">
            <Input value={usdaQuery} onChange={e => setUsdaQuery(e.target.value)} placeholder="Search USDA database..." autoFocus />
            <Button type="submit" disabled={usdaLoading}>
              {usdaLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search
            </Button>
          </form>

          {usdaResults.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {usdaResults.map((item, i) => (
                <div key={i} className="p-3 rounded-xl border border-cream-dark hover:border-terracotta transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brown truncate">{item.name}</p>
                      {item.category && <p className="text-xs text-warm-gray">{item.category}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-warm-gray">
                        {item.calories_per_100g != null && <span>{item.calories_per_100g} cal</span>}
                        {item.protein_per_100g != null && <span>{item.protein_per_100g}g protein</span>}
                        {item.carbs_per_100g != null && <span>{item.carbs_per_100g}g carbs</span>}
                        {item.fat_per_100g != null && <span>{item.fat_per_100g}g fat</span>}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleApplyUsda(item)}>
                      {usdaTarget ? 'Apply' : 'Add'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {usdaResults.length === 0 && !usdaLoading && usdaQuery && (
            <p className="text-sm text-warm-gray text-center py-4">Search the USDA database for nutrition data</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
