import React, { useState } from 'react';
import { Link2, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';

export default function ImportForm({ onImportSuccess, isLoading, onImport, initialUrl = '' }) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    try {
      const data = await onImport(url);
      if (onImportSuccess) {
        onImportSuccess(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to import recipe');
    }
  };

  return (
    <div className="bg-surface rounded-2xl shadow-md p-6">
      <h3 className="text-lg font-bold text-brown mb-4 flex items-center gap-2">
        <Link2 size={20} className="text-terracotta" />
        Import from URL
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Recipe URL"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/recipe/..."
          disabled={isLoading}
        />

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" />
              Importing...
            </>
          ) : (
            'Import Recipe'
          )}
        </Button>
      </form>

      <p className="mt-3 text-xs text-warm-gray text-center">
        Works best with sites that use structured recipe data (most major recipe sites)
      </p>
    </div>
  );
}
