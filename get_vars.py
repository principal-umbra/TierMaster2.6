import re

with open('src/components/operations/OperationsTab.tsx', 'r') as f:
    content = f.read()

# We only care about the code before the main return (
main_return_idx = content.find('  return (\n    <div className="space-y-6" id="ops-module-root">')
code = content[:main_return_idx]

# Find const [var, setVar]
states = re.findall(r'const\s+\[\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\]', code)
# Find const varName = 
funcs_and_vars = re.findall(r'const\s+([a-zA-Z0-9_]+)\s*=', code)
# Find let varName = 
lets = re.findall(r'let\s+([a-zA-Z0-9_]+)\s*=', code)

all_vars = set()
for s in states:
    all_vars.add(s[0])
    all_vars.add(s[1])
for f in funcs_and_vars:
    all_vars.add(f)
for l in lets:
    all_vars.add(l)

# also add props of OperationsTab
all_vars.update(['hideGestionOperativa', 'isSupervisor', 'loggedInAgent', 'currentAgentId'])

print(", ".join(sorted(list(all_vars))))
