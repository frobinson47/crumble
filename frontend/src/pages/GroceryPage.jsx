import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowLeft, ShoppingCart, Trash2, LayoutList, LayoutGrid, Copy, Check } from 'lucide-react';
import useGrocery from '../hooks/useGrocery';
import GroceryList from '../components/grocery/GroceryList';
import GroceryItem from '../components/grocery/GroceryItem';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { Skeleton, GroceryListSkeleton } from '../components/ui/Skeleton';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { groupByCategory } from '../utils/ingredientCategories';
import PantrySection from '../components/grocery/PantrySection';
import usePantry from '../hooks/usePantry';
import EmptyState from '../components/ui/EmptyState';

export default function GroceryPage() {
  const {
    lists, currentList, isLoading,
    fetchLists, fetchList, createList, deleteList,
    addItem, updateItem, removeItem, clearChecked,
  } = useGrocery();

  const { addItem: addPantryItem, removeItem: removePantryItem, fetchPantry } = usePantry();

  useDocumentTitle(currentList ? currentList.name : 'Grocery Lists');

  const [viewMode, setViewMode] = useState('lists'); // 'lists' or 'detail'
  const [groupedView, setGroupedView] = useState(() => {
    try { return localStorage.getItem('cookslate-grocery-grouped') === 'true'; } catch { return false; }
  });
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await createList(newListName.trim());
      setNewListName('');
      setShowNewListModal(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleDeleteList = (listId) => {
    setDeleteConfirm(listId);
  };

  const handleOpenList = async (listId) => {
    await fetchList(listId);
    setViewMode('detail');
  };

  const handleToggleItem = async (itemId, checked) => {
    if (!currentList) return;
    await updateItem(currentList.id, itemId, { checked });
  };

  const handleDeleteItem = async (itemId) => {
    if (!currentList) return;
    await removeItem(currentList.id, itemId);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !currentList) return;
    await addItem(currentList.id, { name: newItemName.trim() });
    setNewItemName('');
  };

  const handlePantryToggle = async (itemId, ingredientName, markAsPantry) => {
    if (!currentList) return;
    if (markAsPantry) {
      await addPantryItem(ingredientName);
    }
    await updateItem(currentList.id, itemId, { in_pantry: markAsPantry });
  };

  const checkedCount = currentList?.items?.filter(i => i.checked).length || 0;

  const handleClearChecked = async () => {
    if (!currentList) return;
    try {
      await clearChecked(currentList.id);
    } catch {
      // Error handled in hook
    }
  };

  // Sort items: unchecked first, checked last
  const sortedItems = currentList?.items
    ? [...currentList.items].sort((a, b) => {
        const aChecked = a.checked ? 1 : 0;
        const bChecked = b.checked ? 1 : 0;
        return aChecked - bChecked;
      })
    : [];

  const groupedItems = useMemo(
    () => groupedView ? groupByCategory(sortedItems) : null,
    [sortedItems, groupedView]
  );

  const toggleGrouped = () => {
    const next = !groupedView;
    setGroupedView(next);
    try { localStorage.setItem('cookslate-grocery-grouped', String(next)); } catch {}
  };

  const handleCopyList = async () => {
    const unchecked = sortedItems.filter(i => !i.checked);
    if (unchecked.length === 0) return;

    const formatItem = (item) => {
      if (item.in_pantry) return null; // Skip pantry items
      const parts = [item.amount, item.unit, item.name].filter(Boolean);
      let line = `☐ ${parts.join(' ')}`;
      if (item.package_display && item.package_suggestion !== 'pantry') {
        line += ` → ${item.package_display}`;
      }
      return line;
    };

    let text;
    if (groupedView) {
      const groups = groupByCategory(unchecked);
      text = groups.map(({ category, items }) => {
        const lines = items.map(formatItem).filter(Boolean);
        return lines.length > 0 ? `${category.toUpperCase()}\n${lines.join('\n')}` : null;
      }).filter(Boolean).join('\n\n');
    } else {
      text = unchecked.map(formatItem).filter(Boolean).join('\n');
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Detail view
  if (viewMode === 'detail' && currentList) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('lists')}
              className="p-2 rounded-xl text-warm-gray hover:bg-cream-dark transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-brown">{currentList.name}</h1>
          </div>
          <div className="flex items-center gap-2">
          {sortedItems.length > 0 && (
            <button
              onClick={handleCopyList}
              className={`p-2 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${copied ? 'text-green-600 bg-green-50' : 'text-warm-gray hover:bg-cream-dark'}`}
              aria-label="Copy list to clipboard"
              title="Copy list"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          )}
          {sortedItems.length > 3 && (
            <button
              onClick={toggleGrouped}
              className={`p-2 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${groupedView ? 'text-terracotta bg-terracotta/10' : 'text-warm-gray hover:bg-cream-dark'}`}
              aria-label={groupedView ? 'Flat list view' : 'Group by aisle'}
              title={groupedView ? 'Flat list' : 'Group by aisle'}
            >
              {groupedView ? <LayoutList size={18} /> : <LayoutGrid size={18} />}
            </button>
          )}
          {checkedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChecked}
              className="text-warm-gray hover:text-red-500"
            >
              <Trash2 size={14} />
              Clear {checkedCount} done
            </Button>
          )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-surface rounded-2xl shadow-md overflow-hidden">
          {isLoading && sortedItems.length === 0 ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingCart size={32} className="mx-auto text-warm-gray mb-2" />
              <p className="text-warm-gray">No items yet</p>
            </div>
          ) : groupedView && groupedItems ? (
            <div>
              {groupedItems.map(({ category, items }) => (
                <div key={category}>
                  <div className="px-4 py-2 bg-cream-dark/50 border-b border-cream-dark">
                    <span className="text-xs font-semibold text-warm-gray uppercase tracking-wide">{category}</span>
                    <span className="text-xs text-warm-gray/60 ml-2">{items.length}</span>
                  </div>
                  <div className="divide-y divide-cream-dark/50">
                    {items.map(item => (
                      <GroceryItem
                        key={item.id}
                        item={item}
                        onToggle={handleToggleItem}
                        onDelete={handleDeleteItem}
                        onPantryToggle={handlePantryToggle}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-cream-dark/50">
              {sortedItems.map(item => (
                <GroceryItem
                  key={item.id}
                  item={item}
                  onToggle={handleToggleItem}
                  onDelete={handleDeleteItem}
                  onPantryToggle={handlePantryToggle}
                />
              ))}
            </div>
          )}

          {/* Add item inline */}
          <form onSubmit={handleAddItem} className="p-3 border-t border-cream-dark">
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                placeholder="Add an item..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-cream-dark text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta transition-colors duration-200 min-h-[44px]"
              />
              <Button type="submit" disabled={!newItemName.trim()} size="sm">
                <Plus size={16} />
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Lists view
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brown">Grocery Lists</h1>
        <Button onClick={() => setShowNewListModal(true)} size="sm">
          <Plus size={16} />
          New List
        </Button>
      </div>

      {isLoading && lists.length === 0 ? (
        <GroceryListSkeleton />
      ) : lists.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          accent="sage"
          title="No grocery lists yet"
          description="Create a list or add ingredients directly from any recipe."
          actionLabel="New List"
          onAction={() => setShowNewListModal(true)}
        />
      ) : (
        <div className="space-y-3">
          {lists.map(list => (
            <GroceryList
              key={list.id}
              list={list}
              onClick={handleOpenList}
              onDelete={handleDeleteList}
            />
          ))}
        </div>
      )}

      {/* Pantry section */}
      <PantrySection />

      {/* Delete list confirmation modal */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete List"
        size="sm"
      >
        <p className="text-brown-light mb-6">Delete this grocery list? This cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={async () => {
            try { await deleteList(deleteConfirm); } catch {}
            setDeleteConfirm(null);
          }}>Delete</Button>
        </div>
      </Modal>

      {/* New list modal */}
      <Modal
        isOpen={showNewListModal}
        onClose={() => {
          setShowNewListModal(false);
          setNewListName('');
        }}
        title="New Grocery List"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateList();
          }}
          className="space-y-4"
        >
          <Input
            label="List Name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="e.g., Weekly Groceries"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowNewListModal(false);
                setNewListName('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!newListName.trim()}>
              Create List
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
