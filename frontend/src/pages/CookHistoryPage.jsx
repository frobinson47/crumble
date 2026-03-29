import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, UtensilsCrossed, Flame, CalendarDays, TrendingUp } from 'lucide-react';
import * as api from '../services/api';
import { thumbImageUrl } from '../utils/imageUrl';
import { Skeleton } from '../components/ui/Skeleton';
import useDocumentTitle from '../hooks/useDocumentTitle';

/**
 * Group cook history entries by time period:
 * This Week, Last Week, This Month, then by month name.
 */
function groupByPeriod(history) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Monday of this week
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - mondayOffset);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups = [];
  const buckets = {
    thisWeek: [],
    lastWeek: [],
    thisMonth: [],
  };
  const olderMonths = {}; // "March 2026" → entries[]

  for (const entry of history) {
    const date = new Date(entry.cooked_at);
    if (date >= thisWeekStart) {
      buckets.thisWeek.push(entry);
    } else if (date >= lastWeekStart) {
      buckets.lastWeek.push(entry);
    } else if (date >= thisMonthStart) {
      buckets.thisMonth.push(entry);
    } else {
      const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      (olderMonths[key] = olderMonths[key] || []).push(entry);
    }
  }

  if (buckets.thisWeek.length > 0) {
    groups.push({ label: 'This Week', entries: buckets.thisWeek });
  }
  if (buckets.lastWeek.length > 0) {
    groups.push({ label: 'Last Week', entries: buckets.lastWeek });
  }
  if (buckets.thisMonth.length > 0) {
    groups.push({ label: 'Earlier This Month', entries: buckets.thisMonth });
  }
  for (const [label, entries] of Object.entries(olderMonths)) {
    groups.push({ label, entries });
  }

  return groups;
}

/**
 * Compute summary stats from cook history.
 */
function computeStats(history) {
  if (history.length === 0) return null;

  // Current streak: consecutive days with cooks, counting back from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cookDays = new Set(
    history.map(e => {
      const d = new Date(e.cooked_at);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let streak = 0;
  const day = new Date(today);
  // Check today first, then count backwards
  while (cookDays.has(day.getTime())) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  // If no cook today, check if streak started yesterday
  if (streak === 0) {
    day.setTime(today.getTime());
    day.setDate(day.getDate() - 1);
    while (cookDays.has(day.getTime())) {
      streak++;
      day.setDate(day.getDate() - 1);
    }
  }

  // This month count
  const now = new Date();
  const thisMonthCount = history.filter(e => {
    const d = new Date(e.cooked_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Most cooked recipe
  const recipeCounts = {};
  for (const e of history) {
    const key = e.recipe_id;
    if (!recipeCounts[key]) recipeCounts[key] = { title: e.title, count: 0 };
    recipeCounts[key].count++;
  }
  const topRecipe = Object.values(recipeCounts).sort((a, b) => b.count - a.count)[0];

  return { streak, thisMonthCount, topRecipe };
}

function HistoryEntry({ entry }) {
  const imageUrl = thumbImageUrl(entry.image_path);
  const date = new Date(entry.cooked_at);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Link
      to={`/recipe/${entry.recipe_id}`}
      className="flex gap-4 items-center p-4 bg-surface rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 group"
    >
      <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-cream-dark">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={entry.title}
            loading="lazy"
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
          {dayName}, {dateStr}
        </div>
        {entry.notes && (
          <p className="text-sm text-brown-light mt-1 line-clamp-1">{entry.notes}</p>
        )}
      </div>
    </Link>
  );
}

export default function CookHistoryPage() {
  useDocumentTitle('Cook History');

  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getCookLog()
      .then(data => setHistory(data.history || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const groups = useMemo(() => groupByPeriod(history), [history]);
  const stats = useMemo(() => computeStats(history), [history]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brown font-serif">Cook History</h1>
        {history.length > 0 && (
          <span className="text-sm text-warm-gray">
            {history.length} {history.length === 1 ? 'cook' : 'cooks'}
          </span>
        )}
      </div>

      {/* Summary stats card */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface rounded-xl p-4 shadow-sm text-center">
            <Flame size={20} className={`mx-auto mb-1 ${stats.streak > 0 ? 'text-terracotta' : 'text-warm-gray/40'}`} />
            <p className="text-2xl font-bold text-brown">{stats.streak}</p>
            <p className="text-xs text-warm-gray">day streak</p>
          </div>
          <div className="bg-surface rounded-xl p-4 shadow-sm text-center">
            <CalendarDays size={20} className="mx-auto mb-1 text-sage" />
            <p className="text-2xl font-bold text-brown">{stats.thisMonthCount}</p>
            <p className="text-xs text-warm-gray">this month</p>
          </div>
          <div className="bg-surface rounded-xl p-4 shadow-sm text-center">
            <TrendingUp size={20} className="mx-auto mb-1 text-terracotta" />
            <p className="text-sm font-bold text-brown truncate">{stats.topRecipe?.title || '—'}</p>
            <p className="text-xs text-warm-gray">
              {stats.topRecipe ? `${stats.topRecipe.count}× cooked` : 'top recipe'}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 items-center p-4 bg-surface rounded-2xl shadow-md">
              <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-2xl shadow-md">
          <BookOpen size={48} className="mx-auto text-warm-gray mb-3" />
          <p className="text-lg text-warm-gray">You haven't cooked anything yet!</p>
          <p className="text-sm text-warm-gray mt-1">
            Click "I Cooked This" on a recipe to start tracking
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <div key={group.label}>
              <h2 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-3">
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.entries.map(entry => (
                  <HistoryEntry key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
