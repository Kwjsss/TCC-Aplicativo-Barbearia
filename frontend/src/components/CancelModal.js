import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function CancelModal({ appointment, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('Por favor, informe o motivo do cancelamento');
      return;
    }
    onConfirm(appointment.id, reason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h3 className="text-xl font-bold">Cancelar Agendamento</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Você está prestes a cancelar:</p>
          <p className="font-semibold mt-1">{appointment.serviceName}</p>
          <p className="text-sm text-gray-600">{appointment.date} às {appointment.time}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Motivo do cancelamento *
          </label>
          <textarea
            className="w-full p-3 border rounded-lg resize-none"
            rows="4"
            placeholder="Por favor, informe o motivo do cancelamento..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
