'use client';
import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  LogOut,
  Search,
  Pencil,
  BarChart2,
  Store,
  RefreshCw,
  Box,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  QrCode,
  Eye,
  Calendar,
  X,
  FileSpreadsheet,
  UserCheck,
  Tag,
  Receipt,
  TrendingUp,
  Flame,
} from 'lucide-react';

interface Product {
  id: string;
  nama_produk: string;
  kategori?: string;
  harga: number;
  stok: number;
}

interface CartItem {
  product_id: string;
  nama_produk: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
  max_stok: number;
}

interface ActiveStore {
  id: string;
  nama_toko: string;
  alamat?: string;
  no_telepon?: string;
}

interface TransactionSummary {
  totalOmzet: number;
  totalTransaksi: number;
}

interface TransactionRecord {
  id: string;
  total_harga: number;
  diskon?: number;
  bayar: number;
  kembalian: number;
  metode_pembayaran?: string;
  nama_pelanggan?: string;
  status_pembayaran?: string;
  created_at: string;
}

interface DebtRecord {
  id: string;
  store_id: string;
  transaction_id?: string;
  nama_pelanggan: string;
  sisa_hutang: number;
  created_at: string;
}

interface SalesTrendItem {
  date: string;
  formattedDate: string;
  omzet: number;
}

interface TopProductItem {
  product_id: string;
  nama_produk: string;
  kategori: string;
  total_terjual: number;
  total_pendapatan: number;
}

interface CompletedReceipt {
  transactionId?: string;
  createdAt: Date;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  items: CartItem[];
  subtotalBelanja: number;
  diskon: number;
  totalHarga: number;
  bayar: number;
  kembalian: number;
  metodePembayaran: string;
  namaPelanggan?: string;
  statusPembayaran?: string;
}

interface TransactionDetailItem {
  id: string;
  product_id?: string;
  nama_produk: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
}

function useLocalStorage<T>(key: string): T | null {
  const store = useSyncExternalStore(
    (callback) => {
      window.addEventListener('storage', callback);
      return () => window.removeEventListener('storage', callback);
    },
    () => localStorage.getItem(key),
    () => null
  );

  if (!store) return null;
  try {
    return JSON.parse(store) as T;
  } catch {
    return null;
  }
}

