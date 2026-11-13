"""Generate the pages so the header, menu, footer and theme switch are identical everywhere.
Run:  py -I tools/v5pages.py   (also: npm run pages)
"""
import io, json, os

CREDITS = json.load(io.open('public/video/credits.json', encoding='utf-8'))
MARK_SVG = io.open('public/marks/vimaksh-mark.svg', encoding='utf-8').read().strip().replace('\n', '')
MARK_SVG = MARK_SVG.replace('<svg width="580" height="580" ', '<svg aria-hidden="true" focusable="false" ', 1)
# The wordmark, inline so it takes the colour of its context (currentColor): ink in the header, white on the footer gradient.
WM_SVG = io.open('public/marks/vimaksh-wordmark.svg', encoding='utf-8').read().strip().replace(chr(10), '')
WM_SVG = WM_SVG.replace('<svg width="951" height="172" ', '<svg class="wm" aria-hidden="true" focusable="false" ', 1).replace('fill="#FF5F53"', 'fill="currentColor"')

# The studio. Coordinates are approximate for the address below: confirm before launch.
ADDRESS_LINES = ['3rd Floor, Eshaaya 1629', 'E End Main Rd, 4th T Block East', 'Jayanagar 9th Block, Tilak Nagar', 'Bengaluru, Karnataka 560041']
ADDRESS = ', '.join(ADDRESS_LINES)
LAT, LON = '12.9210° N', '77.5960° E'
LAT_S, LON_S = '12.92° N', '77.60° E'
MAPS = 'https://www.google.com/maps/search/?api=1&query=' + 'Eshaaya+1629+East+End+Main+Road+Jayanagar+9th+Block+Bengaluru+560041'

NEEDS = ['Chrome extension', 'Industry SaaS', 'AI automation', 'CRM / ERP', 'Internal tool', 'Not sure yet']

# ---------------------------------------------------------------- shared pieces
def head(title, desc, page):
    return f'''<!DOCTYPE html>
<html lang="en" data-page="{page}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
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
  <a class="brandlink" href="/" aria-label="Vimaksh, home">{WM_SVG}</a>
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
    return '''<div class="tip t-mono" aria-hidden="true">Copy</div>
