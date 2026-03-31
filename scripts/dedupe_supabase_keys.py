"""Replace duplicated Supabase URL/JWT literals with imports from client."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src"
JWT = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30."
    "7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo"
)
URL_STR = "https://wuuyjjpgzgeimiptuuws.supabase.co"
CLIENT_IMPORT = "from '@/integrations/supabase/client'"
IMPORT_LINE = "import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';\n"


def merge_import(content: str) -> str:
    def repl(m: re.Match) -> str:
        parts = [p.strip() for p in m.group(1).split(",") if p.strip()]
        s = set(parts)
        s.update(["SUPABASE_URL", "SUPABASE_ANON_KEY"])
        return "import { " + ", ".join(sorted(s)) + " } from '@/integrations/supabase/client'"

    return re.sub(
        r"import\s*\{([^}]*)\}\s*from\s*'@/integrations/supabase/client'",
        repl,
        content,
    )


def process_file(path: Path) -> bool:
    if path.as_posix().endswith("integrations/supabase/client.ts"):
        return False
    s = path.read_text(encoding="utf-8")
    if JWT not in s and URL_STR not in s:
        return False
    orig = s

    s = re.sub(
        r"\bSUPABASE_ANON_KEY_(?:AGGRESSIVE|FALLBACK|SAFETY|FORCE)\b",
        "SUPABASE_ANON_KEY",
        s,
    )

    s = re.sub(
        r"^\s*const\s+SUPABASE_URL\s*=\s*['\"`]https://wuuyjjpgzgeimiptuuws\.supabase\.co['\"`]?;?\s*\r?\n",
        "",
        s,
        flags=re.MULTILINE,
    )
    esc = re.escape(JWT)
    s = re.sub(
        rf"^\s*const\s+\w+\s*=\s*['\"`]{esc}['\"`]?;?\s*\r?\n",
        "",
        s,
        flags=re.MULTILINE,
    )
    s = re.sub(
        rf"^\s*let\s+\w+\s*=\s*['\"`]{esc}['\"`]?;?\s*\r?\n",
        "",
        s,
        flags=re.MULTILINE,
    )

    s = s.replace(f"'{JWT}'", "SUPABASE_ANON_KEY")
    s = s.replace(f'"{JWT}"', "SUPABASE_ANON_KEY")
    s = s.replace(f"`{JWT}`", "SUPABASE_ANON_KEY")
    s = s.replace(f"'{URL_STR}'", "SUPABASE_URL")
    s = s.replace(f'"{URL_STR}"', "SUPABASE_URL")

    if JWT in s:
        print("WARN: still has JWT:", path)

    needs = "SUPABASE_ANON_KEY" in s or "SUPABASE_URL" in s
    has_imp = "from '@/integrations/supabase/client'" in s
    if needs and not has_imp:
        s = IMPORT_LINE + s
    elif needs and has_imp:
        s = merge_import(s)

    if s != orig:
        path.write_text(s, encoding="utf-8")
        return True
    return False


def main() -> None:
    n = 0
    for path in ROOT.rglob("*"):
        if path.suffix not in (".ts", ".tsx"):
            continue
        if process_file(path):
            n += 1
    print(f"dedupe_supabase_keys: updated {n} files")


if __name__ == "__main__":
    main()
