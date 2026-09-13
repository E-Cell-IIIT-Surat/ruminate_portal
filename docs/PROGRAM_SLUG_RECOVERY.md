# Program address recovery

Deleting a program is intentionally a soft delete: the program remains archived for audit history. Previously, its unique `slug` therefore stayed reserved, so creating a replacement event could return `409 A record with this value already exists` even though the admin list was empty.

New program creation, slug edits, and duplication now lock the address and automatically rename only an archived program that owns it to a private `deleted-<id>-<random>` slug. Active and draft programs still reject duplicate addresses. This preserves historical applications while making an archived event's public address reusable.

For a one-off cleanup, use the exact-target maintenance script. It is safe to preview first:

```text
node --env-file=.env --import tsx scripts/cleanup-old-ktb-applications.ts
node --env-file=.env --import tsx scripts/cleanup-old-ktb-applications.ts --apply
```

The script is hard-coded to the five old KTB draft reference IDs requested by the owner. It checks that both matching programs are still archived, that every target is still an unsubmitted draft, and that no uploaded files, public teams, or review records were added. On apply it writes a `0600` local backup under `.local-backups/`, verifies it, deletes only those applications (and their private application team), releases the two archived slugs, writes audit records, and verifies the delete count inside the transaction. It never deletes users, unrelated applications, public teams, or R2 objects.
