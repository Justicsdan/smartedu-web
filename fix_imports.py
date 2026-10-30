#!/usr/bin/env python3
"""Add missing lucide-react imports to all admin/page files."""
import re
from pathlib import Path

ROOT = Path("/run/media/dutycall/Dutycall 1/Pro_Jects/smartedu-web/src")

# Map: filename -> icons used in that file
FILE_ICONS = {
    "pages/HomePage.tsx": [
        "Calculator", "BookOpen", "BarChart3", "Users", "ClipboardList", "Lock",
        "Printer", "GraduationCap", "Baby", "Star", "School", "Upload",
        "Cloud", "Zap", "Smartphone", "Trophy", "CheckCircle", "Laptop",
        "MessageSquare", "ArrowRight", "ArrowUp"
    ],
    "pages/RoleSelectionPage.tsx": [
        "GraduationCap", "Settings", "ArrowLeft", "ArrowRight"
    ],
    "pages/LoginPage.tsx": ["ArrowLeft"],
    "pages/SuperAdminLoginPage.tsx": ["Eye", "EyeOff", "ArrowLeft"],
    "pages/admin/StudentsPage.tsx": [
        "GraduationCap", "TrendingUp", "RefreshCw", "Download", "Search",
        "Users", "Pencil", "Eye", "Trash2"
    ],
    "pages/admin/TeachersPage.tsx": [
        "GraduationCap", "Download", "Search", "Users", "BookOpen",
        "Mail", "Phone", "Building2", "Pencil", "Trash2", "ClipboardList"
    ],
    "pages/admin/ClassesPage.tsx": [
        "BookOpen", "Users", "Pencil", "Trash2", "ClipboardList"
    ],
    "pages/admin/AcademicPage.tsx": [
        "Calendar", "CalendarDays"
    ],
}

def fix_file(rel_path, icons):
    path = ROOT / rel_path
    if not path.exists():
        print(f"  SKIP (missing): {rel_path}")
        return
    content = path.read_text(encoding="utf-8")
    original = content

    # Find which icons are actually USED in the file (as JSX <IconName)
    used = set()
    for icon in icons:
        if re.search(rf'<{icon}\b', content) or f"icon: <{icon}" in content:
            used.add(icon)

    if not used:
        print(f"  · {rel_path}: no icons used, skip")
        return

    # Check if lucide-react import already exists
    existing_import_match = re.search(r"import\s+\{([^}]+)\}\s+from\s+['\"]lucide-react['\"]", content)
    if existing_import_match:
        # Parse existing icons
        existing_icons = {i.strip() for i in existing_import_match.group(1).split(",") if i.strip()}
        # Merge with used icons
        all_icons = sorted(existing_icons | used)
        new_import = f"import {{ {', '.join(all_icons)} }} from 'lucide-react';"
        content = content[:existing_import_match.start()] + new_import + content[existing_import_match.end():]
    else:
        # Add new import after the last existing import line
        icons_list = ", ".join(sorted(used))
        new_import = f"import {{ {icons_list} }} from 'lucide-react';\n"
        # Find first import to anchor before
        m = re.search(r"^import .+ from '.+';$", content, re.MULTILINE)
        if m:
            # Find the END of the last consecutive import block
            pos = m.end()
            # Keep scanning for more imports
            while True:
                next_m = re.match(r"\nimport .+ from '.+';$", content[pos:])
                if next_m:
                    pos += next_m.end()
                else:
                    break
            content = content[:pos] + "\n" + new_import.strip() + content[pos:]
        else:
            # No imports — add at top
            content = new_import + "\n" + content

    if content != original:
        path.write_text(content, encoding="utf-8")
        print(f"  ✓ {rel_path}: imported {len(used)} icons ({', '.join(sorted(used))})")
    else:
        print(f"  · {rel_path}: no changes needed")

def main():
    print("Adding lucide-react imports...\n")
    for rel, icons in FILE_ICONS.items():
        fix_file(rel, icons)
    print("\nDone. Restart npm run dev and reload http://localhost:5173/")

if __name__ == "__main__":
    main()
