with open('src/components/operations/ui/OperationsTareasTab.tsx', 'r') as f:
    lines = f.readlines()

# 1-733 is the code before the modals
# 1369 is the "Coming Soon Overlay", wait, is 1369 included?
# Let's keep 1-733 and 1369 onwards.
new_lines = lines[:733] + lines[1368:]

with open('src/components/operations/ui/OperationsTareasTab.tsx', 'w') as f:
    f.write("".join(new_lines))

print("Updated OperationsTareasTab.tsx")
