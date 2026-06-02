import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';
import { api } from '@/services/api';
import { useAdminNativeCursor } from '@/hooks/useAdminNativeCursor';

type Mode = 'login' | 'bootstrap';
const ADMIN_STATUS_TIMEOUT_MS = 3500;

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useAdminNativeCursor();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === '1') {
      setError('Tu sesión admin venció. Iniciá sesión de nuevo y repetí la subida.');
    }

    const loadStatus = async () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), ADMIN_STATUS_TIMEOUT_MS);

      try {
        const status = await api.getAdminAuthStatus(controller.signal);
        setMode(status.bootstrapAvailable ? 'bootstrap' : 'login');
      } catch (err) {
        setMode('login');
        setError('No pude verificar el estado admin. Probá ingresar igual; si falla, recargá la página.');
      } finally {
        window.clearTimeout(timer);
        setIsCheckingStatus(false);
      }
    };

    loadStatus();
  }, [location.search]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await api.login(username.trim(), password.trim());
      localStorage.setItem('admin_token', res.token);
      navigate('/admin');
    } catch (err) {
      setError('Credenciales inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();

    if (username.trim().length < 3) {
      setError('Elegí un usuario de al menos 3 caracteres.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await api.bootstrapAdmin(username.trim(), password);
      localStorage.setItem('admin_token', res.token);
      navigate('/admin');
    } catch (err) {
      setError('No se pudo crear el acceso admin inicial.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingStatus) {
    return <div className="min-h-[70vh] flex items-center justify-center text-zinc-400">Verificando acceso admin...</div>;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="w-12 h-12 bg-violet-600/20 rounded-full flex items-center justify-center mb-2">
            {mode === 'bootstrap' ? (
              <KeyRound className="w-6 h-6 text-violet-400" />
            ) : (
              <Lock className="w-6 h-6 text-violet-400" />
            )}
          </div>
          <h1 className="text-2xl font-display font-bold text-white">
            {mode === 'bootstrap' ? 'Crear acceso admin' : 'Acceso Admin'}
          </h1>
          <p className="text-zinc-400 text-sm">
            {mode === 'bootstrap'
              ? 'No existe ningún admin configurado. Creá el primer acceso desde acá.'
              : 'Ingresá tus credenciales para administrar la plataforma.'}
          </p>
        </div>

        <form onSubmit={mode === 'bootstrap' ? handleBootstrap : handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none transition-colors"
              required
            />
          </div>

          {mode === 'bootstrap' && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400">Repetir contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:outline-none transition-colors"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 mt-4"
          >
            {isLoading
              ? mode === 'bootstrap'
                ? 'Creando acceso...'
                : 'Verificando...'
              : mode === 'bootstrap'
                ? 'Crear y entrar'
                : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
