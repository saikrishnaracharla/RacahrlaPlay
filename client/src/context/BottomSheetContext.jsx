import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SongBottomSheet from '../components/SongBottomSheet';

const Ctx = createContext(null);

export function BottomSheetProvider({ children }) {
  const [data, setData] = useState(null); // { song, songs, index }

  const openSheet  = useCallback((song, songs = [], index = 0) => setData({ song, songs, index }), []);
  const closeSheet = useCallback(() => setData(null), []);

  return (
    <Ctx.Provider value={{ openSheet, closeSheet }}>
      {children}
      {/* Render sheet at document.body — outside any transform/overflow parent */}
      {data && createPortal(
        <SongBottomSheet
          song={data.song}
          songs={data.songs}
          index={data.index}
          onClose={closeSheet}
        />,
        document.body
      )}
    </Ctx.Provider>
  );
}

export function useBottomSheet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBottomSheet must be inside BottomSheetProvider');
  return ctx;
}
