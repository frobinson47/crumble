import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock, Edit, Trash2, ExternalLink, ChefHat, ShoppingCart,
  ArrowLeft, Plus, Printer
} from 'lucide-react';
import useRecipes from '../hooks/useRecipes';
import { useAuth } from '../hooks/useAuth';
import useGrocery from '../hooks/useGrocery';
import IngredientList from '../components/recipe/IngredientList';
import StepList from '../components/recipe/StepList';
import CookMode from '../components/recipe/CookMode';
import TagBadge from '../components/ui/TagBadge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Input from '../components/ui/Input';
import ServingsAdjuster from '../components/ui/ServingsAdjuster';
import { scaleIngredients } from '../utils/ingredientScaling';

export default function RecipePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { recipe, isLoading, error, fetchRecipe, removeRecipe } = useRecipes();
  const { lists, fetchLists, createList, addRecipeToList } = useGrocery();

  const [cookMode, setCookMode] = useState(false);
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [adjustedServings, setAdjustedServings] = useState(null);

  useEffect(() => {
    fetchRecipe(id);
  }, [id, fetchRecipe]);

  // Sync adjustedServings when recipe loads or changes
  useEffect(() => {
    if (recipe?.servings) {
      setAdjustedServings(recipe.servings);
    }
  }, [recipe?.servings]);

  useEffect(() => {
    if (showGroceryModal) {
      fetchLists();
    }
  }, [showGroceryModal, fetchLists]);

  const handleDelete = async () => {
    try {
      await removeRecipe(recipe.id);
      navigate('/');
    } catch {
      // Error handled in hook
    }
  };

  const handleAddToGrocery = async (listId) => {
    setGroceryLoading(true);
    try {
      await addRecipeToList(listId, recipe.id);
      setShowGroceryModal(false);
    } catch {
      // Error handled in hook
    } finally {
      setGroceryLoading(false);
    }
  };

  const handleCreateListAndAdd = async () => {
    if (!newListName.trim()) return;
    setGroceryLoading(true);
    try {
      const newList = await createList(newListName.trim());
      await addRecipeToList(newList.id, recipe.id);
      setNewListName('');
      setShowGroceryModal(false);
    } catch {
      // Error handled in hook
    } finally {
      setGroceryLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-warm-gray">{error || 'Recipe not found'}</p>
        <Link to="/" className="text-terracotta hover:underline mt-2 inline-block">
          Back to recipes
        </Link>
      </div>
    );
  }

  const canEdit = user && (user.id === recipe.created_by || isAdmin);
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const imageUrl = recipe.image_path ? `/uploads/${recipe.image_path}` : null;
  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions
    : typeof recipe.instructions === 'string'
      ? JSON.parse(recipe.instructions)
      : [];

  const scaledIngredients = scaleIngredients(
    recipe.ingredients || [],
    recipe.servings,
    adjustedServings
  );

  return (
    <div>
      {/* Cook Mode overlay */}
      {cookMode && (
        <CookMode
          steps={instructions}
          ingredients={scaledIngredients}
          onClose={() => setCookMode(false)}
        />
      )}

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-warm-gray hover:text-brown mb-4 transition-colors duration-200 min-h-[44px]"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </button>

      {/* Hero image */}
      {imageUrl && (
        <div className="aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden mb-6 bg-cream-dark">
          <img
            src={imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title and actions */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-brown mb-2">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-brown-light text-lg leading-relaxed">
              {recipe.description}
            </p>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/edit/${recipe.id}`)}
            >
              <Edit size={16} />
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {recipe.prep_time > 0 && (
          <div className="flex items-center gap-1.5 text-brown-light">
            <Clock size={18} className="text-terracotta" />
            <span className="text-sm">
              <span className="font-semibold">Prep:</span> {recipe.prep_time} min
            </span>
          </div>
        )}
        {recipe.cook_time > 0 && (
          <div className="flex items-center gap-1.5 text-brown-light">
            <Clock size={18} className="text-terracotta" />
            <span className="text-sm">
              <span className="font-semibold">Cook:</span> {recipe.cook_time} min
            </span>
          </div>
        )}
        {totalTime > 0 && (
          <div className="flex items-center gap-1.5 text-brown-light">
            <Clock size={18} className="text-sage" />
            <span className="text-sm font-semibold">Total: {totalTime} min</span>
          </div>
        )}
        {recipe.servings && adjustedServings && (
          <ServingsAdjuster
            servings={adjustedServings}
            onChange={setAdjustedServings}
          />
        )}
      </div>

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {recipe.tags.map(tag => (
            <TagBadge key={tag.id || tag.name || tag} tag={tag.name || tag} />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        {instructions.length > 0 && (
          <Button onClick={() => setCookMode(true)} size="lg">
            <ChefHat size={20} />
            Start Cooking
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => setShowGroceryModal(true)}
        >
          <ShoppingCart size={18} />
          Add to Grocery List
        </Button>
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="print:hidden"
        >
          <Printer size={18} />
          Print
        </Button>
      </div>

      {/* Source URL */}
      {recipe.source_url && (
        <div className="mb-6">
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-terracotta hover:text-terracotta-dark transition-colors text-sm"
          >
            <ExternalLink size={14} />
            View original recipe
          </a>
        </div>
      )}

      {/* Two-column content */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        {/* Ingredients */}
        <div className="md:sticky md:top-20 md:self-start">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-brown mb-4">Ingredients</h2>
            <IngredientList ingredients={scaledIngredients} />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold text-brown mb-4">Instructions</h2>
          <StepList steps={instructions} />
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Recipe"
        size="sm"
      >
        <p className="text-brown-light mb-6">
          Are you sure you want to delete this recipe? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Grocery list modal */}
      <Modal
        isOpen={showGroceryModal}
        onClose={() => setShowGroceryModal(false)}
        title="Add to Grocery List"
      >
        {groceryLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Existing lists */}
            {lists.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-brown">Choose a list:</p>
                {lists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => handleAddToGrocery(list.id)}
                    className="w-full text-left p-3 rounded-xl hover:bg-cream-dark transition-colors duration-200 text-brown-light min-h-[44px]"
                  >
                    {list.name}
                  </button>
                ))}
              </div>
            )}

            {/* Create new list */}
            <div className="border-t border-cream-dark pt-4">
              <p className="text-sm font-semibold text-brown mb-2">Or create a new list:</p>
              <div className="flex gap-2">
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateListAndAdd();
                    }
                  }}
                />
                <Button onClick={handleCreateListAndAdd} disabled={!newListName.trim()}>
                  <Plus size={16} />
                  Create
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
