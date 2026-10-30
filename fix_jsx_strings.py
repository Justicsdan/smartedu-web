#!/usr/bin/env python3
"""Fix string literals that contain JSX (leftover from emoji script)."""
import re
from pathlib import Path

ROOT = Path("/run/media/dutycall/Dutycall 1/Pro_Jects/smartedu-web/src")

# Match: '<IconName className="..." /> optional-text'
JSX_IN_STRING = re.compile(
    r"'(<\w+\s+className=\"[^\"]+\"\s*/>)\s*([^']*)'"
)

def fix_string_with_jsx(content):
    """Convert '...<JSX />... text' string literals to JSX fragments."""
    def replacer(m):
        jsx_tag = m.group(1)
        text_after = m.group(2).strip()
        if text_after:
            return f'<>{jsx_tag} {text_after}</>'
        return jsx_tag
    return JSX_IN_STRING.sub(replacer, content)

# Also fix: 'icon: "<Icon />"' or 'text: "<Icon />"' (object values that are strings containing JSX)
def fix_object_jsx_values(content):
    """Fix object property values like icon: '<Icon />' (already fixed by Pattern D, but double-check)."""
    # icon: "<Icon className="..." />"  -> icon: <Icon className="..." />
    pattern = re.compile(r'(icon|text|node):\s*["\'](<\w+\s+className="[^"]+"\s*/>)["\']')
    def replacer(m):
        return f'{m.group(1)}: {m.group(2)}'
    return pattern.sub(replacer, content)

count = 0
for tsx_file in ROOT.rglob("*.tsx"):
    content = tsx_file.read_text(encoding="utf-8")
    fixed = fix_string_with_jsx(content)
    fixed = fix_object_jsx_values(fixed)
    if fixed != content:
        tsx_file.write_text(fixed, encoding="utf-8")
        count += 1
        print(f"  ✓ Fixed: {tsx_file.relative_to(ROOT)}")

print(f"\nDone. Fixed {count} file(s).")
print("\nNext: restart npm run dev and reload http://localhost:5173/")
