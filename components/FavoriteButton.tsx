'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function FavoriteButton({ auctionId }: { auctionId: string }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('favorites')
          .select('auction_id')
          .eq('user_id', user.id)
          .eq('auction_id', auctionId)
          .maybeSingle();
        setSaved(!!data);
      } finally {
        setLoading(false);
      }
    })();
  }, [auctionId]);

  async function toggle() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      if (saved) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('auction_id', auctionId);
        setSaved(false);
      } else {
        await supabase.from('favorites').insert({
          user_id: user.id,
          auction_id: auctionId,
        });
        setSaved(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
        saved
          ? 'border-amber-300 bg-amber-50 text-amber-800'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {saved ? '★ Salvata nei preferiti' : '☆ Salva nei preferiti'}
    </button>
  );
}
