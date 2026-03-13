import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  ListTodo, 
  Search, 
  Filter,
  RefreshCcw,
  Check,
  X,
  ScrollText,
  Coins,
  Download,
  FileText,
  Table,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Order {
  id: number;
  telegram_id: string;
  username: string;
  prayer_id: number;
  prayer_name: string;
  names: string;
  donation_amount: number;
  status: 'pending' | 'verified' | 'completed';
  created_at: string;
}

interface Prayer {
  id: number;
  name: string;
  description: string;
  is_active: number;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminRole, setAdminRole] = useState<'lama' | 'master'>('lama');
  const [passwordInput, setPasswordInput] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'prayers' | 'broadcast' | 'reports'>('orders');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPrayer, setNewPrayer] = useState({ name: '', description: '' });
  const [selectedPrayerReport, setSelectedPrayerReport] = useState<Prayer | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    const role = localStorage.getItem('admin_role') as 'lama' | 'master';
    if (auth === 'true') {
      setIsAuthenticated(true);
      if (role) setAdminRole(role);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Лама2026+' || passwordInput === 'Adminmaster5796') {
      setIsAuthenticated(true);
      localStorage.setItem('admin_auth', 'true');
      const role = passwordInput === 'Adminmaster5796' ? 'master' : 'lama';
      setAdminRole(role);
      localStorage.setItem('admin_role', role);
    } else {
      alert('Неверный пароль');
    }
  };

  const fetchData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [ordersRes, prayersRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/prayers')
      ]);
      const ordersData = await ordersRes.json();
      const prayersData = await prayersRes.json();
      setOrders(ordersData);
      setPrayers(prayersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_role');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-sm w-full border border-[#1A1A1A]/5">
          <div className="flex justify-center mb-6">
            <div className="bg-[#5A5A40] p-4 rounded-2xl shadow-lg shadow-[#5A5A40]/20">
              <ScrollText className="text-white w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-serif font-bold text-center mb-2">Панель Ламы</h1>
          <p className="text-sm text-center text-[#1A1A1A]/60 mb-8">Введите пароль для доступа к управлению заказами</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Пароль"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] outline-none transition-all text-center"
            />
            <button
              type="submit"
              className="w-full py-3 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 active:scale-[0.98]"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  const verifyOrder = async (id: number) => {
    await fetch(`/api/orders/${id}/verify`, { method: 'POST' });
    fetchData();
  };

  const completeOrder = async (id: number) => {
    await fetch(`/api/orders/${id}/complete`, { method: 'POST' });
    fetchData();
  };

  const togglePrayer = async (id: number) => {
    await fetch(`/api/prayers/${id}/toggle`, { method: 'POST' });
    fetchData();
  };

  const deletePrayer = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот молебен?')) return;
    const res = await fetch(`/api/prayers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Ошибка при удалении');
    }
    fetchData();
  };

  const addPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrayer.name) return;
    
    await fetch('/api/prayers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPrayer)
    });
    
    setNewPrayer({ name: '', description: '' });
    setIsAddModalOpen(false);
    fetchData();
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch = order.names.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         order.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.prayer_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    verified: orders.filter(o => o.status === 'verified').length,
    totalDonations: orders.reduce((acc, o) => acc + o.donation_amount, 0)
  };

  if (isPrintMode) {
    return (
      <div className="min-h-screen bg-white p-10 text-black font-serif">
        <div className="flex justify-between items-center mb-10 border-b-2 border-black pb-4 no-print">
          <h1 className="text-2xl font-bold">Список имен для прочтения</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => window.print()} 
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-sans hover:bg-gray-800 transition-colors"
            >
              Печать
            </button>
            <button 
              onClick={() => setIsPrintMode(false)} 
              className="border border-black px-4 py-2 rounded-lg text-sm font-sans hover:bg-gray-100 transition-colors"
            >
              Выйти из режима
            </button>
          </div>
        </div>

        <div className="space-y-12">
          {prayers.map(prayer => {
            const prayerOrders = filteredOrders.filter(o => o.prayer_id === prayer.id && o.status !== 'completed');
            if (prayerOrders.length === 0) return null;

            return (
              <div key={prayer.id} className="break-inside-avoid">
                <h2 className="text-4xl font-bold mb-6 border-b-2 border-black pb-2 uppercase tracking-tight">{prayer.name}</h2>
                <div className="grid grid-cols-1 gap-6">
                  {prayerOrders.map(order => (
                    <div key={order.id} className="border-l-8 border-black pl-6 py-3 bg-gray-50">
                      <p className="text-3xl leading-relaxed font-medium">{order.names}</p>
                      <div className="flex justify-between items-center mt-3 border-t border-gray-200 pt-2">
                        <p className="text-sm text-gray-500 font-sans italic">
                          {order.donation_amount > 0 ? `Пожертвование: ${order.donation_amount} ₽` : 'Без суммы'}
                        </p>
                        <p className="text-xs text-gray-400 font-sans">
                          {format(new Date(order.created_at), 'dd.MM.yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const downloadNames = (prayerName: string) => {
    const today = new Date().toLocaleDateString('ru-RU');
    const relevantOrders = orders.filter(o => 
      o.prayer_name === prayerName && 
      o.status !== 'completed'
    );

    if (relevantOrders.length === 0) {
      alert('Нет активных имен для скачивания для этого молебна');
      return;
    }

    const namesList = relevantOrders.map(o => o.names).join(', ');
    const content = `Молебен: ${prayerName}\nДата выгрузки: ${today}\n\nИмена:\n${namesList}`;
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Имена_${prayerName.replace(/\s+/g, '_')}_${today}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCSV = () => {
    const headers = ['ID', 'Дата', 'Молебен', 'Имена', 'Сумма', 'Статус', 'Пользователь'];
    const rows = orders.map(o => [
      o.id,
      new Date(o.created_at).toLocaleString('ru-RU'),
      o.prayer_name,
      `"${o.names.replace(/"/g, '""')}"`,
      o.donation_amount,
      o.status === 'verified' ? 'Оплачен' : o.status === 'pending' ? 'Ожидает' : 'Завершен',
      o.username || 'Аноним'
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Отчет_по_заказам_${new Date().toLocaleDateString('ru-RU')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans selection:bg-[#5A5A40]/20">
      {/* Sidebar / Header */}
      <header className="bg-white border-b border-[#1A1A1A]/10 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#5A5A40] p-2 rounded-xl shadow-lg shadow-[#5A5A40]/20">
                <ScrollText className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold tracking-tight">Панель Ламы</h1>
                <p className="text-[10px] text-[#1A1A1A]/40 uppercase tracking-[0.2em] font-bold">Управление дацаном</p>
              </div>
            </div>

            <nav className="flex items-center bg-[#F5F2ED] p-1 rounded-xl border border-[#1A1A1A]/5">
              <button 
                onClick={() => setActiveTab('orders')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  activeTab === 'orders' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60"
                )}
              >
                Заказы
              </button>
              <button 
                onClick={() => setActiveTab('prayers')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  activeTab === 'prayers' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60"
                )}
              >
                Молебны
              </button>
              <button 
                onClick={() => setActiveTab('broadcast')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  activeTab === 'broadcast' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60"
                )}
              >
                Рассылка
              </button>
              <button 
                onClick={() => setActiveTab('reports')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  activeTab === 'reports' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60"
                )}
              >
                Отчеты
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsPrintMode(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#5A5A40] text-white rounded-full text-sm font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 active:scale-95"
            >
              <ScrollText className="w-4 h-4" />
              Режим чтения
            </button>
            <div className="flex bg-[#F5F2ED] border border-[#1A1A1A]/10 rounded-full px-4 py-2.5 items-center gap-2 w-full md:w-64 focus-within:ring-2 focus-within:ring-[#5A5A40]/20 transition-all">
              <Search className="w-4 h-4 text-[#1A1A1A]/40" />
              <input 
                type="text" 
                placeholder="Поиск..." 
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-[#1A1A1A]/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={fetchData}
              className="p-2.5 hover:bg-[#1A1A1A]/5 rounded-full transition-colors active:rotate-180 duration-500"
              title="Обновить"
            >
              <RefreshCcw className={cn("w-5 h-5 text-[#1A1A1A]/60", loading && "animate-spin")} />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2.5 hover:bg-red-50 rounded-full transition-colors group"
              title="Выйти"
            >
              <X className="w-5 h-5 text-red-400 group-hover:text-red-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'orders' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                icon={<ListTodo className="w-5 h-5" />} 
                label="Всего заказов" 
                value={stats.total} 
                color="bg-blue-50 text-blue-600"
              />
              <StatCard 
                icon={<Clock className="w-5 h-5" />} 
                label="Ожидают" 
                value={stats.pending} 
                color="bg-amber-50 text-amber-600"
              />
              <StatCard 
                icon={<CheckCircle2 className="w-5 h-5" />} 
                label="Проверено" 
                value={stats.verified} 
                color="bg-emerald-50 text-emerald-600"
              />
              <StatCard 
                icon={<Coins className="w-5 h-5" />} 
                label="Пожертвования" 
                value={`${stats.totalDonations} ₽`} 
                color="bg-purple-50 text-purple-600"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <FilterButton active={filterStatus === 'all'} onClick={() => setFilterStatus('all')}>Все</FilterButton>
              <FilterButton active={filterStatus === 'pending'} onClick={() => setFilterStatus('pending')}>Ожидают</FilterButton>
              <FilterButton active={filterStatus === 'verified'} onClick={() => setFilterStatus('verified')}>Проверены</FilterButton>
              <FilterButton active={filterStatus === 'completed'} onClick={() => setFilterStatus('completed')}>Завершены</FilterButton>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-[#1A1A1A]/5 border border-[#1A1A1A]/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F2ED]/50 text-[#1A1A1A]/40 text-[10px] uppercase tracking-[0.2em] font-bold">
                      <th className="px-8 py-5">Дата</th>
                      <th className="px-8 py-5">Молебен</th>
                      <th className="px-8 py-5">Имена</th>
                      <th className="px-8 py-5">Пользователь</th>
                      <th className="px-8 py-5">Сумма</th>
                      <th className="px-8 py-5">Статус</th>
                      <th className="px-8 py-5 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A]/5">
                    {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#F5F2ED]/30 transition-colors group">
                        <td className="px-8 py-6 text-xs font-medium text-[#1A1A1A]/40">
                          {format(new Date(order.created_at), 'dd.MM HH:mm')}
                        </td>
                        <td className="px-8 py-6">
                          <span className="font-serif font-bold text-[#1A1A1A] text-lg">{order.prayer_name}</span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-medium leading-relaxed max-w-xs text-[#1A1A1A]/80">{order.names}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] font-bold text-xs shadow-inner">
                              {order.username[0]?.toUpperCase() || 'A'}
                            </div>
                            <span className="text-sm font-bold text-[#1A1A1A]/70">@{order.username}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-mono font-bold text-[#5A5A40] bg-[#5A5A40]/5 px-3 py-1 rounded-lg">{order.donation_amount} ₽</span>
                        </td>
                        <td className="px-8 py-6">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            {order.status === 'pending' && (
                              <button 
                                onClick={() => verifyOrder(order.id)}
                                className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"
                                title="Подтвердить оплату"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {order.status === 'verified' && (
                              <button 
                                onClick={() => completeOrder(order.id)}
                                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                                title="Отметить как прочитанное"
                              >
                                <ScrollText className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-20">
                            <Search className="w-12 h-12" />
                            <p className="font-serif italic text-xl">Заказов не найдено</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : activeTab === 'broadcast' ? (
          <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-[#1A1A1A]/5 border border-[#1A1A1A]/5">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-blue-50 p-3 rounded-2xl">
                  <ScrollText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold">Рассылка сообщений</h2>
                  <p className="text-sm text-[#1A1A1A]/60 mt-1">Отправка сообщений всем пользователям бота</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
                <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                  <span className="text-xl">⚠️</span> Как сделать рассылку с фото/видео:
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-amber-900/80 text-sm leading-relaxed">
                  <li>Откройте бота в Telegram.</li>
                  <li>Отправьте боту сообщение, которое хотите разослать (можно прикрепить фото, видео, добавить форматирование текста).</li>
                  <li>Нажмите на отправленное сообщение и выберите <strong>«Ответить» (Reply)</strong>.</li>
                  <li>Введите команду <code>/broadcast</code> и отправьте.</li>
                  <li>Бот автоматически разошлет это сообщение всем пользователям!</li>
                </ol>
              </div>

              <div className="bg-[#F5F2ED] rounded-2xl p-6 text-center border border-[#1A1A1A]/5">
                <p className="text-[#1A1A1A]/60 text-sm mb-4">
                  Для рассылки простого текста без медиафайлов вы также можете использовать команду <code>/broadcast</code> в боте, ответив на текстовое сообщение.
                </p>
                <a 
                  href="https://t.me/SogchenBot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#5A5A40] text-white rounded-xl font-bold hover:bg-[#4A4A30] transition-colors shadow-lg shadow-[#5A5A40]/20"
                >
                  Перейти в бота для рассылки
                </a>
              </div>
            </div>
          </div>
        ) : activeTab === 'reports' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-[#1A1A1A]/5 border border-[#1A1A1A]/5">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-purple-50 p-3 rounded-2xl">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold">Имена на сегодня</h2>
                  <p className="text-sm text-[#1A1A1A]/60 mt-1">Скачать списки имен для прочтения на хуралах</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prayers.map(prayer => {
                  const relevantOrders = orders.filter(o => 
                    o.prayer_id === prayer.id && 
                    o.status !== 'completed'
                  );
                  
                  return (
                    <div 
                      key={prayer.id} 
                      onClick={() => setSelectedPrayerReport(prayer)}
                      className="p-5 rounded-2xl border border-[#1A1A1A]/10 bg-[#F5F2ED]/50 flex flex-col justify-between cursor-pointer hover:bg-[#F5F2ED] transition-colors"
                    >
                      <div>
                        <h3 className="font-bold text-lg mb-1">{prayer.name}</h3>
                        <p className="text-sm text-[#1A1A1A]/60 mb-4">
                          Активных заказов: <span className="font-bold text-[#1A1A1A]">{relevantOrders.length}</span>
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadNames(prayer.name);
                        }}
                        disabled={relevantOrders.length === 0}
                        className={cn(
                          "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all",
                          relevantOrders.length > 0 
                            ? "bg-[#5A5A40] text-white hover:bg-[#4A4A30] shadow-md shadow-[#5A5A40]/20" 
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                      >
                        <Download className="w-4 h-4" />
                        Скачать .txt
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-[#1A1A1A]/5 border border-[#1A1A1A]/5">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-50 p-3 rounded-2xl">
                    <Table className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif font-bold">Отчет по заказам</h2>
                    <p className="text-sm text-[#1A1A1A]/60 mt-1">Полная выгрузка всех заказов и пожертвований</p>
                  </div>
                </div>
                <button 
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Скачать CSV
                </button>
              </div>

              <div className="bg-[#F5F2ED] rounded-2xl p-6 border border-[#1A1A1A]/5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs text-[#1A1A1A]/50 uppercase font-bold tracking-wider mb-1">Всего заказов</p>
                    <p className="text-2xl font-serif font-bold">{orders.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#1A1A1A]/50 uppercase font-bold tracking-wider mb-1">Оплачено</p>
                    <p className="text-2xl font-serif font-bold text-emerald-600">
                      {orders.filter(o => o.status === 'verified').length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#1A1A1A]/50 uppercase font-bold tracking-wider mb-1">Сумма пожертвований</p>
                    <p className="text-2xl font-serif font-bold text-blue-600">
                      {orders.reduce((sum, o) => sum + (o.donation_amount || 0), 0)} ₽
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#1A1A1A]/50 uppercase font-bold tracking-wider mb-1">Завершено</p>
                    <p className="text-2xl font-serif font-bold text-gray-600">
                      {orders.filter(o => o.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-xl border border-[#1A1A1A]/5 p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-serif font-bold">Активные молебны</h2>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="px-5 py-2.5 bg-[#5A5A40] text-white rounded-full text-sm font-bold hover:bg-[#4A4A30] transition-all"
              >
                Добавить молебен
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prayers.map(prayer => (
                <div key={prayer.id} className="p-6 rounded-3xl border border-[#1A1A1A]/5 bg-[#F5F2ED]/30 hover:bg-[#F5F2ED]/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-serif font-bold text-xl">{prayer.name}</h3>
                    <div className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                      prayer.is_active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {prayer.is_active ? "Активен" : "Скрыт"}
                    </div>
                  </div>
                  <p className="text-sm text-[#1A1A1A]/60 leading-relaxed mb-6">{prayer.description || 'Нет описания'}</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => togglePrayer(prayer.id)}
                      className="flex-1 py-2 rounded-xl border border-[#1A1A1A]/10 text-xs font-bold hover:bg-white transition-colors"
                    >
                      {prayer.is_active ? "Скрыть" : "Показать"}
                    </button>
                    <button 
                      onClick={() => deletePrayer(prayer.id)}
                      className="px-4 py-2 rounded-xl border border-red-100 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Selected Prayer Report Modal */}
      {selectedPrayerReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-[#1A1A1A]/10">
              <div>
                <h3 className="text-2xl font-serif font-bold">{selectedPrayerReport.name}</h3>
                <p className="text-sm text-[#1A1A1A]/60 mt-1">Список имен для прочтения</p>
              </div>
              <button onClick={() => setSelectedPrayerReport(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-[#1A1A1A]/40" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {orders.filter(o => o.prayer_id === selectedPrayerReport.id && o.status !== 'completed').length === 0 ? (
                  <p className="text-center text-[#1A1A1A]/40 py-8">Нет активных заказов для этого молебна</p>
                ) : (
                  orders.filter(o => o.prayer_id === selectedPrayerReport.id && o.status !== 'completed').map(order => (
                    <div key={order.id} className="bg-[#F5F2ED]/50 p-4 rounded-2xl border border-[#1A1A1A]/5">
                      <p className="text-lg font-medium leading-relaxed mb-2">{order.names}</p>
                      <div className="flex justify-between items-center text-xs text-[#1A1A1A]/50">
                        <span>{order.donation_amount > 0 ? `Пожертвование: ${order.donation_amount} ₽` : 'Без суммы'}</span>
                        <span>{format(new Date(order.created_at), 'dd.MM.yyyy HH:mm')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 border-t border-[#1A1A1A]/10 bg-gray-50 rounded-b-[2rem] flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => downloadNames(selectedPrayerReport.name)}
                disabled={orders.filter(o => o.prayer_id === selectedPrayerReport.id && o.status !== 'completed').length === 0}
                className="flex-1 py-3 bg-white border border-[#1A1A1A]/10 text-[#1A1A1A] rounded-xl font-bold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Скачать .txt
              </button>
              <button 
                onClick={async () => {
                  if (confirm('Вы уверены, что хотите отметить этот хурал как прочитанный? Всем заказавшим придет уведомление в Telegram.')) {
                    await fetch(`/api/prayers/${selectedPrayerReport.id}/complete-orders`, { method: 'POST' });
                    setSelectedPrayerReport(null);
                    fetchData();
                  }
                }}
                disabled={orders.filter(o => o.prayer_id === selectedPrayerReport.id && o.status !== 'completed').length === 0}
                className="flex-1 py-3 bg-[#5A5A40] text-white rounded-xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Хурал завершен (Отправить всем)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Prayer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-bold">Новый молебен</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={addPrayer} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 ml-1">Название</label>
                <input 
                  type="text" 
                  required
                  placeholder="Напр: Алтан Гэрэл"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] outline-none transition-all"
                  value={newPrayer.name}
                  onChange={e => setNewPrayer({...newPrayer, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 ml-1">Описание</label>
                <textarea 
                  placeholder="О чем этот молебен..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] outline-none transition-all h-32 resize-none"
                  value={newPrayer.description}
                  onChange={e => setNewPrayer({...newPrayer, description: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-[#5A5A40] text-white rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 active:scale-[0.98] mt-4"
              >
                Создать
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#1A1A1A]/5 shadow-sm">
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-4", color)}>
        {icon}
      </div>
      <p className="text-xs text-[#1A1A1A]/60 uppercase tracking-wider font-bold mb-1">{label}</p>
      <p className="text-2xl font-serif font-bold">{value}</p>
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean, children: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
        active 
          ? "bg-[#5A5A40] text-white shadow-md shadow-[#5A5A40]/20" 
          : "bg-white text-[#1A1A1A]/60 border border-[#1A1A1A]/10 hover:border-[#5A5A40]/40"
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: Order['status'] }) {
  const styles = {
    pending: "bg-amber-50 text-amber-600 border-amber-200",
    verified: "bg-emerald-50 text-emerald-600 border-emerald-200",
    completed: "bg-gray-50 text-gray-500 border-gray-200"
  };

  const labels = {
    pending: "Ожидает",
    verified: "Проверено",
    completed: "Прочитано"
  };

  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", styles[status])}>
      {labels[status]}
    </span>
  );
}
