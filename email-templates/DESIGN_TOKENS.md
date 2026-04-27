# Email design tokens (Ujenzixform)

Auth emails cannot rely on CSS variables or external stylesheets. Keep colors and typography aligned with the app by mirroring values from `src/index.css` (`:root` HSL tokens) into **inline** styles in `partials/` and `pages/`.

## Palette mapping (approximate hex for mail clients)

| App token (`:root`) | HSL (from source) | Email usage | Hex (inline) |
|---------------------|-------------------|-------------|--------------|
| `--background` | 45 15% 97% | Page background | `#F7F5F0` → emails use slightly deeper `#F4F1EA` for contrast on white cards |
| `--foreground` | 25 15% 15% | Headings | `#2B241E` |
| `--primary` | 0 75% 45% | Buttons, links, “U” mark | `#C41E1E` |
| `--muted-foreground` | 25 8% 45% | Secondary text | `#756A5E` |
| `--muted` | 45 25% 94% | Footer background | `#FAF8F5` |
| Card / border feel | — | Card border | `#E8E2D8` |

When the design system changes, update **partials first** (header/footer), then page bodies so all templates stay visually consistent.

## Typography

Use a safe system stack only (already inlined):

`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

For monospace hints (paths), use `Consolas, Monaco, monospace` at smaller sizes with a light pill background `#F5F2ED`.

## Layout

- Outer table `width="100%"`, inner card `max-width:600px` for desktop; mobile clients scale down.
- Primary CTA: table-wrapped button row for Outlook-friendly rendering.
