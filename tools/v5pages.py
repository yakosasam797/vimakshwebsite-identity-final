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
MAPS = 'https://maps.app.goo.gl/ktwso9ycC2Ufo8Tt7'

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
    <a href="/contact/"><span class="c" aria-hidden="true">&gt;</span><span class="t">Let's talk</span><span class="c" aria-hidden="true">&lt;</span></a>
    <button class="menubox" type="button" aria-label="Show navigation" aria-expanded="false" data-menu-btn><span class="t">Menu</span><span class="dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>
  </nav>'''

def brief_form(rows=4):
    return f'''          <form class="brief-form" data-brief-form novalidate>
            <label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
            <div class="f2"><label><span class="t-mono">Name</span><input name="name" required autocomplete="name"></label>
            <label><span class="t-mono">Email</span><input name="email" type="email" required autocomplete="email"></label></div>
            <div class="f2"><label><span class="t-mono">Phone</span><input name="phone" type="tel" required autocomplete="tel" inputmode="tel" pattern="[0-9+()\-\s]{{7,}}" placeholder="+91"></label>
            <label><span class="t-mono">Company <i>(optional)</i></span><input name="company" autocomplete="organization"></label></div>
            <label><span class="t-mono">Tell us about it</span><textarea name="message" rows="{rows}" required></textarea></label>
            <div class="f-foot"><button class="btn" type="submit"><span>Send brief</span><span class="chev" aria-hidden="true">&gt;</span></button><p class="t-mono note" data-brief-note aria-live="polite"></p></div>
          </form>'''

def footer(name=""):
    addr = '<br>'.join(ADDRESS_LINES)
    foot_cta = '''<div class="foot-cta"><button class="email" type="button" data-copy="hq@vimaksh.in"><span class="chev l" aria-hidden="true">&gt;</span>hq@vimaksh.in<span class="chev r" aria-hidden="true">&lt;</span></button></div>'''
    foot_form = f'''<div class="block fbrief" id="brief">
        <div class="row row--brief"><span>Start a project</span><button class="pill t-mono" type="button" data-copy="hq@vimaksh.in">hq@vimaksh.in</button></div>
{brief_form(3)}
      </div>'''
    return f'''<footer class="foot" id="footer" data-tone="dark">
  <canvas class="edge edge--top" data-edge="night" aria-hidden="true"></canvas>
  <div class="foot-in">
    <div class="foot-top">
      <div class="foot-say">
        <div class="fmark" role="img" aria-label="Vimaksh mark">{MARK_SVG}</div>
        <div class="foot-copy">
        <p class="t-mono label"><span class="chev">&gt;</span> Let's talk</p>
        <h2 class="t-statement">Come build what<br>should exist.</h2>
        <p class="foot-sub">Tell us what you want to build. We read every brief and reply within two working days with honest next steps.</p>
        </div>
      </div>
      {foot_form if name != 'contact' else foot_cta}
    </div>
    <div class="cols">
      <div><p class="t-mono k">Navigate</p><ul><li><a href="/#work">Work</a></li><li><a href="/#services">What we build</a></li><li><a href="/#about">About us</a></li><li><a href="/contact/">Contact</a></li></ul></div>
      <div><p class="t-mono k">Legal</p><ul><li><a href="/terms/">Terms &amp; conditions</a></li><li><a href="/privacy/">Privacy policy</a></li><li><a href="/cookies/">Cookie policy</a></li></ul></div>
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
    html = head(title, desc, name) + HEADER + NAVBOX + chr(10) + menu() + '<main id="main">\n' + body + '\n</main>\n' + footer(name) + tail()
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
        <p>{w['desc']}</p>
        <a class="bar t-mono" href="{w['url']}" target="_blank" rel="noopener"><span class="bt">Visit {w['host']}</span><span class="sr"> (opens in a new tab)</span><span class="chev" aria-hidden="true">&gt;</span></a>
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
      <div class="hero-cta"><a class="btn" href="#work"><span>Explore our work</span><span class="chev" aria-hidden="true">&gt;</span></a><a class="btn btn--ghost" href="/contact/"><span>Start a project</span></a></div>
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
    <a class="more t-mono" href="/contact/">Start yours <span class="chev" aria-hidden="true">&gt;</span></a>
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
    </div>
  </div>
  <ul class="track" data-track aria-label="Types of software we build">
{chr(10).join(build_card(b, i) for i, b in enumerate(BUILD))}
  </ul>
  <div class="track-foot">
    <span class="track-bar" aria-hidden="true"><i data-track-bar></i></span>
    <div class="track-btns"><button type="button" class="tbtn" data-track-prev aria-label="Previous"><span class="chev" aria-hidden="true">&lt;</span></button><button type="button" class="tbtn" data-track-next aria-label="Next"><span class="chev" aria-hidden="true">&gt;</span></button></div>
  </div>
</section>'''

contact = f'''<section class="contact-page" aria-labelledby="ct-h">
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
{brief_form()}
        </div></div>
      </div>
      <div class="row"><span>General enquiries</span><button class="pill t-mono" type="button" data-copy="hq@vimaksh.in">hq@vimaksh.in</button></div>
      <div class="row"><span>New projects</span><button class="pill t-mono" type="button" data-copy="hq@vimaksh.in">hq@vimaksh.in</button></div>
    </div>
    <div class="block block--split">
      <div class="cell"><span>Studio</span><address class="addr"><a href="{MAPS}" target="_blank" rel="noopener">{'<br>'.join(ADDRESS_LINES)}</a></address></div>
      <div class="cell"><span class="t-mono soft">Coordinates</span><button class="pill t-mono" type="button" data-copy="{LAT}, {LON}">{LAT_S} {LON_S}</button><span class="t-mono soft">Bengaluru now · <span data-clock>--:--:--</span> IST</span></div>
    </div>
  </div>
