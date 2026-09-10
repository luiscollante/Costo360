"""Optional asset maintenance, not part of build: vendor public OFL fonts locally.
Run from landing/. No credentials or product services are involved.
"""
from pathlib import Path
import re
from urllib.request import Request, urlopen

URL = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..700&family=Plus+Jakarta+Sans:wght@400..800&display=swap'
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'

def download(url):
    with urlopen(Request(url, headers={'User-Agent': USER_AGENT}), timeout=30) as response:
        return response.read()

folder = Path('public/fonts')
folder.mkdir(parents=True, exist_ok=True)
css = download(URL).decode('utf-8')
blocks = []
for subset, block in re.findall(r'/\* (latin(?:-ext)?) \*/\s*(@font-face\s*\{[^}]+\})', css):
    family = re.search(r"font-family: '([^']+)'", block).group(1)
    source = re.search(r'url\(([^)]+)\)', block).group(1)
    if not source.startswith('https://fonts.gstatic.com/') or not source.endswith('.woff2'):
        raise ValueError('Expected public WOFF2 font from Google Fonts')
    name = family.lower().replace(' ', '-') + '-' + subset + '.woff2'
    (folder / name).write_bytes(download(source))
    blocks.append(f'/* {family}: {subset}; SIL Open Font License in public/fonts/. */\n' + block.replace(source, '/fonts/' + name))
assert len(blocks) == 4, 'Expected Latin and Latin Extended for both families'
Path('src/fonts.css').write_text('\n\n'.join(blocks) + '\n', encoding='utf-8')
for family in ['plusjakartasans', 'jetbrainsmono']:
    (folder / (family + '-OFL.txt')).write_bytes(download(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{family}/OFL.txt'))
print('Vendored four WOFF2 subsets and both original OFL licenses.')
