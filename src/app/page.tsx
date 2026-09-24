'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/api';
import { AxiosError } from 'axios';
import { Store, Zap, BarChart3, ArrowRight } from 'lucide-react';

export default function LandingAndAuthPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await API.post(endpoint, { email, password });

      if (isLogin) {
        localStorage.setItem('user', JSON.stringify(data.user));
        alert('Login berhasil!');
        router.push('/stores');
      } else {
        alert('Registrasi berhasil! Silakan login.');
        setIsLogin(true);
      }
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      alert(error.response?.data?.error || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Store className="text-blue-600" size={28} />
          <span className="text-xl font-bold text-slate-900">Kasir</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsLogin(true); setShowAuthModal(true); }}
            className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Masuk
          </button>
          <button
            onClick={() => { setIsLogin(false); setShowAuthModal(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Daftar Gratis
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-5xl mx-auto px-6 py-16 flex flex-col items-center text-center justify-center">
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-4">
          Solusi Aplikasi Kasir Multi-Usaha
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
          Kelola Semua Jenis Usahamu dalam <span className="text-blue-600">Satu Akun</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mb-8">
          Platform Point of Sale (POS) modern yang memungkinkan pemilik bisnis mengelola inventaris, catatan kasir, dan ringkasan transaksi untuk berbagai toko sekaligus.
        </p>
        <button
          onClick={() => { setIsLogin(false); setShowAuthModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition"
        >
          Mulai Sekarang <ArrowRight size={20} />
        </button>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left w-full">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <Store className="text-blue-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-1">Multi-Store Management</h3>
            <p className="text-sm text-slate-600">Ganti profil usaha instan tanpa logout. Cocok untuk pemilik warkop, kelontong, dan toko pakaian sekaligus.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <Zap className="text-blue-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-1">Kasir Cepat & Responsif</h3>
            <p className="text-sm text-slate-600">Sistem pencarian produk instan, kalkulasi otomatis total belanja & kembalian, serta pengurangan stok real-time.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <BarChart3 className="text-blue-600 mb-3" size={32} />
            <h3 className="font-bold text-lg mb-1">Ringkasan Omzet</h3>
            <p className="text-sm text-slate-600">Pantau performa penjualan dan histori transaksi lengkap untuk tiap cabang usaha yang kamu miliki.</p>
          </div>
        </div>
      </section>

      {/* Modal Auth */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-slate-200 relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
              Kasir
            </h2>
            <p className="text-sm text-center text-slate-600 mb-6">
              {isLogin ? 'Masuk ke akun Anda' : 'Daftar akun baru'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                  placeholder="nama@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                {loading ? 'Memproses...' : isLogin ? 'Masuk' : 'Daftar'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                {isLogin ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}