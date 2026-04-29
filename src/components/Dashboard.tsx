import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { PlusCircle, FileText, TrendingUp, Receipt, ArrowRight, TrendingDown, Target } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user, profile } = useAppStore();
  const router = useRouter();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [allReceipts, setAllReceipts] = useState<any[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [previousMonthTotal, setPreviousMonthTotal] = useState(0);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const start = startOfMonth(now).toISOString();
      const end = endOfMonth(now).toISOString();

      // Fetch recent receipts for current month
      const { data: recentData, error: recentError } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user!.id)
        .order('purchase_date', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;
      setReceipts(recentData || []);

      // Fetch ALL receipts for current month (for analysis)
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('receipts')
        .select('*, items:receipt_items(*)')
        .eq('user_id', user!.id)
        .gte('purchase_date', start)
        .lte('purchase_date', end)
        .order('purchase_date', { ascending: false });

      if (monthlyError) throw monthlyError;
      setAllReceipts(monthlyData || []);
      
      const total = (monthlyData || []).reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);
      setMonthlyTotal(total);

      // Fetch previous month total
      const prevStart = startOfMonth(subMonths(now, 1)).toISOString();
      const prevEnd = endOfMonth(subMonths(now, 1)).toISOString();

      const { data: prevData, error: prevError } = await supabase
        .from('receipts')
        .select('total_amount')
        .eq('user_id', user!.id)
        .gte('purchase_date', prevStart)
        .lte('purchase_date', prevEnd);

      if (prevError) throw prevError;
      const prevTotal = (prevData || []).reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);
      setPreviousMonthTotal(prevTotal);

      // Calculate category breakdown
      const categories: Record<string, number> = {};
      const items: Record<string, number> = {};
      
      for (const receipt of monthlyData || []) {
        const receiptItems = receipt.items || [];
        for (const item of receiptItems) {
          const category = item.category || 'Lainnya';
          categories[category] = (categories[category] || 0) + (item.total_price || 0);
          
          const itemName = item.item_name || 'Unknown';
          items[itemName] = (items[itemName] || 0) + item.quantity;
        }
      }

      const categoryArray = Object.entries(categories)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a: any, b: any) => b.value - a.value);
      
      setCategoryData(categoryArray);

      const topItemsArray = Object.entries(items)
        .map(([name, count]) => ({ name, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);
      
      setTopItems(topItemsArray);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: id });
  const previousMonth = format(subMonths(new Date(), 1), 'MMMM', { locale: id });
  
  const spendingChange = previousMonthTotal > 0 
    ? ((monthlyTotal - previousMonthTotal) / previousMonthTotal) * 100 
    : 0;
  
  const isIncreased = spendingChange > 0;
  
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const dailyAverage = monthlyTotal / currentDay;
  
  const savingTarget = profile?.monthly_income ? Math.round((profile.monthly_income * (profile.saving_target_pct || 20)) / 100) : 0;
  const savingPercentage = profile?.monthly_income ? Math.round((monthlyTotal / profile.monthly_income) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Welcome */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-plum">
          Halo, {profile?.family_name || 'Keluarga'}!
        </h1>
        <p className="text-sm text-plum-muted">Kelola pengeluaranmu dengan mudah</p>
      </div>

      {/* Main Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp size={16} className="text-primary" />
              <span className="text-xs text-plum-muted">Bulan Ini</span>
            </div>
            <p className="text-lg font-bold text-plum">
              {loading ? '...' : formatCurrency(monthlyTotal)}
            </p>
            <p className="text-[10px] text-plum-muted capitalize">{currentMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Receipt size={16} className="text-primary" />
              <span className="text-xs text-plum-muted">Total Transaksi</span>
            </div>
            <p className="text-lg font-bold text-plum">
              {loading ? '...' : receipts.length}
            </p>
            <p className="text-[10px] text-plum-muted">Transaksi terbaru</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights Row 1 - Spending Change & Daily Average */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              {isIncreased ? (
                <TrendingUp size={16} className="text-red-500" />
              ) : (
                <TrendingDown size={16} className="text-green-500" />
              )}
              <span className="text-xs text-plum-muted">vs {previousMonth}</span>
            </div>
            <p className="text-lg font-bold text-plum">
              {loading ? '...' : `${Math.abs(spendingChange).toFixed(1)}%`}
            </p>
            <p className="text-[10px] text-plum-muted">
              {isIncreased ? 'Naik' : 'Turun'} dari bulan lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp size={16} className="text-primary" />
              <span className="text-xs text-plum-muted">Rata-rata Harian</span>
            </div>
            <p className="text-lg font-bold text-plum">
              {loading ? '...' : formatCurrency(dailyAverage)}
            </p>
            <p className="text-[10px] text-plum-muted">Hari ini ({currentDay}/{daysInMonth})</p>
          </CardContent>
        </Card>
      </div>

      {/* Spending Progress */}
      {profile?.monthly_income && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Target size={16} className="text-primary" />
                <span className="text-xs text-plum-muted">Proporsi Pengeluaran</span>
              </div>
              <span className="text-sm font-bold text-plum">{savingPercentage}%</span>
            </div>
            <Progress value={savingPercentage} className="mb-2" />
            <p className="text-[10px] text-plum-muted">
              {formatCurrency(monthlyTotal)} dari {formatCurrency(profile.monthly_income)} penghasilan
            </p>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="text-center p-4 text-plum-muted text-sm">Memuat data...</div>
            ) : (
              <div className="space-y-3">
                {categoryData.map((cat, idx) => {
                  const percentage = (cat.value / monthlyTotal) * 100;
                  const colors = ['bg-blue-500', 'bg-pink-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
                  return (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-plum">{cat.name}</span>
                        <span className="text-xs font-bold text-plum">{formatCurrency(cat.value)}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[idx % colors.length]}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-plum-muted">{percentage.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Items */}
      {topItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Barang Terbanyak Dibeli</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="text-center p-4 text-plum-muted text-sm">Memuat data...</div>
            ) : (
              <div className="space-y-2">
                {topItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                    <span className="text-xs text-plum font-medium truncate flex-1">{item.name}</span>
                    <span className="text-xs font-bold text-primary ml-2">×{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => router.push('/add')}
          className="h-auto py-3 flex flex-col items-center space-y-1"
        >
          <PlusCircle size={20} />
          <span className="text-xs">Tambah Struk</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/history')}
          className="h-auto py-3 flex flex-col items-center space-y-1"
        >
          <FileText size={20} />
          <span className="text-xs">Lihat Riwayat</span>
        </Button>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-plum">Transaksi Terbaru</h2>
          <button
            onClick={() => router.push('/history')}
            className="text-xs text-primary flex items-center space-x-1"
          >
            <span>Lihat Semua</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="text-center p-8 text-plum-muted">Memuat data...</div>
        ) : receipts.length === 0 ? (
          <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-border">
            <p className="text-plum-muted text-sm">Belum ada transaksi.</p>
            <Button
              onClick={() => router.push('/add')}
              variant="link"
              className="text-xs mt-1"
            >
              Tambah struk pertama
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <Card
                key={receipt.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/edit/${receipt.id}`)}
              >
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-plum">{receipt.store_name}</h3>
                    <div className="text-xs text-plum-muted flex space-x-2 mt-1">
                      <span>
                        {format(new Date(receipt.purchase_date), 'dd MMM yyyy', { locale: id })}
                      </span>
                      {receipt.is_manual && (
                        <span className="bg-slate-200 px-1.5 rounded">Manual</span>
                      )}
                    </div>
                  </div>
                  <div className="font-bold text-plum">
                    {formatCurrency(receipt.total_amount)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
