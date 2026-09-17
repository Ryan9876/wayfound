from pathlib import Path

ui_path = Path('web/src/app/projects/[projectId]/durable-interview.tsx')
ui = ui_path.read_text()
old = '          <Link href="/projects">Projects</Link>'
new = '''          <nav className="topbar-links" aria-label="Project navigation">
            <Link href={`/projects/${projectId}/records`}>Records</Link>
            <Link href="/projects">Projects</Link>
          </nav>'''
count = ui.count(old)
if count != 2:
    raise SystemExit(f'Expected 2 project header links, found {count}')
ui = ui.replace(old, new)
ui_path.write_text(ui)

css_path = Path('web/src/app/globals.css')
css = css_path.read_text()
marker = '.records-intro'
if marker not in css:
    css += '''\n.topbar-links { display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
.records-intro { display:grid; gap:7px; }
.records-intro h1 { margin:0; letter-spacing:-.025em; }
.records-intro p { margin:0; max-width:780px; line-height:1.55; }
.record-counts { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:16px 0; }
.record-count { display:grid; gap:3px; background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px; }
.record-count strong { font-size:1.65rem; letter-spacing:-.04em; }
.record-count span { color:var(--secondary); font-size:.86rem; }
.records-list { display:grid; gap:12px; }
.record-card { display:grid; gap:8px; }
.record-card h2,.record-card p { margin:0; }
.record-heading { display:flex; justify-content:space-between; gap:12px; align-items:center; }
.record-heading > div { display:flex; gap:8px; align-items:center; flex-wrap:wrap; min-width:0; }
.record-type { display:inline-flex; border-radius:999px; padding:4px 8px; font-size:.72rem; font-weight:800; background:var(--soft); color:var(--pine); }
.record-type.assumption { background:#F8F0DD; color:#74580F; }
.record-type.blocker { background:#FBECE8; color:#8A3A24; }
.record-type.open-question { background:#F0EFF7; color:#514C72; }
.record-statement { font-size:1.05rem; line-height:1.5; }
.record-evidence { margin-top:6px; border-top:1px solid var(--border); padding-top:10px; color:var(--secondary); font-size:.86rem; }
.record-evidence summary { cursor:pointer; color:var(--pine); font-weight:750; }
.record-evidence dl { display:grid; gap:7px; margin:10px 0 0; }
.record-evidence dl div { display:grid; grid-template-columns:120px minmax(0,1fr); gap:8px; }
.record-evidence dt { font-weight:750; color:var(--ink); }
.record-evidence dd { margin:0; min-width:0; }
.record-evidence code { display:inline-block; max-width:100%; overflow-wrap:anywhere; }
.record-evidence.derived { background:#FAFBFA; border:1px dashed var(--border); border-radius:9px; padding:10px; }
.records-empty { margin-top:16px; display:grid; gap:10px; justify-items:start; }
@media (max-width:760px){ .record-counts{grid-template-columns:repeat(2,minmax(0,1fr))}.record-heading{align-items:flex-start}.record-evidence dl div{grid-template-columns:1fr}.topbar-links{justify-content:flex-end} }
'''
css_path.write_text(css)
