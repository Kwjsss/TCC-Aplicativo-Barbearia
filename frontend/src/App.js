import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  // If status is explicitly set, use it
  if (apt.status && apt.status !== 'pending') {
    return apt.status;
  }
  
  // Otherwise, determine by date
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

// Utility: create time slots for a day (09:00 - 18:00 every 30min)
function generateSlots() {
  const slots = [];
  const start = 9 * 60; // minutes
  const end = 18 * 60;
  for (let t = start; t < end; t += 30) {
    const hh = String(Math.floor(t / 60)).padStart(2, '0');
    const mm = String(t % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

const SLOTS = generateSlots();

function todayISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export default function App() {
  // Simple auth state
  const [role, setRole] = useState(null); // 'client' | 'pro'
  const [userName, setUserName] = useState('');

  // Data
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Client booking state
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);

  // Fetch initial data
  useEffect(() => {
    loadServices();
    loadProfessionals();
  }, []);

  useEffect(() => {
    if (role) {
      loadAppointments();
    }
  }, [role, userName]);

  useEffect(() => {
    if (services.length && !selectedService) setSelectedService(services[0]?.id);
    if (professionals.length && !selectedPro) setSelectedPro(professionals[0]?.id);
  }, [services, professionals]);

  // Load available slots when date or pro changes
  useEffect(() => {
    if (selectedDate && selectedPro) {
      loadAvailableSlots();
    }
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

  // Auth handlers
  async function loginAs(roleToUse, name) {
    try {
      setLoading(true);
      await axios.post(`${API}/auth/login`, {
        name: name || 'User',
        role: roleToUse
      });
      setRole(roleToUse);
      setUserName(name || 'User');
    } catch (error) {
      console.error('Login error:', error);
      alert('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setRole(null);
    setUserName('');
    setAppointments([]);
  }

  // Booking handler (client)
  async function bookAppointment() {
    if (!selectedTime) return alert('Escolha um horário.');
    
    try {
      setLoading(true);
      const res = await axios.post(`${API}/appointments`, {
        client: userName || 'Cliente',
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
      console.error('Booking error:', error);
      alert(error.response?.data?.detail || 'Erro ao agendar');
    } finally {
      setLoading(false);
    }
  }

  // Professional: set service price/duration
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
      console.error('Update service error:', error);
      alert('Erro ao atualizar serviço');
    } finally {
      setLoading(false);
    }
  }

  // Update appointment status
  async function updateAppointmentStatus(appointmentId, newStatus) {
    try {
      setLoading(true);
      await axios.patch(`${API}/appointments/${appointmentId}/status`, {
        status: newStatus
      });
      await loadAppointments();
    } catch (error) {
      console.error('Update status error:', error);
      alert('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  }

  // Reports (monthly)
  async function monthlyReport(year, month) {
    try {
      const res = await axios.get(`${API}/reports/monthly/${year}/${month}`);
      return res.data;
    } catch (error) {
      console.error('Report error:', error);
      return { totalAttendance: 0, totalRevenue: 0, servicesCount: {} };
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-start justify-center p-4">
      <div className="w-full max-w-4xl shadow-lg rounded-2xl p-4 md:p-8 bg-white">
        <Header role={role} logout={logout} />

        {!role && (
          <Auth onLogin={loginAs} loading={loading} />
        )}

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
            formatBRL={formatBRL}
            formatDateBR={formatDateBR}
            loading={loading}
          />
        )}

        {role === 'pro' && (
          <ProfessionalView
            userName={userName}
            services={services}
            updateService={updateService}
            appointments={appointments}
            professionals={professionals}
            monthlyReport={monthlyReport}
            formatBRL={formatBRL}
            formatDateBR={formatDateBR}
            loading={loading}
            updateAppointmentStatus={updateAppointmentStatus}
            getAppointmentStatus={getAppointmentStatus}
          />
        )}
      </div>
    </div>
  );
}

// -------------------- Subcomponents --------------------

function Header({ role, logout }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">A</div>
        <div>
          <h1 className="text-lg font-semibold">AgendAI</h1>
          <p className="text-xs text-gray-500">Barbearia — branco & azul</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {role && (
          <button onClick={logout} className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">Sair</button>
        )}
      </div>
    </div>
  );
}

function Auth({ onLogin, loading }) {
  const [name, setName] = useState('');
  const [asRole, setAsRole] = useState('client');
  return (
    <div className="grid gap-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Bem-vindo ao AgendAI</h2>
        <p className="text-sm text-gray-600">Escolha seu acesso: Cliente ou Profissional</p>
      </div>
      <input
        className="w-full p-3 border rounded-lg focus:outline-none"
        placeholder="Seu nome (ex: João)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />
      <div className="flex gap-2">
        <button
          className={`flex-1 p-3 rounded-lg ${asRole === 'client' ? 'bg-blue-500 text-white' : 'border'}`}
          onClick={() => setAsRole('client')}
          disabled={loading}
        >
          Cliente
        </button>
        <button
          className={`flex-1 p-3 rounded-lg ${asRole === 'pro' ? 'bg-blue-500 text-white' : 'border'}`}
          onClick={() => setAsRole('pro')}
          disabled={loading}
        >
          Profissional
        </button>
      </div>
      <button
        onClick={() => onLogin(asRole, name)}
        disabled={loading}
        className="w-full p-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
      >
        {loading ? 'Carregando...' : `Entrar como ${asRole === 'client' ? 'Cliente' : 'Profissional'}`}
      </button>
    </div>
  );
}

function ClientView({
  userName,
  services,
  professionals,
  selectedService,
  setSelectedService,
  selectedPro,
  setSelectedPro,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  SLOTS,
  bookedSlots,
  appointments,
  bookAppointment,
  formatBRL,
  formatDateBR,
  loading
}) {
  const svc = services.find((s) => s.id === Number(selectedService));
  const [showCalendar, setShowCalendar] = useState(false);
  
  const handleDateSelect = (date) => {
    if (date) {
      const isoDate = format(date, 'yyyy-MM-dd');
      setSelectedDate(isoDate);
      setSelectedTime(null);
      setShowCalendar(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Olá, {userName || 'Cliente'}</h3>
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
                onSelect={handleDateSelect}
                locale={ptBR}
                disabled={{ before: new Date() }}
                className="rdp-small"
              />
            </div>
          )}
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Horários disponíveis</h4>
          <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
            {SLOTS.map((t) => {
              const taken = bookedSlots.includes(t);
              return (
                <button
                  key={t}
                  disabled={taken}
                  onClick={() => setSelectedTime(t)}
                  className={`p-2 text-xs rounded ${
                    taken
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : selectedTime === t
                      ? 'bg-blue-500 text-white'
                      : 'border hover:bg-blue-50'
                  }`}
                >
                  {t}
                </button>
              );
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
          <button 
            onClick={bookAppointment} 
            disabled={loading || !selectedTime}
            className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700"
          >
            {loading ? 'Aguarde...' : 'Confirmar'}
          </button>
        </div>
      </div>

      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold mb-2">Histórico</h4>
        <div className="space-y-2">
          {appointments.length === 0 && <p className="text-sm text-gray-500">Nenhum agendamento</p>}
          {appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <div className="font-medium">{services.find((s) => s.id === a.serviceId)?.name}</div>
                <div className="text-xs text-gray-500">{formatDateBR(a.date)} • {a.time}</div>
              </div>
              <div className="text-sm">{formatBRL(services.find((s) => s.id === a.serviceId)?.price || 0)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfessionalView({ 
  userName, 
  services, 
  updateService, 
  appointments, 
  professionals, 
  monthlyReport, 
  formatBRL, 
  formatDateBR,
  loading,
  updateAppointmentStatus,
  getAppointmentStatus
}) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [editingService, setEditingService] = useState(null);
  const [report, setReport] = useState(null);

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
      case 'completed':
        return 'border-l-4 border-green-500 bg-green-50';
      case 'cancelled':
        return 'border-l-4 border-red-500 bg-red-50';
      case 'pending':
      default:
        return 'border-l-4 border-blue-500 bg-blue-50';
    }
  };

  const getStatusBadge = (apt) => {
    const status = getAppointmentStatus(apt);
    switch(status) {
      case 'completed':
        return <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Concluído</span>;
      case 'cancelled':
        return <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">Cancelado</span>;
      case 'pending':
      default:
        return <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Pendente</span>;
    }
  };

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Painel do Profissional</h3>
        <p className="text-sm text-gray-500">{userName || 'Profissional'}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Agenda (Próximos agendamentos)</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {appointments.length === 0 && <p className="text-sm text-gray-500">Sem agendamentos</p>}
            {appointments.slice(0, 20).map((a) => (
              <div key={a.id} className={`flex flex-col p-3 rounded ${getStatusColor(a)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{a.client}</div>
                    <div className="text-xs text-gray-500">{formatDateBR(a.date)} • {a.time}</div>
                    <div className="text-xs text-gray-600 mt-1">{services.find((s) => s.id === a.serviceId)?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatBRL(services.find((s) => s.id === a.serviceId)?.price || 0)}</div>
                    <div className="mt-1">{getStatusBadge(a)}</div>
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  {getAppointmentStatus(a) === 'pending' && (
                    <>
                      <button
                        onClick={() => updateAppointmentStatus(a.id, 'completed')}
                        className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        disabled={loading}
                      >
                        Concluir
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(a.id, 'cancelled')}
                        className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        disabled={loading}
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
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
                  <input 
                    type="text" 
                    className="p-2 border rounded" 
                    value={editingService.name} 
                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })} 
                    placeholder="Nome do serviço"
                  />
                  <input 
                    type="number" 
                    className="p-2 border rounded" 
                    value={editingService.price} 
                    onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })} 
                    placeholder="Preço"
                  />
                  <input 
                    type="number" 
                    className="p-2 border rounded" 
                    value={editingService.duration} 
                    onChange={(e) => setEditingService({ ...editingService, duration: Number(e.target.value) })} 
                    placeholder="Duração (min)"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { 
                        updateService(editingService); 
                        setEditingService(null); 
                      }} 
                      disabled={loading}
                      className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
                    >
                      Salvar
                    </button>
                    <button 
                      onClick={() => setEditingService(null)} 
                      className="px-3 py-2 border rounded hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
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
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
            className="p-2 border rounded" 
          />
        </div>
        {report ? (
          <div className="grid gap-2">
            <div className="p-3 border rounded bg-blue-50">
              <div className="text-sm text-gray-600">Atendimentos Concluídos</div>
              <div className="font-semibold text-xl">{report.totalAttendance}</div>
            </div>
            <div className="p-3 border rounded bg-green-50">
              <div className="text-sm text-gray-600">Faturamento</div>
              <div className="font-semibold text-xl">{formatBRL(report.totalRevenue)}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-sm text-gray-600 mb-2">Serviços mais realizados</div>
              <ul className="list-disc pl-5">
                {Object.entries(report.servicesCount).length === 0 && <li className="text-sm text-gray-500">Nenhum</li>}
                {Object.entries(report.servicesCount).map(([name, cnt]) => (
                  <li key={name} className="text-sm">{name} — {cnt}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Carregando...</p>
        )}
      </div>
    </div>
  );
}