# ToolHarbor examples

Three worked example tools for [ToolHarbor](https://github.com/stopsign002/toolharbor)
(private), one per tier. Install any of them from the portal's admin page
with repo URL `https://github.com/stopsign002/toolharborexamples` and the
`subdir` set to the tool's directory:

| subdir | tier | what it shows |
|---|---|---|
| `hello-static` | static | path-prefix-safe relative URLs, the tool store, a declared upstream with a server-side secret |
| `hello-node` | container | verified `X-Portal-*` identity headers, its own Postgres schema |
| `hello-compose` | compose | a web service plus a background worker sharing one schema |

How to write your own is in ToolHarbor's `docs/TOOL-AUTHORING.md`. This repo is
public on purpose: it holds no secrets and the portal clones it without a
token.
