import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Key, ShieldAlert, Navigation, HelpCircle } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMapsLibrary } from '@vis.gl/react-google-maps';
import { incrementGoogleMapsUsage } from '../../db/firebaseService';

interface MapSelectionProps {
  address: string;
  onChangeAddress: (val: string) => void;
  latitude: string;
  longitude: string;
  onChangeCoords: (lat: string, lng: string) => void;
}

export default function MapSelection({
  address,
  onChangeAddress,
  latitude,
  longitude,
  onChangeCoords,
}: MapSelectionProps) {
  // Read API Key dynamically to react instantly to in-app changes
  const customKey = localStorage.getItem('GOOGLE_MAPS_PLATFORM_KEY') || '';
  const envKey = (typeof process !== 'undefined' && process.env?.GOOGLE_MAPS_PLATFORM_KEY) || '';
  const API_KEY = 
    envKey || 
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY || 
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY || 
    customKey || 
    '';
  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim().length > 10;

  // Center map on existing coords or default to Santo Domingo, Dominican Republic (FHONS context)
  const defaultLat = 18.4861;
  const defaultLng = -69.9312;

  const currentLat = parseFloat(latitude) || defaultLat;
  const currentLng = parseFloat(longitude) || defaultLng;

  const [mapCenter, setMapCenter] = useState({ lat: currentLat, lng: currentLng });
  const [mapZoom, setMapZoom] = useState(14);
  const [showKeyInstructions, setShowKeyInstructions] = useState(false);
  const [googleMapsAuthError, setGoogleMapsAuthError] = useState(false);
  
  // Callback ref state to perfectly handle mounting/unmounting of autocomplete input node
  const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);

  // Listen for Google Maps Auth Failure event (native window callback from Google Maps API)
  useEffect(() => {
    // Save original if any
    const originalAuthFailure = (window as any).gm_authFailure;
    
    // Override with custom resilient callback
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps authentication failure detected. Fallback mode activated.');
      setGoogleMapsAuthError(true);
      if (typeof originalAuthFailure === 'function') {
        try {
          originalAuthFailure();
        } catch (e) {
          console.error(e);
        }
      }
    };

    return () => {
      if (originalAuthFailure) {
        (window as any).gm_authFailure = originalAuthFailure;
      } else {
        delete (window as any).gm_authFailure;
      }
    };
  }, []);

  // Sync state if coordinates are set externally
  useEffect(() => {
    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      setMapCenter({ lat: parsedLat, lng: parsedLng });
    }
  }, [latitude, longitude]);

  // Record map load when component is mounted and has a valid key
  useEffect(() => {
    if (hasValidKey) {
      incrementGoogleMapsUsage('maps_js_api_loads').catch(err => console.warn('Error logs:', err));
    }
  }, [hasValidKey]);

  // Handle map click for real Google Maps
  const handleMapClick = (e: any) => {
    if (e.detail && e.detail.latLng) {
      const { lat, lng } = e.detail.latLng;
      onChangeCoords(lat.toFixed(6), lng.toFixed(6));
    }
  };

  // Quick geocoding search
  const handleGeocodeSearch = () => {
    if (!address.trim()) return;

    if (hasValidKey && (window as any).google?.maps) {
      // Record a geocoding request
      incrementGoogleMapsUsage('geocoding_requests').catch(err => console.warn('Error logs:', err));

      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ address: address }, (results: any, status: string) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          onChangeCoords(lat.toFixed(6), lng.toFixed(6));
          setMapCenter({ lat, lng });
          setMapZoom(16);
        } else {
          alert('No se pudo encontrar la dirección en Google Maps.');
        }
      });
    } else {
      // Simulation mode geocoding: random offset near Santo Domingo center
      const randomOffsetLat = (Math.random() - 0.5) * 0.03;
      const randomOffsetLng = (Math.random() - 0.5) * 0.03;
      const simLat = (defaultLat + randomOffsetLat).toFixed(6);
      const simLng = (defaultLng + randomOffsetLng).toFixed(6);
      onChangeCoords(simLat, simLng);
      setMapCenter({ lat: parseFloat(simLat), lng: parseFloat(simLng) });
      setMapZoom(15);
    }
  };

  // Interactive Click on Mock Map grid
  const handleMockMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0 to 1
    const y = (e.clientY - rect.top) / rect.height; // 0 to 1

    // Map click percentage to coordinates around Santo Domingo, DN bounding box
    // Lat range: 18.44 to 18.52
    // Lng range: -69.85 to -69.98
    const simLat = (18.52 - y * 0.08).toFixed(6);
    const simLng = (-69.85 - x * 0.13).toFixed(6);

    onChangeCoords(simLat, simLng);
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Address Input Toolbar */}
      <div className="space-y-1.5">
        <label className="font-mono text-[9px] text-slate-500 font-bold uppercase block tracking-wider">
          Dirección de la Visita
        </label>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <input
              ref={setInputEl}
              type="text"
              value={address}
              onChange={(e) => onChangeAddress(e.target.value)}
              placeholder="Ej. Av. Winston Churchill, Santo Domingo, DN..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGeocodeSearch())}
              className="w-full text-xs font-sans pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-slate-700"
            />
          </div>
          <button
            type="button"
            onClick={handleGeocodeSearch}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shrink-0"
            title="Localizar dirección en el mapa"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold hidden sm:inline">Ubicar</span>
          </button>
        </div>
      </div>

      {/* Map display area */}
      <div className="flex-1 min-h-[300px] lg:min-h-[340px] max-h-[420px] relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner flex flex-col">
        {hasValidKey && !googleMapsAuthError ? (
          // REAL GOOGLE MAPS
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              center={mapCenter}
              zoom={mapZoom}
              mapId="DEMO_MAP_ID"
              onClick={handleMapClick}
              onCenterChanged={(e) => {
                if (e.detail?.center) {
                  setMapCenter(e.detail.center);
                }
              }}
              onZoomChanged={(e) => {
                if (e.detail?.zoom !== undefined) {
                  setMapZoom(e.detail.zoom);
                }
              }}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%', minHeight: '300px' }}
            >
              <AdvancedMarker
                position={{ lat: currentLat, lng: currentLng }}
                title="Ubicación de Visita"
              >
                <Pin background="#ef4444" glyphColor="#fff" borderColor="#b91c1c" />
              </AdvancedMarker>
            </Map>
            <AutocompleteBinder
              inputEl={inputEl}
              onChangeAddress={onChangeAddress}
              onChangeCoords={onChangeCoords}
              setMapCenter={setMapCenter}
              setMapZoom={setMapZoom}
            />
          </APIProvider>
        ) : (
          // INTERACTIVE Fallback Mock Map
          <div 
            onClick={handleMockMapClick}
            className="w-full h-full relative cursor-crosshair select-none overflow-hidden bg-slate-50 flex flex-col justify-between"
            style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }}
          >
            {/* Mock roads and city blocks */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-1/4 left-0 right-0 h-4 bg-slate-300" />
              <div className="absolute top-2/3 left-0 right-0 h-6 bg-slate-300" />
              <div className="absolute left-1/3 top-0 bottom-0 w-5 bg-slate-300" />
              <div className="absolute left-3/4 top-0 bottom-0 w-4 bg-slate-300" />
              <div className="absolute top-[45%] left-1/4 w-32 h-32 rounded-full border-8 border-slate-300 bg-slate-100" />
            </div>

            {/* Notification Badge / Instructions */}
            {googleMapsAuthError ? (
              <div className="p-3 bg-red-500/10 backdrop-blur-sm border-b border-red-500/20 text-[11px] text-red-600 flex items-start gap-2 z-10 font-sans">
                <span className="p-1 rounded bg-red-100 shrink-0 text-red-500">
                  <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                </span>
                <div className="flex-1 text-[11px]">
                  <p className="font-extrabold text-red-700">⚠️ Error de Autenticación de Google Maps</p>
                  <p className="text-slate-600 text-[10px] mt-0.5 leading-relaxed">
                    La API Key no se pudo autenticar. Verifique que la <strong>Maps JavaScript API</strong> esté habilitada en su Google Cloud Console y que tenga una cuenta de facturación activa o configure una nueva API Key en la pestaña de Configuración. <strong className="text-indigo-600">El sistema activó automáticamente el visor de simulación para que pueda seguir agendando normalmente.</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50/95 backdrop-blur-sm border-b border-blue-100 text-[11px] text-blue-700 flex items-start gap-2 z-10">
                <span className="p-1 rounded bg-blue-100 shrink-0 text-blue-800">
                  <Navigation className="w-3.5 h-3.5 animate-pulse" />
                </span>
                <div className="flex-1">
                  <p className="font-bold">🗺️ Visor de Ubicación Interactivo (Modo Simulación)</p>
                  <p className="text-slate-600 text-[10px] mt-0.5">
                    Haga clic en cualquier punto de la cuadrícula para marcar las coordenadas de su visita técnica.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setShowKeyInstructions(!showKeyInstructions); }}
                  className="text-blue-500 hover:text-blue-800 font-bold p-1 underline cursor-pointer text-[10px] uppercase shrink-0"
                >
                  Configurar Mapa Real
                </button>
              </div>
            )}

            {/* Central Santo Domingo coordinates box info */}
            {latitude && longitude ? (
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
                <div className="p-1 rounded-full bg-red-150 animate-ping absolute w-8 h-8" />
                <div className="p-2 bg-red-500 text-white rounded-xl shadow-lg border border-red-600 z-10 flex items-center gap-1 animate-bounce">
                  <MapPin className="w-4 h-4 fill-white text-red-500" />
                  <span className="text-[10px] font-mono font-bold">¡Pin Colocado!</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
                <MapPin className="w-8 h-8 text-slate-300 stroke-1 mb-2 animate-bounce" />
                <span className="text-xs font-semibold">Haga clic en el mapa para marcar el punto exacto</span>
              </div>
            )}

            {/* Configuration Overlay instructions */}
            {showKeyInstructions && (
              <div className="absolute inset-0 bg-slate-900/90 z-20 p-4 text-white flex flex-col justify-center text-xs animate-fadeIn">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                  <span className="font-bold flex items-center gap-1.5 text-blue-300">
                    <Key className="w-4 h-4" /> Activar Google Maps Real
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowKeyInstructions(false); }}
                    className="text-white/60 hover:text-white text-sm font-bold p-1"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="space-y-2 leading-relaxed">
                  <p>Para cargar el visor satelital real de Google Maps y el autocompletado:</p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                    <li>Copie una API Key habilitada en Google Cloud Console.</li>
                    <li>Vaya a la pestaña <strong>Configuración (Roster/Escalafón)</strong> en la barra lateral superior.</li>
                    <li>Ingrese su clave en el campo <strong>Clave de API de Google Maps</strong> y haga clic en Guardar Clave.</li>
                  </ol>
                  <p className="text-[10px] text-slate-400 italic">El mapa real y el buscador de autocompletado se activarán inmediatamente sin recargar la página.</p>
                </div>
              </div>
            )}

            {/* Footer with Coordinates */}
            <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-mono font-bold z-10 shrink-0">
              <span className="flex items-center gap-1">
                <Navigation className="w-3 h-3 text-slate-400 rotate-45" />
                SANTO DOMINGO, RD (REF)
              </span>
              <span>
                {latitude && longitude ? `LAT: ${latitude} | LNG: ${longitude}` : 'COORD: NO SELECCIONADAS'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Coordinate Displays (Editable) */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <div className="space-y-1">
          <label className="font-mono text-[9px] text-slate-400 font-bold uppercase block tracking-wider">
            Latitud Exacta
          </label>
          <input
            type="text"
            value={latitude}
            onChange={(e) => onChangeCoords(e.target.value, longitude)}
            placeholder="Ej. 18.4861"
            className="w-full text-[11px] font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-600"
          />
        </div>
        <div className="space-y-1">
          <label className="font-mono text-[9px] text-slate-400 font-bold uppercase block tracking-wider">
            Longitud Exacta
          </label>
          <input
            type="text"
            value={longitude}
            onChange={(e) => onChangeCoords(latitude, e.target.value)}
            placeholder="Ej. -69.9312"
            className="w-full text-[11px] font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-600"
          />
        </div>
      </div>
    </div>
  );
}

