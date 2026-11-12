"""Generate the v6 pages so the header, menu, footer and theme switch are identical everywhere.
Run:  py -I tools/v5pages.py   (also: npm run pages)
"""
import io, json, os

CREDITS = json.load(io.open('public/video/credits.json', encoding='utf-8'))
MARK_SVG = io.open('public/marks/vimaksh-mark.svg', encoding='utf-8').read().strip().replace('\n', '')
MARK_SVG = MARK_SVG.replace('<svg width="580" height="580" ', '<svg aria-hidden="true" focusable="false" ', 1)
WM = 'Vımaksh'   # the wordmark: dotless i

# ---------------------------------------------------------------- shared pieces
def head(title, desc, page):
    return f'''<!DOCTYPE html>
<html lang="en" data-page="{page}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#F4F2EE">
<link rel="icon" href="/marks/vimaksh-mark.svg">
<link rel="preload" href="/fonts/inter-tight.woff2" as="font" type="font/woff2" crossorigin>
<script>
  // Set the theme before first paint: saved choice, else the system setting.
  (function () {{ try {{ var t = localStorage.getItem('vimaksh-theme'); if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = t; }} catch (e) {{ document.documentElement.dataset.theme = 'light'; }} }})();
</script>
<link rel="stylesheet" href="/src/v5/v5.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
'''

HEADER = f'''<header class="hdr">
  <a class="brandlink" href="/" aria-label="Vimaksh, home"><span aria-hidden="true">{WM}</span></a>
  <div class="hdr-r">
    <button class="toggle" type="button" aria-label="Switch to dark theme" data-toggle-theme>
      <span class="ghost g-sun" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"/></svg></span>
      <span class="ghost g-moon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg></span>
      <span class="knob" aria-hidden="true">
        <svg class="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"/></svg>
        <svg class="i-moon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>
      </span>
    </button>
  </div>
</header>
'''

def menu():
    return f'''<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <div class="menu-in">
    <div class="menu-cards">
      <a class="mcard" href="/work/paryatech/"><video muted loop playsinline preload="none" src="/video/mumbai.webm"></video><span class="mc-tag t-mono">&gt; Case study</span><span class="mc-name">Paryatech</span></a>
      <a class="mcard" href="/work/wingman/"><video muted loop playsinline preload="none" src="/video/blackhole.webm"></video><span class="mc-tag t-mono">&gt; Exploring</span><span class="mc-name">Wingman</span></a>
    </div>
    <nav class="menu-links" aria-label="Menu">
      <a href="/#work">Work</a>
      <a href="/services/">Services</a>
      <a class="sub" href="/services/#brand">Brand</a>
      <a class="sub" href="/services/#digital">Digital experiences</a>
      <a class="sub" href="/services/#product">Product</a>
      <a class="sub" href="/services/#research">Research</a>
      <a href="/about/">About us</a>
      <a href="/careers/">Careers</a>
      <a href="/contact/">Contact</a>
    </nav>
    <div class="menu-chips t-mono"><a href="https://vimaksh.in/join">Join</a><a href="https://vimaksh.in/thoughts">Thoughts</a><a href="https://vimaksh.in/events">Events</a><button type="button" data-copy="hq@vimaksh.in">hq@vimaksh.in</button></div>
  </div>
</div>
<div class="tip t-mono" aria-hidden="true">Copy</div>
'''

NAVBOX = '''<nav class="navbox" aria-label="Main" data-navbox>
    <a href="/#work"><span class="c" aria-hidden="true">&gt;</span><span class="t">Work</span><span class="c" aria-hidden="true">&lt;</span></a>
    <a href="/services/"><span class="c" aria-hidden="true">&gt;</span><span class="t">Services</span><span class="c" aria-hidden="true">&lt;</span></a>
    <a href="/about/"><span class="c" aria-hidden="true">&gt;</span><span class="t">About</span><span class="c" aria-hidden="true">&lt;</span></a>
    <a href="/contact/"><span class="c" aria-hidden="true">&gt;</span><span class="t">Let's talk</span><span class="c" aria-hidden="true">&lt;</span></a>
    <button class="menubox" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="menu" data-menu-btn><span class="t">Menu</span><span class="dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>
  </nav>'''

