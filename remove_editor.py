import re

with open(r"C:\Users\PC\antigravity\El-Rincón-de-Warren-2026-09-25-12862\src\components\PythonDataConsole.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Find the start and end markers
start_marker = "// Código en el editor interactivo"
end_marker = "// Sincronizar ticker inicial si cambia"

start_idx = content.find(start_marker)
if start_idx == -1:
    print("Start marker not found")
    exit(1)

end_idx = content.find(end_marker, start_idx)
if end_idx == -1:
    print("End marker not found")
    exit(1)

# Remove from start_marker to just before end_marker
new_content = content[:start_idx] + content[end_idx:]

with open(r"C:\Users\PC\antigravity\El-Rincón-de-Warren-2026-09-25-12862\src\components\PythonDataConsole.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Done - removed editor section")