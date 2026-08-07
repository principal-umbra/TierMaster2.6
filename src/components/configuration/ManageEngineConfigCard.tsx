import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchSystemSettings, saveSystemSettings } from '../../db/firebaseService';

export function ManageEngineConfigCard() {
  const [apiUrl, setApiUrl] = useState('https://sdpondemand.manageengine.com/api/v3');
  const [portalName, setPortalName] = useState('');
  const [authType, setAuthType] = useState<'technician_key' | 'oauth2'>('technician_key');
  const [technicianKey, setTechnicianKey] = useState('');
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [oauthRefreshToken, setOauthRefreshToken] = useState('');
  const [oauthDomain, setOauthDomain] = useState('com');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(15);

  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    status?: number;
    ticketsFoundInTest?: number;
    details?: any;
  } | null>(null);

  const [saveMessage, setSaveMessage] = useState('');

  // Load existing configuration from Firestore or Server Status
  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        setIsLoading(true);
        
        // 1. Check server status from environment
        const statusRes = await fetch('/api/manageengine/status').catch(() => null);
        let statusData: any = null;
        if (statusRes && statusRes.ok) {
          statusData = await statusRes.json().catch(() => null);
        }

        // 2. Fetch stored Firestore settings
        const settings = await fetchSystemSettings().catch(() => ({}));
        const meConfig = settings?.manageEngineConfig || {};

        if (isMounted) {
          setApiUrl(meConfig.apiUrl || statusData?.apiUrl || 'https://sdpondemand.manageengine.com/api/v3');
          setPortalName(meConfig.portalName || statusData?.portalName || '');
          setAuthType(meConfig.authType || statusData?.authType || 'technician_key');
          setTechnicianKey(meConfig.technicianKey || '');
          setOauthClientId(meConfig.oauthClientId || '');
          setOauthClientSecret(meConfig.oauthClientSecret || '');
          setOauthRefreshToken(meConfig.oauthRefreshToken || '');
          setOauthDomain(meConfig.oauthDomain || 'com');
          if (typeof meConfig.autoSyncEnabled === 'boolean') {
            setAutoSyncEnabled(meConfig.autoSyncEnabled);
          }
          if (meConfig.syncIntervalMinutes) {
            setSyncIntervalMinutes(meConfig.syncIntervalMinutes);
          }
        }
      } catch (err) {
        console.error('Error cargando configuración de ManageEngine:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadConfig();
    return () => { isMounted = false; };
  }, []);

  // Save configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');

    try {
      const configToSave = {
        apiUrl: apiUrl.trim(),
        portalName: portalName.trim(),
        authType,
        technicianKey: technicianKey.trim(),
        oauthClientId: oauthClientId.trim(),
        oauthClientSecret: oauthClientSecret.trim(),
        oauthRefreshToken: oauthRefreshToken.trim(),
        oauthDomain: oauthDomain.trim(),
        autoSyncEnabled,
        syncIntervalMinutes,
        updatedAt: new Date().toISOString(),
      };

      await saveSystemSettings({
        manageEngineConfig: configToSave,
      });

      setSaveMessage('¡Configuración de ManageEngine guardada correctamente en Firestore!');
      setTimeout(() => setSaveMessage(''), 4500);
    } catch (err: any) {
      alert('Error al guardar configuración: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const payload = {
        apiUrl: apiUrl.trim(),
        portalName: portalName.trim(),
        authType,
        technicianKey: technicianKey.trim(),
        oauthClientId: oauthClientId.trim(),
        oauthClientSecret: oauthClientSecret.trim(),
        oauthRefreshToken: oauthRefreshToken.trim(),
        oauthDomain: oauthDomain.trim(),
      };

      const res = await fetch('/api/manageengine/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Conexión establecida con éxito con ManageEngine ServiceDesk Plus.',
          status: data.status,
          ticketsFoundInTest: data.ticketsFoundInTest,
          details: data.sampleResponse,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'No se pudo validar la conexión con ManageEngine.',
          status: data.status,
          details: data.rawResponse || data.details,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Error de red o servidor al intentar probar la conexión: ' + (err?.message || err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#111827]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 text-slate-400 font-sans text-xs flex items-center gap-2">
        <span className="material-symbols-outlined animate-spin text-indigo-400">sync</span>
        Cargando parámetros de API ManageEngine...
      </div>
    );
  }

  return (
    <div className="bg-[#111827]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-5 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-extrabold text-[#eceef0] text-base mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400">api</span>
            Integración Directa con ManageEngine SupportCenter Plus (On-Premise)
          </h3>
          <p className="font-sans text-xs text-slate-400 leading-relaxed">
            Conecte la aplicación directamente con la API REST v3 de ManageEngine SupportCenter Plus para consultar tickets en tiempo real sin requerir archivos Excel.
          </p>
        </div>

        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono self-start sm:self-center flex items-center gap-1.5 ${
          testResult?.success
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : testResult === null
            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          {testResult?.success ? 'API Conectada' : testResult === null ? 'Pendiente Verificación' : 'Error de Conexión'}
        </span>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
            {saveMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Form */}
      <form onSubmit={handleSaveConfig} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* API URL */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-indigo-400">link</span>
              Base API URL de SupportCenter Plus
            </label>
            <input
              type="text"
              required
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://servidor-crm:8080/api/v3"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500">
              Ejemplo On-Premise: <code>http://ip-o-servidor-crm:8080/api/v3</code> o <code>https://crm.tuempresa.com/api/v3</code>.
            </span>
          </div>

          {/* Portal Name */}
          <div className="flex flex-col gap-1.5 opacity-60">
            <label className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-slate-500">domain</span>
              Nombre de Portal (No requerido para SupportCenter Plus On-Premise)
            </label>
            <input
              type="text"
              value={portalName}
              onChange={(e) => setPortalName(e.target.value)}
              placeholder="No aplica en On-Premise (dejar vacío)"
              className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-400 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500">Las instalaciones On-Premise no requieren Portal Name.</span>
          </div>
        </div>

        {/* Auth Type Selector */}
        <div className="flex flex-col gap-2 bg-slate-950/60 p-4 rounded-xl border border-white/5">
          <label className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-indigo-400">lock</span>
            Método de Autenticación
          </label>
          <div className="flex flex-wrap gap-4 mt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="radio"
                name="authType"
                checked={authType === 'technician_key'}
                onChange={() => setAuthType('technician_key')}
                className="accent-indigo-500"
              />
              <span className="font-bold">Technician Key / API Key</span>
              <span className="text-[10px] text-slate-400">(Recomendado para On-Premise & ServiceDesk Plus)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="radio"
                name="authType"
                checked={authType === 'oauth2'}
                onChange={() => setAuthType('oauth2')}
                className="accent-indigo-500"
              />
              <span className="font-bold">OAuth 2.0 (Zoho Account)</span>
              <span className="text-[10px] text-slate-400">(Recomendado para SDP Cloud / Zoho On Demand)</span>
            </label>
          </div>
        </div>

        {/* Technician Key inputs */}
        {authType === 'technician_key' && (
          <div className="flex flex-col gap-1.5 bg-slate-950/60 p-4 rounded-xl border border-white/5">
            <label className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-indigo-400">key</span>
              Clave de Técnico (Technician Key / API Key)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={technicianKey}
                onChange={(e) => setTechnicianKey(e.target.value)}
                placeholder="Pega tu Technician Key generada en ManageEngine..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 bg-transparent border-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">{showKey ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-500">
              Obtén tu Technician Key ingresando a ManageEngine SDP &gt; Perfil de Usuario &gt; API Key / Technician Key.
            </span>
          </div>
        )}

        {/* OAuth 2.0 inputs */}
        {authType === 'oauth2' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-white/5">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider">OAuth Client ID</label>
              <input
                type="text"
                value={oauthClientId}
                onChange={(e) => setOauthClientId(e.target.value)}
                placeholder="1000.XXXXXX..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider">OAuth Client Secret</label>
              <input
                type="password"
                value={oauthClientSecret}
                onChange={(e) => setOauthClientSecret(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider">OAuth Refresh Token</label>
              <input
                type="password"
                value={oauthRefreshToken}
                onChange={(e) => setOauthRefreshToken(e.target.value)}
                placeholder="1000.XXXXXX.RefreshToken..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider">Dominio Zoho Accounts</label>
              <select
                value={oauthDomain}
                onChange={(e) => setOauthDomain(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="com">.com (Global)</option>
                <option value="eu">.eu (Europa)</option>
                <option value="in">.in (India)</option>
                <option value="com.au">.com.au (Australia)</option>
              </select>
            </div>
          </div>
        )}

        {/* Sync Frequency Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoSyncCheck"
              checked={autoSyncEnabled}
              onChange={(e) => setAutoSyncEnabled(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
            <label htmlFor="autoSyncCheck" className="text-xs font-bold text-slate-200 cursor-pointer">
              Habilitar Sincronización Automática en Segundo Plano
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Frecuencia:</span>
            <select
              value={syncIntervalMinutes}
              onChange={(e) => setSyncIntervalMinutes(Number(e.target.value))}
              disabled={!autoSyncEnabled}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            >
              <option value={5}>Cada 5 minutos</option>
              <option value={15}>Cada 15 minutos</option>
              <option value={30}>Cada 30 minutos</option>
              <option value={60}>Cada 1 hora</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-300 border border-indigo-500/30 font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">{isTesting ? 'sync' : 'network_check'}</span>
            {isTesting ? 'Probando Conexión...' : 'Probar Conexión en Tiempo Real'}
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-950/40 active:scale-95 border-none"
          >
            <span className="material-symbols-outlined text-sm">{isSaving ? 'sync' : 'save'}</span>
            {isSaving ? 'Guardando...' : 'Guardar Configuración en Firestore'}
          </button>
        </div>
      </form>

      {/* Test Output Panel */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border flex flex-col gap-2 ${
            testResult.success
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs flex items-center gap-1.5 font-mono">
              <span className="material-symbols-outlined text-base">
                {testResult.success ? 'check_circle' : 'error'}
              </span>
              {testResult.message}
            </span>
            {testResult.status && (
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-900 border border-current">
                HTTP {testResult.status}
              </span>
            )}
          </div>

          {testResult.ticketsFoundInTest !== undefined && (
            <span className="text-[11px] font-sans text-emerald-300">
              ✓ Tickets consultados en prueba preliminar: <strong>{testResult.ticketsFoundInTest}</strong>
            </span>
          )}

          {testResult.details && (
            <div className="mt-1">
              <span className="text-[10px] font-mono text-slate-400 block mb-1">Respuesta técnica recibida de ManageEngine:</span>
              <pre className="p-3 bg-slate-950 rounded-lg text-[10px] font-mono overflow-x-auto border border-slate-800 text-slate-300 max-h-48 leading-tight">
                {typeof testResult.details === 'string'
                  ? testResult.details
                  : JSON.stringify(testResult.details, null, 2)}
              </pre>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
