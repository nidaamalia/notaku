'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface AggregatedPrice {
  store_name: string;
  item_name_normalized: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  purchase_count: number;
  last_bought: string;
  isCustomTermurah?: boolean;
}

interface Receipt {
  id: string;
  store_name: string;
  purchase_date: string;
}

interface ReceiptItem {
  receipt_id: string;
  item_name_normalized: string;
  unit_price: number;
}

export default function Search() {
  const { user } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AggregatedPrice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length > 2) {
        searchPrices(query.trim());
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const searchPrices = async (searchTerm: string) => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch relevant receipts to filter by user
      const { data: receipts } = await supabase
        .from('receipts')
        .select('id, store_name, purchase_date')
        .eq('user_id', user.id);

      if (!receipts || receipts.length === 0) {
        setResults([]);
        return;
      }

      const receiptMap = new Map(receipts.map((r: any) => [r.id, r]));

      // 2. Fetch all matching items for this exact ILIKE
      const { data: items } = await supabase
        .from('receipt_items')
        .select('receipt_id, item_name_normalized, unit_price')
        .ilike('item_name_normalized', `%${searchTerm.toLowerCase()}%`);

      if (!items) {
        setResults([]);
        return;
      }

      // Filter items to ensure they belong to this user's receipts
      const userItems = items.filter((i: ReceiptItem) => receiptMap.has(i.receipt_id));

      // 3. Aggregate data manually
      const groups = new Map<string, AggregatedPrice>();
      
      for (const item of userItems) {
        const receipt = receiptMap.get(item.receipt_id) as any;
        const key = `${item.item_name_normalized}::${receipt.store_name}`;
        
        if (!groups.has(key)) {
          groups.set(key, {
            store_name: (receipt as any).store_name,
            item_name_normalized: item.item_name_normalized,
            avg_price: Number(item.unit_price), // will average later
            min_price: Number(item.unit_price),
            max_price: Number(item.unit_price),
            purchase_count: 1,
            last_bought: (receipt as any).purchase_date
          });
        } else {
          const acc = groups.get(key)!;
          acc.avg_price += Number(item.unit_price);
          // keep min and max
          if (item.unit_price < acc.min_price) acc.min_price = Number(item.unit_price);
          if (item.unit_price > acc.max_price) acc.max_price = Number(item.unit_price);
          
          acc.purchase_count += 1;
          
          if (new Date((receipt as any).purchase_date) > new Date(acc.last_bought)) {
            acc.last_bought = (receipt as any).purchase_date;
          }
        }
      }

      // Convert groups to array and compute average
      let aggregatedArray = Array.from(groups.values()).map(g => ({
        ...g,
        avg_price: g.avg_price / g.purchase_count
      }));

      // Filter rule: only show if item exists in > 1 store or sum(purchase_count) > 1 for reliability?
      // "Hanya tampilkan jika produk pernah dibeli di minimal 2 toko berbeda" -> Let's group by item name, see store count
      
      const itemStoreCount = new Map<string, Set<string>>();
      for (const g of aggregatedArray) {
        if (!itemStoreCount.has(g.item_name_normalized)) {
          itemStoreCount.set(g.item_name_normalized, new Set());
        }
        itemStoreCount.get(g.item_name_normalized)!.add(g.store_name);
      }

      // We only include items that have been bought at >= 2 different stores or >=2 times
      // Just to ensure not too strict, we display it, but maybe tag it. Prompt says "Sistem query receipt_items ... Hanya tampilkan jika produk pernah dibeli di minimal 2 toko berbeda"
      aggregatedArray = aggregatedArray.filter(g => {
        const stores = itemStoreCount.get(g.item_name_normalized);
        return stores && stores.size >= 2;
      });

      // Sort by avg price ASC
      aggregatedArray.sort((a, b) => a.avg_price - b.avg_price);
      
      // Determine termurah
      if (aggregatedArray.length > 0) {
        aggregatedArray[0].isCustomTermurah = true;
      }

      setResults(aggregatedArray);

    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-plum">Cari Harga Termurah</h1>
        <p className="text-sm text-plum-muted">Temukan toko terbaik untuk belanjaanmu selanjutnya.</p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-3 text-plum-muted" size={18} />
        <Input 
          className="pl-10 h-12 bg-white border-border shadow-sm rounded-xl"
          placeholder="Ketik nama barang (min. 3 huruf)" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {loading && <p className="text-center text-plum-muted mt-8">Mencari data...</p>}
        {!loading && query.length > 2 && results.length === 0 && (
          <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-border mt-4">
            <p className="text-plum-muted">Produk belum pernah dibeli di 2 toko berbeda.</p>
          </div>
        )}

        {!loading && results.map((result, idx) => (
          <Card key={idx} className={`border ${result.isCustomTermurah ? 'border-mint bg-mint-light/20' : 'border-border'}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-plum truncate pr-4 capitalize">{result.item_name_normalized}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-plum-muted">{result.store_name}</span>
                    {result.purchase_count < 3 && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-medium">Data Terbatas</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-plum">{formatCurrency(result.avg_price)}</div>
                  {result.isCustomTermurah && (
                    <div className="flex items-center text-mint-dark text-xs justify-end mt-1 font-medium bg-mint-light px-2 py-0.5 rounded-full">
                      <ArrowDownCircle size={12} className="mr-1" /> Termurah
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[11px] text-plum-muted mt-3 pt-3 border-t border-border flex justify-between">
                <span>Dibeli {result.purchase_count}x</span>
                <span>Terakhir: {format(new Date(result.last_bought), 'dd MMM yyyy', { locale: id })}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
