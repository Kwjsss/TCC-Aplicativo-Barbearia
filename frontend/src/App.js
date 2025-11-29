import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import { Settings } from 'lucide-react';
import ClientSettings from './components/ClientSettings';
import ProfessionalSettings from './components/ProfessionalSettings';
import CancelModal from './components/CancelModal';
import 'react-day-picker/dist/style.css';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Utility: format currency BRL
const formatBRL = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Utility: format date to Brazilian format
const formatDateBR = (dateStr) => {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
};

// Utility: check if appointment is in the past
const getAppointmentStatus = (apt) => {
  if (apt.status && apt.status !== 'pending') {
    return apt.status;
  }
  try {
    const aptDate = parseISO(apt.date);
    if (isPast(aptDate) && !isToday(aptDate)) {
      return 'completed';
    }
    return 'pending';
  } catch {
    return 'pending';
  }
};

// Utility: create time slots
function generateSlots() {
  const slots = [];
  for (let t = 9 * 60; t < 18 * 60; t += 30) {
    const hh = String(Math.floor(t / 60)).padStart(2, '0');
    const mm = String(t % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

const SLOTS = generateSlots();

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/book/:proId" element={<PublicBooking />} />
      </Routes>
    </BrowserRouter>
  );
}

function MainApp() {
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [userPhoto, setUserPhoto] = useState('');
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadServices();
    loadProfessionals();
  }, []);

  useEffect(() => {
    if (role) loadAppointments();
  }, [role, userName]);

  useEffect(() => {
    if (services.length && !selectedService) setSelectedService(services[0]?.id);
    if (professionals.length && !selectedPro) setSelectedPro(professionals[0]?.id);
  }, [services, professionals]);

  useEffect(() => {
    if (selectedDate && selectedPro) loadAvailableSlots();
  }, [selectedDate, selectedPro]);

  async function loadServices() {
    try {
      const res = await axios.get(`${API}/services`);
      setServices(res.data);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  }

  async function loadProfessionals() {
    try {
      const res = await axios.get(`${API}/professionals`);
      setProfessionals(res.data);
    } catch (error) {
      console.error('Error loading professionals:', error);
    }
  }

  async function loadAppointments() {
    try {
      const params = role === 'client' ? { client: userName } : {};
      const res = await axios.get(`${API}/appointments`, { params });
      setAppointments(res.data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  }

  async function loadAvailableSlots() {
    try {
      const res = await axios.post(`${API}/appointments/available-slots`, {
        date: selectedDate,
        proId: Number(selectedPro)
      });
      setBookedSlots(res.data.bookedSlots || []);
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  }

  async function handleAuth(data) {
    setRole(data.role);
    setUserName(data.userName);
    setUserId(data.userId);
    await loadUserProfile(data.userId, data.role);
  }

  async function loadUserProfile(id, userRole) {
    try {
      const endpoint = userRole === 'client' ? `clients/profile/${id}` : `professionals/profile/${id}`;
      const res = await axios.get(`${API}/${endpoint}`);
      setUserPhoto(res.data.photo || '');
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function handleProfileUpdate() {
    await loadUserProfile(userId, role);
    setShowSettings(false);
  }

  function logout() {
    setRole(null);
    setUserName('');
    setUserId('');
    setUserPhoto('');
    setAppointments([]);
  }

  async function bookAppointment() {
    if (!selectedTime) return alert('Escolha um horário.');
    try {
      setLoading(true);
      const res = await axios.post(`${API}/appointments`, {
        client: userName,
        proId: Number(selectedPro),
        serviceId: Number(selectedService),
        date: selectedDate,
        time: selectedTime
      });
      setAppointments([res.data, ...appointments]);
      setSelectedTime(null);
      await loadAvailableSlots();
      alert('Agendamento confirmado!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao agendar');
    } finally {
      setLoading(false);
    }
  }

  async function cancelAppointment(appointmentId, reason) {
    try {
      setLoading(true);
      await axios.patch(`${API}/appointments/${appointmentId}/cancel`, { reason });
      await loadAppointments();
      alert('Agendamento cancelado com sucesso!');
      return true;
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao cancelar agendamento');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function updateService(updated) {
    try {
      setLoading(true);
      await axios.put(`${API}/services/${updated.id}`, {
        name: updated.name,
        duration: updated.duration,
        price: updated.price
      });
      await loadServices();
    } catch (error) {
      alert('Erro ao atualizar serviço');
    } finally {
      setLoading(false);
    }
  }

  async function updateAppointmentStatus(appointmentId, newStatus) {
    try {
      setLoading(true);
      await axios.patch(`${API}/appointments/${appointmentId}/status`, { status: newStatus });
      await loadAppointments();
    } catch (error) {
      alert('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  }

  async function monthlyReport(year, month) {
    try {
      const res = await axios.get(`${API}/reports/monthly/${year}/${month}`);
      return res.data;
    } catch (error) {
      return { totalAttendance: 0, totalRevenue: 0, servicesCount: {} };
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-start justify-center p-4">
      <div className="w-full max-w-4xl shadow-lg rounded-2xl p-4 md:p-8 bg-white">
        <Header role={role} userName={userName} userPhoto={userPhoto} logout={logout} onSettings={() => setShowSettings(true)} />

        {!role && <Auth onAuth={handleAuth} loading={loading} setLoading={setLoading} />}

        {role === 'client' && (
          <ClientView
            userName={userName}
            services={services}
            professionals={professionals}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            selectedPro={selectedPro}
            setSelectedPro={setSelectedPro}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            SLOTS={SLOTS}
            bookedSlots={bookedSlots}
            appointments={appointments}
            bookAppointment={bookAppointment}
            cancelAppointment={cancelAppointment}
            formatBRL={formatBRL}
            formatDateBR={formatDateBR}
            loading={loading}
          />
        )}

        {role === 'pro' && (
          <ProfessionalView
            userName={userName}
            userId={userId}
            services={services}
            updateService={updateService}
            appointments={appointments}
            monthlyReport={monthlyReport}
            formatBRL={formatBRL}
            formatDateBR={formatDateBR}
            loading={loading}
            updateAppointmentStatus={updateAppointmentStatus}
            getAppointmentStatus={getAppointmentStatus}
          />
        )}

        {/* Settings Modal */}
        {showSettings && role === 'client' && (
          <ClientSettings userId={userId} onUpdate={handleProfileUpdate} onClose={() => setShowSettings(false)} />
        )}
        {showSettings && role === 'pro' && (
          <ProfessionalSettings userId={userId} onUpdate={handleProfileUpdate} onClose={() => setShowSettings(false)} />
        )}
      </div>
    </div>
  );
}

// Public booking page
function PublicBooking() {
  const { proId } = useParams();
  const [professional, setProfessional] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    loadBookingData();
  }, [proId]);

  useEffect(() => {
    if (selectedDate && proId) loadAvailableSlots();
  }, [selectedDate, proId]);

  async function loadBookingData() {
    try {
      const res = await axios.get(`${API}/public/book/${proId}`);
      setProfessional(res.data.professional);
      setServices(res.data.services);
      if (res.data.services.length) setSelectedService(res.data.services[0].id);
    } catch (error) {
      alert('Profissional não encontrado');
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableSlots() {
    try {
      const res = await axios.post(`${API}/appointments/available-slots`, {
        date: selectedDate,
        proId: Number(proId)
      });
      setBookedSlots(res.data.bookedSlots || []);
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  }

  async function handleBooking() {
    if (!clientName || !clientEmail || !clientPhone) {
      return alert('Preencha todos os campos');
    }
    if (!selectedTime) return alert('Escolha um horário.');

    try {
      setLoading(true);
      await axios.post(`${API}/appointments`, {
        client: clientName,
        proId: Number(proId),
        serviceId: Number(selectedService),
        date: selectedDate,
        time: selectedTime,
        clientEmail,
        clientPhone
      });
      alert('Agendamento confirmado! Entraremos em contato.');
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setSelectedTime(null);
      await loadAvailableSlots();
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao agendar');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  if (!professional) return <div className="p-8 text-center">Profissional não encontrado</div>;

  const svc = services.find(s => s.id === Number(selectedService));

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-start justify-center p-4">
      <div className="w-full max-w-3xl shadow-lg rounded-2xl p-4 md:p-8 bg-white">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-2xl mb-3">
            {professional.name[0]}
          </div>
          <h1 className="text-2xl font-bold">Agende com {professional.name}</h1>
          <p className="text-gray-600">Preencha os dados abaixo</p>
        </div>

        <div className="grid gap-4">
          <input
            className="w-full p-3 border rounded-lg"
            placeholder="Seu nome completo"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <input
            className="w-full p-3 border rounded-lg"
            placeholder="Seu email"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
          />
          <input
            className="w-full p-3 border rounded-lg"
            placeholder="Seu telefone"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
          />

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Escolha o serviço</h4>
            <div className="space-y-2">
              {services.map((s) => (
                <label key={s.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${s.id === Number(selectedService) ? 'bg-blue-50 border border-blue-100' : 'border'}`}>
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.duration} min</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm">{formatBRL(s.price)}</div>
                    <input type="radio" name="service" checked={s.id === Number(selectedService)} onChange={() => setSelectedService(s.id)} />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-lg relative">
            <h4 className="font-semibold mb-2">Escolha a data</h4>
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <span>{formatDateBR(selectedDate)}</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            {showCalendar && (
              <div className="absolute z-10 mt-2 bg-white border rounded-lg shadow-lg p-2">
                <DayPicker
                  mode="single"
                  selected={parseISO(selectedDate)}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(format(date, 'yyyy-MM-dd'));
                      setSelectedTime(null);
                      setShowCalendar(false);
                    }
                  }}
                  locale={ptBR}
                  disabled={{ before: new Date() }}
                />
              </div>
            )}
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Horários disponíveis</h4>
            <div className="grid grid-cols-4 gap-2">
              {SLOTS.map((t) => {
                const taken = bookedSlots.includes(t);
                return (
                  <button
                    key={t}
                    disabled={taken}
                    onClick={() => setSelectedTime(t)}
                    className={`p-2 text-xs rounded ${taken ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : selectedTime === t ? 'bg-blue-500 text-white' : 'border hover:bg-blue-50'}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-blue-50">
            <h4 className="font-semibold">Resumo do Agendamento</h4>
            <p className="text-sm">Serviço: {svc?.name}</p>
            <p className="text-sm">Data: {formatDateBR(selectedDate)}</p>
            <p className="text-sm">Horário: {selectedTime || '—'}</p>
            <p className="text-sm">Valor: {svc ? formatBRL(svc.price) : '—'}</p>
          </div>

          <button 
            onClick={handleBooking}
            disabled={loading || !selectedTime}
            className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700"
          >
            {loading ? 'Aguarde...' : 'Confirmar Agendamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ role, userName, userPhoto, logout, onSettings }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.5 8.5L14.5 3.5M14.5 3.5L9.5 8.5M14.5 3.5L4 14L3 21L10 20L20.5 9.5M9.5 15.5L8.5 14.5" stroke="#40BFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="4" cy="20" r="1.5" fill="#40BFFF"/>
            <circle cx="14.5" cy="3.5" r="1.5" fill="#40BFFF"/>
          </svg>
          <div>
            <h1 className="text-xl font-bold text-blue-400">AgendAI</h1>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Barbearia</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {role && (
          <>
            <div className="flex items-center gap-2">
              {userPhoto ? (
                <img src={userPhoto} alt={userName} className="w-8 h-8 rounded-full object-cover" onError={(e) => e.target.src = ''} />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  {userName?.[0]}
                </div>
              )}
              <span className="text-sm font-medium hidden md:block">{userName}</span>
            </div>
            <button onClick={onSettings} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Configurações">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={logout} className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">Sair</button>
          </>
        )}
      </div>
    </div>
  );
}

function Auth({ onAuth, loading, setLoading }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('client');
  
  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields - Client
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  // Register fields - Professional
  const [proName, setProName] = useState('');
  const [proPassword, setProPassword] = useState('');

  async function handleLogin() {
    try {
      setLoading(true);
      const res = await axios.post(`${API}/auth/login`, { identifier, password, role });
      onAuth(res.data);
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    try {
      setLoading(true);
      let res;
      if (role === 'client') {
        res = await axios.post(`${API}/auth/register/client`, { name, email, phone, password: regPassword });
      } else {
        res = await axios.post(`${API}/auth/register/professional`, { name: proName, password: proPassword });
      }
      onAuth(res.data);
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Bem-vindo ao AgendAI</h2>
        <p className="text-sm text-gray-600">{ isLogin ? 'Faça login' : 'Crie sua conta' }</p>
      </div>

      <div className="flex gap-2">
        <button className={`flex-1 p-3 rounded-lg ${role === 'client' ? 'bg-blue-500 text-white' : 'border'}`} onClick={() => setRole('client')}>Cliente</button>
        <button className={`flex-1 p-3 rounded-lg ${role === 'pro' ? 'bg-blue-500 text-white' : 'border'}`} onClick={() => setRole('pro')}>Profissional</button>
      </div>

      {isLogin ? (
        <div className="grid gap-3">
          <input className="w-full p-3 border rounded-lg" placeholder={role === 'client' ? 'Email' : 'Nome'} value={identifier} onChange={(e) => setIdentifier(e.target.value)} disabled={loading} />
          <input className="w-full p-3 border rounded-lg" placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          <button onClick={handleLogin} disabled={loading} className="w-full p-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 hover:bg-blue-700">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {role === 'client' ? (
            <>
              <input className="w-full p-3 border rounded-lg" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
              <input className="w-full p-3 border rounded-lg" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              <input className="w-full p-3 border rounded-lg" placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
              <input className="w-full p-3 border rounded-lg" placeholder="Senha" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={loading} />
            </>
          ) : (
            <>
              <input className="w-full p-3 border rounded-lg" placeholder="Nome" value={proName} onChange={(e) => setProName(e.target.value)} disabled={loading} />
              <input className="w-full p-3 border rounded-lg" placeholder="Senha" type="password" value={proPassword} onChange={(e) => setProPassword(e.target.value)} disabled={loading} />
            </>
          )}
          <button onClick={handleRegister} disabled={loading} className="w-full p-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 hover:bg-blue-700">
            {loading ? 'Criando...' : 'Criar Conta'}
          </button>
        </div>
      )}

      <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600 hover:underline">
        {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
      </button>
    </div>
  );
}

function ClientView({
  userName, services, professionals, selectedService, setSelectedService,
  selectedPro, setSelectedPro, selectedDate, setSelectedDate, selectedTime,
  setSelectedTime, SLOTS, bookedSlots, appointments, bookAppointment,
  cancelAppointment, formatBRL, formatDateBR, loading
}) {
  const svc = services.find((s) => s.id === Number(selectedService));
  const [showCalendar, setShowCalendar] = useState(false);
  const [cancelingAppointment, setCancelingAppointment] = useState(null);

  async function handleCancelConfirm(appointmentId, reason) {
    const success = await cancelAppointment(appointmentId, reason);
    if (success) {
      setCancelingAppointment(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Olá, {userName}</h3>
        <p className="text-sm text-gray-500">Faça seu agendamento de forma rápida</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Serviços</h4>
          <div className="space-y-2">
            {services.map((s) => (
              <label key={s.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${s.id === Number(selectedService) ? 'bg-blue-50 border border-blue-100' : 'bg-white border'}`}>
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.duration} min</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">{formatBRL(s.price)}</div>
                  <input className="ml-2" type="radio" name="service" checked={s.id === Number(selectedService)} onChange={() => setSelectedService(s.id)} />
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Profissional</h4>
          <div className="space-y-2">
            {professionals.map((p) => (
              <label key={p.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${p.id === Number(selectedPro) ? 'bg-blue-50 border border-blue-100' : 'bg-white border'}`}>
                <div className="font-medium">{p.name}</div>
                <input type="radio" name="pro" checked={p.id === Number(selectedPro)} onChange={() => setSelectedPro(p.id)} />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 border rounded-lg relative">
          <h4 className="font-semibold mb-2">Escolha a data</h4>
          <button onClick={() => setShowCalendar(!showCalendar)} className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 flex items-center justify-between">
            <span>{formatDateBR(selectedDate)}</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
          {showCalendar && (
            <div className="absolute z-10 mt-2 bg-white border rounded-lg shadow-lg p-2">
              <DayPicker mode="single" selected={parseISO(selectedDate)} onSelect={(date) => { if (date) { setSelectedDate(format(date, 'yyyy-MM-dd')); setSelectedTime(null); setShowCalendar(false); }}} locale={ptBR} disabled={{ before: new Date() }} />
            </div>
          )}
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Horários disponíveis</h4>
          <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
            {SLOTS.map((t) => {
              const taken = bookedSlots.includes(t);
              return <button key={t} disabled={taken} onClick={() => setSelectedTime(t)} className={`p-2 text-xs rounded ${taken ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : selectedTime === t ? 'bg-blue-500 text-white' : 'border hover:bg-blue-50'}`}>{t}</button>;
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 p-4 border rounded-lg w-full">
          <h4 className="font-semibold">Resumo</h4>
          <p className="text-sm">Serviço: {svc?.name}</p>
          <p className="text-sm">Profissional: {professionals.find((p) => p.id === Number(selectedPro))?.name}</p>
          <p className="text-sm">Data: {formatDateBR(selectedDate)}</p>
          <p className="text-sm">Horário: {selectedTime || '—'}</p>
          <p className="text-sm">Valor: {svc ? formatBRL(svc.price) : '—'}</p>
        </div>
        <div className="w-full md:w-40">
          <button onClick={bookAppointment} disabled={loading || !selectedTime} className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700">{loading ? 'Aguarde...' : 'Confirmar'}</button>
        </div>
      </div>

      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold mb-2">Histórico</h4>
        <div className="space-y-2">
          {appointments.length === 0 && <p className="text-sm text-gray-500">Nenhum agendamento</p>}
          {appointments.map((a) => {
            const service = services.find((s) => s.id === a.serviceId);
            const isPending = !a.status || a.status === 'pending';
            const isCancelled = a.status === 'cancelled';
            
            return (
              <div 
                key={a.id} 
                className={`flex items-center justify-between p-3 border rounded ${isCancelled ? 'bg-red-50 border-red-200' : 'bg-white'}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{service?.name}</div>
                    {isCancelled && (
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">Cancelado</span>
                    )}
                    {a.status === 'completed' && (
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Concluído</span>
                    )}
                    {isPending && (
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Pendente</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{formatDateBR(a.date)} • {a.time}</div>
                  {a.cancellationReason && (
                    <div className="text-xs text-red-600 mt-1">Motivo: {a.cancellationReason}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold">{formatBRL(service?.price || 0)}</div>
                  {isPending && (
                    <button
                      onClick={() => setCancelingAppointment({
                        id: a.id,
                        serviceName: service?.name,
                        date: formatDateBR(a.date),
                        time: a.time
                      })}
                      className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cancelingAppointment && (
        <CancelModal
          appointment={cancelingAppointment}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelingAppointment(null)}
          loading={loading}
        />
      )}
    </div>
  );
}

function ProfessionalView({ userName, userId, services, updateService, appointments, monthlyReport, formatBRL, formatDateBR, loading, updateAppointmentStatus, getAppointmentStatus }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingService, setEditingService] = useState(null);
  const [report, setReport] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'day' or 'month'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyAppointments, setDailyAppointments] = useState([]);

  const bookingUrl = `${window.location.origin}/book/${userId}`;

  // Filter appointments by selected date for day view
  useEffect(() => {
    if (viewMode === 'day' && selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const filtered = appointments.filter(a => a.date === dateStr);
      setDailyAppointments(filtered);
    }
  }, [viewMode, selectedDate, appointments]);

  useEffect(() => {
    loadReport();
  }, [selectedMonth, appointments]);

  async function loadReport() {
    const [year, month] = selectedMonth.split('-').map(Number);
    const data = await monthlyReport(year, month);
    setReport(data);
  }

  const getStatusColor = (apt) => {
    const status = getAppointmentStatus(apt);
    switch(status) {
      case 'completed': return 'border-l-4 border-green-500 bg-green-50';
      case 'cancelled': return 'border-l-4 border-red-500 bg-red-50';
      default: return 'border-l-4 border-blue-500 bg-blue-50';
    }
  };

  const getStatusBadge = (apt) => {
    const status = getAppointmentStatus(apt);
    switch(status) {
      case 'completed': return <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Concluído</span>;
      case 'cancelled': return <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">Cancelado</span>;
      default: return <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Pendente</span>;
    }
  };

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Painel do Profissional</h3>
        <p className="text-sm text-gray-500">{userName}</p>
      </div>

      <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">QR Code para Agendamento</h4>
          <button onClick={() => setShowQR(!showQR)} className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">{showQR ? 'Ocultar' : 'Mostrar'} QR Code</button>
        </div>
        <p className="text-xs text-gray-600 mb-2">Compartilhe este QR Code para que clientes agendem diretamente com você</p>
        {showQR && (
          <div className="flex flex-col items-center gap-3 p-4 bg-white rounded">
            <QRCodeSVG value={bookingUrl} size={200} />
            <div className="text-xs text-center break-all max-w-full">{bookingUrl}</div>
            <button onClick={() => navigator.clipboard.writeText(bookingUrl)} className="text-sm px-3 py-1 border rounded hover:bg-gray-50">Copiar Link</button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Agenda</h4>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-xs rounded ${viewMode === 'day' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
              >
                Dia
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-xs rounded ${viewMode === 'month' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
              >
                Mês
              </button>
            </div>
          </div>

          {viewMode === 'day' ? (
            <>
              <div className="mb-3">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  className="rdp-small"
                />
              </div>
              <div className="border-t pt-3">
                <h5 className="font-medium mb-2">{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</h5>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {dailyAppointments.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Sem agendamentos neste dia</p>
                  )}
                  {dailyAppointments.map((a) => (
                    <div key={a.id} className={`flex flex-col p-3 rounded ${getStatusColor(a)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{a.client}</div>
                          <div className="text-xs text-gray-500">{a.time}</div>
                          {a.clientPhone && (
                            <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                              <span>📞</span> {a.clientPhone}
                            </div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">{services.find((s) => s.id === a.serviceId)?.name}</div>
                          {a.cancellationReason && (
                            <div className="text-xs text-red-600 mt-1 italic">Motivo: {a.cancellationReason}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{formatBRL(services.find((s) => s.id === a.serviceId)?.price || 0)}</div>
                          <div className="mt-1">{getStatusBadge(a)}</div>
                        </div>
                      </div>
                      {getAppointmentStatus(a) === 'pending' && (
                        <div className="flex gap-1 mt-2">
                          <button onClick={() => updateAppointmentStatus(a.id, 'completed')} className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600" disabled={loading}>Concluir</button>
                          <button onClick={() => updateAppointmentStatus(a.id, 'cancelled')} className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600" disabled={loading}>Cancelar</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
            {appointments.length === 0 && <p className="text-sm text-gray-500">Sem agendamentos</p>}
            {appointments.slice(0, 20).map((a) => (
              <div key={a.id} className={`flex flex-col p-3 rounded ${getStatusColor(a)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{a.client}</div>
                    <div className="text-xs text-gray-500">{formatDateBR(a.date)} • {a.time}</div>
                    {a.clientPhone && (
                      <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                        <span>📞</span> {a.clientPhone}
                      </div>
                    )}
                    <div className="text-xs text-gray-600 mt-1">{services.find((s) => s.id === a.serviceId)?.name}</div>
                    {a.cancellationReason && (
                      <div className="text-xs text-red-600 mt-1 italic">Motivo: {a.cancellationReason}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatBRL(services.find((s) => s.id === a.serviceId)?.price || 0)}</div>
                    <div className="mt-1">{getStatusBadge(a)}</div>
                  </div>
                </div>
                {getAppointmentStatus(a) === 'pending' && (
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => updateAppointmentStatus(a.id, 'completed')} className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600" disabled={loading}>Concluir</button>
                    <button onClick={() => updateAppointmentStatus(a.id, 'cancelled')} className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600" disabled={loading}>Cancelar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Serviços</h4>
          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.duration} min</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">{formatBRL(s.price)}</div>
                  <button onClick={() => setEditingService(s)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">Editar</button>
                </div>
              </div>
            ))}
            {editingService && (
              <div className="mt-3 p-3 border rounded bg-gray-50">
                <h5 className="font-medium">Editar {editingService.name}</h5>
                <div className="mt-2 grid gap-2">
                  <input type="text" className="p-2 border rounded" value={editingService.name} onChange={(e) => setEditingService({ ...editingService, name: e.target.value })} placeholder="Nome do serviço" />
                  <input type="number" className="p-2 border rounded" value={editingService.price} onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })} placeholder="Preço" />
                  <input type="number" className="p-2 border rounded" value={editingService.duration} onChange={(e) => setEditingService({ ...editingService, duration: Number(e.target.value) })} placeholder="Duração (min)" />
                  <div className="flex gap-2">
                    <button onClick={() => { updateService(editingService); setEditingService(null); }} disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">Salvar</button>
                    <button onClick={() => setEditingService(null)} className="px-3 py-2 border rounded hover:bg-gray-50">Cancelar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold mb-2">Relatório Mensal</h4>
        <div className="flex gap-2 items-center mb-3">
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-2 border rounded" />
        </div>
        {report ? (
          <div className="grid gap-2">
            <div className="p-3 border rounded bg-blue-50"><div className="text-sm text-gray-600">Atendimentos Concluídos</div><div className="font-semibold text-xl">{report.totalAttendance}</div></div>
            <div className="p-3 border rounded bg-green-50"><div className="text-sm text-gray-600">Faturamento</div><div className="font-semibold text-xl">{formatBRL(report.totalRevenue)}</div></div>
            <div className="p-3 border rounded"><div className="text-sm text-gray-600 mb-2">Serviços mais realizados</div><ul className="list-disc pl-5">{Object.entries(report.servicesCount).length === 0 && <li className="text-sm text-gray-500">Nenhum</li>}{Object.entries(report.servicesCount).map(([name, cnt]) => <li key={name} className="text-sm">{name} — {cnt}</li>)}</ul></div>
          </div>
        ) : <p className="text-sm text-gray-500">Carregando...</p>}
      </div>
    </div>
  );
}