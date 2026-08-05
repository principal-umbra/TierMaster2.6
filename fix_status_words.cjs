const fs = require('fs');
let code = fs.readFileSync('src/components/leaderboard/LeaderboardAdminSettings.tsx', 'utf8');

const t = `<div className="flex flex-col gap-2">
                          <span className="text-sm font-bold text-slate-800">Palabras clave: En Progreso</span>
                          <span className="text-[11px] text-slate-500">Separadas por coma. Los tickets con estas palabras contarán como "En curso".</span>
                          <textarea 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-2 rounded-lg text-sm font-mono outline-none transition-colors resize-none h-20"
                            value={settings.statusInProgressWords?.join(', ')}
                            onChange={(e) => {
                              const words = e.target.value.split(',').map(w => w.trim()).filter(w => w);
                              setSettings(prev => ({...prev, statusInProgressWords: words}));
                            }}
                          />
                        </div>`;
const r = ``;

if (code.includes(t)) {
  code = code.replace(t, r);
  fs.writeFileSync('src/components/leaderboard/LeaderboardAdminSettings.tsx', code);
  console.log('Removed Palabras clave: En Progreso');
} else {
  console.log('Not found!');
}
