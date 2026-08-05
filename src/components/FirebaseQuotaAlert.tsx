import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  currentUser: { username: string; name: string; email: string; role?: string } | null;
}

export default function FirebaseQuotaAlert({ currentUser }: Props) {
  const [alert, setAlert] = useState<{ msg: string } | null>(null);

  useEffect(() => {
    if (currentUser?.username !== 'rq') return;

    const handleExceeded = (e: any) => {
      const errorMsg = e.detail?.error || 'Exceso de cuota no especificado';
      setAlert({ msg: `Error Crítico: Se ha excedido la cuota de Firebase: ${errorMsg}. Se han suspendido las consultas para evitar colapsos. Contacte a facturación.` });
    };

    window.addEventListener('firebase_quota_exceeded', handleExceeded);

    return () => {
      window.removeEventListener('firebase_quota_exceeded', handleExceeded);
    };
  }, [currentUser]);

  if (!alert) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      >
        <div className="bg-red-600 text-white p-8 rounded-xl shadow-2xl border-4 border-white flex flex-col gap-4 max-w-lg w-full">
          <h2 className="text-2xl font-bold">¡ALERTA CRÍTICA DE CUOTA FIREBASE!</h2>
          <p>{alert.msg}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