</section>'''


# ---------------------------------------------------------------- legal pages (drafts: have them reviewed before launch)
LEGAL_UPDATED = '14 November 2026'
def legal_page(title, lead, sections):
    body = ''.join(f'<h2>{h}</h2>{t}' for h, t in sections)
    return f'''<article class="legal" aria-labelledby="lg-h">
  <p class="t-mono label"><span class="chev">&gt;</span> Legal</p>
  <h1 id="lg-h" class="t-hero">{title}</h1>
  <p class="t-mono upd">Last updated {LEGAL_UPDATED}</p>
  <p>{lead}</p>
  {body}
</article>'''

terms = legal_page('Terms &amp; conditions',
  'These terms cover your use of vimaksh.in. By using the site, you agree to them. Work we do for you is covered by a separate written agreement.', [
  ('Who we are', f'<p>Vimaksh is a software studio based at {ADDRESS}. You can reach us at <a href="mailto:hq@vimaksh.in">hq@vimaksh.in</a>.</p>'),
  ('Using this site', '<p>You may browse, read and share this site for personal and business use. Please do not copy it wholesale, try to break or overload it, or use it for anything unlawful.</p>'),
  ('Projects and briefs', '<p>Sending a brief does not create a contract or oblige either side to work together. Any project is governed by the proposal, statement of work or agreement we both sign, which takes priority over these terms.</p>'),
  ('Intellectual property', '<p>The Vimaksh name, wordmark, six-arrow mark, pixel graphics, text and code on this site belong to Vimaksh. Product names and logos shown in our work belong to their owners and appear with their permission.</p>'),
  ('Links to other sites', '<p>Our work section links to products and sites we built or support. Those sites have their own terms, and we are not responsible for their content.</p>'),
  ('No warranty', '<p>We keep this site accurate, but it is provided as it is. To the extent the law allows, we are not liable for losses arising from using it.</p>'),
  ('Governing law', '<p>These terms are governed by the laws of India. Courts in Bengaluru, Karnataka have jurisdiction over any dispute.</p>'),
  ('Changes', '<p>We may update these terms. The date at the top always shows the latest version.</p>'),
])

privacy = legal_page('Privacy policy',
  'This policy explains what personal data we collect through this site, why, and the choices you have. We handle it in line with India’s Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.', [
  ('What we collect', '<p>When you send a brief, you give us your name, email, phone number, company (optional) and your message. The form opens your own email app, so the brief reaches us as an email you send. Our site does not store it on a server.</p><p>Like any website, our hosting provider may log basic technical data such as your IP address and browser, to keep the site secure and working.</p>'),
  ('Why we use it', '<ul><li>To reply to your enquiry and discuss a possible project.</li><li>To keep records of our conversations and any work we agree.</li><li>To keep the site secure.</li></ul><p>We do not sell your data or use it for advertising.</p>'),
  ('Who we share it with', '<p>Only with services that help us run the studio, such as our email and hosting providers, and only as far as they need it. We may also share data where the law requires it.</p>'),
  ('How long we keep it', '<p>We keep enquiries for as long as needed to respond and for our business records, and delete them when no longer needed.</p>'),
  ('Your rights', '<p>You can ask to access, correct or delete your personal data, or withdraw your consent, by writing to <a href="mailto:hq@vimaksh.in">hq@vimaksh.in</a>. We will respond within a reasonable time.</p>'),
  ('Grievances', f'<p>For any concern about how we handle your data, contact our grievance officer at <a href="mailto:hq@vimaksh.in">hq@vimaksh.in</a> or write to us at {ADDRESS}.</p>'),
  ('Changes', '<p>We may update this policy. The date at the top always shows the latest version.</p>'),
])

cookies = legal_page('Cookie policy',
  'This site uses as little as possible on your device.', [
  ('What we store', '<p>We remember your light or dark theme choice in your browser’s local storage, so the site looks the way you left it. It stays on your device and is never sent to us.</p>'),
  ('What we do not use', '<p>We do not use advertising or tracking cookies, and we do not run third-party analytics that follow you across sites.</p>'),
  ('Hosting', '<p>Our hosting and security provider may set strictly necessary cookies to protect the site from abuse. These are needed for the site to work and do not track you.</p>'),
  ('Your choices', '<p>You can clear local storage and cookies at any time in your browser settings. The site will still work; it will just forget your theme.</p>'),
])

page('terms', 'Terms & conditions — Vimaksh', 'The terms for using vimaksh.in.', terms)
page('privacy', 'Privacy policy — Vimaksh', 'How Vimaksh collects and uses personal data through vimaksh.in.', privacy)
page('cookies', 'Cookie policy — Vimaksh', 'What vimaksh.in stores on your device.', cookies)

page('home', 'Vimaksh — Boil the Ocean.', 'Vimaksh builds custom software: Chrome extensions, industry SaaS, AI automation, CRM and ERP. We turn “what if?” into products you can actually use.', home)
page('contact', 'Contact — Vimaksh', f'Start a project with Vimaksh: hq@vimaksh.in, {ADDRESS}.', contact)
