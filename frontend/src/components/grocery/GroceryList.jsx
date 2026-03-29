import React from 'react';
import { ShoppingCart, ChevronRight, Calendar, Trash2 } from 'lucide-react';

export default function GroceryList({ list, onClick, onDelete }) {
  const itemCount = list.item_count || list.items?.length || 0;
  const checkedCount = list.checked_count || 0;
  const createdDate = list.created_at
    ? new Date(list.created_at).toLocaleDateString()
    : '';

  return (
    <button
      onClick={() => onClick(list.id)}
      className="w-full flex items-center gap-4 p-4 bg-surface rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 text-left group"
    >
      <div className="shrink-0 w-12 h-12 rounded-xl bg-sage-light/30 flex items-center justify-center">
        <ShoppingCart size={22} className="text-sage" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-brown truncate group-hover:text-terracotta transition-colors duration-200">
          {list.name}
        </h3>
        <div className="flex items-center gap-3 text-sm text-warm-gray mt-0.5">
          <span>{itemCount} items</span>
          {checkedCount > 0 && (
            <span className="text-sage">({checkedCount} done)</span>
          )}
          {createdDate && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {createdDate}
            </span>
          )}
        </div>
      </div>

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(list.id);
          }}
          className="shrink-0 p-2 rounded-lg text-warm-gray opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Delete list"
        >
          <Trash2 size={16} />
        </button>
      )}
      <ChevronRight size={20} className="text-warm-gray shrink-0 group-hover:text-terracotta transition-colors duration-200" />
    </button>
  );
}