def footer():
    cred = ' · '.join(f'<a href="{c["page"]}">{c["title"].rsplit(".", 1)[0]}</a> ({c["license"]})' for c in CREDITS.values())
    return f'''<footer class="foot" id="footer" data-tone="dark">
  <canvas class="edge edge--top" data-edge="night" aria-hidden="true"></canvas>
  <div class="foot-glow heat" aria-hidden="true"><canvas class="edge edge--glow" data-edge="night" aria-hidden="true"></canvas></div>
  <div class="foot-in">
    <div class="foot-top">
      <div class="fmark" role="img" aria-label="Vimaksh mark">{MARK_SVG}</div>
      <p class="t-mono label"><span class="chev">&gt;</span> Let's talk</p>
      <h2 class="t-statement">Come build what<br>should exist.</h2>
      <div class="foot-cta">
        <button class="email" type="button" data-copy="hq@vimaksh.in"><span class="chev l" aria-hidden="true">&gt;</span>hq@vimaksh.in<span class="chev r" aria-hidden="true">&lt;</span></button>
        <a class="btn" href="/contact/"><span>Start a project</span><span class="chev" aria-hidden="true">&gt;</span></a>
      </div>
    </div>
    <div class="cols">
      <div><p class="t-mono k">Navigate</p><ul><li><a href="/#work">Work</a></li><li><a href="/services/">Services</a></li><li><a href="/about/">About us</a></li><li><a href="/careers/">Careers</a></li><li><a href="/contact/">Contact</a></li></ul></div>
      <div><p class="t-mono k">Elsewhere</p><ul><li><a href="https://vimaksh.in/join">Join</a></li><li><a href="https://vimaksh.in/thoughts">Thoughts / Notes</a></li><li><a href="https://vimaksh.in/events">Events</a></li></ul></div>
      <div><p class="t-mono k">Coordinates</p><p class="t-mono v">12.9716° N<br>77.5946° E</p></div>
      <div><p class="t-mono k">Bengaluru now</p><p class="t-mono v"><span data-clock>--:--:--</span> IST</p><a class="totop t-mono" href="#top">Back to top <span aria-hidden="true">↑</span></a></div>
    </div>
    <p class="giant" aria-hidden="true">{WM}</p>
    <div class="fine t-mono"><span>© <span data-year>2026</span> Vimaksh</span><span>Built from first principles</span><span>Boil the Ocean.</span></div>
    <p class="credits">Work-card footage from Wikimedia Commons: {cred}.</p>
  </div>
</footer>
'''

def tail():
    return '''<script type="module" src="/src/v5/main.js"></script>
</body>
</html>
'''

def page(name, title, desc, body):
    html = head(title, desc, name) + HEADER + NAVBOX + chr(10) + menu() + '<main id="main">\n' + body + '\n</main>\n' + footer() + tail()
    path = 'index.html' if name == 'home' else f'{name}/index.html'
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(html)
    print('wrote', path)

# ---------------------------------------------------------------- content
WORK = [
    dict(key='paryatech', name='Paryatech', status='Live', video='mumbai', logo='/marks/paryatech-wordmark.svg', href='/work/paryatech/',
         tags='Travel SaaS · India-first', desc='From first enquiry to booked trip—one workspace for modern Indian travel agencies.'),
    dict(key='wingman', name='Wingman', status='Exploring', video='blackhole', logo='/marks/wingman-mark.svg', href='/work/wingman/',
         tags='AI agents · Open system', desc='An open engineering system for reliable software with AI agents—in research / early development.'),
    dict(key='p3', name='Project 03', status='Placeholder', video='convection', desc='[PLACEHOLDER: project name and one-line description]', tags='[Placeholder]'),
    dict(key='p4', name='Project 04', status='Placeholder', video='waves', desc='[PLACEHOLDER: project name and one-line description]', tags='[Placeholder]'),
    dict(key='p5', name='Project 05', status='Placeholder', video='sst', desc='[PLACEHOLDER: project name and one-line description]', tags='[Placeholder]'),
    dict(key='p6', name='Project 06', status='Placeholder', video='clouds', desc='[PLACEHOLDER: project name and one-line description]', tags='[Placeholder]'),
]