export default function POSPage() {
  const activeStore = useLocalStorage<ActiveStore>('activeStore');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bayar, setBayar] = useState<number>(0);
  const [metodePembayaran, setMetodePembayaran] = useState<'Tunai' | 'QRIS / Non-Tunai'>('Tunai');
  const [searchQuery, setSearchQuery] = useState('');

  // State Fitur Diskon & Kasbon
  const [diskon, setDiskon] = useState<number>(0);
  const [namaPelanggan, setNamaPelanggan] = useState<string>('');
  const [isKasbon, setIsKasbon] = useState<boolean>(false);

  // State Kelola & Pelunasan Kasbon
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [jumlahBayarKasbon, setJumlahBayarKasbon] = useState<number>(0);

  // State Analitik Grafik & Top Products
  const [salesTrend, setSalesTrend] = useState<SalesTrendItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [trendRange, setTrendRange] = useState<'7days' | '30days'>('7days');

  // State UX Loading
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const [activeTab, setActiveTab] = useState<'pos' | 'products' | 'dashboard'>('pos');
  const [summary, setSummary] = useState<TransactionSummary>({ totalOmzet: 0, totalTransaksi: 0 });
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');

  // Modal Tambah/Edit Produk
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [namaProduk, setNamaProduk] = useState('');
  const [kategori, setKategori] = useState('');
  const [harga, setHarga] = useState(0);
  const [stok, setStok] = useState(0);

  // Modal Struk Penjualan
  const [receipt, setReceipt] = useState<CompletedReceipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Modal Detail Transaksi
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);
  const [txDetails, setTxDetails] = useState<TransactionDetailItem[]>([]);
  const [showTxDetailModal, setShowTxDetailModal] = useState(false);

  const router = useRouter();

  const fetchProducts = useCallback(async (storeId: string) => {
    setLoadingProducts(true);
    try {
      const { data } = await API.get<Product[]>(`/products/store/${storeId}`);
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async (storeId: string) => {
    setLoadingDashboard(true);
    try {
      const { data } = await API.get(`/transactions/store/${storeId}`);
      setSummary(data.summary);
      setTransactions(data.transactions);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const fetchDebts = useCallback(async (storeId: string) => {
    try {
      const { data } = await API.get<DebtRecord[]>(`/debts/store/${storeId}`);
      setDebts(data);
    } catch (error) {
      console.error('Gagal mengambil data kasbon', error);
    }
  }, []);

  const fetchAnalyticsData = useCallback(async (storeId: string, range: string) => {
    try {
      const [trendRes, topRes] = await Promise.all([
        API.get<SalesTrendItem[]>(`/analytics/sales-trend/${storeId}?range=${range}`),
        API.get<TopProductItem[]>(`/analytics/top-products/${storeId}`),
      ]);
      setSalesTrend(trendRes.data);
      setTopProducts(topRes.data);
    } catch (err) {
      console.error('Gagal memuat data analitik:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    if (activeStore === null) {
      const timer = setTimeout(() => {
        if (!localStorage.getItem('activeStore')) {
          router.replace('/stores');
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      fetchProducts(activeStore.id);
      fetchDashboardData(activeStore.id);
      fetchDebts(activeStore.id);
    }, 0);

    return () => clearTimeout(timer);
  }, [activeStore, router, fetchProducts, fetchDashboardData, fetchDebts]);

  useEffect(() => {
    if (activeStore && activeTab === 'dashboard') {
      const timer = setTimeout(() => {
        setLoadingAnalytics(true);
        fetchAnalyticsData(activeStore.id, trendRange);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeStore, activeTab, trendRange, fetchAnalyticsData]);

  const confirmNavigationWithCart = (): boolean => {
    if (cart.length > 0) {
      return confirm('Masih ada item di dalam keranjang belanja. Apakah Anda yakin ingin keluar?');
    }
    return true;
  };

  const handleSwitchStore = () => {
    if (confirmNavigationWithCart()) {
      router.push('/stores');
    }
  };

  const handleLogout = () => {
    if (confirmNavigationWithCart()) {
      localStorage.removeItem('user');
      localStorage.removeItem('activeStore');
      router.push('/');
    }
  };

  const handleClearCart = () => {
    if (cart.length > 0 && confirm('Apakah Anda yakin ingin mengosongkan keranjang?')) {
      setCart([]);
      setBayar(0);
      setDiskon(0);
      setNamaPelanggan('');
      setIsKasbon(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    try {
      if (editingProduct) {
        await API.put(`/products/${editingProduct.id}`, {
          nama_produk: namaProduk,
          kategori,
          harga,
          stok,
        });
      } else {
        await API.post('/products', {
          store_id: activeStore.id,
          nama_produk: namaProduk,
          kategori,
          harga,
          stok,
        });
      }
      closeProductModal();
      fetchProducts(activeStore.id);
    } catch {
      alert('Gagal menyimpan produk');
    }
  };

  const handleDeleteProduct = async (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeStore || !confirm('Yakin ingin menghapus produk ini?')) return;
    try {
      await API.delete(`/products/${productId}`);
      fetchProducts(activeStore.id);
    } catch {
      alert('Gagal menghapus produk');
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setNamaProduk('');
    setKategori('');
    setHarga(0);
    setStok(0);
    setShowProductModal(true);
  };

  const openEditModal = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProduct(product);
    setNamaProduk(product.nama_produk);
    setKategori(product.kategori || '');
    setHarga(product.harga);
    setStok(product.stok);
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
    setNamaProduk('');
    setKategori('');
    setHarga(0);
    setStok(0);
  };

  const getAvailableStock = (product: Product) => {
    const cartItem = cart.find((item) => item.product_id === product.id);
    const inCartQty = cartItem ? cartItem.jumlah : 0;
    return product.stok - inCartQty;
  };

  const addToCart = (product: Product) => {
    const availableStock = getAvailableStock(product);
    if (availableStock <= 0) {
      return alert('Sisa stok produk ini tidak mencukupi untuk ditambah lagi!');
    }

    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? { ...item, jumlah: item.jumlah + 1, subtotal: (item.jumlah + 1) * item.harga_satuan }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          nama_produk: product.nama_produk,
          jumlah: 1,
          harga_satuan: product.harga,
          subtotal: product.harga,
          max_stok: product.stok,
        },
      ]);
    }
  };

  const decreaseQuantity = (productId: string) => {
    const existing = cart.find((item) => item.product_id === productId);
    if (!existing) return;

    if (existing.jumlah === 1) {
      setCart(cart.filter((item) => item.product_id !== productId));
    } else {
      setCart(
        cart.map((item) =>
          item.product_id === productId
            ? { ...item, jumlah: item.jumlah - 1, subtotal: (item.jumlah - 1) * item.harga_satuan }
            : item
        )
      );
    }
  };

  const removeAllItemFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  // Kalkulasi Total Belanja
  const subtotalBelanja = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalHarga = Math.max(0, subtotalBelanja - diskon);
  const kembalian = bayar >= totalHarga ? bayar - totalHarga : 0;

  const handleSelectPaymentMethod = (method: 'Tunai' | 'QRIS / Non-Tunai') => {
    setMetodePembayaran(method);
    if (method === 'QRIS / Non-Tunai') {
      setBayar(totalHarga);
    }
  };

  const handleCheckout = async () => {
    if (!activeStore) return;
    if (cart.length === 0) return alert('Keranjang masih kosong!');
    if (!isKasbon && bayar < totalHarga) return alert('Uang pembayaran kurang!');
    if (isKasbon && !namaPelanggan.trim()) return alert('Nama Pelanggan wajib diisi untuk transaksi Kasbon/Hutang!');

    try {
      const statusPembayaran = isKasbon ? 'Belum Lunas' : 'Lunas';
      const { data } = await API.post('/transactions', {
        store_id: activeStore.id,
        total_harga: totalHarga,
        diskon,
        bayar,
        kembalian: isKasbon ? 0 : kembalian,
        metode_pembayaran: metodePembayaran,
        nama_pelanggan: namaPelanggan.trim() || 'Umum',
        status_pembayaran: statusPembayaran,
        items: cart,
      });

      setReceipt({
        transactionId: data?.transaction?.id,
        createdAt: new Date(),
        storeName: activeStore.nama_toko,
        storeAddress: activeStore.alamat,
        storePhone: activeStore.no_telepon,
        items: [...cart],
        subtotalBelanja,
        diskon,
        totalHarga,
        bayar,
        kembalian: isKasbon ? 0 : kembalian,
        metodePembayaran,
        namaPelanggan: namaPelanggan.trim() || 'Umum',
        statusPembayaran,
      });

      setShowReceiptModal(true);
      setCart([]);
      setBayar(0);
      setDiskon(0);
      setNamaPelanggan('');
      setIsKasbon(false);
      setMetodePembayaran('Tunai');
      fetchProducts(activeStore.id);
      fetchDashboardData(activeStore.id);
      fetchDebts(activeStore.id);
    } catch {
      alert('Transaksi Gagal disimpan');
    }
  };

  // Fungsi Pelunasan Kasbon
  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || jumlahBayarKasbon <= 0) return;

    try {
      await API.post(`/debts/${selectedDebt.id}/pay`, {
        jumlah_bayar: jumlahBayarKasbon,
      });
      alert('Pembayaran kasbon berhasil dicatat!');
      setSelectedDebt(null);
      setJumlahBayarKasbon(0);

      if (activeStore) {
        fetchProducts(activeStore.id);
        fetchDashboardData(activeStore.id);
        fetchDebts(activeStore.id);
      }
    } catch {
      alert('Gagal memproses pembayaran kasbon');
    }
  };

  const handleViewTxDetail = async (tx: TransactionRecord) => {
    setSelectedTx(tx);
    try {
      const { data } = await API.get<TransactionDetailItem[]>(`/transactions/${tx.id}/items`);
      setTxDetails(data);
      setShowTxDetailModal(true);
    } catch {
      alert('Gagal mengambil detail transaksi');
    }
  };

  const handleRePrintFromHistory = () => {
    if (!selectedTx || !activeStore) return;

    const mappedItems: CartItem[] = txDetails.map((item) => ({
      product_id: item.product_id || item.id,
      nama_produk: item.nama_produk,
      jumlah: item.jumlah,
      harga_satuan: item.harga_satuan,
      subtotal: item.subtotal,
      max_stok: item.jumlah,
    }));

    const txDiskon = Number(selectedTx.diskon || 0);
    const txTotal = Number(selectedTx.total_harga);

    setReceipt({
      transactionId: selectedTx.id,
      createdAt: new Date(selectedTx.created_at),
      storeName: activeStore.nama_toko,
      storeAddress: activeStore.alamat,
      storePhone: activeStore.no_telepon,
      items: mappedItems,
      subtotalBelanja: txTotal + txDiskon,
      diskon: txDiskon,
      totalHarga: txTotal,
      bayar: Number(selectedTx.bayar),
      kembalian: Number(selectedTx.kembalian),
      metodePembayaran: selectedTx.metode_pembayaran || 'Tunai',
      namaPelanggan: selectedTx.nama_pelanggan || 'Umum',
      statusPembayaran: selectedTx.status_pembayaran || 'Lunas',
    });

    setShowTxDetailModal(false);
    setShowReceiptModal(true);
  };

  const handleDeleteTx = async (txId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeStore || !confirm('Yakin ingin menghapus transaksi ini? Stok barang akan dikembalikan otomatis.')) return;

    try {
      await API.delete(`/transactions/${txId}`);
      fetchProducts(activeStore.id);
      fetchDashboardData(activeStore.id);
      fetchDebts(activeStore.id);
      if (showTxDetailModal) setShowTxDetailModal(false);
    } catch {
      alert('Gagal menghapus transaksi');
    }
  };

  const handleExportExcel = () => {
    if (!activeStore) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    window.open(`${apiUrl}/transactions/export/excel/${activeStore.id}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredProducts = products.filter((p) =>
    p.nama_produk.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.created_at);
    const now = new Date();

    if (dateFilter === 'today') {
      return txDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return txDate >= sevenDaysAgo;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-900">
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            background-color: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
          }
          .receipt-print-area {
            width: 78mm !important;
            margin: 0 auto !important;
            padding: 4mm 2mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            font-size: 11px !important;
          }
        }
      `}</style>

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 print:hidden">
        <div>
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <Store className="text-blue-600" size={24} />
              <span className="font-bold text-lg text-slate-900">Kasir</span>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg mt-3">
              <p className="text-xs text-slate-500 font-medium">Usaha Aktif:</p>
              <p className="font-bold text-slate-900 text-sm truncate">{activeStore?.nama_toko || '...'}</p>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('pos')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'pos'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CreditCard size={18} /> Halaman Kasir (POS)
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'products'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Box size={18} /> Produk & Stok
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BarChart2 size={18} /> Ringkasan Transaksi
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button
            onClick={handleSwitchStore}
            className="w-full flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw size={16} /> Ganti Toko
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium hover:bg-red-100 transition"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-hidden print:hidden overflow-y-auto">
        {/* TAB 1: KASIR (POS) */}
        {activeTab === 'pos' && (
          <div className="h-screen flex p-4 gap-4 overflow-hidden">
            <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 flex flex-col">
              <div className="flex justify-between items-center mb-4 gap-4">
                <h2 className="font-bold text-slate-900 text-base">Katalog Produk</h2>
                <div className="relative flex-1 max-w-xs">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari produk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {loadingProducts ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-3 border border-slate-200 rounded-lg animate-pulse space-y-3 bg-slate-50">
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[calc(100vh-140px)]">
                  {filteredProducts.map((prod) => {
                    const availableStock = getAvailableStock(prod);
                    const isOutOfStock = availableStock <= 0;
                    const isLowStock = availableStock > 0 && availableStock <= 5;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => !isOutOfStock && addToCart(prod)}
                        className={`p-3 border rounded-lg transition flex flex-col justify-between bg-white relative ${
                          isOutOfStock
                            ? 'opacity-50 border-slate-200 cursor-not-allowed bg-slate-50'
                            : isLowStock
                            ? 'border-amber-300 hover:border-amber-500 cursor-pointer bg-amber-50/20'
                            : 'border-slate-200 hover:border-blue-500 cursor-pointer'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <h3 className="font-medium text-slate-900 text-sm line-clamp-1">{prod.nama_produk}</h3>
                            {isLowStock && (
                              <span title="Stok Menipis" className="text-amber-600 shrink-0">
                                <AlertTriangle size={14} />
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{prod.kategori || 'Umum'}</span>
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="font-bold text-blue-600 text-sm">
                            Rp {prod.harga.toLocaleString('id-ID')}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-700 font-bold'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800 font-bold'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isOutOfStock
                              ? 'Habis'
                              : isLowStock
                              ? `Sisa: ${availableStock}`
                              : `Stok: ${availableStock}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Keranjang Kasir */}
            <div className="w-80 bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shrink-0">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                    <ShoppingCart size={18} /> Keranjang Kasir
                  </h2>
                  {cart.length > 0 && (
                    <button
                      onClick={handleClearCart}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition"
                    >
                      Kosongkan
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-[calc(100vh-480px)] overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                      Keranjang masih kosong
                    </div>
                  ) : (
                    cart.map((item) => {
                      const prod = products.find((p) => p.id === item.product_id);
                      const isMaxStockReached = prod ? item.jumlah >= prod.stok : false;

                      return (
                        <div key={item.product_id} className="border-b border-slate-100 pb-2 space-y-1">
                          <div className="flex justify-between items-start">
                            <p className="font-medium text-slate-900 text-sm">{item.nama_produk}</p>
                            <button
                              onClick={() => removeAllItemFromCart(item.product_id)}
                              aria-label={`Hapus ${item.nama_produk} dari keranjang`}
                              title="Hapus Semua"
                              className="text-slate-400 hover:text-red-600 p-0.5"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2 bg-slate-100 rounded-md p-1">
                              <button
                                onClick={() => decreaseQuantity(item.product_id)}
                                className="p-1 hover:bg-white rounded text-slate-700 transition"
                                title="Kurangi 1"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="font-bold px-1 text-slate-900">{item.jumlah}</span>
                              <button
                                disabled={isMaxStockReached}
                                onClick={() => {
                                  if (prod) addToCart(prod);
                                }}
                                className={`p-1 rounded transition ${
                                  isMaxStockReached
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-700 hover:bg-white'
                                }`}
                                title={isMaxStockReached ? 'Stok Maksimal Tercapai' : 'Tambah 1'}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <span className="font-bold text-slate-900">
                              Rp {item.subtotal.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
                {/* FITUR DISKON & KASBON */}
                <div className="space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1 mb-0.5">
                        <Tag size={10} /> Diskon (Rp)
                      </label>
                      <input
                        type="number"
                        value={diskon || ''}
                        onChange={(e) => setDiskon(Number(e.target.value))}
                        className="w-full p-1.5 border border-slate-300 rounded bg-white font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1 mb-0.5">
                        <UserCheck size={10} /> Pelanggan
                      </label>
                      <input
                        type="text"
                        value={namaPelanggan}
                        onChange={(e) => setNamaPelanggan(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded bg-white text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Umum / Nama"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-amber-800 pt-0.5">
                    <input
                      type="checkbox"
                      checked={isKasbon}
                      onChange={(e) => setIsKasbon(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    Tandai Sebagai Kasbon / Hutang
                  </label>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectPaymentMethod('Tunai')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                        metodePembayaran === 'Tunai'
                          ? 'bg-blue-50 text-blue-700 border-blue-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote size={14} /> Tunai
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPaymentMethod('QRIS / Non-Tunai')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                        metodePembayaran === 'QRIS / Non-Tunai'
                          ? 'bg-blue-50 text-blue-700 border-blue-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <QrCode size={14} /> QRIS / Digital
                    </button>
                  </div>
                </div>

                <div className="space-y-0.5 pt-1">
                  {diskon > 0 && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal:</span>
                      <span>Rp {subtotalBelanja.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {diskon > 0 && (
                    <div className="flex justify-between text-red-600 font-semibold">
                      <span>Diskon:</span>
                      <span>- Rp {diskon.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-900">
                    <span>Total Tagihan:</span>
                    <span className="text-blue-600">Rp {totalHarga.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Jumlah Bayar (Rp)</label>
                  <input
                    type="number"
                    readOnly={metodePembayaran === 'QRIS / Non-Tunai'}
                    value={bayar || ''}
                    onChange={(e) => setBayar(Number(e.target.value))}
                    className={`w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-semibold ${
                      metodePembayaran === 'QRIS / Non-Tunai' ? 'bg-slate-100' : 'bg-white'
                    }`}
                    placeholder="0"
                  />
                  {metodePembayaran === 'Tunai' && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setBayar(totalHarga)}
                        className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded transition"
                      >
                        Uang Pas
                      </button>
                      {[10000, 20000, 50000, 100000].map((nominal) => (
                        <button
                          key={nominal}
                          type="button"
                          onClick={() => setBayar(nominal)}
                          className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                        >
                          {nominal / 1000}rb
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!isKasbon && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Kembalian:</span>
                    <span className="font-semibold text-slate-900">Rp {kembalian.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className={`w-full py-2.5 rounded-lg font-bold transition ${
                    cart.length === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : isKasbon
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isKasbon ? 'Simpan Transaksi Kasbon' : 'Bayar Sekarang'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUK & STOK (CRUD) */}
        {activeTab === 'products' && (
          <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Manajemen Produk & Stok</h2>
                <p className="text-sm text-slate-500">Kelola daftar barang dan pembaruan inventaris toko</p>
              </div>
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                <Plus size={18} /> Tambah Produk
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                      <th className="p-3">Nama Produk</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Harga</th>
                      <th className="p-3">Stok Saat Ini</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loadingProducts ? (
                      [1, 2, 3].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="p-3"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                          <td className="p-3"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                          <td className="p-3"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                          <td className="p-3"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                          <td className="p-3 text-right"><div className="h-4 bg-slate-200 rounded w-12 ml-auto"></div></td>
                        </tr>
                      ))
                    ) : (
                      products.map((prod) => {
                        const isLowStock = prod.stok > 0 && prod.stok <= 5;
                        const isOutOfStock = prod.stok <= 0;

                        return (
                          <tr key={prod.id} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-900">{prod.nama_produk}</td>
                            <td className="p-3">{prod.kategori || 'Umum'}</td>
                            <td className="p-3 font-semibold text-blue-600">Rp {prod.harga.toLocaleString('id-ID')}</td>
                            <td className="p-3">
                              <span
                                className={`px-2.5 py-1 rounded-md font-medium text-xs inline-flex items-center gap-1 ${
                                  isOutOfStock
                                    ? 'bg-red-100 text-red-700 font-bold'
                                    : isLowStock
                                    ? 'bg-amber-100 text-amber-800 font-bold'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {isLowStock && <AlertTriangle size={12} />}
                                {isOutOfStock
                                  ? 'Stok Habis (0)'
                                  : isLowStock
                                  ? `Stok Menipis (${prod.stok})`
                                  : prod.stok}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-2">
                              <button
                                onClick={() => openEditModal(prod)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold"
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold"
                              >
                                <Trash2 size={14} /> Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RINGKASAN TRANSAKSI & ANALITIK GRAFIK */}
        {activeTab === 'dashboard' && (
          <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Ringkasan Penjualan</h2>
                <p className="text-sm text-slate-500">Laporan omzet dan analitik transaksi usaha ini</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* TOMBOL KELOLA KASBON */}
                <button
                  onClick={() => {
                    if (activeStore) fetchDebts(activeStore.id);
                    setShowDebtModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-amber-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-700 transition shadow-sm"
                >
                  <Receipt size={15} /> Kelola Kasbon ({debts.length})
                </button>

                {/* TOMBOL EXPORT EXCEL */}
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-green-700 transition shadow-sm"
                >
                  <FileSpreadsheet size={15} /> Export Excel (.xlsx)
                </button>

                {/* FILTER TANGGAL RIWAYAT */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl text-xs font-semibold">
                  <Calendar size={14} className="text-slate-400 ml-2" />
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      dateFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      dateFilter === 'today' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Hari Ini
                  </button>
                  <button
                    onClick={() => setDateFilter('week')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      dateFilter === 'week' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    7 Hari Terakhir
                  </button>
                </div>
              </div>
            </div>

            {/* CARD RINGKASAN OMZET */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Omzet Penjualan</p>
                <h3 className="text-3xl font-extrabold text-blue-600 mt-2">
                  Rp {summary.totalOmzet.toLocaleString('id-ID')}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Transaksi Selesai</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">
                  {summary.totalTransaksi} <span className="text-sm font-normal text-slate-500">Transaksi</span>
                </h3>
              </div>
            </div>

            {/* SECTION ANALITIK VISUAL (GRAFIK & TOP PRODUCTS) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* GRAFIK TREN OMZET */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <TrendingUp className="text-blue-600" size={18} /> Grafik Tren Omzet
                    </h3>
                    <p className="text-xs text-slate-500">Pergerakan pendapatan harian toko</p>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setTrendRange('7days')}
                      className={`px-3 py-1 rounded-lg transition ${
                        trendRange === '7days' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      7 Hari
                    </button>
                    <button
                      onClick={() => setTrendRange('30days')}
                      className={`px-3 py-1 rounded-lg transition ${
                        trendRange === '30days' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      30 Hari
                    </button>
                  </div>
                </div>

                <div className="h-64 w-full pt-4">
                  {loadingAnalytics ? (
                    <div className="h-full w-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400">
                      Memuat Grafik...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTrend}>
                        <defs>
                          <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="formattedDate" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(val) => `Rp${val / 1000}k`}
                        />
                        <Tooltip
                          formatter={(value) => [`Rp ${Number(value || 0).toLocaleString('id-ID')}`, 'Omzet']}
                          labelFormatter={(label) => `Tanggal: ${label}`}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        />
                        <Area type="monotone" dataKey="omzet" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorOmzet)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* DAFTAR PRODUK TERLARIS (TOP SELLING) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="text-amber-500" size={20} />
                    <h3 className="font-bold text-slate-900 text-base">Top 5 Produk Terlaris</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Produk paling banyak dibeli pelanggan</p>

                  {loadingAnalytics ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : topProducts.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">Belum ada data penjualan produk.</div>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((item, index) => (
                        <div key={item.product_id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center ${
                              index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900 text-xs line-clamp-1">{item.nama_produk}</p>
                              <p className="text-[10px] text-slate-500">{item.kategori || 'Umum'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-blue-600 text-xs block">{item.total_terjual} pcs</span>
                            <span className="text-[10px] text-slate-400">Rp {item.total_pendapatan.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TABEL RIWAYAT TRANSAKSI */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Riwayat Transaksi Penjualan</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                      <th className="p-3">Tanggal / Waktu</th>
                      <th className="p-3">Pelanggan</th>
                      <th className="p-3">Status / Metode</th>
                      <th className="p-3">Total Transaksi</th>
                      <th className="p-3">Bayar</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loadingDashboard ? (
                      [1, 2, 3].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="p-3"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                          <td className="p-3"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                          <td className="p-3"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                          <td className="p-3"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                          <td className="p-3"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                          <td className="p-3 text-right"><div className="h-4 bg-slate-200 rounded w-12 ml-auto"></div></td>
                        </tr>
                      ))
                    ) : (
                      filteredTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          onClick={() => handleViewTxDetail(tx)}
                          className="hover:bg-slate-50 cursor-pointer transition"
                        >
                          <td className="p-3">{new Date(tx.created_at).toLocaleString('id-ID')}</td>
                          <td className="p-3 font-semibold text-slate-800">{tx.nama_pelanggan || 'Umum'}</td>
                          <td className="p-3 font-medium space-x-1">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                tx.status_pembayaran === 'Belum Lunas'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {tx.status_pembayaran || 'Lunas'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                              {tx.metode_pembayaran || 'Tunai'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-900">
                            Rp {Number(tx.total_harga).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3">Rp {Number(tx.bayar).toLocaleString('id-ID')}</td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTxDetail(tx);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg inline-flex items-center gap-1 text-xs font-semibold"
                            >
                              <Eye size={14} /> Rincian
                            </button>
                            <button
                              onClick={(e) => handleDeleteTx(tx.id, e)}
                              title="Hapus Transaksi"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg inline-flex items-center text-xs"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL KELOLA & PELUNASAN KASBON / PIUTANG */}
      {showDebtModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg text-slate-900 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Daftar Kasbon / Piutang Pelanggan</h3>
                <p className="text-xs text-slate-500">Kelola dan catat pelunasan hutang pelanggan</p>
              </div>
              <button
                onClick={() => {
                  setShowDebtModal(false);
                  setSelectedDebt(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {selectedDebt ? (
              /* FORM INPUT PELUNASAN KASBON */
              <form onSubmit={handlePayDebt} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-amber-900 text-sm">{selectedDebt.nama_pelanggan}</p>
                  <p className="text-slate-600">
                    Sisa Hutang:{' '}
                    <span className="font-bold text-red-600">
                      Rp {Number(selectedDebt.sisa_hutang).toLocaleString('id-ID')}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominal Pembayaran (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    max={Number(selectedDebt.sisa_hutang)}
                    value={jumlahBayarKasbon || ''}
                    onChange={(e) => setJumlahBayarKasbon(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                    placeholder="0"
                  />
                  <div className="flex gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setJumlahBayarKasbon(Number(selectedDebt.sisa_hutang))}
                      className="text-[10px] font-bold px-2 py-1 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded transition"
                    >
                      Bayar Lunas
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDebt(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition"
                  >
                    Simpan Pembayaran
                  </button>
                </div>
              </form>
            ) : (
              /* TABEL DAFTAR KASBON AKTIF */
              <div className="space-y-3">
                {debts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Tidak ada catatan kasbon yang belum lunas.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {debts.map((debt) => (
                      <div
                        key={debt.id}
                        className="flex justify-between items-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{debt.nama_pelanggan}</p>
                          <p className="text-[10px] text-slate-500">
                            Sisa Hutang:{' '}
                            <span className="font-bold text-red-600">
                              Rp {Number(debt.sisa_hutang).toLocaleString('id-ID')}
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDebt(debt);
                            setJumlahBayarKasbon(Number(debt.sisa_hutang));
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                        >
                          Bayar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setShowDebtModal(false)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL RINCIAN ITEM TRANSAKSI */}
      {showTxDetailModal && selectedTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md text-slate-900 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Rincian Item Transaksi</h3>
                <p className="text-xs text-slate-500">
                  {new Date(selectedTx.created_at).toLocaleString('id-ID')}
                </p>
              </div>
              <button
                onClick={() => setShowTxDetailModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4 border-b border-slate-100 pb-3">
              {txDetails.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{item.nama_produk}</p>
                    <p className="text-xs text-slate-500">
                      {item.jumlah} x Rp {Number(item.harga_satuan).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900">
                    Rp {Number(item.subtotal).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Pelanggan</span>
                <span className="font-bold text-slate-900">{selectedTx.nama_pelanggan || 'Umum'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Status Pembayaran</span>
                <span
                  className={`font-bold ${
                    selectedTx.status_pembayaran === 'Belum Lunas' ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {selectedTx.status_pembayaran || 'Lunas'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Metode Pembayaran</span>
                <span className="font-bold text-slate-900">{selectedTx.metode_pembayaran || 'Tunai'}</span>
              </div>
              {Number(selectedTx.diskon || 0) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Potongan Diskon</span>
                  <span>- Rp {Number(selectedTx.diskon).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                <span>Total Belanja</span>
                <span className="text-blue-600">Rp {Number(selectedTx.total_harga).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Jumlah Bayar</span>
                <span>Rp {Number(selectedTx.bayar).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kembalian</span>
                <span>Rp {Number(selectedTx.kembalian).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleRePrintFromHistory}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition"
              >
                <Printer size={16} /> Cetak / Simpan PDF Struk
              </button>
              <button
                onClick={() => setShowTxDetailModal(false)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-100 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Produk */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-xl p-6 w-full max-w-md text-slate-900">
            <h3 className="text-lg font-bold mb-4 text-slate-900">
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={namaProduk}
                  onChange={(e) => setNamaProduk(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Contoh: Kopi Hitam"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                <input
                  type="text"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Contoh: Minuman"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Jual (Rp)</label>
                <input
                  type="number"
                  required
                  value={harga || ''}
                  onChange={(e) => setHarga(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Stok</label>
                <input
                  type="number"
                  required
                  value={stok || ''}
                  onChange={(e) => setStok(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL STRUK SELESAI BAYAR & CETAK ULANG */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 print:p-0 print:bg-white print:static print:block">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-slate-900 shadow-2xl border border-slate-200 print:w-full print:p-0 print:border-none print:shadow-none">
            <div className="text-center mb-4 print:hidden">
              <div className="inline-flex p-3 bg-green-100 text-green-600 rounded-full mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Struk Transaksi</h3>
              <p className="text-xs text-slate-500">Bukti transaksi resmi</p>
            </div>

            <div className="receipt-print-area border border-dashed border-slate-300 p-4 rounded-xl bg-slate-50 font-mono text-xs text-slate-800 print:bg-white print:border-none print:p-0">
              <div className="text-center pb-3 border-b border-dashed border-slate-300 mb-3">
                <h4 className="font-bold text-sm uppercase tracking-wide text-slate-900">{receipt.storeName}</h4>
                {receipt.storeAddress && <p className="text-[10px] text-slate-600">{receipt.storeAddress}</p>}
                {receipt.storePhone && <p className="text-[10px] text-slate-600">Telp: {receipt.storePhone}</p>}
                <p className="text-[10px] text-slate-500 mt-1">
                  {receipt.createdAt.toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
                {receipt.transactionId && (
                  <p className="text-[9px] text-slate-400 font-mono truncate">ID: {receipt.transactionId}</p>
                )}
              </div>

              <div className="space-y-1 mb-2 border-b border-dashed border-slate-300 pb-2 text-[10px] text-slate-600">
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-bold text-slate-800">{receipt.namaPelanggan || 'Umum'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-bold text-slate-800">{receipt.statusPembayaran || 'Lunas'}</span>
                </div>
              </div>

              <div className="space-y-2 border-b border-dashed border-slate-300 pb-3 mb-3">
                {receipt.items.map((item) => (
                  <div key={item.product_id} className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900">{item.nama_produk}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.jumlah} x Rp {item.harga_satuan.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-xs">
                {receipt.diskon > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>SUBTOTAL</span>
                    <span>Rp {receipt.subtotalBelanja.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {receipt.diskon > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>DISKON</span>
                    <span>- Rp {receipt.diskon.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>METODE</span>
                  <span className="font-semibold text-slate-900">{receipt.metodePembayaran}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                  <span>TOTAL</span>
                  <span>Rp {receipt.totalHarga.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>BAYAR</span>
                  <span>Rp {receipt.bayar.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>KEMBALIAN</span>
                  <span>Rp {receipt.kembalian.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="text-center mt-4 pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
                Terima kasih atas kunjungan Anda!
              </div>
            </div>

            <div className="mt-6 flex gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition"
              >
                <Printer size={16} /> Cetak / Simpan PDF
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-100 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}