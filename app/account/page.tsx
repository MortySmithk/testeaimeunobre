// PrimeVicio - Site - Copia/app/account/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, userFirestore } from '@/lib/firebase';
import { useAuth } from '@/components/auth/auth-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface HistoryItem {
  id: string;
  title: string;
  mediaType: 'movie' | 'tv';
  progress: number;
  finished: boolean;
  mediaId: string;
  season?: number;
  episode?: number;
}

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setLoadingHistory(true);
      const historyCollection = collection(userFirestore, 'users', user.uid, 'watchHistory');
      const q = query(historyCollection, orderBy('lastWatched', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const historyData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as HistoryItem));
        setHistory(historyData);
        setLoadingHistory(false);
      }, (error) => {
        console.error("Erro ao buscar histórico:", error);
        setLoadingHistory(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{user.displayName || 'Minha Conta'}</h1>
            <p className="text-zinc-400">{user.email}</p>
          </div>
          <Button variant="destructive" onClick={handleLogout}>Sair</Button>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Histórico de Exibição</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              </div>
            ) : history.length > 0 ? (
              <ul className="space-y-4">
                {history.map((item) => (
                  <li key={item.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-zinc-400">{item.mediaType === 'movie' ? 'Filme' : `Série - T${item.season} E${item.episode}`}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {item.progress >= 95 ? (
                        <span className="text-green-400 text-sm font-semibold">Assistido</span>
                      ) : (
                        <div className="w-32">
                          <div className="h-2 bg-zinc-700 rounded-full">
                            <div
                              className="h-2 bg-red-600 rounded-full"
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 text-right">{Math.round(item.progress)}%</p>
                        </div>
                      )}
                      <Link href={`/embed/${item.mediaType}/${item.mediaId}${item.season ? `/${item.season}/${item.episode}` : ''}`} passHref target="_blank">
                        <Button size="sm" variant="outline">Continuar</Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-400 text-center py-8">Você ainda não assistiu nada.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}