def work_card(w, i):
    art = (f'<span class="logo"><span class="chip"><img src="{w["logo"]}" alt="" loading="lazy"></span></span>' if w.get('logo')
           else f'<span class="num t-mono" aria-hidden="true">{i + 1:02d}</span>')
    href = w.get('href', '/contact/')
    label = 'View project' if w.get('href') else 'Ask about this project'
    return f'''      <article class="card{' card--ph' if not w.get('logo') else ''}">
        <a class="media" href="{href}" tabindex="-1" aria-hidden="true">
          <video muted loop playsinline preload="metadata" src="/video/{w['video']}.webm"></video>
          <span class="veil"></span>{art}
          <span class="tag t-mono"><i class="dot{' live' if w['status'] == 'Live' else ''}"></i>{w['status']}</span>
        </a>
        <div class="meta"><h3>{w['name']}</h3><span class="t-mono kind">{w['tags']}</span></div>
        <p>{w['desc']}</p>
        <a class="bar t-mono" href="{href}">{label}<span class="sr"> — {w['name']}</span> <span class="chev" aria-hidden="true">&gt;</span></a>
      </article>'''

SERVICES = [
    dict(id='brand', n='01', name='Brand', g='heat', line='Identities with a point of view.',
         body='Naming, identity systems and the voice that carries them: built from what a company actually believes, then tested on the people it is for.',
         items=['Positioning', 'Identity systems', 'Voice & messaging', 'Brand guidelines']),
    dict(id='digital', n='02', name='Digital experiences', g='lines', line='Sites and interfaces that leave an impression.',
         body='Websites and product interfaces designed and built in-house, from the first sketch to the last line of code, with motion and 3D where it earns its place.',
         items=['Websites', 'Interface design', 'Motion & 3D', 'Front-end build']),
    dict(id='product', n='03', name='Product', g='pixels', line='Independent products, shipped and measured.',
         body='We take ideas to working software, put them in front of real users early, and keep what survives contact with the world.',
         items=['Product strategy', 'Prototyping', 'MVP build', 'Launch & iteration']),
    dict(id='research', n='04', name='Research', g='rings', line='Open questions, explored in public.',
         body='Experiments at the edge of what we know, from AI-assisted engineering to new ways of working, written up so others can build on them.',
         items=['Exploratory prototypes', 'Technical research', 'Field testing', 'Write-ups']),
]

def svc_row(s, compact=False):
    items = ''.join(f'<li>{x}</li>' for x in s['items'])
    if compact:
        return f'''      <a class="srow" href="/services/#{s['id']}">
        <span class="t-mono n">&gt; {s['n']}</span><span class="nm">{s['name']}</span><span class="ln">{s['line']}</span>
        <span class="thumb" aria-hidden="true"><img class="l" src="/services/{s['id']}-light.jpg" alt="" loading="lazy"><img class="d" src="/services/{s['id']}-dark.jpg" alt="" loading="lazy"></span><span class="go chev" aria-hidden="true">&gt;</span>
      </a>'''
    return f'''    <section class="svc" id="{s['id']}" aria-labelledby="{s['id']}-h">
      <div class="svc-text">
        <p class="t-mono label"><span class="chev">&gt;</span> {s['n']}</p>
        <h2 id="{s['id']}-h" class="t-section">{s['name']}</h2>
        <p class="t-lead">{s['line']}</p>
        <p class="body">{s['body']}</p>
        <ul class="deliv t-mono">{items}</ul>
      </div>
      <figure class="svc-art"><img class="l" src="/services/{s['id']}-light.jpg" alt="The Vimaksh mark in the {s['name']} colourway" loading="lazy"><img class="d" src="/services/{s['id']}-dark.jpg" alt="" loading="lazy"><figcaption class="t-mono cap">{s['n']} / {s['name']}</figcaption></figure>
    </section>'''