'''

NAVBOX = '''<nav class="navbox" aria-label="Main" data-navbox>
    <a href="/#work"><span class="c" aria-hidden="true">&gt;</span><span class="t">Work</span><span class="c" aria-hidden="true">&lt;</span></a>
    <a href="/#services"><span class="c" aria-hidden="true">&gt;</span><span class="t">What we build</span><span class="c" aria-hidden="true">&lt;</span></a>
    <a href="/#about"><span class="c" aria-hidden="true">&gt;</span><span class="t">About</span><span class="c" aria-hidden="true">&lt;</span></a>
    <a href="#contact"><span class="c" aria-hidden="true">&gt;</span><span class="t">Let's talk</span><span class="c" aria-hidden="true">&lt;</span></a>
    <button class="menubox" type="button" aria-label="Show navigation" aria-expanded="false" data-menu-btn><span class="t">Menu</span><span class="dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>
  </nav>'''

def footer():
    addr = '<br>'.join(ADDRESS_LINES)
    return f'''<footer class="foot" id="footer" data-tone="dark">
  <canvas class="edge edge--top" data-edge="night" aria-hidden="true"></canvas>
  <div class="foot-in">
    <div class="foot-top">
      <div class="foot-say">
        <div class="fmark" role="img" aria-label="Vimaksh mark">{MARK_SVG}</div>
        <p class="t-mono label"><span class="chev">&gt;</span> Let's talk</p>
        <h2 class="t-statement">Come build what<br>should exist.</h2>
      </div>
      <form class="qform" id="contact" data-brief-form novalidate aria-label="Start a project">
        <p class="t-mono qk"><span class="chev">&gt;</span> Start a project</p>
        <div class="q2"><label><span class="sr">Name</span><input name="name" placeholder="Name" required autocomplete="name"></label><label><span class="sr">Email</span><input name="email" type="email" placeholder="Email" required autocomplete="email"></label></div>
        <fieldset><legend class="sr">What do you need?</legend><div class="chips">{''.join(f'<label><input type="checkbox" name="need" value="{n}"><span>{n}</span></label>' for n in NEEDS)}</div></fieldset>
        <label><span class="sr">Tell us about it</span><textarea name="message" rows="2" placeholder="Tell us about it" required></textarea></label>
        <div class="qfoot"><button class="btn" type="submit"><span>Send brief</span><span class="chev" aria-hidden="true">&gt;</span></button><button class="qmail t-mono" type="button" data-copy="hq@vimaksh.in">or hq@vimaksh.in</button></div>
        <p class="t-mono qnote" data-brief-note aria-live="polite"></p>
      </form>
    </div>
    <div class="cols">
      <div><p class="t-mono k">Navigate</p><ul><li><a href="/#work">Work</a></li><li><a href="/#services">What we build</a></li><li><a href="/#about">About us</a></li><li><a href="/careers/">Careers</a></li><li><a href="#contact">Contact</a></li></ul></div>
      <div class="col-addr"><p class="t-mono k">Studio</p><address><a href="{MAPS}" target="_blank" rel="noopener">{addr}</a></address></div>
      <div><p class="t-mono k">Coordinates</p><p class="t-mono v">{LAT}<br>{LON}</p></div>
      <div><p class="t-mono k">Bengaluru now</p><p class="t-mono v"><span data-clock>--:--:--</span> IST</p></div>
    </div>
  </div>
  <div class="foot-base heat" data-pixel-mask>
    <div class="giant" aria-hidden="true">{WM_SVG}</div>
    <div class="fine t-mono"><span>© <span data-year>2026</span> Vimaksh</span><span>Bengaluru, India</span></div>
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
    dict(name='Paryatech', logo='/marks/paryatech-wordmark.svg', url='https://paryatech.in', host='paryatech.in', video='mumbai', kind='Travel SaaS',
         line='The workspace behind every trip.',
         desc='Brings a travel agency’s enquiries, itineraries, bookings and finances together in one place.'),
    dict(name='Sachit', icon='/logos/sachit.svg', url='https://sachit.vimaksh.in/', host='sachit.vimaksh.in', video='blackhole', kind='Support desk',
         line='A home for every “help!”',
         desc='Turns emails and in-app requests into support tickets your team can organise, track and resolve.'),
    dict(name='Sarak Ecosystem', logo='/logos/sarak.png', url='https://sarakabhiyan.org/', host='sarakabhiyan.org', video='convection', kind='Community platform',
         line='Technology that keeps a community connected.',
         desc='A digital ecosystem supporting Sarak’s pathshalas, volunteers, events and community initiatives.'),
    dict(name='HQly', logo='/logos/hqly.png', url='https://hqly.vimaksh.in/', host='hqly.vimaksh.in', video='waves', kind='Company workspace',
         line='Your company’s everyday HQ.',
         desc='Brings people, office resources, finances and approvals into one shared workspace.'),
    dict(name='Vaat', icon='/logos/vaat.svg', url='https://vaat.vimaksh.in/', host='vaat.vimaksh.in', video='sst', kind='Team discussions',
         line='The conversation behind the work.',
         desc='A space for your team to exchange ideas, ask questions and figure things out together.'),
    dict(name='Godspeed', url='https://godspeed.wtf', host='godspeed.wtf', video='clouds', kind='Project management',
         line='Keep everyone on the bigger picture.',
         desc='Plan projects, work through tasks and keep everyone connected to the bigger picture.'),
]

