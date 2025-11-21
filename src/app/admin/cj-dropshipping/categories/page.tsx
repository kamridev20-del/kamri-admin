'use client';

import CategoryExplorer from '@/components/cj/CategoryExplorer';
import React from 'react';

const CategoriesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <CategoryExplorer />
      </div>
    </div>
  );
};

export default CategoriesPage;