# ---------------------------------------------------------------- pages
home = f'''<section class="hero" id="top" aria-label="Vimaksh — Boil the Ocean.">
  <div class="hero-in">
    <canvas id="stage" aria-label="The Vimaksh six-arrow mark, built from moving pixels" role="img"></canvas>
    <img class="stage-fallback" src="/marks/vimaksh-mark.svg" alt="" aria-hidden="true">
    <div class="hero-grain" aria-hidden="true"></div>
    <div class="hero-copy">
      <p class="t-mono label"><span class="chev">&gt;</span> Boil the Ocean.</p>
      <h1>We build brands and digital experiences that don't just attract attention — they leave an impression.</h1>
      <div class="hero-cta"><a class="btn" href="#work"><span>Explore selected work</span><span class="chev" aria-hidden="true">&gt;</span></a><a class="btn btn--ghost" href="/contact/"><span>Start a project</span></a></div>
    </div>
    <p class="hero-meta t-mono"><span>Studio / Bengaluru</span><span>12.97° N 77.59° E</span><span data-clock>--:--:--</span></p>
  </div>
  <div class="hero-dim" aria-hidden="true"></div>
</section>

<section class="work rise" id="work" aria-labelledby="work-h">
  <canvas class="edge edge--top" data-edge="paper" aria-hidden="true"></canvas>
  <div class="sec-head">
    <p class="t-mono label"><span class="chev">&gt;</span> Selected work</p>
    <h2 id="work-h" class="t-section">Things we've built,<br>and are building.</h2>
    <a class="more t-mono" href="/contact/">Start yours <span class="chev" aria-hidden="true">&gt;</span></a>
  </div>
  <div class="grid3">
{chr(10).join(work_card(w, i) for i, w in enumerate(WORK))}
  </div>
</section>

<section class="statement" aria-labelledby="st-h">
  <h2 id="st-h" class="t-big">Ideas made real enough to test. Independent products and open questions, built from first principles and tested in the world.</h2>
  <div class="st-side">
    <p>Builders, researchers, and relentless question-askers. Different crafts, one shared map, and a stubborn appetite for the unexplored.</p>
    <a class="btn btn--ghost" href="/about/"><span>About us</span><span class="chev" aria-hidden="true">&gt;</span></a>
  </div>
</section>

<section class="svc-teaser" aria-labelledby="sv-h">
  <div class="sec-head">
    <p class="t-mono label"><span class="chev">&gt;</span> What we do</p>
    <h2 id="sv-h" class="t-section">Four ways in.</h2>
    <a class="more t-mono" href="/services/">All services <span class="chev" aria-hidden="true">&gt;</span></a>
  </div>
  <div class="srows">
{chr(10).join(svc_row(s, True) for s in SERVICES)}
  </div>
</section>'''

services = f'''<section class="page-hero">
  <p class="t-mono label"><span class="chev">&gt;</span> Services</p>
  <h1 class="t-hero">Brand, digital, product and research:<br>four crafts, one shared map.</h1>
  <p class="t-lead">Each one stands on its own. Most projects use two or three together, run by one small team from first question to launch.</p>
</section>
<div class="svcs">
{chr(10).join(svc_row(s) for s in SERVICES)}
</div>
<section class="band" aria-label="Start a project">
  <h2 class="t-section">Not sure which one you need?</h2>
  <a class="btn" href="/contact/"><span>Tell us the problem</span><span class="chev" aria-hidden="true">&gt;</span></a>
</section>'''

TEAM = [('[PLACEHOLDER: name]', 'Founder · [PLACEHOLDER: role]'), ('[PLACEHOLDER: name]', '[PLACEHOLDER: role]'),
        ('[PLACEHOLDER: name]', '[PLACEHOLDER: role]'), ('[PLACEHOLDER: name]', '[PLACEHOLDER: role]')]

