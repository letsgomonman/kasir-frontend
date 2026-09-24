'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/api';
import { Store, Plus, LogOut, Trash2 } from 'lucide-react';

interface StoreItem {
  id: string;
  nama_toko: string;
  alamat?: string;
  no_telepon?: string;
}

interface User {
  id: string;
  email: string;
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [namaToko, setNamaToko] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const router = useRouter();

  // Lazy Initial State dari localStorage
  const [user] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  });

  const fetchStores = useCallback(async (userId: string) => {
    try {
      const { data } = await API.get<StoreItem[]>(`/stores/user/${userId}`);
      setStores(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }

    // Dibungkus dengan Async IIFE di dalam timer untuk menghindari synchronous render di Effect
    const timer = setTimeout(() => {
      fetchStores(user.id);
    }, 0);

    return () => clearTimeout(timer);
  }, [user, router, fetchStores]);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await API.post('/stores', {
        user_id: user.id,
        nama_toko: namaToko,
        alamat,
        no_telepon: noTelepon,
      });
      setShowModal(false);
      setNamaToko('');
      setAlamat('');
      setNoTelepon('');
      fetchStores(user.id);
    } catch {
      alert('Gagal membuat toko');
    }
  };

  const handleDeleteStore = async (storeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !confirm('Yakin ingin menghapus toko ini beserta seluruh data produk & transaksinya?')) return;
    try {
      await API.delete(`/stores/${storeId}`);
      fetchStores(user.id);
    } catch {
      alert('Gagal menghapus toko');
    }
  };

  const handleSelectStore = (store: StoreItem) => {
    localStorage.setItem('activeStore', JSON.stringify(store));
    router.push('/pos');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('activeStore');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pilih Profil Usaha</h1>
            <p className="text-slate-600 text-sm">Kelola beberapa toko dalam satu akun ({user?.email})</p>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar dari akun"
            className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg font-medium hover:bg-red-100 transition text-sm"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {stores.map((store) => (
            <div
              key={store.id}
              onClick={() => handleSelectStore(store)}
              className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition flex flex-col justify-between h-44 relative group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Store size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 line-clamp-1">{store.nama_toko}</h2>
                  </div>
                  <button
                    onClick={(e) => handleDeleteStore(store.id, e)}
                    title="Hapus Toko"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{store.alamat || 'Tidak ada alamat'}</p>
              </div>
              <p className="text-xs text-slate-500">{store.no_telepon || '-'}</p>
            </div>
          ))}

          <div
            onClick={() => setShowModal(true)}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition h-44 group"
          >
            <div className="p-3 bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 rounded-full mb-2 transition">
              <Plus size={24} />
            </div>
            <span className="font-semibold text-slate-700 group-hover:text-blue-600 text-sm">
              Tambah Toko Baru
            </span>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md text-slate-900">
              <h3 className="text-lg font-bold mb-4 text-slate-900">Tambah Usaha Baru</h3>
              <form onSubmit={handleCreateStore} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Toko/Usaha</label>
                  <input
                    type="text"
                    required
                    value={namaToko}
                    onChange={(e) => setNamaToko(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contoh: Warkop Berkah"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Toko</label>
                  <input
                    type="text"
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contoh: Jl. Merdeka No. 12"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. Telepon</label>
                  <input
                    type="text"
                    value={noTelepon}
                    onChange={(e) => setNoTelepon(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contoh: 08123456789"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}