import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock, Edit, Trash2, ExternalLink, ChefHat, ShoppingCart,
  ArrowLeft, Plus, Printer, Link2
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
import { RecipeDetailSkeleton } from '../components/ui/Skeleton';
import Input from '../components/ui/Input';
import ServingsAdjuster from '../components/ui/ServingsAdjuster';
import { scaleIngredients } from '../utils/ingredientScaling';
// Card sharing utils — commented out, may revisit as part of unified share modal
// import { generateRecipeCard, recipeToText } from '../utils/recipeCardGenerator';
import StarRating from '../components/ui/StarRating';
import FavoriteButton from '../components/recipe/FavoriteButton';
import CookButton from '../components/recipe/CookButton';
import * as api from '../services/api';
import RelatedRecipes from '../components/recipe/RelatedRecipes';
import NutritionFacts from '../components/recipe/NutritionFacts';
import useRecentlyViewed from '../hooks/useRecentlyViewed';

export default function RecipePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { recipe, isLoading, error, fetchRecipe, removeRecipe } = useRecipes();
  const { lists, fetchLists, createList, addRecipeToList } = useGrocery();
  const { addRecipe: addToRecentlyViewed } = useRecentlyViewed();

  const [cookMode, setCookMode] = useState(false);
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [adjustedServings, setAdjustedServings] = useState(null);
  // Card sharing state — commented out, may revisit as part of unified share modal
  // const [showShareModal, setShowShareModal] = useState(false);
  // const [shareCardUrl, setShareCardUrl] = useState(null);
  // const [shareCardBlob, setShareCardBlob] = useState(null);
  // const [shareGenerating, setShareGenerating] = useState(false);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [shareLinkData, setShareLinkData] = useState(null);
  const [shareLinkError, setShareLinkError] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetchRecipe(id);
  }, [id, fetchRecipe]);

  // Track recently viewed
  useEffect(() => {
    if (recipe) {
      addToRecentlyViewed(recipe);
    }
  }, [recipe?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Card sharing handlers — commented out, may revisit as part of unified share modal
  // const handleShare = async () => {
  //   setShowShareModal(true);
  //   setShareGenerating(true);
  //   try {
  //     const imgUrl = recipe.image_path ? `/uploads/${recipe.image_path}` : null;
  //     const { blob, dataUrl } = await generateRecipeCard(recipe, imgUrl);
  //     setShareCardUrl(dataUrl);
  //     setShareCardBlob(blob);
  //   } catch {
  //     // Card generation failed, will show text-only options
  //   } finally {
  //     setShareGenerating(false);
  //   }
  // };

  // const handleShareEmail = () => {
  //   const text = recipeToText(recipe);
  //   const subject = encodeURIComponent(recipe.title);
  //   const body = encodeURIComponent(text);
  //   window.location.href = `mailto:?subject=${subject}&body=${body}`;
  //   setShowShareModal(false);
  // };

  // const handleShareDownload = () => {
  //   if (!shareCardBlob) return;
  //   const url = URL.createObjectURL(shareCardBlob);
  //   const a = document.createElement('a');
  //   a.href = url;
  //   a.download = `${recipe.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
  //   a.click();
  //   URL.revokeObjectURL(url);
  // };

  // const handleShareCopy = async () => {
  //   if (!shareCardBlob) return;
  //   try {
  //     await navigator.clipboard.write([
  //       new ClipboardItem({ 'image/png': shareCardBlob }),
  //     ]);
  //   } catch {
  //     // Fallback: download instead
  //     handleShareDownload();
  //   }
  // };

  const handleShareLink = async () => {
    setShowShareLinkModal(true);
    setShareLinkData(null);
    setShareLinkError(null);
    setLinkCopied(false);
    try {
      const data = await api.createShareLink(recipe.id);
      setShareLinkData(data);
    } catch (err) {
      setShareLinkError(err.message || 'Failed to create share link');
    }
  };

  const shareLinkUrl = shareLinkData ? `${window.location.origin}/shared/${shareLinkData.token}` : '';

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLinkUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleRevokeShareLink = async () => {
    try {
      await api.revokeShareLink(recipe.id);
      setShareLinkData(null);
      setShowShareLinkModal(false);
    } catch {
      // handle error
    }
  };

  if (isLoading) {
    return <RecipeDetailSkeleton />;
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl md:text-4xl font-bold text-brown mb-2 font-serif">
              {recipe.title}
            </h1>
            <FavoriteButton
              recipeId={recipe.id}
              initialFavorited={recipe.is_favorited}
              size="lg"
            />
          </div>
          {recipe.avg_rating !== null && recipe.avg_rating !== undefined && (
            <div className="mb-2">
              <StarRating
                value={recipe.user_rating || recipe.avg_rating || 0}
                onChange={(score) => api.rateRecipe(recipe.id, score)}
                size="md"
              />
            </div>
          )}
          {!recipe.avg_rating && (
            <div className="mb-2">
              <StarRating
                value={0}
                onChange={(score) => api.rateRecipe(recipe.id, score)}
                size="md"
              />
            </div>
          )}
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
        <CookButton recipeId={recipe.id} cookCount={recipe.cook_count || 0} />
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
        {/* Card sharing button — commented out, may revisit as part of unified share modal
        <Button
          variant="outline"
          onClick={handleShare}
          className="print:hidden"
        >
          <Share2 size={18} />
          Share Card
        </Button> */}
        <Button
          variant="outline"
          onClick={handleShareLink}
          className="print:hidden"
        >
          <Link2 size={18} />
          Share
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

      {/* Nutrition Facts */}
      <NutritionFacts nutrition={{
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        fiber: recipe.fiber,
        sugar: recipe.sugar,
      }} />

      {/* Related Recipes */}
      <RelatedRecipes recipeId={recipe.id} />

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

      {/* Card share modal — commented out, may revisit as part of unified share modal */}
      {/* <Modal
        isOpen={showShareModal}
        onClose={() => { setShowShareModal(false); setShareCardUrl(null); setShareCardBlob(null); }}
        title="Share Recipe"
      >
        <div className="space-y-4">
          {shareGenerating ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Spinner />
              <p className="text-sm text-warm-gray">Generating recipe card...</p>
            </div>
          ) : shareCardUrl ? (
            <div className="max-h-80 overflow-y-auto rounded-xl border border-cream-dark">
              <img src={shareCardUrl} alt="Recipe card preview" className="w-full" />
            </div>
          ) : null}
          <div className="space-y-2">
            <Button className="w-full" onClick={handleShareEmail}>
              <Mail size={18} />
              Email Recipe
            </Button>
            {shareCardBlob && (
              <>
                <Button variant="secondary" className="w-full" onClick={handleShareDownload}>
                  <Download size={18} />
                  Download Card Image
                </Button>
                <Button variant="outline" className="w-full" onClick={handleShareCopy}>
                  <Image size={18} />
                  Copy Card to Clipboard
                </Button>
              </>
            )}
            <p className="text-xs text-warm-gray text-center pt-2">
              Download or copy the recipe card image to share on Facebook, X, or anywhere.
            </p>
          </div>
        </div>
      </Modal> */}

      {/* Share link modal */}
      <Modal
        isOpen={showShareLinkModal}
        onClose={() => setShowShareLinkModal(false)}
        title="Share Recipe Link"
        size="sm"
      >
        {shareLinkData ? (
          <div className="space-y-4">
            <p className="text-sm text-brown-light">
              Anyone with this link can view this recipe.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareLinkUrl}
                className="flex-1 px-3 py-2 rounded-xl border border-cream-dark bg-cream text-brown text-sm"
              />
              <Button variant="outline" onClick={handleCopyShareLink}>
                {linkCopied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-warm-gray">
              Expires {new Date(shareLinkData.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <button
              onClick={handleRevokeShareLink}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Revoke link
            </button>
          </div>
        ) : shareLinkError ? (
          <div className="text-center py-4">
            <p className="text-sm text-red-500">{shareLinkError}</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <Spinner />
          </div>
        )}
      </Modal>
    </div>
  );
}
