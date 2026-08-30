# ADR 0020: Use allow-listed structured external embeds

Date: 2026-07-19  
Status: accepted

## Decision

Documents may contain versioned `externalEmbed` Tiptap nodes whose attributes are validated structured descriptors. Minerva never stores or executes user-supplied HTML, iframe markup, JavaScript, or arbitrary iframe URLs.

Every supported provider is added through code with a pure shared URL parser, a strict descriptor schema, a server-side document-content policy, a client renderer, security tests, and an explicit Content Security Policy origin. The first provider is Figma. Its descriptor stores only the resource type, resource key, optional node ID, accessible title, and bounded height; Minerva constructs canonical Figma URLs itself.

Document permissions remain authoritative: `documents.update_draft` permits insertion and editing, while ordinary document read authorization permits rendering. Provider credentials are not stored for embeds. The provider remains responsible for access to private resources.

## Rationale

Arbitrary script or iframe insertion would allow stored cross-site scripting, credential phishing, unwanted network access, and policy bypass. A closed provider registry preserves interactive documentation while keeping origins, attributes, persistence, search, MCP, and future AI behavior reviewable.

The embed contract is reusable pure data under `shared/embeds`, but Documents owns whether the node is allowed. This preserves the accepted vertical feature architecture and avoids introducing a generic FSD `widgets` layer.

## Consequences

- New providers require code review, tests, and an explicit CSP change.
- Published versions preserve descriptors as immutable content snapshots.
- Search indexes the accessible embed title, never its URL or resource key.
- Project descriptions continue to reject embed nodes.
- MCP reads and mutations use the same validated structured descriptor and never emit executable markup.
- Unsupported or invalid descriptors render a safe fallback instead of external content.