TEAM_CREDITS = json.load(io.open('public/team/credits.json', encoding='utf-8'))
BRAND_CREDITS = json.load(io.open('public/brands/credits.json', encoding='utf-8'))
_n = [0]
BOT = {
    'gpt': dict(logo='/brands/chatgpt.svg', status='Typing', dots=True, line='Always mid-sentence'),
    'claude': dict(logo='/brands/claude.svg', status='02:00 · second coffee', dots=False, line='Writes the code'),
}
def person(name, role, kind='human'):
    if kind == 'human':
        _n[0] += 1
        fig = f'<img src="/team/{_n[0]}.jpg" alt="Dummy portrait (stock photo, not a Vimaksh team member)" loading="lazy" width="800" height="1000">'
        tag = 'Dummy portrait'
    else:
        b = BOT[kind]
        dots = '<i></i><i></i><i></i>' if b['dots'] else ''
        fig = f'<span class="bot-card bot-card--{kind}"><img class="bot-logo" src="{b["logo"]}" alt="{name} logo" width="160" height="160"><span class="bot-status t-mono"><span class="led"></span>{b["status"]}<span class="typing">{dots}</span></span></span>'
        tag = 'Honourable mention'
    return f'''      <figure class="person{' person--bot' if kind != 'human' else ''}">
        <div class="portrait">{fig}<span class="t-mono ph-tag">{tag}</span></div>
        <figcaption><b>{name}</b><span class="t-mono">{role}</span></figcaption>
      </figure>'''

about = f'''<section class="page-hero">
  <p class="t-mono label"><span class="chev">&gt;</span> About us</p>
  <h1 class="t-hero">Small party.<br>Large quests.</h1>
</section>
<div class="scenes">
  <figure class="scene scene--wide"><canvas class="px" data-px="skyline" role="img" aria-label="Pixel illustration: the Bengaluru skyline at dusk"></canvas><figcaption class="t-mono">Bengaluru, dusk <span>· Dummy image, studio photo to come</span></figcaption></figure>
  <figure class="scene"><canvas class="px" data-px="desk" role="img" aria-label="Pixel illustration: a studio desk with a laptop showing the mark's arrows, a red mug and a plant"></canvas><figcaption class="t-mono">The desk <span>· Dummy image</span></figcaption></figure>
</div>
<section class="split" aria-labelledby="mission-h">
  <p class="t-mono label" id="mission-h"><span class="chev">&gt;</span> Mission</p>
  <p class="t-big">Vimaksh builds independent products and chases open questions, built from first principles and tested in the world. We make brands and digital experiences that don't just attract attention — they leave an impression.</p>
</section>
<section class="nums" aria-label="Vimaksh in numbers">
  <div><p class="num">02</p><p class="t-mono">Independent products</p></div>
  <div class="num-px"><canvas class="px" data-px="field" aria-hidden="true"></canvas><p class="num">01</p><p class="t-mono">Live in market</p></div>
  <div><p class="num">04</p><p class="t-mono">Crafts under one roof</p></div>
  <div><p class="num num--sm">12.97° N</p><p class="t-mono">Bengaluru, India</p></div>
</section>
<section class="principles" aria-labelledby="pr-h">
  <div class="sec-head"><p class="t-mono label"><span class="chev">&gt;</span> How we think</p><h2 id="pr-h" class="t-section">Four principles.</h2></div>
  <div class="pgrid">
    <article><p class="t-mono n">&gt; 01</p><h3>First principles</h3><p>We start from what is true, not from what is usual, and rebuild the answer from there.</p></article>
    <article><p class="t-mono n">&gt; 02</p><h3>Real enough to test</h3><p>An idea is only as good as its first contact with real people. We get there early.</p></article>
    <article><p class="t-mono n">&gt; 03</p><h3>Small, exacting team</h3><p>Few people, high standards, one shared map. Everyone ships; nobody hands off.</p></article>
    <article><p class="t-mono n">&gt; 04</p><h3>Boil the ocean</h3><p>Some problems deserve the impossible version. We pick those on purpose.</p></article>
  </div>
</section>
<section class="team" aria-labelledby="team-h">
  <div class="sec-head"><p class="t-mono label"><span class="chev">&gt;</span> The party</p><h2 id="team-h" class="t-section">The people behind it.</h2></div>
  <div class="tgrid">
{chr(10).join(person(n, r) for n, r in TEAM)}
  </div>
  <div class="sec-head sec-head--mini"><p class="t-mono label"><span class="chev">&gt;</span> Honourable mentions</p><p class="t-mono soft">Not on payroll. Always online.</p></div>
  <div class="tgrid tgrid--bots">
{person('ChatGPT', 'Thinks out loud · always mid-sentence', 'gpt')}
{person('Claude', 'Writes the code · 2 a.m., second coffee', 'claude')}
  </div>
</section>
<p class="photo-credits">Dummy portraits from Wikimedia Commons, used as placeholders: {' · '.join(f'<a href="{c["page"]}">{c["author"] or c["title"]}</a> ({c["license"]})' for c in TEAM_CREDITS)}. ChatGPT and Claude marks are trademarks of OpenAI and Anthropic, shown here only as a nod; files: {' · '.join(f'<a href="{BRAND_CREDITS[k]["page"]}">{BRAND_CREDITS[k]["title"]}</a>' for k in ('chatgpt', 'claude'))}.</p>
<section class="band" aria-label="Join us">
  <h2 class="t-section">Want to join the party?</h2>
  <a class="btn" href="/careers/"><span>See careers</span><span class="chev" aria-hidden="true">&gt;</span></a>
</section>'''

