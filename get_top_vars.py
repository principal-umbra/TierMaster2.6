import re

with open('src/components/operations/OperationsTab.tsx', 'r') as f:
    content = f.read()

main_return_idx = content.find('  return (\n    <div className="space-y-6" id="ops-module-root">')
code = content[:main_return_idx]

top_vars = set(['hideGestionOperativa', 'isSupervisor', 'loggedInAgent', 'currentAgentId'])
for line in code.split('\n'):
    if line.startswith('  const [') or line.startswith('  let [') or line.startswith('  var ['):
        match = re.search(r'\[(.*?)\]', line)
        if match:
            parts = match.group(1).split(',')
            for p in parts:
                top_vars.add(p.strip())
    elif line.startswith('  const ') or line.startswith('  let ') or line.startswith('  var ') or line.startswith('  function '):
        match = re.search(r'^(?:  const|  let|  var|  function)\s+([a-zA-Z0-9_]+)', line)
        if match:
            top_vars.add(match.group(1))

# write them out
vars_list = sorted([v for v in top_vars if v])
with open('top_vars.txt', 'w') as f:
    f.write(',\n'.join(vars_list))

print(len(vars_list), "variables found.")
