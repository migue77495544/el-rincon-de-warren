with open(r"C:\Users\PC\antigravity\El-Rincón-de-Warren-2026-09-25-12862\src\components\PythonDataConsole.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# We need to remove specific sections by line numbers (approximate)
# Let's find the line numbers for the sections to remove

# Find line numbers
start_handleExecuteCustomCode = None
end_handleExecuteCustomCode = None
start_handleCopyCode = None
end_handleCopyCode = None
start_loadCodePreset = None
end_loadCodePreset = None
start_editor_tab_button = None
end_editor_tab_button = None
start_pestana4 = None
end_pestana4 = None

for i, line in enumerate(lines):
    if "const handleExecuteCustomCode = async () => {" in line:
        start_handleExecuteCustomCode = i
    if start_handleExecuteCustomCode is not None and end_handleExecuteCustomCode is None:
        if line.strip() == "};":
            end_handleExecuteCustomCode = i
    if "const handleCopyCode = () => {" in line:
        start_handleCopyCode = i
    if start_handleCopyCode is not None and end_handleCopyCode is None:
        if line.strip() == "};":
            end_handleCopyCode = i
    if "const loadCodePreset = (preset:" in line:
        start_loadCodePreset = i
    if start_loadCodePreset is not None and end_loadCodePreset is None:
        if line.strip() == "};":
            end_loadCodePreset = i
    if "onClick={() => setActiveTab('editor')}" in line:
        start_editor_tab_button = i - 5  # Go back to find the button start
    if start_editor_tab_button is not None and end_editor_tab_button is None:
        if "Consola / Editor Python" in line:
            end_editor_tab_button = i + 1
    if "{/* PESTAÑA 4: CONSOLA / EDITOR INTERACTIVO PYTHON */}" in line:
        start_pestana4 = i
    if start_pestana4 is not None and end_pestana4 is None:
        if "{/* Consola de Terminal Histórica de Logs */}" in line:
            end_pestana4 = i - 1

print(f"handleExecuteCustomCode: {start_handleExecuteCustomCode} - {end_handleExecuteCustomCode}")
print(f"handleCopyCode: {start_handleCopyCode} - {end_handleCopyCode}")
print(f"loadCodePreset: {start_loadCodePreset} - {end_loadCodePreset}")
print(f"editor_tab_button: {start_editor_tab_button} - {end_editor_tab_button}")
print(f"pestana4: {start_pestana4} - {end_pestana4}")

# Remove sections in reverse order to maintain line numbers
sections = [
    (start_pestana4, end_pestana4),
    (start_editor_tab_button, end_editor_tab_button),
    (start_loadCodePreset, end_loadCodePreset),
    (start_handleCopyCode, end_handleCopyCode),
    (start_handleExecuteCustomCode, end_handleExecuteCustomCode),
]

for start, end in sections:
    if start is not None and end is not None and start < end:
        print(f"Removing lines {start+1} to {end+1}")
        del lines[start:end+1]
    else:
        print(f"Skipping section: start={start}, end={end}")

# Also remove the copiedCode state line
new_lines = []
for line in lines:
    if "const [copiedCode, setCopiedCode] = useState<boolean>(false);" in line:
        continue
    new_lines.append(line)

with open(r"C:\Users\PC\antigravity\El-Rincón-de-Warren-2026-09-25-12862\src\components\PythonDataConsole.tsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Done")