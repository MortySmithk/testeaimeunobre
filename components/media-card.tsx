// PrimeVicio - Site - Copia/components/media-card.tsx
"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Heart, PlayCircle, Star } from "lucide-react"
import { useFavorites } from "./favorites-context"
import { Button } from "./ui/button"
import { useToast } from "@/hooks/use-toast"

export interface MediaItem {
  id: number
  title: string
  name?: string
  poster_path: string
  vote_average: number
  release_date?: string
  first_air_date?: string
  media_type: 'movie' | 'tv'
}

interface MediaCardProps {
  item: MediaItem
}

export function MediaCard({ item }: MediaCardProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites()
  const { toast } = useToast()

  const title = item.title || item.name || "Título não disponível"
  const releaseDate = item.release_date || item.first_air_date
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "N/A"
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A"
  const href = `/${item.media_type}/${item.id}`

  const isFav = isFavorite(item.id)

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isFav) {
      removeFavorite(item.id)
      toast({
        title: "Removido dos Favoritos",
        description: `${title} foi removido da sua lista.`,
      })
    } else {
      addFavorite(item)
      toast({
        title: "Adicionado aos Favoritos",
        description: `${title} foi adicionado à sua lista.`,
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative group"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-lg">
        <Link href={href} passHref>
          <Image
            src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
            alt={`Pôster de ${title}`}
            fill
            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            unoptimized
          />
          {/* Overlay que aparece ao passar o mouse */}
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <PlayCircle className="text-white h-20 w-20" />
          </div>
        </Link>
      </div>

      {/* Botão de Favoritos */}
      <Button
        onClick={handleFavoriteClick}
        variant="ghost"
        size="icon"
        className={`absolute top-2 right-2 rounded-full h-8 w-8 bg-black/50 backdrop-blur-sm ${isFav ? 'text-red-500' : 'text-white'}`}
      >
        <Heart className="h-4 w-4" />
      </Button>
      
      {/* Informações abaixo do card */}
      <div className="mt-2">
        <Link href={href} passHref>
          <h3 className="truncate text-sm font-semibold text-white hover:text-red-400 transition-colors">
            {title}
          </h3>
        </Link>
        <div className="mt-1 flex items-center justify-between text-xs text-zinc-400">
          <span>{year}</span>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400" />
            <span>{rating}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}