'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRODUCT_CATEGORIES } from '@/lib/categories';

const ALL_MONTHS = 'all';

const categoryLabelMap: Record<string, string> = {};
PRODUCT_CATEGORIES.forEach((c) => {
  categoryLabelMap[c.value] = c.label;
});

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return format(date, 'MMMM yyyy', { locale: id });
}

export default function History() {
  const { user } = useAppStore();
  const router = useRouter();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_MONTHS);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    retryCountRef.current = 0;
    fetchHistory();
  }, [user]);

  const fetchHistory = async (isRetry = false) => {
    try {
      setError(null);
      if (!isRetry) {
        setLoading(true);
      }

      const { data, error: supabaseError } = await supabase
        .from('receipts')
        .select('*, items:receipt_items(*)')
        .eq('user_id', user!.id)
        .order('purchase_date', { ascending: false });

      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }

      setReceipts(data || []);

      const currentKey = getMonthKey(new Date().toISOString());
      const hasCurrent = (data || []).some((r) => getMonthKey(r.purchase_date) === currentKey);
      if (hasCurrent) {
        setSelectedMonth(currentKey);
      } else {
        setSelectedMonth(ALL_MONTHS);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Fetch history error:', errorMsg);
      setError(errorMsg);
      
      // Retry logic
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        console.log(`Retrying... (${retryCountRef.current}/${MAX_RETRIES})`);
        setTimeout(() => fetchHistory(true), 1000 * retryCountRef.current);
      } else {
        setReceipts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const months = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach((r) => {
      set.add(getMonthKey(r.purchase_date));
    });
    return Array.from(set).sort().reverse();
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    if (selectedMonth === ALL_MONTHS) return receipts;
    return receipts.filter((r) => getMonthKey(r.purchase_date) === selectedMonth);
  }, [receipts, selectedMonth]);

  const categoryAnalysis = useMemo(() => {
    const grouped: Record<string, { receipts: any[]; total: number }> = {};
    let grandTotal = 0;

    filteredReceipts.forEach((receipt) => {
      (receipt.items || []).forEach((item: any) => {
        const cat = item.category || 'Lainnya';
        if (!grouped[cat]) {
          grouped[cat] = { receipts: [], total: 0 };
        }
        // Only add receipt once per category
        if (!grouped[cat].receipts.find((r) => r.id === receipt.id)) {
          grouped[cat].receipts.push(receipt);
        }
        grouped[cat].total += item.total_price || 0;
        grandTotal += item.total_price || 0;
      });
    });

    const entries = Object.entries(grouped)
      .map(([category, data]) => ({
        category,
        label: categoryLabelMap[category] || category,
        amount: data.total,
        percent: grandTotal > 0 ? Math.round((data.total / grandTotal) * 100) : 0,
        receipts: data.receipts.sort(
          (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
        ),
      }))
      .sort((a, b) => b.amount - a.amount);

    return { entries, total: grandTotal };
  }, [filteredReceipts]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Tagihan & Layanan': '💳',
      'Kebutuhan Pokok': '🛒',
      'Transportasi': '🚗',
      'Hiburan': '🎬',
      'Kesehatan': '⚕️',
      'Pendidikan': '📚',
      'Lainnya': '📦',
    };
    return icons[category] || '💰';
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-plum">Riwayat Transaksi</h1>
        <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)}>
          <SelectTrigger className="w-[180px]">
            <span className="flex-1 text-left truncate">
              {selectedMonth === ALL_MONTHS ? 'Semua Bulan' : formatMonthLabel(selectedMonth)}
            </span>
            <SelectValue className="sr-only" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_MONTHS}>Semua Bulan</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!loading && categoryAnalysis.entries.length > 0 && (
        <Card className="bg-gradient-to-r from-plum-50 to-white border-plum-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-plum">Total Pengeluaran</h2>
              <span className="text-lg font-bold text-plum">{formatCurrency(categoryAnalysis.total)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center p-8 text-plum-muted">Memuat data...</div>
      ) : error ? (
        <div className="text-center p-8 bg-red-50 rounded-xl border border-red-200 mt-4">
          <p className="text-red-600 mb-3">{error}</p>
          <button 
            onClick={() => fetchHistory()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            Coba Lagi
          </button>
        </div>
      ) : categoryAnalysis.entries.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-border mt-4">
          <p className="text-plum-muted">Belum ada transaksi{selectedMonth !== ALL_MONTHS ? ' untuk bulan ini' : ''}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categoryAnalysis.entries.map((entry) => {
            const isExpanded = expandedCategories[entry.category] !== false; // Default expanded
            return (
              <div key={entry.category} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(entry.category)}
                  className="w-full bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 px-4 py-3 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <span className="text-2xl">{getCategoryIcon(entry.label)}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-plum text-sm">{entry.label}</p>
                      <p className="text-xs text-plum-muted">{entry.receipts.length} transaksi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-plum text-sm">{formatCurrency(entry.amount)}</p>
                      <p className="text-xs text-plum-muted">{entry.percent}%</p>
                    </div>
                    <span className="text-plum text-lg ml-2">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </button>

                {/* Receipts List */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-white">
                    <div className="space-y-1 p-2">
                      {entry.receipts.map((receipt) => (
                        <div
                          key={receipt.id}
                          onClick={() => window.location.href = `/edit/${receipt.id}`}
                          className="p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-plum text-sm">{receipt.store_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-plum-muted">
                                  {format(new Date(receipt.purchase_date), 'dd MMM yyyy', { locale: id })}
                                </p>
                                {receipt.is_manual && (
                                  <span className="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-medium">
                                    Manual
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="font-semibold text-plum text-sm whitespace-nowrap">
                              {formatCurrency(receipt.total_amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
