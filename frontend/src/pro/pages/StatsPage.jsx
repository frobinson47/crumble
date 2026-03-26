import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Clock, Heart, Star, Flame, BookOpen, TrendingUp, Calendar, Sparkles } from 'lucide-react';
import * as api from '../../services/api';
import { thumbImageUrl } from '../../utils/imageUrl';
import Spinner from '../../components/ui/Spinner';
import useDocumentTitle from '../../hooks/useDocumentTitle';

function StatCard({ icon: Icon, label, value, sublabel, color = 'text-terracotta' }) {
  return (
    <div className="bg-surface rounded-2xl shadow-md p-5 flex flex-col items-center text-center gap-1">
      <Icon size={24} className={color} />
      <span className="text-2xl font-bold text-brown">{value}</span>
      <span className="text-sm text-warm-gray">{label}</span>
      {sublabel && <span className="text-xs text-warm-gray/70">{sublabel}</span>}
    </div>
  );
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StatsPage() {
  useDocumentTitle('Kitchen Stats');

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-warm-gray">Unable to load stats.</p>
      </div>
    );
  }

  const maxMonthly = Math.max(...(stats.monthly_activity?.map(m => m.count) || [1]));
  const weekdayCounts = stats.weekday_counts || {};
  const maxWeekday = Math.max(...Object.values(weekdayCounts), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brown flex items-center gap-2">
        <TrendingUp size={24} className="text-terracotta" />
        Kitchen Stats
      </h1>

      {/* Main stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={ChefHat}
          label="Times Cooked"
          value={stats.total_cooks}
          color="text-terracotta"
        />
        <StatCard
          icon={BookOpen}
          label="Unique Recipes"
          value={stats.unique_recipes}
          sublabel={`of ${stats.recipes_owned} in collection`}
          color="text-brown-light"
        />
        <StatCard
          icon={Clock}
          label="Time Cooking"
          value={formatMinutes(stats.total_minutes)}
          sublabel="estimated total"
          color="text-sage"
        />
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={stats.streak}
          sublabel={stats.streak > 0 ? 'Keep it up!' : 'Cook something today!'}
          color="text-terracotta-dark"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Heart}
          label="Favorites"
          value={stats.favorites_count}
          color="text-terracotta-light"
        />
        <StatCard
          icon={Star}
          label="Avg Rating Given"
          value={stats.avg_rating ? `${stats.avg_rating}/5` : '—'}
          color="text-sage"
        />
        <StatCard
          icon={Sparkles}
          label="New This Year"
          value={stats.new_recipes_this_year ?? 0}
          sublabel="recipes tried for the first time"
          color="text-terracotta"
        />
        <StatCard
          icon={Calendar}
          label="Busiest Day"
          value={stats.busiest_day?.day || '—'}
          sublabel={stats.busiest_day ? `${stats.busiest_day.count} cooks` : ''}
          color="text-brown-light"
        />
      </div>

      {/* Top 5 most cooked recipes */}
      {stats.top_recipes && stats.top_recipes.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-md p-5">
          <h2 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-3">Most Cooked Recipes</h2>
          <div className="space-y-3">
            {stats.top_recipes.map((recipe, i) => (
              <Link
                key={recipe.id}
                to={`/recipe/${recipe.id}`}
                className="flex items-center gap-3 group"
              >
                <span className="text-sm font-bold text-warm-gray/50 w-5 text-right shrink-0">{i + 1}</span>
                {recipe.image_path ? (
                  <img
                    src={thumbImageUrl(recipe.image_path)}
                    alt=""
                    loading="lazy"
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-cream-dark flex items-center justify-center shrink-0">
                    <ChefHat size={16} className="text-warm-gray" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-brown group-hover:text-terracotta transition-colors truncate text-sm">
                    {recipe.title}
                  </p>
                </div>
                <span className="text-xs text-warm-gray shrink-0">{recipe.cook_count}x</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top tags */}
      {stats.top_tags && stats.top_tags.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-md p-5">
          <h2 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-3">What You Cook Most</h2>
          <div className="space-y-2">
            {stats.top_tags.map((tag) => (
              <div key={tag.name} className="flex items-center gap-3">
                <span className="text-sm text-brown font-medium w-24 shrink-0">{tag.name}</span>
                <div className="flex-1 h-2 bg-cream-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-terracotta/60 rounded-full"
                    style={{ width: `${(tag.count / stats.top_tags[0].count) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-warm-gray w-8 text-right">{tag.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekday heatmap */}
      {Object.values(weekdayCounts).some(c => c > 0) && (
        <div className="bg-surface rounded-2xl shadow-md p-5">
          <h2 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-3">When You Cook</h2>
          <div className="flex items-end gap-2 justify-between">
            {DAY_LABELS.map((label, i) => {
              const count = weekdayCounts[i + 1] || 0;
              const intensity = count / maxWeekday;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-warm-gray font-medium">{count}</span>
                  <div
                    className="w-full rounded-md transition-all duration-300"
                    style={{
                      height: `${Math.max(8, intensity * 64)}px`,
                      backgroundColor: count > 0
                        ? `rgba(193, 112, 80, ${0.2 + intensity * 0.8})`
                        : 'rgb(var(--color-cream-dark))',
                    }}
                  />
                  <span className="text-[10px] text-warm-gray">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly activity */}
      {stats.monthly_activity && stats.monthly_activity.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-md p-5">
          <h2 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-3">Monthly Activity</h2>
          <div className="flex items-end gap-1.5 h-28">
            {stats.monthly_activity.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-warm-gray font-medium">{month.count}</span>
                <div
                  className="w-full bg-sage/40 rounded-t-md transition-all duration-300"
                  style={{ height: `${Math.max(8, (month.count / maxMonthly) * 80)}px` }}
                />
                <span className="text-[10px] text-warm-gray">
                  {new Date(month.month + '-01').toLocaleString('default', { month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total_cooks === 0 && (
        <div className="text-center py-8 text-warm-gray">
          <ChefHat size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No cooking history yet</p>
          <p className="text-sm mt-1">Start logging your cooks to see stats here!</p>
        </div>
      )}
    </div>
  );
}
