"""Download small transcodes of six openly licensed Wikimedia Commons videos for the work cards, and record credits."""
import hashlib, json, os, re, time, urllib.parse, urllib.request

UA = {'User-Agent': 'vimaksh-site-build/1.0 (local build script)'}
FILES = {
    'mumbai':   'Timelapse at Marine Drive Mumbai.webm',
    'blackhole': None,  # resolved by search below (long title)
    'waves':    'Ocean surface waves 06.ogv',
    'clouds':   'Moving clouds timelapse 1152x694x10fps.ogv',
    'sst':      'Sea Surface Temperature (SST) - Near Real Time.webm',
    'convection': 'Convection1.ogv',
}
OUT = 'public/video'
os.makedirs(OUT, exist_ok=True)

def api(params):
    q = urllib.parse.urlencode({'format': 'json', **params})
    with urllib.request.urlopen(urllib.request.Request('https://commons.wikimedia.org/w/api.php?' + q, headers=UA), timeout=30) as r:
        return json.load(r)

if FILES['blackhole'] is None:
    d = api({'action': 'query', 'list': 'search', 'srnamespace': 6, 'srlimit': 5, 'srsearch': 'Black Hole with Accretion Disk Visualization SVS14619 filetype:video'})
    hits = [h['title'][5:] for h in d['query']['search']]
    FILES['blackhole'] = next((h for h in hits if '6-Black hole grid' in h), hits[0])

credits = {}
for key, name in FILES.items():
    time.sleep(3)
    info = api({'action': 'query', 'titles': 'File:' + name, 'prop': 'imageinfo|videoinfo', 'iiprop': 'url|extmetadata',
                'viprop': 'derivatives', 'iiextmetadatafilter': 'LicenseShortName|Artist'})
    page = next(iter(info['query']['pages'].values()))
    meta = page.get('imageinfo', [{}])[0].get('extmetadata', {})
    ders = page.get('videoinfo', [{}])[0].get('derivatives', [])
    webms = [x for x in ders if x.get('type', '').startswith('video/webm') and x.get('height')]
    webms.sort(key=lambda x: abs(int(x['height']) - 480))
    if not webms:
        print('no transcode for', name); continue
    src = webms[0]['src']
    dest = f'{OUT}/{key}.webm'
    if not os.path.exists(dest):
      time.sleep(6)
      with urllib.request.urlopen(urllib.request.Request(src, headers=UA), timeout=120) as r, open(dest, 'wb') as f:
          f.write(r.read())
    credits[key] = {
        'title': name, 'page': 'https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(name.replace(' ', '_')),
        'license': meta.get('LicenseShortName', {}).get('value', ''),
        'author': re.sub('<[^>]+>', '', meta.get('Artist', {}).get('value', '')).strip(),
    }
    print(key, webms[0]['height'], 'p', round(os.path.getsize(dest) / 1e6, 1), 'MB', credits[key]['license'])
json.dump(credits, open(f'{OUT}/credits.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
