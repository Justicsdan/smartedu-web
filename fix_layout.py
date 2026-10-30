#!/usr/bin/env python3
"""Fix scattered icon layout in HomePage.tsx — replace array-of-fragments with proper inline JSX."""
from pathlib import Path

PATH = Path("/run/media/dutycall/Dutycall 1/Pro_Jects/smartedu-web/src/pages/HomePage.tsx")
content = PATH.read_text(encoding="utf-8")

# Fix the pills array — replace broken key={p} with proper structure
OLD = '''{[<><Zap className="w-4 h-4 inline-block" /> Fast</>, <><Lock className="w-4 h-4 inline-block" /> Secure</>, <><CheckCircle className="w-4 h-4 inline-block" /> Reliable</>, <><Laptop className="w-4 h-4 inline-block" /> Cross-Platform</>].map(p => (
                <span key={p} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-white/50">{p}</span>
              ))}'''

NEW = '''{[
                { key: 'fast', icon: <Zap className="w-3.5 h-3.5" />, label: 'Fast' },
                { key: 'secure', icon: <Lock className="w-3.5 h-3.5" />, label: 'Secure' },
                { key: 'reliable', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Reliable' },
                { key: 'cross', icon: <Laptop className="w-3.5 h-3.5" />, label: 'Cross-Platform' },
              ].map(p => (
                <span key={p.key} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-white/50 inline-flex items-center gap-1.5">
                  {p.icon}{p.label}
                </span>
              ))}'''

if OLD in content:
    content = content.replace(OLD, NEW)
    PATH.write_text(content, encoding="utf-8")
    print("✓ Fixed HomePage.tsx pills array")
else:
    print("✗ Pattern not found — let me search for variants...")
    # Search for any [<><... lines
    import re
    matches = re.findall(r'\{?\[<><\w+.*?\]\.map', content)
    for m in matches[:5]:
        print(f"  Found: {m[:100]}...")
