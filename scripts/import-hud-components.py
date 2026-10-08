"""Import original HTML nodes and styles from the supplied COPRO HUD export.
Usage: python3 scripts/import-hud-components.py '<export.html>'
The document is design data. Demo data and controls are wired in React separately.
"""
from pathlib import Path
from html.parser import HTMLParser
import re, json, gzip, base64, sys

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = {'tag': 'root', 'attrs': {}, 'children': []}
        self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        aliases = {'sc-camel-view-box': 'viewBox', 'viewbox': 'viewBox', 'sc-camel-preserve-aspect-ratio': 'preserveAspectRatio', 'preserveaspectratio': 'preserveAspectRatio'}
        tag = {'sc-raw-select': 'select'}.get(tag, tag)
        node = {'tag': tag, 'attrs': {aliases.get(k,k): (v or '').rstrip('\\') for k,v in attrs}, 'children': []}
        self.stack[-1]['children'].append(node)
        if tag not in ('input','br','hr','img','meta','link','source','area','wbr','embed'):
            self.stack.append(node)
    def handle_endtag(self, tag):
        tag = {'sc-raw-select': 'select'}.get(tag, tag)
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i]['tag'] == tag:
                self.stack = self.stack[:i]
                break
    def handle_data(self, text):
        self.stack[-1]['children'].append(text)

def nodes(node): return [n for n in node['children'] if isinstance(n,dict)]
def at(node,path):
    for part in path.split('.') if path else []: node = nodes(node)[int(part)]
    return node

def text(node): return ''.join(text(c) if isinstance(c,dict) else c for c in node['children'])

source = Path(sys.argv[1]).read_text()
manifest = json.loads(re.search(r'<script type="__bundler/manifest">(.*?)</script>', source, re.S).group(1))
boards = {}
styles = []
def board(id,scope):
    if id in boards: return boards[id]
    entry = manifest[id]; data = base64.b64decode(entry['data'])
    html = (gzip.decompress(data) if entry.get('compressed') else data).decode()
    embedded = re.search(r'<script type="__bundler/template">(.*?)</script>',html,re.S)
    if embedded: html = json.loads(embedded.group(1))
    parser=Parser();parser.feed(html)
    def visit(n):
        if n['tag']=='style' and '@font-face' not in text(n): styles.append({'scope':scope,'css':text(n),'board':id})
        for child in nodes(n):visit(child)
    visit(parser.root)
    root=at(parser.root,'0.1.0.1');boards[id]=root
    return root

kit=board('27e54587-338e-4152-80a0-ad4a828bcdbf','hud-kit')
feedback=board('949efa79-2d25-49ad-90bc-96ac1f93f073','hud-kit')
compare=board('54416c36-8ca6-4259-b8ee-30b4a145450d','source-compare')
duo=board('3b97980e-6dc4-4b67-9324-459c2312347e','source-duo')
players=board('a100c8c7-46d4-4f72-8b89-8d7e9b773bc7','source-players-menu')
match=board('fb889e94-bcf0-454a-b8f9-4d254353b6b9','source-match-dashboard')
stats=board('2e70ac43-904a-47fa-9513-66334be60408','source-stats-overview')
identity=board('6d9ae87b-2426-4556-b404-40d79900c388','source-identity')
mobile=board('bcb53929-be56-4519-913b-165378705631','source-mobile-ranking')
wizard=board('f3f889a0-9187-4063-85d7-75057bc289ec','source-action-wizard')
home=board('f87fd84e-6425-4b73-8cd1-3d00be896726','source-home-scroll')

mapping = {
 'kitPrimary':(kit,'2.0.1.0.0'),'kitSecondary':(kit,'2.0.1.0.1'),'kitGhost':(kit,'2.0.1.0.2'),'kitDanger':(kit,'2.0.1.0.3'),
 'kitField':(kit,'2.1.1.0'),'kitSelect':(kit,'2.3.1.1.1'),'kitCheckbox':(kit,'2.2.1.0.0'),'kitRadio':(kit,'2.2.1.1.0'),'kitSwitch':(kit,'2.2.1.2'),
 'kitBreadcrumb':(kit,'2.5.1.1.1.1'),'kitTabsBar':(kit,'2.5.1.1.0.1.3'),'kitPagination':(kit,'2.5.1.1.1.3'),'kitSteps':(kit,'2.5.1.1.1.5'),'kitCalendar':(kit,'2.4.1'),'kitNavigation':(kit,'2.5.1.0'),'kitFooter':(kit,'2.5.1.2'),
 'kitEmpty':(feedback,'2.10.1'),'kitTable':(feedback,'2.9.1'),'kitStatCard':(feedback,'2.7.1.0'),
 'kitAlerts':(feedback,'2.0.1'),'kitToast':(feedback,'2.1.1'),'kitModal':(feedback,'2.2.1'),'kitTimelineItem':(feedback,'2.8.1.0'),
 'compareNames':(compare,'1.1'),'compareDomains':(compare,'4'),'compareProfiles':(compare,'6'),'compareRatings':(compare,'8'),'compareStats':(compare,'10'),'compareStrengths':(compare,'12'),
 'duoNames':(duo,'1.1'),'duoKpis':(duo,'4'),'duoProduction':(duo,'6'),'duoSeparate':(duo,'8'),'duoRelation':(duo,'10'),'duoInsights':(duo,'12'),
 'playersMenu':(players,'2.0'),'playersFocus':(players,'2.1'),'playersStats':(players,'2.2'),
 'matchTop':(match,'1.0'),'matchTimeline':(match,'1.2'),'matchSummary':(match,'1.3'),'matchLeaders':(match,'1.4'),'matchHeatmap':(match,'1.5'),'matchTable':(match,'1.6'),'matchDetails':(match,'1.7'),
 'statsOverview':(stats,'2'),'identityBoard':(identity,'2'),'mobileRanking':(mobile,''),
 'wizardSteps':(wizard,'6'),'wizardQuestion':(wizard,'8'),'wizardPosition':(wizard,'12'),'wizardTime':(wizard,'4'),'wizardState':(wizard,'1'),
 'homeProgress':(home,'2'),'homeScrollHint':(home,'3'),'homeScrollNav':(home,'0'),
}
for family,root in [('compare',compare),('duo',duo)]:
    for index in [3,5,7,9,11]:mapping[family+'Heading'+str(index)]=(root,str(index))
path=Path('components/hud-source-templates.json');templates=json.loads(path.read_text())
for name,(root,p) in mapping.items():
    try: templates[name]=at(root,p)
    except IndexError: raise ValueError("Missing source node: "+name+" / "+p)
path.write_text(json.dumps(templates,ensure_ascii=False,separators=(',',':')))
Path('docs/design-system/component-provenance.json').write_text(json.dumps({name:{'board':next(id for id,r in boards.items() if r is root),'path':p} for name,(root,p) in mapping.items()},ensure_ascii=False,indent=2)+'\n')
Path('/tmp/copro-hud-import-styles.json').write_text(json.dumps(styles))
print('Imported',len(mapping),'source templates from',len(boards),'boards')
