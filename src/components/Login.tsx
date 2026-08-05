import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, UserRound, Eye, EyeOff, ShieldAlert, CheckCircle2, Database
} from 'lucide-react';
import { fetchAllCredentials } from '../db/firebaseService';

interface LoginProps {
  onLoginSuccess: (user: { username: string; name: string; email: string; role?: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  // Credenciales y estados de formulario
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Por favor, ingresa tu usuario y contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. CONSULTA A FIRESTORE
      console.log('Consultando base de datos de credenciales en Firestore...');
      const users = await fetchAllCredentials();
      console.log('Usuarios obtenidos de Firestore:', users);
      
      const found = users.find(
        (u) => u.username === username.toLowerCase().trim() && u.password === password
      );

      let matchedUser: { username: string; name: string; email: string; role?: string } | null = null;
      if (found) {
        matchedUser = {
          username: found.username,
          name: found.name || found.username,
          email: found.email || `${found.username}@fhons.com.do`,
          role: found.role || 'User'
        };
      }

      if (matchedUser) {
        setIsSuccess(true);
        const finalUser = matchedUser;
        setTimeout(() => {
          onLoginSuccess(finalUser);
        }, 800);
      } else {
        setError('Usuario o contraseña incorrectos. Verifica tus credenciales de acceso.');
        setIsLoading(false);
      }

    } catch (err: any) {
      console.error('Error durante el inicio de sesión:', err);
      setError(err.message || 'Error de conexión con el servidor de autenticación.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#070a13] relative overflow-hidden py-12 px-4">
      {/* Luces de Fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md flex flex-col gap-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-[#0d1425]/95 border border-[#1e293b]/90 rounded-3xl p-8 md:p-9 shadow-2xl backdrop-blur-md"
          id="login-card-container"
        >
          {/* Encabezado */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 mb-4">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div className="text-blue-500 font-mono text-[10px] font-bold uppercase tracking-widest mb-1">FHONS</div>
            <h2 className="font-display font-black text-2xl text-white tracking-tight">Tier Master</h2>
            <p className="font-sans text-xs text-slate-400 mt-1.5 leading-relaxed">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          {/* Alerta de Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 flex items-start gap-2.5 text-xs font-sans leading-relaxed"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Formulario */}
          <form onSubmit={handleLoginSubmit} className="space-y-5" id="login-form">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider pl-1">
                Usuario
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserRound className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Ingresa tu usuario (ej: rquintana)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading || isSuccess}
                  className="w-full bg-[#131b31] border border-[#1e293b] text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                  id="login-input-username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider pl-1">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isSuccess}
                  className="w-full bg-[#131b31] border border-[#1e293b] text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                  id="login-input-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className={`w-full font-sans text-xs font-bold py-3.5 px-4 rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 shadow-lg border relative overflow-hidden mt-2 ${
                isSuccess
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-550 hover:to-indigo-550 text-white shadow-blue-500/25 border-blue-400/20'
              }`}
              id="login-submit-button"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verificando credenciales...</span>
                </div>
              ) : isSuccess ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Acceso Concedido</span>
                </div>
              ) : (
                <span>Ingresar al Panel</span>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
