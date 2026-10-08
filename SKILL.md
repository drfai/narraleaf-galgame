---
name: narraleaf-galgame
description: Build a complete, playable Japanese-style visual novel (galgame) with NarraLeaf Studio — story graph, characters, backgrounds, BGM and multiple endings, all authored as code and verified by actually running the game. Use when the user asks for a galgame / visual novel / 视觉小说 / 文字冒险 / 恋爱游戏, or asks to extend or rebuild an existing NarraLeaf Studio project. Do not hand-write storydoc.json or invent a browser-based engine instead.
---

# NarraLeaf galgame

Produce a real NarraLeaf Studio project — the same file format the Studio writes — so the user can play it, edit it visually, and ship it. The bundled toolkit turns a plain-text script, SVG art generators and code-synthesized music into the project's binary/JSON store. `<skill-directory>` is this loaded skill's resource base.

Do not invent a parallel format. Do not write `storydoc.json` by hand. The compiler already encodes every quirk of the format; read `references/storydoc-schema.md` before changing the compiler.

## Before you start

This toolkit is a companion to **[NarraLeaf Studio](https://github.com/NarraLeaf/NarraLeaf-Studio)** (MPL-2.0) — the IDE and runtime it targets. The project-format facts in `references/` were verified against **v1.4.5** ([release](https://github.com/NarraLeaf/NarraLeaf-Studio/releases/tag/v1.4.5)). Studio must be installed (default `%LOCALAPPDATA%\Programs\NarraLeaf Studio`). The toolkit also needs Node 18+ and a Chromium browser (Chrome or Edge) for SVG→PNG rendering; both are auto-detected. If Studio is missing, stop and tell the user where to get it — do not substitute another engine.

Decide the shape of the game with the user if it is unspecified, then write it down before coding: title, logline, cast (2–4 heroines plus side characters), route structure, ending list, and the palette/personality of each character. `toolkit/docs/STORY_BIBLE.md` is a worked example of that document — copy its structure, not its story.

## Build a new game

```powershell
node "<skill-directory>\toolkit\init.mjs" --name "游戏名" --dir "<工程目录>" --author "<作者>"
```

This copies the toolkit to `<工程目录>-tools` (one toolkit per game), writes that game's `game.config.mjs`, scaffolds the Studio project from the Studio's own bundled template, and runs a full build. Everything after this happens inside the copied toolkit:

```powershell
node build-all.mjs --story   # 只重编译剧本（改完 scripts/*.nls，几秒）
node build-all.mjs           # 美术/音乐也重做
node play.mjs                # 开始游戏
node play.mjs --stop         # 关掉 Studio
```

The shipped `scripts/`, `art/` and `audio/` are a **working demo game** (放课后 astronomy-club romance). They exist so the first build succeeds and so you have a reference; replace them for a new game rather than shipping someone else's story.

## What to edit

| 目标 | 文件 | 说明 |
|---|---|---|
| 剧情 | `scripts/*.nls` | 纯文本剧本，格式见 `toolkit/docs/SCRIPT_FORMAT.md` |
| 角色/背景/BGM 清单 | `game.config.mjs` | 新角色、新背景 id 都要先在这里登记 |
| 背景美术 | `art/bg_*.mjs` | 每个模块导出 `{ bgId: (w,h) => '<svg…>' }` |
| 立绘 | `lib/charbase.mjs` + `art/characters.mjs` | 一套参数化画法 + 每个角色的配色/发型/服装 |
| BGM | `audio/make-audio.mjs` | 纯 Node 合成 WAV，22050 Hz 单声道 16-bit 无缝循环 |

Adding a character means: an entry in `game.config.mjs` `characters`, a `stage` position, a spec in `art/characters.mjs`, and at least one `.nls` scene that uses the script name. Adding a background means an entry in `backgrounds` plus a drawing function. `build-all.mjs` re-renders everything and `register-assets.mjs` reports what is missing.

## Parallel work

Script writing, art modules and the audio generator are independent and split cleanly across subagents: give each writer a disjoint set of `scripts/*.nls` files with unique scene-id prefixes, each artist a disjoint `art/bg_*.mjs` file, and let them self-check with `render-svg.mjs` + `png-stats.mjs`. Keep one writer per character route. Settle the DSL, the cast and the scene-id list **before** spawning them, and give them the DSL doc path — a writer that invents a character name or a pose id will fail the build.

Keep any file that more than one worker would touch (`game.config.mjs`, `art/characters.mjs`, `lib/charbase.mjs`) for yourself.

## Verify before delivering

A build that compiles is not a game. Do all of these:

1. `node build-story.mjs --check` — zero errors. Warnings about a scene not ending in `@jump`/`@ending` mean a player can get stuck; fix them.
2. Launch it: `node play.mjs`. Driving the Studio over CDP (`toolkit/cdp.mjs`) is how you actually inspect a running game — `devMode.launch` returns `{status:"running"}` or an error you must resolve.
3. Read the running game's DOM to confirm real behaviour: the title surface lists 开始/继续/加载/设置/鉴赏; clicking 开始 reaches the first line; the dialogue advances one row per click; a choice shows every option; clicking an option lands in the intended scene. Query `<img>` elements and assert `naturalWidth` is non-zero — that is what proves backgrounds and sprites actually resolved.
4. The Dev Mode window must report **zero errors and zero warnings**. A runtime diagnostic is a bug even when the text looks right.
5. `node build-all.mjs --fresh` must reproduce the project from scratch. Do this before calling the work done — it catches anything you fixed by editing generated files instead of sources.

If `read_image` is unavailable, do not claim to have looked at the art. Verify numerically (`png-stats.mjs`, pixel probes) and say plainly that visual layout was not inspected by eye.

## Hard rules

* Keep the template's `storyId` (`71bb159f-1322-4539-b09f-9593a426a67d`) and reserve the entry scene's uuid — the title screen's blueprint hardcodes both. `references/project-format.md` explains this.
* Preserve the Studio template's own assets; the title screen and UI sounds reference them by id. Register new assets alongside, never by clearing the metadata files.
* Never stop BGM with `stopSound`; use `setBgm` without an `assetId`.
* Regenerate `dependencies` in `.nlproj` after the Studio updates its plugins (`patch-config.mjs`), or Studio reports the plugin as unavailable.
* Use the `read`/`write`/`edit` tools for any file containing non-ASCII text. Piping Chinese through PowerShell rewrites it as mojibake.
* Keep generated renders in `workDir`, never inside the Studio project — `assets/content/` is the project's own store and the Studio reads it.

## Why it works this way

`references/project-format.md` — the `.nlproj` msgpack layout, directory structure, asset shards, `character.json`, project trust, single-instance and auto-update behaviour.
`references/storydoc-schema.md` — every verified block kind and payload shape in the story graph.
`references/pitfalls.md` — the failure modes that cost real time; read it before debugging anything strange.
`toolkit/docs/SCRIPT_FORMAT.md` — the `.nls` script language, for whoever writes the story.
`toolkit/docs/STORY_BIBLE.md` — a worked example of turning a premise into cast, routes and scene ids.
