with open('src/components/operations/OperationsTab.tsx', 'r') as f:
    content = f.read()

main_return_idx = content.find('  return (\n    <div className="space-y-6" id="ops-module-root">')
if main_return_idx == -1:
    # try another match just in case
    main_return_idx = content.find('  return (\n      <div className="h-full w-full">')
    if main_return_idx == -1:
        # fallback to line 2019
        lines = content.split('\n')
        main_return_idx = content.find(lines[2018])

before_return = content[:main_return_idx]

with open('top_vars.txt', 'r') as f:
    top_vars = [line.strip().replace(',', '') for line in f.readlines()]

context_obj = "  const operationsContextValue = {\n    " + ",\n    ".join(top_vars) + "\n  };\n"

new_return = """
  return (
    <OperationsProvider value={operationsContextValue}>
      <div className="space-y-6" id="ops-module-root">
        <OperationsToast />
        <OperationsHeader />
        <OperationsFilterBar />

        {/* --- SUB-TAB CONTENT RENDERING --- */}
        {activeSubTab === 'dashboard' && <OperationsDashboardTab />}
        {activeSubTab === 'administracion' && <OperationsAdminTab />}
        {activeSubTab === 'ausencias' && <OperationsAusenciasTab />}
        {activeSubTab === 'externo' && <OperationsTareasTab />}
        {activeSubTab === 'calendario' && <OperationsCalendarioTab />}

        <OperationsModals />
      </div>
    </OperationsProvider>
  );
}
"""

new_content = before_return + context_obj + new_return

# Now insert the imports at the top
imports = """import { OperationsProvider } from './OperationsContext';
import { OperationsToast } from './ui/OperationsToast';
import { OperationsHeader } from './ui/OperationsHeader';
import { OperationsFilterBar } from './ui/OperationsFilterBar';
import { OperationsDashboardTab } from './ui/OperationsDashboardTab';
import { OperationsAdminTab } from './ui/OperationsAdminTab';
import { OperationsAusenciasTab } from './ui/OperationsAusenciasTab';
import { OperationsTareasTab } from './ui/OperationsTareasTab';
import { OperationsCalendarioTab } from './ui/OperationsCalendarioTab';
import { OperationsModals } from './ui/OperationsModals';
"""

# Insert after the first few lines of imports
lines = new_content.split('\n')
for i, l in enumerate(lines):
    if l.startswith("import") and "lucide-react" in l:
        lines.insert(i + 1, imports)
        break

with open('src/components/operations/OperationsTab.tsx', 'w') as f:
    f.write('\n'.join(lines))
    
print("Updated OperationsTab.tsx")
