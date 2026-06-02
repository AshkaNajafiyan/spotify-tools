import { createContext, useState } from 'react';

export const FilterContext = createContext();

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState({
    genre: [],
    minTracks: "",
    maxTracks: "",
    releaseAfter: "",
    releaseBefore: "",
    addedAfter: "",
    addedBefore: "",
    minDuration: "",
    maxDuration: "",
    sort: "",
    order: "desc",
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleGenre = (g) => {
    setFilters(prev => {
      const exists = prev.genre.includes(g);
      const next = exists ? prev.genre.filter(x => x !== g) : [...prev.genre, g];
      return { ...prev, genre: next };
    });
  };

  const resetFilters = () => {
    setFilters({
      genre: [],
      minTracks: "",
      maxTracks: "",
      releaseAfter: "",
      releaseBefore: "",
      addedAfter: "",
      addedBefore: "",
      minDuration: "",
      maxDuration: "",
      sort: "",
      order: "desc",
    });
  };

  const clearAllGenres = () => {
    setFilters(prev => ({ ...prev, genre: [] }));
  };

  const removeFilterChip = (key, value = "") => {
    if (key === "genre") {
      setFilters(prev => ({ ...prev, genre: prev.genre.filter(g => g !== value) }));
    } else {
      setFilters(prev => ({ ...prev, [key]: "" }));
    }
  }

  return (
    <FilterContext.Provider value={{ filters, setFilters, handleFilterChange, toggleGenre, resetFilters, clearAllGenres, removeFilterChip }}>
      {children}
    </FilterContext.Provider>
  );
}