'use client';
import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/api';
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
  QrCode
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
  bayar: number;
  kembalian: number;
  created_at: string;
}

interface CompletedReceipt {
  transactionId?: string;
  createdAt: Date;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  items: CartItem[];
  totalHarga: number;
  bayar: number;
  kembalian: number;
  metodePembayaran: string;
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

  const [activeTab, setActiveTab] = useState<'pos' | 'products' | 'dashboard'>('pos');
  const [summary, setSummary] = useState<TransactionSummary>({ totalOmzet: 0, totalTransaksi: 0 });
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  // State untuk modal Tambah/Edit Produk
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [namaProduk, setNamaProduk] = useState('');
  const [kategori, setKategori] = useState('');
  const [harga, setHarga] = useState(0);
  const [stok, setStok] = useState(0);

  // State untuk Modal Struk Penjualan
  const [receipt, setReceipt] = useState<CompletedReceipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const router = useRouter();

  const fetchProducts = useCallback(async (storeId: string) => {
    try {
      const { data } = await API.get<Product[]>(`/products/store/${storeId}`);
      setProducts(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchDashboardData = useCallback(async (storeId: string) => {
    try {
      const { data } = await API.get(`/transactions/store/${storeId}`);
      setSummary(data.summary);
      setTransactions(data.transactions);
    } catch (error) {
      console.error(error);
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
    }, 0);

    return () => clearTimeout(timer);
  }, [activeStore, router, fetchProducts, fetchDashboardData]);

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

  const totalHarga = cart.reduce((acc, item) => acc + item.subtotal, 0);
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
    if (bayar < totalHarga) return alert('Uang pembayaran kurang!');

    try {
      const { data } = await API.post('/transactions', {
        store_id: activeStore.id,
        total_harga: totalHarga,
        bayar,
        kembalian,
        metode_pembayaran: metodePembayaran,
        items: cart,
      });

      setReceipt({
        transactionId: data?.transaction?.id,
        createdAt: new Date(),
        storeName: activeStore.nama_toko,
        storeAddress: activeStore.alamat,
        storePhone: activeStore.no_telepon,
        items: [...cart],
        totalHarga,
        bayar,
        kembalian,
        metodePembayaran,
      });

      setShowReceiptModal(true);
      setCart([]);
      setBayar(0);
      setMetodePembayaran('Tunai');
      fetchProducts(activeStore.id);
      fetchDashboardData(activeStore.id);
    } catch {
      alert('Transaksi Gagal disimpan');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('activeStore');
    router.push('/');
  };

  const filteredProducts = products.filter((p) =>
    p.nama_produk.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <span className="font-bold text-lg text-slate-900">Kasir Universal</span>
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
            onClick={() => router.push('/stores')}
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
      <main className="flex-1 overflow-hidden print:hidden">
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
            </div>

            {/* Keranjang Kasir */}
            <div className="w-80 bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shrink-0">
              <div>
                <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-base">
                  <ShoppingCart size={18} /> Keranjang Kasir
                </h2>
                <div className="space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto">
                  {cart.map((item) => {
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
                  })}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2.5">
                {/* PILIHAN METODE PEMBAYARAN */}
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

                <div className="flex justify-between text-base font-bold">
                  <span className="text-slate-900">Total:</span>
                  <span className="text-blue-600">Rp {totalHarga.toLocaleString('id-ID')}</span>
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
                  {/* TOMBOL PINTAS UANG PAS (KHUSUS CASH) */}
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

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Kembalian:</span>
                  <span className="font-semibold text-slate-900">Rp {kembalian.toLocaleString('id-ID')}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition"
                >
                  Bayar Sekarang
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
                    {products.map((prod) => {
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
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RINGKASAN TRANSAKSI */}
        {activeTab === 'dashboard' && (
          <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Ringkasan Penjualan</h2>
              <p className="text-sm text-slate-500">Laporan omzet dan riwayat transaksi usaha ini</p>
            </div>

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

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Riwayat Transaksi Penjualan</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                      <th className="p-3">Tanggal / Waktu</th>
                      <th className="p-3">Total Transaksi</th>
                      <th className="p-3">Bayar</th>
                      <th className="p-3">Kembalian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-3">{new Date(tx.created_at).toLocaleString('id-ID')}</td>
                        <td className="p-3 font-semibold text-slate-900">Rp {Number(tx.total_harga).toLocaleString('id-ID')}</td>
                        <td className="p-3">Rp {Number(tx.bayar).toLocaleString('id-ID')}</td>
                        <td className="p-3">Rp {Number(tx.kembalian).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

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

      {/* MODAL STRUK SELESAI BAYAR */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 print:p-0 print:bg-white print:static print:block">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-slate-900 shadow-2xl border border-slate-200 print:w-full print:p-0 print:border-none print:shadow-none">
            <div className="text-center mb-4 print:hidden">
              <div className="inline-flex p-3 bg-green-100 text-green-600 rounded-full mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Pembayaran Berhasil!</h3>
              <p className="text-xs text-slate-500">Bukti transaksi resmi telah diterbitkan</p>
            </div>

            {/* AREA STRUK NOTA PENJUALAN THERMAL */}
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

              {/* Rincian Barang */}
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

              {/* Rincian Pembayaran */}
              <div className="space-y-1 text-xs">
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