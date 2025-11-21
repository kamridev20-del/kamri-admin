'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStoreNotifications } from '@/hooks/useStoreNotifications';
import { Bell, RefreshCw, Store, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function NotificationDropdown() {
  const { notifications, loading, refresh } = useStoreNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleItemClick = (id: string, type: 'store') => {
    setIsOpen(false);
    router.push(`/admin/stores?store=${id}`);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {notifications.total > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold animate-pulse">
            {notifications.total > 99 ? '99+' : notifications.total}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown panel */}
          <Card className="absolute right-0 top-12 w-96 z-50 shadow-xl border-slate-200">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-slate-700" />
                <h3 className="font-semibold text-slate-900">
                  Produits disponibles
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    refresh();
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <CardContent className="p-0 max-h-96 overflow-y-auto">
              {loading && (!notifications.items || notifications.items.length === 0) ? (
                <div className="p-6 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-slate-400" />
                  <p className="text-sm">Chargement des notifications...</p>
                </div>
              ) : !notifications.items || notifications.items.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium">Aucune notification</p>
                  <p className="text-xs mt-1">
                    Tous vos produits sont traités
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id, item.type)}
                      className="w-full p-4 hover:bg-slate-50 transition-colors text-left flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100">
                          <Store className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate group-hover:text-blue-600">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.count}{' '}
                            {item.count === 1
                              ? 'produit disponible'
                              : 'produits disponibles'}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="default"
                        className="ml-2 bg-blue-500 hover:bg-blue-600"
                      >
                        {item.count}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>

            {notifications.items.length > 0 && (
              <div className="p-3 border-t bg-slate-50 text-center">
                <p className="text-xs text-slate-600">
                  Total : <strong>{notifications.total}</strong>{' '}
                  {notifications.total === 1 ? 'produit' : 'produits'} disponible{notifications.total === 1 ? '' : 's'}
                  {notifications.storesCount > 0 && (
                    <span className="ml-2 text-slate-500">
                      ({notifications.storesCount} {notifications.storesCount === 1 ? 'magasin' : 'magasins'})
                    </span>
                  )}
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
