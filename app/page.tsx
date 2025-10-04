// app/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import PaginationComponent from "@/components/PaginationComponent"
import { MediaCard, type MediaItem } from "@/components/media-card"

// --- CONSTANTES ---
const API_KEY = "860b66ade580bacae581f4228fad49fc";
const API_BASE_URL = "https://api.themoviedb.org/3";

export default function HomePage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroBackdrop, setHeroBackdrop] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchMedia = useCallback(async (page: number) => {
    setLoading(true);
    try {
        const res = await fetch(`${API_BASE_URL}/trending/all/week?api_key=${API_KEY}&language=pt-BR&page=${page}`);
        if (!res.ok) throw new Error("Falha ao buscar dados do TMDB.");
        
        const data = await res.json();
        const validMedia = data.results.filter((item: any) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path);
        
        setMedia(validMedia);
        setTotalPages(data.total_pages > 500 ? 500 : data.total_pages);

        if (page === 1 && validMedia.length > 0) {
            const itemsWithBackdrop = validMedia.filter((item: MediaItem) => item.backdrop_path);
            if (itemsWithBackdrop.length > 0) {
                const randomItem = itemsWithBackdrop[Math.floor(Math.random() * itemsWithBackdrop.length)];
                setHeroBackdrop(randomItem.backdrop_path);
            }
        }
    } catch (error) {
        console.error("Erro ao buscar mídia do TMDB:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia(currentPage);
  }, [currentPage, fetchMedia]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="relative flex h-[55vh] items-center justify-center overflow-hidden pt-14">
        <AnimatePresence>
          {heroBackdrop && ( <motion.div key={heroBackdrop} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0.6 }} transition={{ duration: 1.2, ease: "easeOut" }} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original/${heroBackdrop})` }} /> )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
      </section>

      {/* A SEÇÃO DE DOCUMENTAÇÃO DA API FOI REMOVIDA DAQUI */}

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 -mt-32">
        <h2 className="text-2xl font-bold mb-6 text-white">Populares da Semana</h2>
        <AnimatePresence mode="wait">
          <motion.div key="media-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {loading ? ( <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-zinc-500" /></div> ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {media.map((item) => (<MediaCard key={`${item.id}-${item.media_type}`} item={item} />))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
  )
}