# Graph Filter Chips

Turn the **graph view filter** into removable chips.

Today the graph filter is a single text field, and pressing `Esc` wipes it out.
This plugin changes that:

| Action | Vanilla Obsidian | With Graph Filter Chips |
| --- | --- | --- |
| `Esc` | clears the whole filter | just leaves the text field, keeps the text |
| `Enter` | only re-applies the filter | turns the text into a **chip** |
| Remove a term | edit the raw text | click the **x** on the chip |

<!-- Add a screenshot at ./assets/screenshot.png once available, then re-add the image line above. -->

## Features

- `Enter` commits the current query as a chip.
- `Esc` only blurs the field; the filter stays.
- Each chip has an **x** to remove just that term.
- Click a chip's label to pull it back into the input for editing.
- Works on the **global graph** and on **local graphs**.
- The filter keeps being saved normally in `graph.json`, so it survives restarts.

## Why

The graph filter is easy to lose: a single stray `Esc` erases a carefully built
query. Chips make the filter explicit, visible, and individually removable.

## Installation

### Community plugins (after it is published)

Settings → Community plugins → Browse → search for **Graph Filter Chips** → Install → Enable.

### BRAT (beta)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
2. Run **BRAT: Add a beta plugin for testing** and paste the repository URL.

### Manual

Copy `main.js`, `manifest.json`, and `styles.css` into
`<your-vault>/.obsidian/plugins/graph-filter-chips/` and enable the plugin.

## Usage

1. Open the graph view and expand the **Filters** section.
2. Type a query, for example `path:"Projects"`, `-file:home`, or `tag:idea`.
3. Press `Enter` to turn it into a chip.
4. Press `Esc` any time to leave the field without losing what you typed.
5. Click the **x** on a chip to remove that filter.

## How it works

The plugin relies on a few stable graph internals:

- The filter input is `.graph-controls .setting-item.mod-search-setting input[type="search"]`.
- Obsidian reads the effective value with `engine.filterOptions.search.getValue()`
  and applies it with `engine.updateSearch()`.
- `Esc` clearing the field is the native behavior of `<input type="search">` in
  Chromium, not Obsidian's code.

The plugin overrides `getValue`/`setValue` **on the filter instance only**
(chips become the source of truth) and intercepts `keydown` in the capture
phase on an ancestor of the input, so its `preventDefault` runs before the
native clear. Everything is restored when the plugin unloads.

## Compatibility and caveats

- Built and tested against Obsidian **1.12.7** (`minAppVersion`).
- Because it hooks undocumented graph internals, a future Obsidian update could
  change these objects. The plugin fails gracefully (it simply stops attaching),
  but it may need maintenance. Issues and PRs are welcome.
- A chip typed with spaces stays one chip in the session; after reload, the
  saved query is split back into chips on whitespace (outside quotes). The
  filtering result is identical.

## Development

No build step, plain JavaScript.

```bash
# copy the plugin into a vault for live testing
./scripts/sync-to-vault.sh
```

Then reload Obsidian (`Ctrl/Cmd + P` → *Reload app without saving*).

## License

[MIT](./LICENSE)