// PrimeVicio - Site - Copia/components/layout-wrapper.tsx
"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import React, { useState, useEffect, useCallback, useRef } from "react"
import { Search, Heart, Home, Film, Tv, Clapperboard, Drama, User, Loader2, LogIn } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-context"

const API_KEY = "860b66ade580bacae581f4228fad49fc";
const API_BASE_URL = "https://api.themoviedb.org/3";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const searchRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth(); // Usando o hook de autenticação

  // Lógica para esconder sugestões ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [searchRef])

  // Lógica para buscar sugestões com debounce
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`${API_BASE_URL}/search/multi?api_key=${API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}&page=1`)
      const data = await res.json()
      const validMedia = data.results
        .filter((item: any) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
        .slice(0, 5) // Pega apenas os 5 primeiros resultados
      setSuggestions(validMedia)
      setShowSuggestions(true)
    } catch (error) {
      console.error("Erro ao buscar sugestões:", error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSuggestions(searchQuery)
    }, 300) // Delay de 300ms antes de fazer a busca

    return () => {
      clearTimeout(handler)
    }
  }, [searchQuery, fetchSuggestions])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setShowSuggestions(false)
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery("")
    }
  }

  if (pathname.startsWith('/embed') || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return <>{children}</>
  }
  
  const navLinks = [
    { href: "/", label: "Início", icon: Home },
    { href: "/filmes", label: "Filmes", icon: Film },
    { href: "/series", label: "Séries", icon: Tv },
    { href: "/animes", label: "Animes", icon: Clapperboard },
    { href: "/doramas", label: "Doramas", icon: Drama },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
        <div className="container flex h-16 max-w-screen-2xl items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2 h-full py-3">
            <img 
              src="https://i.ibb.co/pc5NsDs/Chat-GPT-Image-14-de-ago-de-2025-23-47-40-1.png" 
              alt="PrimeVicio Logo" 
              className="h-full w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => {
                 const isActive = pathname === link.href;
                 return (
                    <Link key={link.href} href={link.href} passHref>
                      <Button variant="ghost" className={cn("text-sm font-medium", isActive ? "text-white" : "text-zinc-400 hover:text-white")}>
                         <link.icon className="mr-2 h-4 w-4" />
                         {link.label}
                      </Button>
                    </Link>
                 )
            })}
          </nav>
          
          <div className="flex flex-1 items-center justify-end space-x-2">
            <div ref={searchRef} className="relative w-full max-w-xs">
              <form onSubmit={handleSearchSubmit}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="search"
                  placeholder="Buscar..."
                  className="w-full bg-zinc-900 border-zinc-800 pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />}
              </form>

              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map((item) => (
                    <li key={item.id}>
                      <Link 
                        href={`/${item.media_type}/${item.id}`} 
                        className="flex items-center p-2 hover:bg-zinc-800 transition-colors"
                        onClick={() => {
                          setShowSuggestions(false);
                          setSearchQuery("");
                        }}
                      >
                        <Image
                          src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                          alt={item.title || item.name}
                          width={40}
                          height={60}
                          className="rounded-md object-cover"
                          unoptimized
                        />
                        <div className="ml-3">
                          <p className="text-sm font-semibold text-white">{item.title || item.name}</p>
                          <p className="text-xs text-zinc-400">{item.media_type === 'movie' ? 'Filme' : 'Série'}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <Link href="/favorites">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                <Heart className="h-5 w-5" />
                <span className="sr-only">Favoritos</span>
              </Button>
            </Link>

            {user ? (
                <Link href="/account">
                    <Button variant="ghost" className="text-zinc-400 hover:text-white">
                        <User className="mr-2 h-5 w-5" />
                        {user.displayName || user.email}
                    </Button>
                </Link>
            ) : (
                <Link href="/login">
                    <Button variant="ghost" className="text-zinc-400 hover:text-white">
                        <LogIn className="mr-2 h-5 w-5" />
                        Entrar
                    </Button>
                </Link>
            )}

          </div>
        </div>
      </header>
      <main>{children}</main>
      <Toaster />
    </>
  )
}