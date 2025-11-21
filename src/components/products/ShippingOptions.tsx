'use client'

import { useState } from 'react'
import { Truck, Clock, DollarSign, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

export interface ShippingOption {
  logisticName: string
  shippingTime: string
  freight: number
  currency: string
}

interface ShippingOptionsProps {
  options: ShippingOption[]
  loading?: boolean
  error?: string | null
  selectedOption?: ShippingOption | null
  onSelect?: (option: ShippingOption) => void
}

export function ShippingOptions({ 
  options, 
  loading, 
  error, 
  selectedOption,
  onSelect 
}: ShippingOptionsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary-600 mr-2" />
        <span className="text-sm text-gray-600">Calcul des options de livraison...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">Erreur de calcul</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!options || options.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-yellow-600" />
        <p className="text-sm text-yellow-800">Aucune option de livraison disponible pour ce pays</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const isSelected = selectedOption?.logisticName === option.logisticName
        return (
          <Card
            key={index}
            className={`p-4 cursor-pointer transition-all ${
              isSelected
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
            }`}
            onClick={() => onSelect?.(option)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-primary-600" />
                  <h4 className="font-semibold text-gray-900">{option.logisticName}</h4>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-primary-600" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{option.shippingTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span className="font-semibold text-gray-900">
                      {option.freight.toFixed(2)} {option.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