interface AutocompleteBinderProps {
  inputEl: HTMLInputElement | null;
  onChangeAddress: (val: string) => void;
  onChangeCoords: (lat: string, lng: string) => void;
  setMapCenter: (val: { lat: number; lng: number }) => void;
  setMapZoom: (val: number) => void;
}

function AutocompleteBinder({
  inputEl,
  onChangeAddress,
  onChangeCoords,
  setMapCenter,
  setMapZoom,
}: AutocompleteBinderProps) {
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!placesLib || !inputEl) return;

    // Check if new PlaceAutocompleteElement is available (recommended over Autocomplete)
    if (placesLib.PlaceAutocompleteElement) {
      try {
        // Create new PlaceAutocompleteElement (cast options to any to bypass outdated TS definitions)
        const autocomplete = new (placesLib.PlaceAutocompleteElement as any)({
          inputElement: inputEl,
        });

        // Use standard DOM addEventListener for the web component
        const handlePlaceSelect = async (e: any) => {
          const place = e.place;
          if (!place) return;
          
          await place.fetchFields({
            fields: ['location', 'displayName', 'formattedAddress']
          });

          if (place.location) {
            const lat = place.location.lat();
            const lng = place.location.lng();
            const formattedAddress = place.formattedAddress || place.displayName || '';

            onChangeAddress(formattedAddress);
            onChangeCoords(lat.toFixed(6), lng.toFixed(6));
            setMapCenter({ lat, lng });
            setMapZoom(16);

            // Record a geocoding request usage
            incrementGoogleMapsUsage('geocoding_requests').catch((err) =>
              console.warn('Usage increment error:', err)
            );
          }
        };

        autocomplete.addEventListener('gmp-placeselect', handlePlaceSelect);

        return () => {
          if (autocomplete) {
            autocomplete.removeEventListener('gmp-placeselect', handlePlaceSelect);
          }
        };
      } catch (err) {
        console.warn('Failed to instantiate PlaceAutocompleteElement (falling back to legacy Autocomplete):', err);
      }
    }

    // Fallback to old Autocomplete instance if new element not found
    const autocomplete = new placesLib.Autocomplete(inputEl, {
      fields: ['geometry', 'formatted_address', 'name']
    });

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const formattedAddress = place.formatted_address || place.name || '';

        onChangeAddress(formattedAddress);
        onChangeCoords(lat.toFixed(6), lng.toFixed(6));
        setMapCenter({ lat, lng });
        setMapZoom(16);

        // Record a geocoding request usage
        incrementGoogleMapsUsage('geocoding_requests').catch((err) =>
          console.warn('Usage increment error:', err)
        );
      }
    });

    return () => {
      if (typeof google !== 'undefined' && google.maps && google.maps.event) {
        if (listener) {
          google.maps.event.removeListener(listener);
        }
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [placesLib, inputEl, onChangeAddress, onChangeCoords, setMapCenter, setMapZoom]);

  return (
    <style>{`
      .pac-container {
        z-index: 99999 !important;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        font-family: ui-sans-serif, system-ui, sans-serif !important;
        margin-top: 4px;
        background-color: #ffffff;
      }
      .pac-item {
        padding: 8px 12px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        color: #475569;
        border-top: 1px solid #f1f5f9;
      }
      .pac-item:hover {
        background-color: #f8fafc;
      }
      .pac-item-query {
        font-size: 12px;
        color: #1e293b;
        font-weight: 600;
      }
      .pac-matched {
        color: #3b82f6;
      }
    `}</style>
  );
}