ROLES = [('[PLACEHOLDER: role title]', 'Design', 'Bengaluru · Full-time'), ('[PLACEHOLDER: role title]', 'Engineering', 'Bengaluru / Remote · Full-time'),
         ('[PLACEHOLDER: role title]', 'Research', 'Bengaluru · Internship')]
careers = f'''<section class="page-hero page-hero--careers">
  <p class="t-mono label"><span class="chev">&gt;</span> Careers</p>
  <h1 class="t-hero">Where curiosity, craft<br>and code work together.</h1>
  <div class="hero-cta"><a class="btn" href="#roles"><span>See open roles</span><span class="chev" aria-hidden="true">&gt;</span></a><span class="t-mono soft">({len(ROLES)} placeholder roles)</span></div>
</section>
<section class="split" aria-labelledby="hw-h">
  <p class="t-mono label" id="hw-h"><span class="chev">&gt;</span> How we work</p>
  <p class="t-big">We are a small, exacting team. Join through a role, a shared experiment, or a clear reason to make something together.</p>
</section>
<section class="values" aria-label="What it's like">
  <article><p class="t-mono n">(01)</p><h3>One team, start to finish</h3><p>Strategy, design and engineering sit together. The people who imagine it are the people who build it.</p></article>
  <article><p class="t-mono n">(02)</p><h3>What guides us</h3><p>Curiosity, care and first principles. We push for clarity when things get complex.</p></article>
  <article><p class="t-mono n">(03)</p><h3>Based in Bengaluru</h3><p>Our home is Bengaluru. [PLACEHOLDER: confirm remote / hybrid policy.]</p></article>
  <article><p class="t-mono n">(04)</p><h3>Room to grow</h3><p>You learn on real products with real users, and take on more as you are ready for it.</p></article>
</section>
<section class="roles" id="roles" aria-labelledby="roles-h">
  <div class="sec-head"><p class="t-mono label"><span class="chev">&gt;</span> Open roles</p><h2 id="roles-h" class="t-section">Open positions</h2></div>
  <ul class="rlist">
{chr(10).join(f'    <li><a href="mailto:hq@vimaksh.in?subject=Application"><span class="rt">{t}</span><span class="t-mono">{d}</span><span class="t-mono">{l}</span><span class="t-mono go">Apply <span class="chev">&gt;</span></span></a></li>' for t, d, l in ROLES)}
  </ul>
  <p class="open">Don't see your role? Write to <button type="button" class="inline-copy" data-copy="hq@vimaksh.in">hq@vimaksh.in</button> with a clear reason to make something together.</p>
</section>
<section class="process" aria-labelledby="pc-h">
  <div class="sec-head"><p class="t-mono label"><span class="chev">&gt;</span> Process</p><h2 id="pc-h" class="t-section">How hiring works.</h2></div>
  <ol class="steps">
    <li><span class="t-mono">01</span><b>Write to us</b><p>A short note and something you've made.</p></li>
    <li><span class="t-mono">02</span><b>First conversation</b><p>Thirty minutes, both ways.</p></li>
    <li><span class="t-mono">03</span><b>A small shared task</b><p>Paid, real, and short.</p></li>
    <li><span class="t-mono">04</span><b>Decision</b><p>Within a week, either way.</p></li>
  </ol>
</section>'''

