---
name: collabnb-crm-fill
description: |
  The single documented way to write found contact details (website, email, WhatsApp, real Instagram handle) onto existing Collabnb prospect rows in Convex via prospects:enrichProspectLocal. Referenced by collabnb-find-contact and collabnb-find-instagram; use it directly when the user says "save these to the CRM", "write these handles/numbers to Convex", or "fill the CRM with these".
---

# Collabnb — write enrichment to the CRM

Writes to `prospects` through the secret-gated mutation `enrichProspectLocal`
in `app/convex/prospects.ts`. It **never overwrites** a field that is already set:
a manually typed value always wins. It returns `{ updated: <n> }`.

## Row shape

| field | required | notes |
|---|---|---|
| `instagram_handle` | yes | The CRM row key, used for lookup only. Hotel rows use a synthetic `hc-…` key here. |
| `website` | no | Full URL |
| `email` | no | |
| `whatsapp` | no | Digits with country code, e.g. `6281234567890` |
| `ig_handle` | no | The hotel's **real** Instagram handle, without `@`. Saved separately because `instagram_handle` may be synthetic. |

Leave a field out rather than sending `""`.

## Secret

Don't ask the user for it. Read it fresh each run, because it can rotate:

```bash
cd app
SECRET=$(npx convex env get LOCAL_IMPORT_SECRET --prod)
```

## Write

Put the rows in a scratch file (`rows.json`, a JSON array), then run:

```bash
cd app
SECRET=$(npx convex env get LOCAL_IMPORT_SECRET --prod)
npx convex run prospects:enrichProspectLocal \
  "$(jq -c --arg s "$SECRET" '{secret:$s, rows:.}' rows.json)" --prod
```

Example with inline JSON:

```bash
npx convex run prospects:enrichProspectLocal \
  '{"secret":"<SECRET>","rows":[{"instagram_handle":"hc-abc123","whatsapp":"6281234567890","ig_handle":"thekayonresort"}]}' --prod
```

- Send at most about 100 rows per call. Split larger sets.
- Report the `updated` count, and say how many rows were sent. A gap usually means the field was already set or the key didn't match.
- Never print the secret back to the user or write it to a committed file.
- This is a CRM data write, not a deploy. It needs no `convex deploy`.