def work_card(w, i):
    n = f'{i + 1:02d}'
    if w.get('logo'):
        chip = f'<span class="plogo"><img src="{w["logo"]}" alt="{w["name"]}" loading="lazy"></span>'
    elif w.get('icon'):
        chip = f'<span class="plogo plogo--icon"><img src="{w["icon"]}" alt="" loading="lazy"><b>{w["name"]}</b></span>'
    else:
        chip = f'<span class="plogo plogo--text"><b>{w["name"]}</b></span>'
    return f'''      <article class="card">
        <a class="media" href="{w['url']}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
          <video muted loop playsinline preload="metadata" src="/video/{w['video']}.webm"></video>
          <span class="veil"></span><span class="num t-mono" aria-hidden="true">{n}</span>
          {chip}
        </a>
        <div class="meta"><h3>{w['name']}</h3><span class="t-mono kind">{w['kind']}</span></div>
        <p class="line">{w['line']}</p>
        <p>{w['desc']}</p>
        <a class="bar t-mono" href="{w['url']}" target="_blank" rel="noopener"><span class="bt">Visit {w['host']}</span><span class="sr"> (opens in a new tab)</span><span class="trail" aria-hidden="true"><i>&gt;</i><i>&gt;</i><i>&gt;</i></span></a>
      </article>'''

# What we build: custom software only. Each type gets its own pixel graphic and colour (src/v5/pixelart.js → saas).
BUILD = [
    dict(k='extension', name='Chrome extensions', c='#2D36FF', desc='Tools that live in the browser, right where your team already works.'),
    dict(k='saas', name='Industry SaaS', c='#E42114', desc='Platforms shaped around one industry’s real workflows, not a generic template.'),
    dict(k='ai', name='AI automation', c='#7A3CD6', desc='Agents and pipelines that read, sort, draft and decide, so people don’t have to.'),
    dict(k='crm', name='CRM', c='#0E8F6E', desc='Leads, conversations and follow-ups in one place, built around how you sell.'),
    dict(k='erp', name='ERP', c='#E8730C', desc='Inventory, orders, finance and people, connected end to end.'),
    dict(k='dashboard', name='Internal tools', c='#0A8FB0', desc='Admin panels and dashboards that turn scattered data into clear decisions.'),
    dict(k='integrations', name='Integrations & APIs', c='#C99400', desc='The glue between your systems: syncs, webhooks and APIs that just work.'),
    dict(k='mobile', name='Mobile & field apps', c='#D23C7E', desc='Apps for the people on the move, online or off.'),
]

def build_card(b, i):
    return f'''      <li class="bcard" style="--c:{b['c']}">
        <div class="btile"><canvas class="px" data-px="saas" data-kind="{b['k']}" data-c="{b['c']}" aria-hidden="true"></canvas><span class="t-mono bn">{i + 1:02d}</span></div>
        <h3>{b['name']}</h3>
        <p>{b['desc']}</p>
      </li>'''

STEPS = ['Question', 'Map', 'Prototype', 'Build', 'Test', 'Ship']