contact = '''<section class="contact-page" aria-labelledby="ct-h">
  <div class="ct-left">
    <p class="t-mono label"><span class="chev">&gt;</span> Contact</p>
    <h1 id="ct-h" class="t-hero">The best work begins with the right introduction.</h1>
  </div>
  <div class="ct-right">
    <div class="block">
      <div class="brief">
        <button class="row row--brief" type="button" aria-expanded="false" aria-controls="brief-panel" data-brief>
          <span>Start a project</span><span class="pill t-mono">Submit brief <span class="tri" aria-hidden="true">▸</span></span>
        </button>
        <div class="brief-panel" id="brief-panel"><div>
          <form class="brief-form" data-brief-form novalidate>
            <div class="f2"><label><span class="t-mono">Name</span><input name="name" required autocomplete="name"></label>
            <label><span class="t-mono">Email</span><input name="email" type="email" required autocomplete="email"></label></div>
            <label><span class="t-mono">Company <i>(optional)</i></span><input name="company" autocomplete="organization"></label>
            <fieldset><legend class="t-mono">What do you need?</legend>
              <div class="chips"><label><input type="checkbox" name="need" value="Brand"><span>Brand</span></label><label><input type="checkbox" name="need" value="Digital experience"><span>Digital experience</span></label><label><input type="checkbox" name="need" value="Product"><span>Product</span></label><label><input type="checkbox" name="need" value="Research"><span>Research</span></label><label><input type="checkbox" name="need" value="Not sure yet"><span>Not sure yet</span></label></div>
            </fieldset>
            <label><span class="t-mono">Tell us about it</span><textarea name="message" rows="4" required></textarea></label>
            <div class="f-foot"><button class="btn" type="submit"><span>Send brief</span><span class="chev" aria-hidden="true">&gt;</span></button><p class="t-mono note" data-brief-note>Opens your email app with the brief filled in.</p></div>
          </form>
        </div></div>
      </div>
      <div class="row"><span>General enquiries</span><button class="pill t-mono" type="button" data-copy="hq@vimaksh.in">hq@vimaksh.in</button></div>
      <div class="row"><span>New projects</span><button class="pill t-mono" type="button" data-copy="hq@vimaksh.in">hq@vimaksh.in</button></div>
    </div>
    <div class="block block--split">
      <div class="cell"><span>Studio</span><p>We're a small team building from Bengaluru, India.</p></div>
      <div class="cell"><p class="addr">Bengaluru,<br>Karnataka,<br><br>India</p><button class="pill t-mono" type="button" data-copy="12.9716° N, 77.5946° E">12.97° N 77.59° E</button></div>
    </div>
    <div class="block">
      <a class="row" href="/careers/"><span>Join us <sup class="t-mono">(placeholder roles)</sup></span><span class="pill t-mono">Careers <span class="tri" aria-hidden="true">▸</span></span></a>
      <div class="row"><span>Elsewhere</span><span class="pills"><a class="pill t-mono" href="https://vimaksh.in/join">Join</a><a class="pill t-mono" href="https://vimaksh.in/thoughts">Thoughts</a><a class="pill t-mono" href="https://vimaksh.in/events">Events</a></span></div>
    </div>
    <p class="t-mono soft local">Bengaluru now · <span data-clock>--:--:--</span> IST</p>
  </div>
</section>'''

page('home', 'Vimaksh — Boil the Ocean.', 'Vimaksh: independent products and open questions, built from first principles and tested in the world.', home)
page('services', 'Services — Vimaksh', 'Brand, digital experiences, product and research at Vimaksh.', services)
page('about', 'About — Vimaksh', 'Small party. Large quests. About Vimaksh.', about)
page('careers', 'Careers — Vimaksh', 'Careers at Vimaksh: where curiosity, craft and code work together.', careers)
page('contact', 'Contact — Vimaksh', 'Start a project with Vimaksh: hq@vimaksh.in, Bengaluru.', contact)
