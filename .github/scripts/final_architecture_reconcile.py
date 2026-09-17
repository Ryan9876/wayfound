from pathlib import Path

path = Path('docs/ARCHITECTURE.md')
text = path.read_text()

replacements = {
    '**Status:** Approved local-first production baseline; M2 implementation in progress':
    '**Status:** Approved local-first production baseline; M2 validated',
    '| Local-first durable runtime still being implemented | Delivery gap | Validated prototype and durable local application are not yet fully unified | Complete M2 against ADR-0009 and validate local persistence/restart flow | Project owner | In progress |':
    '| Durable M2 checkpoint is not yet the full validated Interview experience | Delivery gap | The local durable runtime proves authority and persistence, while the full adaptive Interview still lives in the validated prototype | Migrate WF-001 through WF-016 onto the local durable project model incrementally with regression/browser gates | Project owner | Open |',
    '| Browser validation is not yet committed as repeatable CI | Validation gap | Unit/integration gates do not automatically protect every future UI change | Add browser-level local interaction/accessibility testing | Project owner | Open |':
    '| Browser CI currently covers the M2 checkpoint, not the full Interview/accessibility surface | Validation gap | Future Interview migration could regress broader UX outside the current M2 checkpoint | Expand Playwright coverage as WF-001 through WF-016 move onto durable state and select a formal accessibility target | Project owner | Open |',
}

for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'Missing expected architecture text: {old}')
    text = text.replace(old, new, 1)

path.write_text(text)
