import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock, Edit, Trash2, ExternalLink, ChefHat, ShoppingCart,
  ArrowLeft, Plus, Printer, Link2, QrCode
} from 'lucide-react';
import qrcode from 'qrcode-generator';
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
import { fullImageUrl } from '../utils/imageUrl';
import StarRating from '../components/ui/StarRating';
import FavoriteButton from '../components/recipe/FavoriteButton';
import CookButton from '../components/recipe/CookButton';
import AddToMealPlanButton from '../components/recipe/AddToMealPlanButton';
import * as api from '../services/api';
import RelatedRecipes from '../components/recipe/RelatedRecipes';
import NutritionFacts from '../components/recipe/NutritionFacts';
import RecipeInsights from '../components/recipe/RecipeInsights';
import useRecentlyViewed from '../hooks/useRecentlyViewed';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { estimateDifficulty, DIFFICULTY_COLORS } from '../utils/recipeDifficulty';
import { timeAgo } from '../utils/timeAgo';
import { buildRecipeJsonLd, injectJsonLd, removeJsonLd } from '../utils/recipeJsonLd';

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
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [shareLinkData, setShareLinkData] = useState(null);
  const [shareLinkError, setShareLinkError] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [cookNotes, setCookNotes] = useState([]);
  const [annotations, setAnnotations] = useState({ ingredient: {}, instruction: {} });

  useDocumentTitle(recipe?.title);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchRecipe(id);
    // Fetch cook notes for this recipe
    api.getRecipeCookLog(id)
      .then(data => setCookNotes(data.history || []))
      .catch(() => setCookNotes([]));
    // Fetch annotations
    api.getAnnotations(id)
      .then(data => {
        const map = { ingredient: {}, instruction: {} };
        (data || []).forEach(a => {
          map[a.target_type] = map[a.target_type] || {};
          map[a.target_type][a.target_index] = a.note;
        });
        setAnnotations(map);
      })
      .catch(() => setAnnotations({ ingredient: {}, instruction: {} }));
  }, [id, fetchRecipe]);

  // Track recently viewed + JSON-LD
  useEffect(() => {
    if (recipe) {
      addToRecentlyViewed(recipe);
      const ld = buildRecipeJsonLd(recipe);
      injectJsonLd(ld);
    }
    return () => removeJsonLd();
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

  const handleAnnotationSave = async (targetType, targetIndex, note) => {
    try {
      await api.saveAnnotation(id, targetType, targetIndex, note);
      setAnnotations(prev => ({
        ...prev,
        [targetType]: { ...prev[targetType], [targetIndex]: note },
      }));
    } catch {
      // silent fail
    }
  };

  const handleAnnotationDelete = async (targetType, targetIndex) => {
    try {
      await api.deleteAnnotation(id, targetType, targetIndex);
      setAnnotations(prev => {
        const updated = { ...prev[targetType] };
        delete updated[targetIndex];
        return { ...prev, [targetType]: updated };
      });
    } catch {
      // silent fail
    }
  };

  if (isLoading) {
    return <RecipeDetailSkeleton />;
  }

  if (error || !recipe) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ChefHat size={48} className="text-warm-gray mx-auto mb-4" />
        <h2 className="text-xl font-bold text-brown mb-2">Recipe not found</h2>
        <p className="text-warm-gray mb-6">This recipe may have been deleted or the link is incorrect.</p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-terracotta hover:text-terracotta-dark transition-colors">
          <ArrowLeft size={16} />
          Back to recipes
        </Link>
      </div>
    );
  }

  const canEdit = user && (user.id === recipe.created_by || isAdmin);
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const imageUrl = fullImageUrl(recipe.image_path);
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
          recipeId={recipe.id}
          annotations={annotations}
          onClose={() => setCookMode(false)}
          onDone={() => {
            api.getRecipeCookLog(id)
              .then(data => setCookNotes(data.history || []))
              .catch(() => {});
          }}
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
          <div className="mb-2">
            <StarRating
              value={recipe.user_rating || recipe.avg_rating || 0}
              onChange={(score) => api.rateRecipe(recipe.id, score)}
              size="md"
            />
          </div>
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
        {(() => {
          const difficulty = estimateDifficulty(recipe);
          return (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DIFFICULTY_COLORS[difficulty]}`}>
              {difficulty}
            </span>
          );
        })()}
      </div>

      {/* Scaling warning for significant adjustments */}
      {recipe.servings && adjustedServings && (() => {
        const factor = adjustedServings / recipe.servings;
        if (factor <= 0.5 || factor >= 1.5) {
          const isBaking = (recipe.tags || []).some(t =>
            ['baking', 'dessert', 'bread', 'cake', 'cookies', 'pastry'].includes((t.name || t).toLowerCase())
          );
          return (
            <div className="px-4 py-3 rounded-xl bg-terracotta/10 text-sm text-brown-light mb-4">
              <span className="font-semibold text-terracotta">Scaling {factor < 1 ? 'down' : 'up'} {factor.toFixed(1)}x</span>
              {' — '}
              {isBaking
                ? 'Leavening agents (baking soda/powder) scale at ~75% — use less than shown. Baking time may need adjustment.'
                : 'Spices and seasonings may need fine-tuning — add gradually and taste as you go.'}
            </div>
          );
        }
        return null;
      })()}

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
        <CookButton
          recipeId={recipe.id}
          cookCount={recipe.cook_count || 0}
          onCook={() => {
            api.getRecipeCookLog(id)
              .then(data => setCookNotes(data.history || []))
              .catch(() => {});
          }}
        />
        <Button
          variant="secondary"
          onClick={() => setShowGroceryModal(true)}
        >
          <ShoppingCart size={18} />
          Add to Grocery List
        </Button>
        <AddToMealPlanButton recipeId={recipe.id} variant="button" />
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="print:hidden"
        >
          <Printer size={18} />
          Print
        </Button>
        <Button
          variant="outline"
          onClick={handleShareLink}
          className="print:hidden"
        >
          <QrCode size={18} />
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
          <div className="bg-surface rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-brown mb-4">Ingredients</h2>
            <IngredientList
              ingredients={scaledIngredients}
              annotations={annotations.ingredient}
              onAnnotationSave={handleAnnotationSave}
              onAnnotationDelete={handleAnnotationDelete}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-surface rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold text-brown mb-4">Instructions</h2>
          <StepList
            steps={instructions}
            annotations={annotations.instruction}
            onAnnotationSave={handleAnnotationSave}
            onAnnotationDelete={handleAnnotationDelete}
          />
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

      {/* Recipe Insights (Cost & Nutrition Analysis) */}
      <RecipeInsights recipeId={recipe.id} />

      {/* Your Cook History & Notes */}
      {cookNotes.length > 0 && (() => {
        const withNotes = cookNotes.filter(e => e.notes);
        const cookCount = cookNotes.length;
        const firstCook = cookNotes[cookNotes.length - 1];
        const lastCook = cookNotes[0];
        const firstDate = new Date(firstCook.cooked_at).toLocaleDateString(undefined, {
          year: 'numeric', month: 'long', day: 'numeric',
        });
        const isOnlyOnce = cookCount === 1;

        return (
          <div className="mt-8">
            {/* Recipe Memories */}
            <div className="bg-cream/60 rounded-xl px-5 py-4 mb-5 border border-cream-dark/30">
              <h2 className="text-lg font-bold text-brown font-serif mb-2">Your History</h2>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-brown-light">
                <span>
                  First made <span className="font-semibold text-brown">{firstDate}</span>
                </span>
                {!isOnlyOnce && (
                  <>
                    <span className="text-warm-gray">·</span>
                    <span>
                      Last cooked <span className="font-semibold text-brown">{timeAgo(lastCook.cooked_at)}</span>
                    </span>
                    <span className="text-warm-gray">·</span>
                    <span>
                      Made <span className="font-semibold text-brown">{cookCount} times</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Cook Notes */}
            {withNotes.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-brown font-serif mb-3">Cook Notes</h3>
                <div className="space-y-2">
                  {withNotes.map(entry => {
                    const date = new Date(entry.cooked_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    });
                    return (
                      <div key={entry.id} className="flex gap-3 py-2 border-b border-cream-dark last:border-0">
                        <span className="text-sm text-warm-gray shrink-0 w-24">{date}</span>
                        <span className="text-sm text-brown-light">{entry.notes}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

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

            {/* QR Code */}
            <div className="flex justify-center py-2">
              <div
                className="bg-white p-3 rounded-xl inline-block"
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    const qr = qrcode(0, 'M');
                    qr.addData(shareLinkUrl);
                    qr.make();
                    return qr.createSvgTag({ cellSize: 4, margin: 0 });
                  })(),
                }}
              />
            </div>
            <p className="text-xs text-warm-gray text-center">Scan to open this recipe</p>

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
