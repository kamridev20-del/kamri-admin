'use client'

import { LoginModal } from '@/components/auth/LoginModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import {
  DollarSign,
  Edit,
  Globe,
  Moon,
  Palette,
  RefreshCw,
  Save,
  Settings,
  Sun
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface Settings {
  id?: string
  theme: string
  currency: string
  language: string
  accentColor: string
  companyName: string
  companyEmail?: string
  companyPhone?: string
  companyAddress?: string
  apiRateLimit: number
  autoSync: boolean
  notifications: boolean
  emailNotifications: boolean
  smsNotifications: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    theme: 'light',
    currency: 'USD',
    language: 'fr',
    accentColor: '#4CAF50',
    companyName: 'KAMRI',
    companyEmail: 'admin@kamri.com',
    companyPhone: '+33 1 23 45 67 89',
    companyAddress: '123 Rue de la Paix, 75001 Paris',
    apiRateLimit: 1000,
    autoSync: true,
    notifications: true,
    emailNotifications: true,
    smsNotifications: false
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showCompanyEditModal, setShowCompanyEditModal] = useState(false)
  const [showApiEditModal, setShowApiEditModal] = useState(false)
  const { isAuthenticated } = useAuth()
  const { theme, accentColor, setTheme, setAccentColor } = useTheme()
  const toast = useToast()

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings()
    } else {
      setShowLogin(true)
    }
  }, [isAuthenticated])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.getSettings()
      if (response.data) {
        // L'API retourne { data: {...}, message: "..." }, on doit extraire data
        const settingsData = response.data.data || response.data;
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const response = await apiClient.updateSettings(settings)
      if (response.data) {
        toast.showToast({ type: 'success', title: 'Paramètres', description: 'Paramètres sauvegardés avec succès !' })
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.showToast({ type: 'error', title: 'Paramètres', description: 'Erreur lors de la sauvegarde des paramètres' })
    } finally {
      setIsSaving(false)
    }
  }

  // Fonction spécifique pour sauvegarder les informations de l'entreprise
  const handleSaveCompanyInfo = async () => {
    try {
      setIsSaving(true)
      const companyData = {
        companyName: settings.companyName,
        companyEmail: settings.companyEmail,
        companyPhone: settings.companyPhone,
        companyAddress: settings.companyAddress,
      }
      const response = await apiClient.updateSettings(companyData)
      if (response.data) {
        toast.showToast({ type: 'success', title: 'Entreprise', description: 'Informations de l\'entreprise sauvegardées avec succès !' })
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des informations de l\'entreprise:', error)
      toast.showToast({ type: 'error', title: 'Entreprise', description: 'Erreur lors de la sauvegarde des informations de l\'entreprise' })
    } finally {
      setIsSaving(false)
    }
  }

  // Fonction spécifique pour sauvegarder la configuration API
  const handleSaveApiSettings = async () => {
    try {
      setIsSaving(true)
      const apiData = {
        apiRateLimit: settings.apiRateLimit,
        autoSync: settings.autoSync,
        notifications: settings.notifications,
        emailNotifications: settings.emailNotifications,
        smsNotifications: settings.smsNotifications,
      }
      const response = await apiClient.updateSettings(apiData)
      if (response.data) {
        toast.showToast({ type: 'success', title: 'API', description: 'Configuration API sauvegardée avec succès !' })
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration API:', error)
      toast.showToast({ type: 'error', title: 'API', description: 'Erreur lors de la sauvegarde de la configuration API' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      setSettings({
        theme: 'light',
        currency: 'EUR',
        language: 'fr',
        accentColor: '#4CAF50',
        companyName: 'KAMRI',
        companyEmail: 'admin@kamri.com',
        companyPhone: '+33 1 23 45 67 89',
        companyAddress: '123 Rue de la Paix, 75001 Paris',
        apiRateLimit: 1000,
        autoSync: true,
        notifications: true,
        emailNotifications: true,
        smsNotifications: false
      })
      toast.showToast({ type: 'success', title: 'Paramètres', description: 'Paramètres réinitialisés !' })
    }
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Connexion Requise</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Veuillez vous connecter pour accéder aux paramètres
              </p>
              <Button onClick={() => setShowLogin(true)}>
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </div>
        <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      </>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des paramètres...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600 mt-2">Configurez votre plateforme KAMRI</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          <Button className="kamri-button" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance */}
        <Card className="kamri-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="w-5 h-5 text-primary-500" />
              <span>Apparence</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thème
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'light' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Clair</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Gris</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleur d'accent
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-10 border border-gray-200 rounded-lg cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Localization */}
        <Card className="kamri-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-primary-500" />
              <span>Localisation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Langue
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devise
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar ($)</option>
                <option value="GBP">Livre Sterling (£)</option>
                <option value="CAD">Dollar Canadien (C$)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card className="kamri-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-primary-500" />
                <span>Informations de l'entreprise</span>
              </div>
              <Button 
                onClick={() => setShowCompanyEditModal(true)}
                variant="outline"
                size="sm"
                className="kamri-button"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'entreprise
                </label>
                <p className="text-gray-900 font-medium">{settings.companyName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-gray-900">{settings.companyEmail}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <p className="text-gray-900">{settings.companyPhone}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <p className="text-gray-900">{settings.companyAddress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card className="kamri-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-primary-500" />
              <span>Configuration API</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limite de taux API (requêtes/heure)
              </label>
              <Input
                value={settings.apiRateLimit}
                onChange={(e) => setSettings({...settings, apiRateLimit: parseInt(e.target.value) || 1000})}
                type="number"
                placeholder="1000"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Synchronisation automatique</label>
                  <p className="text-xs text-gray-500">Synchroniser automatiquement avec les fournisseurs</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoSync}
                  onChange={(e) => setSettings({...settings, autoSync: e.target.checked})}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Notifications</label>
                  <p className="text-xs text-gray-500">Recevoir des notifications système</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Notifications email</label>
                  <p className="text-xs text-gray-500">Recevoir des notifications par email</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Notifications SMS</label>
                  <p className="text-xs text-gray-500">Recevoir des notifications par SMS</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => setSettings({...settings, smsNotifications: e.target.checked})}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Bouton pour enregistrer la configuration API */}
            <div className="pt-4 border-t border-gray-200">
              <Button 
                onClick={handleSaveApiSettings}
                className="kamri-button"
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer la configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card className="kamri-card">
        <CardHeader>
          <CardTitle>Aperçu des paramètres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Thème</h4>
              <p className="text-sm text-gray-600">
                {theme === 'dark' ? 'Mode gris' : 'Mode clair'} avec couleur d'accent {accentColor}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Localisation</h4>
              <p className="text-sm text-gray-600">
                Langue: {settings.language === 'fr' ? 'Français' : 'English'} • 
                Devise: {settings.currency}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Notifications</h4>
              <p className="text-sm text-gray-600">
                {settings.notifications ? 'Activées' : 'Désactivées'} • 
                {settings.autoSync ? 'Sync auto' : 'Sync manuelle'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Popup d'édition des informations de l'entreprise */}
      {showCompanyEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-primary-500" />
                <span>Modifier les informations de l'entreprise</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'entreprise
                  </label>
                  <Input
                    value={settings.companyName}
                    onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                    placeholder="KAMRI"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    value={settings.companyEmail}
                    onChange={(e) => setSettings({...settings, companyEmail: e.target.value})}
                    placeholder="admin@kamri.com"
                    type="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <Input
                    value={settings.companyPhone}
                    onChange={(e) => setSettings({...settings, companyPhone: e.target.value})}
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <textarea
                    value={settings.companyAddress}
                    onChange={(e) => setSettings({...settings, companyAddress: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="123 Rue de la Paix, 75001 Paris"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCompanyEditModal(false)}
                >
                  Annuler
                </Button>
                <Button 
                  onClick={async () => {
                    await handleSaveCompanyInfo()
                    setShowCompanyEditModal(false)
                  }}
                  className="kamri-button"
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