# ---------------------------------------------------------------- pages
home = f'''<section class="hero" id="top" aria-label="Vimaksh — Boil the Ocean.">
  <div class="hero-in">
    <canvas id="stage" aria-label="The Vimaksh six-arrow mark, built from moving pixels" role="img"></canvas>
    <img class="stage-fallback" src="/marks/vimaksh-mark.svg" alt="" aria-hidden="true">
    <div class="hero-grain" aria-hidden="true"></div>
    <div class="hero-copy">
      <p class="t-mono label"><span class="chev">&gt;</span> Boil the Ocean.</p>
      <h1>We turn <span class="hl"><i aria-hidden="true">&lt;</i>what if?<i aria-hidden="true">&gt;</i></span> into products, platforms and experiments you can actually use.</h1>
      <div class="hero-cta"><a class="btn" href="#work"><span>Explore our work</span><span class="chev" aria-hidden="true">&gt;</span></a><a class="btn btn--ghost" href="#contact"><span>Start a project</span></a></div>
    </div>
    <p class="hero-meta t-mono"><span>Studio / Bengaluru</span><span>{LAT_S} {LON_S}</span><span data-clock>--:--:--</span></p>
  </div>
  <div class="hero-dim" aria-hidden="true"></div>
</section>

<section class="work rise" id="work" aria-labelledby="work-h">
  <canvas class="edge edge--top" data-edge="paper" aria-hidden="true"></canvas>
  <div class="sec-head">
    <p class="t-mono label"><span class="chev">&gt;</span> Selected work</p>
    <h2 id="work-h" class="t-section">Things we've built,<br>and are building.</h2>
    <a class="more t-mono" href="#contact">Start yours <span class="chev" aria-hidden="true">&gt;</span></a>
  </div>
  <div class="grid3">
{chr(10).join(work_card(w, i) for i, w in enumerate(WORK))}
  </div>
</section>

<section class="about-home" id="about" aria-labelledby="about-h">
  <div class="ab-text">
    <p class="t-mono label"><span class="chev">&gt;</span> About us</p>
    <h2 id="about-h" class="t-big">Vimaksh builds digital products with a distinct perspective and a practical approach. The company brings clarity to product decisions, care to design and depth to engineering, shaping each experience around the people who use it.</h2>
  </div>
  <figure class="ab-art"><canvas class="px" data-px="desk" role="img" aria-label="Pixel illustration: a studio desk with a laptop showing the mark's arrows, a red mug and a plant"></canvas></figure>
</section>

<section class="build" id="services" aria-labelledby="build-h">
  <div class="build-head">
    <p class="t-mono label"><span class="chev">&gt;</span> What we build</p>
    <div class="build-copy">
      <h2 id="build-h" class="t-big">Custom software, and nothing else. From a Chrome extension to an industry-specific SaaS, AI automation, CRM or ERP: if your business runs on it, we build it.</h2>
      <p class="soft">No templates, no website builders, no logos. One team takes it from the first question to working software in your hands.</p>
    </div>
  </div>
  <ul class="track" data-track aria-label="Types of software we build">
{chr(10).join(build_card(b, i) for i, b in enumerate(BUILD))}
  </ul>
  <div class="track-foot">
    <span class="track-bar" aria-hidden="true"><i data-track-bar></i></span>
    <div class="track-btns"><button type="button" class="tbtn" data-track-prev aria-label="Previous"><span aria-hidden="true">←</span></button><button type="button" class="tbtn" data-track-next aria-label="Next"><span aria-hidden="true">→</span></button></div>
  </div>
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
  <article><p class="t-mono n">(03)</p><h3>Based in Bengaluru</h3><p>Our home is Jayanagar, Bengaluru. [PLACEHOLDER: confirm remote / hybrid policy.]</p></article>
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

contact = f'''<section class="contact-page" aria-labelledby="ct-h">
  <div class="ct-left">
    <p class="t-mono label"><span class="chev">&gt;</span> Contact</p>
    <h1 id="ct-h" class="t-hero">The best work begins with the right introduction.</h1>
  </div>
  <div class="ct-right">
    <div class="block">
      <a class="row row--brief" href="#contact"><span>Start a project</span><span class="pill t-mono">Write a brief <span class="tri" aria-hidden="true">▾</span></span></a>
      <div class="row"><span>General enquiries</span><button class="pill t-mono" type="button" data-copy="hq@vimaksh.in">hq@vimaksh.in</button></div>
      <div class="row"><span>New projects</span><button class="pill t-mono" type="button" data-copy="hq@vimaksh.in">hq@vimaksh.in</button></div>
    </div>
    <div class="block block--split">
      <div class="cell"><span>Studio</span><address class="addr"><a href="{MAPS}" target="_blank" rel="noopener">{'<br>'.join(ADDRESS_LINES)}</a></address></div>
      <div class="cell"><span class="t-mono soft">Coordinates</span><button class="pill t-mono" type="button" data-copy="{LAT}, {LON}">{LAT_S} {LON_S}</button><span class="t-mono soft">Bengaluru now · <span data-clock>--:--:--</span> IST</span></div>
    </div>
    <div class="block">
      <a class="row" href="/careers/"><span>Join us</span><span class="pill t-mono">Careers <span class="tri" aria-hidden="true">▸</span></span></a>
    </div>
  </div>
</section>'''

page('home', 'Vimaksh — Boil the Ocean.', 'Vimaksh builds custom software: Chrome extensions, industry SaaS, AI automation, CRM and ERP. We turn “what if?” into products you can actually use.', home)
page('careers', 'Careers — Vimaksh', 'Careers at Vimaksh: where curiosity, craft and code work together.', careers)
page('contact', 'Contact — Vimaksh', f'Start a project with Vimaksh: hq@vimaksh.in, {ADDRESS}.', contact)
