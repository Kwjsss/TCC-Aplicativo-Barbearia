import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Phone, Lock, Camera } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ClientSettings({ userId, onUpdate, onClose }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      const res = await axios.get(`${API}/clients/profile/${userId}`);
      setProfile(res.data);
      setPhone(res.data.phone || '');
      setPhotoUrl(res.data.photo || '');
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function handleSavePhone() {
    try {
      setLoading(true);
      await axios.put(`${API}/clients/profile/${userId}`, { phone });
      alert('Telefone atualizado com sucesso!');
      onUpdate();
      await loadProfile();
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao atualizar telefone');
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePhoto() {
    try {
      setLoading(true);
      await axios.put(`${API}/clients/profile/${userId}`, { photo: photoUrl });
      alert('Foto atualizada com sucesso!');
      onUpdate();
      await loadProfile();
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao atualizar foto');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      return alert('As senhas não coincidem');
    }
    if (newPassword.length < 6) {
      return alert('A nova senha deve ter pelo menos 6 caracteres');
    }

    try {
      setLoading(true);
      await axios.put(`${API}/clients/profile/${userId}`, {
        currentPassword,
        newPassword
      });
      alert('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return <div className="p-4">Carregando...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Configurações do Perfil</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="space-y-6">
          {/* Photo Section */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Foto do Perfil</h3>
            </div>
            <div className="flex items-center gap-4 mb-3">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover" onError={(e) => e.target.src = ''} />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                  {profile.name[0]}
                </div>
              )}
              <div className="flex-1">
                <input
                  type="url"
                  className="w-full p-2 border rounded"
                  placeholder="URL da foto (https://...)" 
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <button
              onClick={handleSavePhoto}
              disabled={loading}
              className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Foto'}
            </button>
          </div>

          {/* Phone Section */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Telefone</h3>
            </div>
            <input
              type="tel"
              className="w-full p-2 border rounded mb-3"
              placeholder="(11) 98765-4321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
            <button
              onClick={handleSavePhone}
              disabled={loading}
              className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Telefone'}
            </button>
          </div>

          {/* Password Section */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Alterar Senha</h3>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                className="w-full p-2 border rounded"
                placeholder="Senha atual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
              />
              <input
                type="password"
                className="w-full p-2 border rounded"
                placeholder="Nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
              <input
                type="password"
                className="w-full p-2 border rounded"
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button
                onClick={handleChangePassword}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Alterar Senha'}
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold">Informações da Conta</h3>
            </div>
            <p className="text-sm text-gray-600">Nome: {profile.name}</p>
            <p className="text-sm text-gray-600">Email: {profile.email}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 p-3 border rounded-lg hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}