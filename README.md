# Graph Filter Chips

Turn the **graph view filter** into removable chips.

Today the graph filter is a single text field, and pressing `Esc` wipes it out.
This plugin changes that:

| Action | Vanilla Obsidian | With Graph Filter Chips |
| --- | --- | --- |
| `Esc` | clears the whole filter | just leaves the text field, keeps the text |
| `Enter` | only re-applies the filter | turns the text into a **chip** |
| Remove a term | edit the raw text | click the **x** on the chip |
| Edit a term | edit the raw text | click the chip and edit it in place |
| Undo | not available | `Ctrl/Cmd + Z` undoes the last chip change |

<!-- Add a screenshot at ./assets/screenshot.png once available, then re-add the image line above. -->

## Features

- `Enter` commits the current query as a chip.
- `Esc` only blurs the field; the filter stays.
- Each chip has an **x** to remove just that term.
- Click a chip's label to edit it in place: `Enter` or clicking away saves,
  `Esc` cancels, and saving an empty chip removes it.
- `Ctrl/Cmd + Z` undoes the last chip change (add, edit, or remove), one step
  at a time, while the graph is the active tab. Inside a text field with text,
  it keeps undoing your typing as usual. The history lives in memory only.
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
5. Click a chip to edit it in place, or the **x** to remove it.
6. Press `Ctrl/Cmd + Z` to undo the last chip change.

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
native clear. Everything is restored when the plugin unloads, including the
full query, which goes back into the native input so the graph keeps its
filter when the plugin is disabled or updated.

Editing a chip swaps it for a plain text input in the same spot; the graph
filter only changes when the edit is saved. Undo keeps a snapshot of the chip
list before each change (up to 100 per graph) and listens for `Ctrl/Cmd + Z`
on the document, acting only when a graph view is the active leaf.

## Compatibility and caveats

- Built and tested against Obsidian **1.12.7** (`minAppVersion`).
- Because it hooks undocumented graph internals, a future Obsidian update could
  change these objects. The plugin fails gracefully (it simply stops attaching),
  but it may need maintenance. Issues and PRs are welcome.
- A chip typed with spaces stays one chip in the session; after reload, the
  saved query is split back into chips on whitespace (outside quotes). The
  filtering result is identical.
- Undo history is kept in memory only: it is lost when Obsidian reloads (the
  filter itself stays saved). There is no redo yet.
- `Ctrl/Cmd + Z` only works for graphs in the main window, not in pop-out
  windows.
- While a chip is being edited, clicking another chip's label first saves the
  current edit; click again to edit the other chip.

## Development

No build step, plain JavaScript.

```bash
# copy the plugin into a vault for live testing
./scripts/sync-to-vault.sh
```

Then reload Obsidian (`Ctrl/Cmd + P` → *Reload app without saving*).

## License

[MIT](./LICENSE)