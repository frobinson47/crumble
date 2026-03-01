import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2, Upload, CheckCircle, XCircle, Save, Eye,
  PenLine, Loader2, FileUp
} from 'lucide-react';
import Button from '../components/ui/Button';
import * as api from '../services/api';

function formatRecipeData(parsed) {
  return {
    title: parsed.title || '',
    description: parsed.description || '',
    prep_time: parsed.prepTime || parsed.prep_time || '',
    cook_time: parsed.cookTime || parsed.cook_time || '',
    servings: parsed.servings || '',
    source_url: parsed.sourceUrl || parsed.source_url || '',
    source_image_url: parsed.image_url || parsed.imageUrl || '',
    ingredients: (parsed.ingredients || []).map((ing, i) => {
      if (typeof ing === 'string') {
        return { amount: '', unit: '', name: ing, sort_order: i };
      }
      return {
        amount: ing.amount || '',
        unit: ing.unit || '',
        name: ing.name || '',
        sort_order: i,
      };
    }),
    instructions: parsed.instructions || [],
    tags: parsed.tags || [],
  };
}

export default function BulkImportPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('choose'); // 'choose', 'urls', 'file'
  const [urlText, setUrlText] = useState('');
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(null); // { current, total }
  const [isProcessing, setIsProcessing] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState(null);

  const handleUrlImport = async () => {
    const urls = urlText
      .split('\n')
      .map(u => u.trim())
      .filter(u => u && u.startsWith('http'));

    if (urls.length === 0) {
      setError('Please enter at least one valid URL');
      return;
    }

    if (urls.length > 50) {
      setError('Maximum 50 URLs per batch');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgress({ current: 0, total: urls.length });

    try {
      const data = await api.importBatch(urls);
      setResults(
        data.results.map(r => ({
          ...r,
          saved: false,
          saving: false,
        }))
      );
      setProgress(null);
    } catch (err) {
      setError(err.message);
      setProgress(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      let data;
      if (file.name.endsWith('.paprikarecipes')) {
        data = await api.importPaprika(file);
      } else if (file.name.endsWith('.zip')) {
        data = await api.importMealie(file);
      } else {
        setError('Unsupported file format. Use .zip (Mealie) or .paprikarecipes (Paprika).');
        setIsProcessing(false);
        return;
      }

      setResults(
        data.results.map(r => ({
          ...r,
          saved: false,
          saving: false,
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveRecipe = async (index) => {
    const item = results[index];
    if (item.status !== 'success' || item.saved) return;

    setResults(prev =>
      prev.map((r, i) => (i === index ? { ...r, saving: true } : r))
    );

    try {
      const data = formatRecipeData(item.recipe);
      await api.createRecipe(data);
      setResults(prev =>
        prev.map((r, i) => (i === index ? { ...r, saved: true, saving: false } : r))
      );
    } catch {
      setResults(prev =>
        prev.map((r, i) =>
          i === index ? { ...r, saving: false, saveError: 'Failed to save' } : r
        )
      );
    }
  };

  const saveAllSuccessful = async () => {
    setSavingAll(true);
    const toSave = results
      .map((r, i) => ({ ...r, index: i }))
      .filter(r => r.status === 'success' && !r.saved);

    for (const item of toSave) {
      await saveRecipe(item.index);
    }
    setSavingAll(false);
  };

  const reviewRecipe = (index) => {
    const item = results[index];
    if (item.status !== 'success') return;
    const data = formatRecipeData(item.recipe);
    // Store in sessionStorage and navigate to add page
    sessionStorage.setItem('bulkImportReview', JSON.stringify(data));
    navigate('/add?review=bulk');
  };

  const successCount = results?.filter(r => r.status === 'success' && !r.saved).length || 0;
  const savedCount = results?.filter(r => r.saved).length || 0;

  // Choose mode screen
  if (mode === 'choose' && !results) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-brown">Bulk Import</h1>
        <p className="text-brown-light">
          Import multiple recipes at once from URLs or from another recipe app.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('urls')}
            className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-terracotta/10 flex items-center justify-center group-hover:bg-terracotta/20 transition-colors duration-200">
              <Link2 size={28} className="text-terracotta" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-brown">From URLs</h3>
              <p className="text-sm text-warm-gray mt-1">
                Paste multiple recipe links, one per line
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode('file')}
            className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-sage/10 flex items-center justify-center group-hover:bg-sage/20 transition-colors duration-200">
              <FileUp size={28} className="text-sage" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-brown">From App Export</h3>
              <p className="text-sm text-warm-gray mt-1">
                Upload a Mealie (.zip) or Paprika (.paprikarecipes) export
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // URL input screen
  if (mode === 'urls' && !results) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brown">Import from URLs</h1>
          <button
            onClick={() => { setMode('choose'); setError(null); }}
            className="text-sm text-warm-gray hover:text-brown transition-colors"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <label className="block text-sm font-semibold text-brown">
            Paste recipe URLs (one per line)
          </label>
          <textarea
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder={"https://example.com/recipe-1\nhttps://example.com/recipe-2\nhttps://example.com/recipe-3"}
            rows={8}
            className="w-full border border-cream-dark rounded-xl px-4 py-3 text-brown focus:outline-none focus:ring-2 focus:ring-terracotta/50 resize-y"
          />

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <Button
            onClick={handleUrlImport}
            disabled={isProcessing || !urlText.trim()}
            size="lg"
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Importing{progress ? ` (${progress.current} of ${progress.total})` : ''}...
              </>
            ) : (
              <>
                <Upload size={20} />
                Import All
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // File upload screen
  if (mode === 'file' && !results) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brown">Import from App Export</h1>
          <button
            onClick={() => { setMode('choose'); setError(null); }}
            className="text-sm text-warm-gray hover:text-brown transition-colors"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <p className="text-brown-light text-sm">
            Upload an export file from Mealie (.zip) or Paprika (.paprikarecipes).
          </p>

          <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-cream-dark rounded-2xl cursor-pointer hover:border-terracotta/50 transition-colors">
            <FileUp size={32} className="text-warm-gray" />
            <span className="text-sm text-brown-light">
              {isProcessing ? 'Processing...' : 'Click to select file'}
            </span>
            <input
              type="file"
              accept=".zip,.paprikarecipes"
              onChange={handleFileImport}
              className="hidden"
              disabled={isProcessing}
            />
          </label>

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-brown-light">
              <Loader2 size={20} className="animate-spin" />
              <span>Processing export file...</span>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Results screen
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brown">Import Results</h1>
        <button
          onClick={() => {
            setResults(null);
            setMode('choose');
            setUrlText('');
            setError(null);
          }}
          className="text-sm text-warm-gray hover:text-brown transition-colors"
        >
          Start Over
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-sage font-semibold">
          {results.filter(r => r.status === 'success').length} successful
        </span>
        <span className="text-red-500 font-semibold">
          {results.filter(r => r.status === 'error').length} failed
        </span>
        {savedCount > 0 && (
          <span className="text-brown-light">
            {savedCount} saved
          </span>
        )}
      </div>

      {/* Save All button */}
      {successCount > 0 && (
        <Button
          onClick={saveAllSuccessful}
          disabled={savingAll}
          size="lg"
        >
          {savingAll ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              Save All Successful ({successCount})
            </>
          )}
        </Button>
      )}

      {/* Results table */}
      <div className="space-y-3">
        {results.map((item, index) => (
          <div
            key={index}
            className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 ${
              item.saved ? 'opacity-60' : ''
            }`}
          >
            {/* Status icon */}
            <div className="shrink-0">
              {item.status === 'success' ? (
                item.saved ? (
                  <CheckCircle size={24} className="text-sage" />
                ) : (
                  <CheckCircle size={24} className="text-sage-light" />
                )
              ) : (
                <XCircle size={24} className="text-red-400" />
              )}
            </div>

            {/* Recipe info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-brown truncate">
                {item.status === 'success'
                  ? item.recipe?.title || 'Untitled Recipe'
                  : item.url || 'Unknown'}
              </p>
              <p className="text-sm text-warm-gray truncate">
                {item.status === 'success'
                  ? `${item.recipe?.ingredients?.length || 0} ingredients, ${
                      item.recipe?.instructions?.length || 0
                    } steps`
                  : item.error_message || 'Import failed'}
              </p>
              {item.saveError && (
                <p className="text-sm text-red-500">{item.saveError}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {item.status === 'success' && !item.saved && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reviewRecipe(index)}
                  >
                    <Eye size={14} />
                    Review
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveRecipe(index)}
                    disabled={item.saving}
                  >
                    {item.saving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save
                  </Button>
                </>
              )}
              {item.status === 'success' && item.saved && (
                <span className="text-sm text-sage font-semibold">Saved</span>
              )}
              {item.status === 'error' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/add`)}
                >
                  <PenLine size={14} />
                  Enter manually
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
