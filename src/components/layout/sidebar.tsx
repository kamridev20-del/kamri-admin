'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    AlertTriangle,
    BarChart3,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Edit,
    FolderOpen,
    Globe,
    LayoutDashboard,
    Package,
    Settings,
    ShoppingCart,
    Store,
    Truck,
    Users,
    Warehouse
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Produits',
    href: '/admin/products',
    icon: Package,
  },
  {
    name: 'Validation',
    href: '/admin/products/validation',
    icon: CheckCircle,
  },
  {
    name: 'Draft',
    href: '/admin/products/draft',
    icon: Edit,
  },
  {
    name: 'Catégories',
    href: '/admin/categories',
    icon: FolderOpen,
  },
  {
    name: 'Fournisseurs',
    href: '/admin/suppliers',
    icon: Truck,
  },
  {
    name: 'Magasins',
    href: '/admin/stores',
    icon: Store,
  },
  {
    name: 'CJ Dropshipping',
    href: '/admin/cj-dropshipping',
    icon: Globe,
  },
  {
    name: 'Inventaire CJ',
    href: '/admin/cj-dropshipping/inventory',
    icon: Warehouse,
  },
  {
    name: 'Litiges CJ',
    href: '/admin/cj-dropshipping/disputes',
    icon: AlertTriangle,
  },
  {
    name: 'Commandes',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    name: 'Utilisateurs',
    href: '/admin/users',
    icon: Users,
  },
  {
    name: 'Paramètres',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">KAMRI</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-50 text-primary-600 border border-primary-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin KAMRI</p>
              <p className="text-xs text-gray-500 truncate">admin@kamri.com</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
