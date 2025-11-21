import React, { useEffect, useState } from 'react';

const CategoryExplorerTest: React.FC = () => {
  const [status, setStatus] = useState('Chargement...');

  useEffect(() => {
    // Test de base pour vérifier si les composants se chargent
    setStatus('Composant chargé avec succès !');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Test CategoryExplorer
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Statut</h2>
          <p className="text-green-600 font-medium">{status}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Tests de composants</h2>
          
          <div className="space-y-4">
            <div className="p-4 border rounded">
              <h3 className="font-medium mb-2">Test Button</h3>
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Bouton de test
              </button>
            </div>

            <div className="p-4 border rounded">
              <h3 className="font-medium mb-2">Test Input</h3>
              <input 
                type="text" 
                placeholder="Test input..."
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="p-4 border rounded">
              <h3 className="font-medium mb-2">Test Card</h3>
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-medium">Card de test</h4>
                <p className="text-gray-600">Contenu de la card</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryExplorerTest;