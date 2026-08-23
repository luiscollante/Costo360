import json
import os
import re

transcript_path = r"C:\Users\wases\.gemini\antigravity-ide\brain\e299daaf-51fe-419a-a19c-c4041f90c71d\.system_generated\logs\transcript_full.jsonl"
files_to_restore = [
    r"C:\Costo360\web\src\index.css",
    r"C:\Costo360\web\src\pages\LandingPage.tsx",
    r"C:\Costo360\web\src\components\landing\Hero.tsx",
    r"C:\Costo360\web\src\components\landing\InteractiveDemo.tsx",
    r"C:\Costo360\web\src\components\landing\FeaturesBento.tsx",
    r"C:\Costo360\web\src\components\landing\MetricsSection.tsx",
    r"C:\Costo360\web\src\components\landing\QuoteModal.tsx",
    r"C:\Costo360\web\src\components\landing\Navbar.tsx"
]
files_to_restore = [f.lower() for f in files_to_restore]

restored = {}
print("Starting search...")

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
        except:
            continue
            
        if data.get('type') == 'TOOL_RESPONSE' and data.get('status') == 'DONE':
            output = data.get('content', '')
            if 'The following code has been modified to include a line number' in output:
                filepath_match = re.search(r'File Path: `file:///(.+?)`', output)
                if filepath_match:
                    filepath = filepath_match.group(1).replace('/', '\\').lower()
                    
                    if filepath in files_to_restore and filepath not in restored:
                        content_lines = []
                        for out_line in output.split('\n'):
                            match = re.match(r'^\d+:\s(.*)', out_line)
                            if match:
                                content_lines.append(match.group(1))
                            elif re.match(r'^\d+:$', out_line):
                                content_lines.append('')
                                
                        if content_lines:
                            restored[filepath] = '\n'.join(content_lines)
                            print(f"Found original content for {filepath}")

for fp, content in restored.items():
    actual_fp = next(f for f in files_to_restore if f.lower() == fp)
    print(f"Restoring {actual_fp}...")
    with open(actual_fp, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Done restoring files.")
