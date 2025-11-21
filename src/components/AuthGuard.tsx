'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Ne pas rediriger si on est déjà sur la page de login
    if (pathname === '/login') {
      setIsChecking(false);
      return;
    }

    // Attendre que l'authentification soit vérifiée
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        setIsChecking(false);
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Afficher un loader pendant la vérification
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EAF3EE] to-[#FFFFFF] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#4CAF50] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-[#424242]">Vérification...</h2>
          <p className="text-[#81C784] mt-2">Vérification de votre authentification</p>
        </div>
      </div>
    );
  }

  // Si on est sur la page de login, ne pas afficher le guard
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Si authentifié, afficher le contenu
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Par défaut, ne rien afficher (redirection en cours)
  return null;
}
