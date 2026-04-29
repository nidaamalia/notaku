'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { getMonthlyAnalysis } from '@/lib/groq';
import ReactMarkdown from 'react-markdown';

export default function Settings() {
  const { profile, user, logout, setProfile } = useAppStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit states
  const [editData, setEditData] = useState({
    family_name: '',
    monthly_income: 0,
    saving_target_pct: 0
  });

  // AI Financial Insight states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (profile) {
      setEditData({
        family_name: profile.family_name,
        monthly_income: profile.monthly_income,
        saving_target_pct: profile.saving_target_pct
      });
    }
  }, [profile]);

  // Load saved analysis from localStorage on component mount
  useEffect(() => {
    const savedAnalysis = localStorage.getItem(`ai-analysis-${currentMonth}`);
    if (savedAnalysis) {
      setAnalysisResult(savedAnalysis);
    }
  }, [currentMonth]);

  const handleAnalyzeExpenses = async () => {
    if (!user) {
      toast.error('User tidak ditemukan');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await getMonthlyAnalysis(user.id, currentMonth);
      const formattedAnalysis = `# Analisis Pengeluaran Bulan ${currentMonth}

## Ringkasan Kategori Terbesar
${analysis.categories ? Object.entries(analysis.categories)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 3)
  .map(([category, amount]) => `• ${category}: Rp ${amount.toLocaleString('id-ID')}`)
  .join('\n') : 'Data tidak tersedia'}

## Total Pengeluaran
Rp ${analysis.total_spending?.toLocaleString('id-ID') || '0'}

## Analisis AI
${analysis.analysis || 'Analisis tidak tersedia'}`;

      setAnalysisResult(formattedAnalysis);
      localStorage.setItem(`ai-analysis-${currentMonth}`, formattedAnalysis);
      toast.success('Analisis pengeluaran berhasil dibuat!');
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error('Gagal membuat analisis: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          family_name: editData.family_name,
          monthly_income: editData.monthly_income,
          saving_target_pct: editData.saving_target_pct
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      setIsEditing(false);
      toast.success('Profil berhasil diperbarui');
    } catch (e: any) {
      console.error(e);
      toast.error('Gagal memperbarui profil: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <h1 className="text-xl font-bold text-plum">Profil & Pengaturan</h1>

      {!isEditing ? (
        <Card>
          <CardContent className="p-4 flex flex-col space-y-4 pt-6">
            <div>
              <div className="text-sm text-plum-muted">Nama Keluarga</div>
              <div className="font-semibold text-lg">{profile?.family_name || '-'}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-plum-muted">Pendapatan</div>
                <div className="font-semibold">{profile ? `Rp ${profile.monthly_income.toLocaleString('id-ID')}` : '-'}</div>
              </div>
              <div>
                <div className="text-sm text-plum-muted">Target Tabungan</div>
                <div className="font-semibold">{profile?.saving_target_pct || 0}%</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(true)}>Edit Profil</Button>
              <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive/10" onClick={handleLogout}>Keluar</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Edit Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="family_name">Nama Keluarga</Label>
                <Input
                  id="family_name"
                  value={editData.family_name}
                  onChange={(e) => setEditData({...editData, family_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="income">Pendapatan Bulanan (Rp)</Label>
                <Input
                  id="income"
                  type="number"
                  value={editData.monthly_income}
                  onChange={(e) => setEditData({...editData, monthly_income: Number(e.target.value)})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saving">Target Tabungan (%)</Label>
                <Input
                  id="saving"
                  type="number"
                  min="0"
                  max="100"
                  value={editData.saving_target_pct}
                  onChange={(e) => setEditData({...editData, saving_target_pct: Number(e.target.value)})}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsEditing(false)}>Batal</Button>
                <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* AI Financial Insight Section */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-plum-muted">Smart Assistant</div>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-[#d094ea] to-[#d094ea] rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold text-gray-800">AI Review Bulanan</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Dapatkan saran penghematan berbasis AI dari pengeluaran bulan ini.
                </p>
              </div>
            </div>
            
            <div className="pt-2">
              <Button 
                onClick={handleAnalyzeExpenses}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-[#d094ea] to-[#d094ea] hover:from-[#d094ea] hover:to-[#d094ea] text-white font-medium py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border-0"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menganalisa...
                  </>
                ) : (
                  'Generate Review Bulan Ini'
                )}
              </Button>
            </div>

            {/* Loading Skeleton */}
            {isAnalyzing && (
              <div className="mt-6 space-y-3 animate-pulse">
                <div className="h-4 bg-purple-200 rounded w-3/4"></div>
                <div className="h-4 bg-purple-200 rounded w-1/2"></div>
                <div className="h-4 bg-purple-200 rounded w-2/3"></div>
                <div className="h-20 bg-purple-200 rounded"></div>
              </div>
            )}

            {/* Analysis Result */}
            {analysisResult && !isAnalyzing && (
              <div className="mt-6 p-4 bg-white rounded-xl border border-purple-200 shadow-sm animate-in fade-in duration-500">
                <div className="prose prose-sm max-w-none text-gray-800 prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-li:text-gray-700">
                  <ReactMarkdown 
                    components={{
                      h1: ({children}) => <h1 className="text-lg font-bold text-gray-800 mb-3">{children}</h1>,
                      h2: ({children}) => <h2 className="text-base font-semibold text-gray-800 mb-2 mt-4">{children}</h2>,
                      h3: ({children}) => <h3 className="text-sm font-semibold text-gray-800 mb-2 mt-3">{children}</h3>,
                      p: ({children}) => <p className="text-gray-700 mb-2">{children}</p>,
                      ul: ({children}) => <ul className="list-disc list-inside text-gray-700 mb-2 space-y-1">{children}</ul>,
                      li: ({children}) => <li className="text-gray-700">{children}</li>,
                      strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    }}
                  >
                    {analysisResult}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
