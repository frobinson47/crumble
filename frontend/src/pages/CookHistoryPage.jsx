import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, UtensilsCrossed } from 'lucide-react';
import * as api from '../services/api';
import { Skeleton } from '../components/ui/Skeleton';

export default function CookHistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getCookLog()
      .then(data => setHistory(data.history || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-brown font-serif">Cook History</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 items-center p-4 bg-white rounded-2xl shadow-md">
              <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-md">
          <BookOpen size={48} className="mx-auto text-warm-gray mb-3" />
          <p className="text-lg text-warm-gray">You haven't cooked anything yet!</p>
          <p className="text-sm text-warm-gray mt-1">
            Click "I Cooked This" on a recipe to start tracking
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(entry => {
            const imageUrl = entry.image_path ? `/uploads/${entry.image_path}` : null;
            const date = new Date(entry.cooked_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            return (
              <Link
                key={entry.id}
                to={`/recipe/${entry.recipe_id}`}
                className="flex gap-4 items-center p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 group"
              >
                <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-cream-dark">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={entry.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cream to-cream-dark">
                      <UtensilsCrossed size={24} className="text-warm-gray/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-brown truncate group-hover:text-terracotta transition-colors duration-200 font-serif">
                    {entry.title}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-warm-gray mt-0.5">
                    <Clock size={12} />
                    {date}
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-brown-light mt-1 line-clamp-1">{entry.notes}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
