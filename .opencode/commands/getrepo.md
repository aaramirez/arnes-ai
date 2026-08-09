---
description: Add a GitHub repository to repos.json and clone it to repos/.
---

Add a reference repository by URL.

1. Parse the repository URL from: $ARGUMENTS
2. Run `node .opencode/scripts/getrepo.js <url>` to add it to repos.json and clone it
3. Report the result: which entry was added, where it was cloned

Supports formats: `https://github.com/org/repo`, `org/repo`

Use `--description "text"` to add a description for the repo entry.
