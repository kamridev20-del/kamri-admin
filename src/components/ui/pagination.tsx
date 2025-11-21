'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}: PaginationProps) {
  // Calculer les pages à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7 // Nombre maximum de pages visibles
    
    if (totalPages <= maxVisible) {
      // Si on a moins de pages que le maximum, afficher toutes
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Logique pour afficher avec des ellipses
      if (currentPage <= 3) {
        // Début : 1, 2, 3, 4, ..., totalPages
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Fin : 1, ..., totalPages-3, totalPages-2, totalPages-1, totalPages
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Milieu : 1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages
        pages.push(1)
        pages.push('...')
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const pageNumbers = getPageNumbers()
  const startItem = totalItems ? ((currentPage - 1) * (itemsPerPage || 100) + 1) : null
  const endItem = totalItems ? Math.min(currentPage * (itemsPerPage || 100), totalItems) : null

  if (totalPages <= 1) {
    return null // Ne pas afficher la pagination s'il n'y a qu'une page ou moins
  }

  return (
    <div className="flex flex-col items-center gap-4 mt-8">
      {/* Informations sur les résultats */}
      {totalItems && (
        <div className="text-sm text-gray-600">
          Affichage de {startItem} à {endItem} sur {totalItems} produits
        </div>
      )}

      {/* Contrôles de pagination */}
      <div className="flex items-center gap-2">
        {/* Bouton Précédent */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </Button>

        {/* Numéros de pages */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                  ...
                </span>
              )
            }

            const pageNum = page as number
            const isActive = pageNum === currentPage

            return (
              <Button
                key={pageNum}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[40px] ${
                  isActive
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </Button>
            )
          })}
        </div>

        {/* Bouton Suivant */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1"
        >
          Suivant
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Indicateur de page */}
      <div className="text-sm text-gray-500">
        Page {currentPage} sur {totalPages}
      </div>
    </div>
  )
}

