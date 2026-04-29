'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, FileText, Keyboard, ArrowLeft, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { STORE_TYPES, PRODUCT_CATEGORIES } from '@/lib/categories';
import { processReceiptText } from '@/lib/groq';
import { toast } from 'sonner';
import { useRefreshData } from '@/lib/useRefreshData';

export default function AddReceipt() {
  const { user } = useAppStore();
  const router = useRouter();
  const { triggerRefresh } = useRefreshData();
  const [mode, setMode] = useState<'select' | 'ai' | 'manual'>('select');
  const [receiptText, setReceiptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingText, setProcessingText] = useState(false);
  const [formData, setFormData] = useState({
    store_name: '',
    store_type: 'lainnya',
    purchase_date: new Date().toISOString().split('T')[0],
    total_amount: 0,
    notes: '',
    items: [
      {
        id: uuidv4(),
        item_name: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        category: 'lainnya'
      }
    ]
  });

  const calculateTotal = (items: any[]) => items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        id: uuidv4(),
        item_name: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        category: 'lainnya'
      }]
    }));
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Auto-calculate total_price when quantity or unit_price changes
          if (field === 'quantity' || field === 'unit_price') {
            updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price;
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const handleProcessText = async () => {
    if (!receiptText.trim()) {
      toast.error('Silakan masukkan teks struk terlebih dahulu');
      return;
    }

    setProcessingText(true);
    try {
      const result = await processReceiptText(receiptText);
      
      if (result.success && result.data) {
        setFormData({
          store_name: result.data.store_name || '',
          store_type: result.data.store_type || 'lainnya',
          purchase_date: result.data.purchase_date || new Date().toISOString().split('T')[0],
          total_amount: result.data.total_amount || 0,
          notes: result.data.notes || '',
          items: result.data.items?.map((item: any) => ({
            id: uuidv4(),
            item_name: item.item_name || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || 0,
            category: item.category || 'lainnya'
          })) || [{
            id: uuidv4(),
            item_name: '',
            quantity: 1,
            unit_price: 0,
            total_price: 0,
            category: 'lainnya'
          }]
        });
        
        toast.success('Struk berhasil diproses!');
        setMode('manual');
      } else {
        toast.error('Gagal memproses struk. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      toast.error('Terjadi kesalahan saat memproses struk');
    } finally {
      setProcessingText(false);
    }
  };

  const saveReceipt = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          id: uuidv4(),
          user_id: user.id,
          store_name: formData.store_name,
          store_type: formData.store_type,
          purchase_date: formData.purchase_date,
          total_amount: formData.total_amount,
          notes: formData.notes,
          is_manual: true
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      const itemsToInsert = formData.items.map(item => ({
        id: uuidv4(),
        receipt_id: receipt.id,
        item_name: item.item_name,
        item_name_normalized: item.item_name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(),
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        category: item.category
      }));

      const { error: itemsError } = await supabase
        .from('receipt_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success('Transaksi berhasil disimpan!');
      triggerRefresh(); // Trigger dashboard refresh
      router.push('/');
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal menyimpan transaksi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'select') {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold text-plum">Tambah Transaksi</h1>
        </div>

        <p className="text-sm text-plum-muted">Pilih cara input transaksi:</p>

        <div className="grid gap-4">
          <button
            onClick={() => setMode('ai')}
            className="flex items-start gap-4 p-4 rounded-xl border border-border bg-white hover:border-primary hover:shadow-sm transition text-left"
          >
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-plum">Input Teks (AI)</h3>
              <p className="text-sm text-plum-muted mt-1">
                Paste teks hasil analisis struk dari WhatsApp, AI akan mengisi form otomatis.
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode('manual')}
            className="flex items-start gap-4 p-4 rounded-xl border border-border bg-white hover:border-primary hover:shadow-sm transition text-left"
          >
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Keyboard size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-plum">Input Manual</h3>
              <p className="text-sm text-plum-muted mt-1">
                Input data transaksi secara manual.
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setMode('select')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold text-plum">
          {mode === 'ai' ? 'Input Teks (AI)' : 'Input Manual'}
        </h1>
      </div>

      {mode === 'ai' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt-text">Teks Struk</Label>
              <Textarea
                id="receipt-text"
                placeholder="Paste teks hasil analisis struk dari WhatsApp di sini..."
                value={receiptText}
                onChange={(e) => setReceiptText(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
            <Button
              onClick={handleProcessText}
              disabled={processingText || !receiptText.trim()}
              className="w-full"
            >
              {processingText ? 'Memproses...' : 'Proses dengan AI'}
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === 'manual' && (
        <>
          <Card>
            <CardContent className="p-4 space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="store_name">Nama Toko</Label>
                <Input
                  id="store_name"
                  value={formData.store_name}
                  onChange={(e) => setFormData({...formData, store_name: e.target.value})}
                  placeholder="Contoh: Supermarket ABC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store_type">Jenis Toko</Label>
                <Select value={formData.store_type} onValueChange={v => setFormData({...formData, store_type: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis toko" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Tanggal Belanja</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-plum">Daftar Barang</h3>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus size={16} className="mr-1" /> Tambah
                </Button>
              </div>
              
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={item.id} className="p-3 border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Barang {index + 1}</span>
                      {formData.items.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                          <X size={16} />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Nama barang"
                        value={item.item_name}
                        onChange={e => updateItem(item.id, 'item_name', e.target.value)}
                      />
                      <div className="grid grid-cols-[1fr_2fr] gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Harga Satuan</Label>
                          <Input
                            type="number"
                            value={item.unit_price === 0 ? '' : item.unit_price}
                            onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-1">
                        <span className="text-plum-muted">Total: {item.quantity * item.unit_price}</span>
                        <Select value={item.category} onValueChange={v => updateItem(item.id, 'category', v)}>
                          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PRODUCT_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Textarea
                id="notes"
                placeholder="Tambahkan catatan tentang transaksi ini..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-border z-40 max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-plum">Total Transaksi</span>
          <span className="font-bold text-lg text-primary">{formData.total_amount.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setMode('select')}>Kembali</Button>
          <Button className="flex-[2] bg-primary" onClick={saveReceipt} disabled={loading || processingText}>
            {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
          </Button>
        </div>
      </div>
    </div>
  );
}
