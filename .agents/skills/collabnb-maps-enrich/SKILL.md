---
name: collabnb-maps-enrich
description: |
  Renamed. Use collabnb-find-contact for website/email/WhatsApp, collabnb-find-instagram for real IG handles, and collabnb-crm-fill for the Convex write step.
---

# Renamed

This skill was split up:
- **collabnb-find-contact** finds website, email and WhatsApp: hotel site first, then Maps, then Instagram captions.
- **collabnb-find-instagram** finds a hotel's real Instagram handle (saved as `ig_handle`).
- **collabnb-crm-fill** writes the results to Convex via `prospects:enrichProspectLocal`.

Load the matching skill instead.
