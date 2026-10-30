#!/usr/bin/env python3
"""Replace emojis with Lucide React icons in smartedu-web src/."""
import re
from pathlib import Path

ROOT = Path("/run/media/dutycall/Dutycall 1/Pro_Jects/smartedu-web/src")

EMOJI_TO_LUCIDE = {
    '🧮': 'Calculator',
    '📚': 'BookOpen',
    '📊': 'BarChart3',
    '📈': 'TrendingUp',
    '👥': 'Users',
    '📝': 'ClipboardList',
    '🔐': 'Lock',
    '🖨️': 'Printer',
    '🎓': 'GraduationCap',
    '📖': 'BookOpen',
    '🧒': 'Baby',
    '⭐': 'Star',
    '🏫': 'School',
    '📤': 'Upload',
    '🔒': 'Lock',
    '☁️': 'Cloud',
    '⚡': 'Zap',
    '📱': 'Smartphone',
    '🏆': 'Trophy',
    '✅': 'CheckCircle',
    '💻': 'Laptop',
    '💬': 'MessageSquare',
    '↑': 'ArrowUp',
    '→': 'ArrowRight',
    '←': 'ArrowLeft',
    '🔑': 'KeyRound',
    '👁️': 'Eye',
    '👁️‍🗨️': 'EyeOff',
    '👨‍🏫': 'GraduationCap',
    '⚙️': 'Settings',
    '🔄': 'RefreshCw',
    '📥': 'Download',
    '🔍': 'Search',
    '✏️': 'Pencil',
    '🗑️': 'Trash2',
    '📅': 'Calendar',
    '📆': 'CalendarDays',
    '✉️': 'Mail',
    '📞': 'Phone',
    '🏢': 'Building2',
    '📋': 'ClipboardList',
}

FILES = [
    "pages/HomePage.tsx",
    "pages/RoleSelectionPage.tsx",
    "pages/LoginPage.tsx",
    "pages/SuperAdminLoginPage.tsx",
    "pages/admin/StudentsPage.tsx",
    "pages/admin/TeachersPage.tsx",
    "pages/admin/ClassesPage.tsx",
    "pages/admin/AcademicPage.tsx",
]

def process_file(rel_path):
    path = ROOT / rel_path
    if not path.exists():
        print(f"  SKIP (missing): {rel_path}")
        return set()
    content = path.read_text(encoding='utf-8')
    original = content
    used = set()

    # Sort emojis longest-first (handles ZWJ sequences before single chars)
    emojis = sorted(EMOJI_TO_LUCIDE.keys(), key=len, reverse=True)

    for emoji in emojis:
        name = EMOJI_TO_LUCIDE[emoji]
        esc = re.escape(emoji)

        # Pattern A: <span className="X">EMOJI</span>  -> <Icon className="X" />
        def repl_A(m):
            cls = m.group(1)
            used.add(name)
            # If className lacks a w-X/h-X, append default size
            if not re.search(r'\bw-\d', cls):
                cls = cls + " w-4 h-4"
            return f'<{name} className="{cls}" />'
        content = re.sub(rf'<span className="([^"]*)">{esc}</span>', repl_A, content)

        # Pattern B: <div className="X">EMOJI</div>  -> <Icon className="X" />
        def repl_B(m):
            cls = m.group(1)
            used.add(name)
            if not re.search(r'\bw-\d', cls):
                cls = cls + " w-6 h-6"
            return f'<{name} className="{cls}" />'
        content = re.sub(rf'<div className="([^"]*)">{esc}</div>', repl_B, content)

        # Pattern C: <span>EMOJI</span>  -> <Icon className="w-4 h-4 inline-block" />
        simple_span = f'<span>{emoji}</span>'
        if simple_span in content:
            content = content.replace(simple_span, f'<{name} className="w-4 h-4 inline-block" />')
            used.add(name)

        # Pattern D: 'EMOJI' in object literal (icon: '🧮') -> JSX element
        content = content.replace(f"icon: '{emoji}'", f"icon: <{name} className=\"w-6 h-6\" />")
        # generic object value
        content = re.sub(rf"'\{esc}'", f'<{name} className="w-5 h-5" />', content) if False else content

        # Pattern E: standalone emoji after > (e.g., text-2xl">EMOJI</div>) - already handled by B

        # Pattern F: emoji inside text content like <span>📈</span> Promote -> handled by C

    # Inline JSX fragments: handle remaining <span>EMOJI</span> leftovers
    for emoji in emojis:
        name = EMOJI_TO_LUCIDE[emoji]
        if emoji in content:
            # leftover emoji in arbitrary JSX text - replace with inline icon
            content = content.replace(emoji, f'<{name} className="w-4 h-4 inline-block" />')
            used.add(name)

    # Add Lucide import if icons were used
    if used and "from 'lucide-react'" not in content:
        icons_list = ", ".join(sorted(used))
        # Find first import statement
        m = re.search(r"^import .+ from '.+';", content, re.MULTILINE)
        if m:
            insert_pos = m.end()
            new_import = f"\nimport {{ {icons_list} }} from 'lucide-react';"
            content = content[:insert_pos] + new_import + content[insert_pos:]

    if content != original:
        path.write_text(content, encoding='utf-8')
        print(f"  ✓ {rel_path}: {len(used)} icons")
    else:
        print(f"  · {rel_path}: no changes")
    return used

def main():
    print("Replacing emojis with Lucide React icons...\n")
    total = set()
    for f in FILES:
        print(f"Processing {f}")
        used = process_file(f)
        total |= used
    print(f"\n✓ Done. Total unique icons: {len(total)}")
    print(f"  Icons used: {', '.join(sorted(total))}")
    print("\nNext steps:")
    print("  1. Verify: grep -rnP '[\\x{1F300}-\\x{1FAFF}\\x{2600}-\\x{27BF}]' src/ | head -20")
    print("  2. Test: npm run dev")
    print("  3. If lint errors about unused imports, run: npx eslint --fix src/")

if __name__ == "__main__":
    main()
