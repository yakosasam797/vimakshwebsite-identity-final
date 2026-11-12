"""Fetch the ChatGPT / Claude marks and candidate team portraits from Wikimedia Commons, with licence info.
py -I tools/get_assets.py logos      -> public/brands/*.svg + credits
py -I tools/get_assets.py search     -> previews/cand/*.jpg (candidates to pick from) + cand.json
py -I tools/get_assets.py pick a,b,c,d -> public/team/1..4.jpg + team credits
"""
import io, json, os, re, sys, time, urllib.parse, urllib.request
UA = {'User-Agent': 'vimaksh-site-build/1.0 (local build script)'}
def get(url, raw=False):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                b = r.read(); return b if raw else json.loads(b)
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(8 * (i + 1)); continue
            raise
    raise RuntimeError('rate limited')
def api(**p): return get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'format': 'json', **p}))
def info(titles, width=None):
    p = dict(action='query', titles='|'.join(titles), prop='imageinfo', iiprop='url|size|extmetadata', iiextmetadatafilter='LicenseShortName|Artist|ImageDescription')
    if width: p['iiurlwidth'] = width
    return list(api(**p)['query']['pages'].values())
def meta(pg):
    ii = pg['imageinfo'][0]; m = ii.get('extmetadata', {})
    clean = lambda k: re.sub('<[^>]+>', '', m.get(k, {}).get('value', '')).strip()
    return {'title': pg['title'][5:], 'page': ii.get('descriptionurl'), 'license': clean('LicenseShortName'), 'author': clean('Artist')[:80]}

cmd = sys.argv[1]
if cmd == 'logos':
    os.makedirs('public/brands', exist_ok=True); credits = {}
    for key, t in [('chatgpt', 'File:ChatGPT logo.svg'), ('openai', 'File:OpenAI logo 2025 (symbol).svg'), ('claude', 'File:Claude AI symbol.svg')]:
        pg = info([t])[0]; open(f'public/brands/{key}.svg', 'wb').write(get(pg['imageinfo'][0]['url'], raw=True))
        credits[key] = meta(pg); print(key, credits[key]['license']); time.sleep(3)
    json.dump(credits, open('public/brands/credits.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
elif cmd == 'search':
    os.makedirs('previews/cand', exist_ok=True); out = []
    qs = sys.argv[2].split('|') if len(sys.argv) > 2 else ['portrait woman smiling studio', 'portrait man smiling headshot', 'portrait young woman professional', 'portrait of a man in office', 'portrait designer', 'portrait engineer']
    for q in qs:
        r = api(action='query', list='search', srnamespace=6, srlimit=25, srsearch=f'{q} filetype:bitmap'); time.sleep(2)
        titles = [h['title'] for h in r['query']['search']]
        for pg in info(titles, width=480):
            ii = pg.get('imageinfo', [{}])[0]; lic = ii.get('extmetadata', {}).get('LicenseShortName', {}).get('value', '')
            if not ii or ii.get('width', 0) < 1200 or ii['height'] < ii['width'] * .9: continue        # big, portrait orientation
            if not re.search(r'CC0|Public domain|CC BY(-SA)? [34]', lic): continue
            out.append({**meta(pg), 'thumb': ii['thumburl'], 'w': ii['width'], 'h': ii['height']})
        time.sleep(2)
    seen = set(); out = [o for o in out if not (o['title'] in seen or seen.add(o['title']))][:40]
    for i, o in enumerate(out):
        open(f'previews/cand/{"m" if len(sys.argv) > 2 else ""}{i:02d}.jpg', 'wb').write(get(o['thumb'], raw=True)); time.sleep(.6)
    json.dump(out, open('previews/cand/' + ('cand2.json' if len(sys.argv) > 2 else 'cand.json'), 'w', encoding='utf-8'), indent=2, ensure_ascii=False); print(len(out), 'candidates')
elif cmd == 'pick':
    from PIL import Image
    cand = json.load(open('previews/cand/cand.json', encoding='utf-8')); os.makedirs('public/team', exist_ok=True); credits = []
    for n, i in enumerate(int(x) for x in sys.argv[2].split(',')):
        c = cand[i]; pg = info(['File:' + c['title']], width=1000)[0]
        open('previews/tmp.jpg', 'wb').write(get(pg['imageinfo'][0]['thumburl'], raw=True))
        im = Image.open('previews/tmp.jpg').convert('RGB'); w, h = im.size
        top = float(sys.argv[3].split(',')[n]) if len(sys.argv) > 3 else .0   # crop offset (0 = top)
        ch = int(w * 5 / 4)
        if ch > h: cw = int(h * 4 / 5); im = im.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, h))
        else: y = int((h - ch) * top); im = im.crop((0, y, w, y + ch))
        im.resize((800, 1000), Image.LANCZOS).save(f'public/team/{n + 1}.jpg', quality=86)
        credits.append(c); time.sleep(3)
    os.remove('previews/tmp.jpg')
    json.dump(credits, open('public/team/credits.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False); print('saved', len(credits))
