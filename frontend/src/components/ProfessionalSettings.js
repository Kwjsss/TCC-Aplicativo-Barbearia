import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Camera } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ProfessionalSettings({ userId, onUpdate, onClose }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      const res = await axios.get(`${API}/professionals/profile/${userId}`);
      setProfile(res.data);
      setPhotoUrl(res.data.photo || '');
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function handleSavePhoto() {
    try {
      setLoading(true);
      await axios.put(`${API}/professionals/profile/${userId}`, { photo: photoUrl });
      alert('Foto atualizada com sucesso!');
      onUpdate();
      await loadProfile();
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao atualizar foto');
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return <div className="p-4">Carregando...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
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

          {/* User Info */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold">Informações da Conta</h3>
            </div>
            <p className="text-sm text-gray-600">Nome: {profile.name}</p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full p-3 border rounded-lg hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}