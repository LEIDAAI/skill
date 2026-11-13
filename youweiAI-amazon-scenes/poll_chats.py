# -*- coding: utf-8 -*-
"""轮询验收对话：打印每个chat的最新assistant长度/是否含完整HTML/是否done"""
import json, urllib.request, ssl, re, sys, os

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
TOK = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.owui_token'), encoding='utf-8').read().strip()

def get_chat(cid):
    req = urllib.request.Request(
        f"https://local.dianleida.net:21996/api/v1/chats/{cid}",
        headers={"Authorization": f"Bearer {TOK}"})
    return json.loads(urllib.request.urlopen(req, context=ctx, timeout=30).read())

def check(cid, label=''):
    d = get_chat(cid)
    hm = d['chat']['history']['messages']
    asst = [m for m in hm.values() if m.get('role') == 'assistant']
    if not asst:
        return dict(cid=cid, label=label, n=0, state='无回复')
    a = asst[-1]  # 同一会话追问纠偏后，以最新助手回复为准
    c = a.get('content') or ''
    mm = re.search(r'```html\s*(.*?)```', c, re.S)
    html = mm.group(1) if mm else ''
    return dict(
        cid=cid, label=label,
        n=len(c),
        done=bool(a.get('done')),
        has_html=bool(mm),
        html_len=len(html),
        html_closed='</html>' in html,
        tables=html.count('<table'),
        imgs=html.count('<img'),
        links=html.count('amazon.com/dp/'),
        hover='mousemove' in html,
        preview=(mm.group(1)[:60] if mm else c[:80]),
    )

if __name__ == '__main__':
    targets = [x.split('=', 1) for x in sys.argv[1:]]
    for t in targets:
        cid = t[0]; label = t[1] if len(t) > 1 else ''
        try:
            r = check(cid, label)
            print(json.dumps(r, ensure_ascii=False))
        except Exception as e:
            print(json.dumps(dict(cid=cid, label=label, error=str(e)[:120]), ensure_ascii=False))
