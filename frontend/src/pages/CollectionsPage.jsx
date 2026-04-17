import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowLeft, Library, Trash2, UtensilsCrossed, Clock } from 'lucide-react';
import useCollections from '../hooks/useCollections';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import useDocumentTitle from '../hooks/useDocumentTitle';
import EmptyState from '../components/ui/EmptyState';
import { thumbImageUrl } from '../utils/imageUrl';

export default function CollectionsPage() {
  const {
    collections, currentCollection, isLoading,
    fetchCollections, fetchCollection, createCollection, removeCollection,
  } = useCollections();

  useDocumentTitle(currentCollection ? currentCollection.name : 'Collections');

  const [viewMode, setViewMode] = useState('list');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createCollection(newName.trim(), newDescription.trim() || null);
      setNewName('');
      setNewDescription('');
      setShowNewModal(false);
    } catch {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCollection = async (id) => {
    await fetchCollection(id);
    setViewMode('detail');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await removeCollection(deleteConfirm);
      setDeleteConfirm(null);
      if (viewMode === 'detail') setViewMode('list');
    } catch {
      setDeleteConfirm(null);
    }
  };

  if (viewMode === 'detail' && currentCollection) {
    const recipes = currentCollection.recipes || [];
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-xl text-warm-gray hover:bg-cream-dark transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Back to collections"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-brown">{currentCollection.name}</h1>
              {currentCollection.description && (
                <p className="text-sm text-warm-gray mt-0.5">{currentCollection.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setDeleteConfirm(currentCollection.id)}
            className="p-2 rounded-xl text-warm-gray hover:text-red-500 hover:bg-red-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Delete collection"
            title="Delete collection"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {isLoading && recipes.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}
          </div>
        ) : recipes.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            accent="cream"
            title="No recipes in this collection"
            description="Open a recipe and use &quot;Add to Collection&quot; to add recipes here."
            actionLabel="Browse Recipes"
            actionTo="/"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {recipes.map(recipe => (
              <CollectionRecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}

        <Modal
          isOpen={deleteConfirm !== null}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Collection"
          size="sm"
        >
          <p className="text-brown-light mb-6">
            Delete this collection? The recipes inside will not be deleted.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brown">Collections</h1>
        <Button onClick={() => setShowNewModal(true)} size="sm">
          <Plus size={16} />
          New Collection
        </Button>
      </div>

      {isLoading && collections.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl shadow-md">
          <Library size={48} className="mx-auto text-warm-gray mb-3" />
          <p className="text-lg text-warm-gray">No collections yet</p>
          <p className="text-sm text-warm-gray mt-1">
            Create a collection to organise your recipes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {collections.map(col => (
            <CollectionCard
              key={col.id}
              collection={col}
              onClick={() => handleOpenCollection(col.id)}
              onDelete={() => setDeleteConfirm(col.id)}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Collection"
        size="sm"
      >
        <p className="text-brown-light mb-6">
          Delete this collection? The recipes inside will not be deleted.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      <Modal
        isOpen={showNewModal}
        onClose={() => {
          setShowNewModal(false);
          setNewName('');
          setNewDescription('');
        }}
        title="New Collection"
        size="sm"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Weeknight Dinners"
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Description (optional)</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="A short description..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-cream-dark text-brown placeholder:text-warm-gray focus:outline-none focus:border-terracotta transition-colors duration-200 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowNewModal(false);
                setNewName('');
                setNewDescription('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!newName.trim() || saving}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function CollectionCard({ collection, onClick, onDelete }) {
  return (
    <div className="bg-surface rounded-2xl shadow-md border border-cream-dark p-4 flex items-center gap-4 hover:shadow-lg transition-shadow duration-200">
      <button
        onClick={onClick}
        className="flex-1 flex items-center gap-4 text-left min-w-0"
      >
        <div className="w-12 h-12 rounded-xl bg-terracotta/10 flex items-center justify-center shrink-0">
          <Library size={22} className="text-terracotta" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-brown truncate">{collection.name}</p>
          {collection.description && (
            <p className="text-sm text-warm-gray truncate mt-0.5">{collection.description}</p>
          )}
          <p className="text-xs text-warm-gray mt-1">
            {collection.recipe_count ?? 0} {(collection.recipe_count ?? 0) === 1 ? 'recipe' : 'recipes'}
          </p>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-2 rounded-xl text-warm-gray hover:text-red-500 hover:bg-red-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
        aria-label="Delete collection"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function CollectionRecipeCard({ recipe }) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const imageUrl = thumbImageUrl(recipe.image_path);

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className="group block bg-surface rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      <div className="relative aspect-[4/3] bg-cream-dark overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={recipe.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cream to-cream-dark">
            <UtensilsCrossed size={32} className="text-warm-gray/40" />
          </div>
        )}
        {totalTime > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-brown/70 text-white px-2 py-1 rounded-lg text-xs">
            <Clock size={12} />
            {totalTime} min
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-sm font-bold text-brown line-clamp-2 group-hover:text-terracotta transition-colors duration-200 font-serif">
          {recipe.title}
        </p>
      </div>
    </Link>
  );
}
