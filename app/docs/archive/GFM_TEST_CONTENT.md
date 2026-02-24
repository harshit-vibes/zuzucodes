# GitHub Flavored Markdown (GFM) Test Content

This document tests all GitHub Flavored Markdown features supported by `remark-gfm`.

---

## 1. Tables

### Basic Table

| Feature | Supported | Notes |
|---------|-----------|-------|
| Tables | ✅ | Pipe syntax |
| Strikethrough | ✅ | Double tilde |
| Autolinks | ✅ | Plain URLs |
| Task Lists | ✅ | Checkbox syntax |

### Table with Alignment

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Data 1       | Data 2         | Data 3        |
| Cell A       | Cell B         | Cell C        |

### Complex Table

| Col 1 | Col 2 | Col 3 | Col 4 | Col 5 |
|-------|-------|-------|-------|-------|
| A1    | B1    | C1    | D1    | E1    |
| A2    | B2    | C2    | D2    | E2    |
| A3    | B3    | C3    | D3    | E3    |

---

## 2. Strikethrough

This ~~is incorrect~~ is correct.

~~Entire sentence crossed out.~~

Mix of **bold**, *italic*, ~~strikethrough~~, and `code`.

---

## 3. Autolinks

### URLs

Visit https://zuzu.codes for the platform.

Check out https://github.com/anthropics/claude-code for Claude Code.

API docs at https://docs.zuzu.codes/api/v1.

### Email Addresses

Contact support@zuzu.codes for help.

Send feedback to hello@zuzu.codes.

---

## 4. Task Lists

### Pending Tasks

- [ ] Review GFM implementation
- [ ] Test all markdown features
- [ ] Write audit report
- [ ] Update documentation

### Mixed Status

- [x] Completed task 1
- [x] Completed task 2
- [ ] Pending task 1
- [ ] Pending task 2
- [x] Completed task 3

### Nested Task Lists

- [x] Phase 1: Setup
  - [x] Install dependencies
  - [x] Configure remark-gfm
- [ ] Phase 2: Testing
  - [x] Create test content
  - [ ] Run manual tests
  - [ ] Document findings

---

## 5. Fenced Code Blocks

### JavaScript

```javascript
function hello(name) {
  console.log(`Hello, ${name}!`);
  return true;
}

const result = hello("GFM");
```

### Python

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

### TypeScript

```typescript
interface User {
  id: string;
  email: string;
  verified: boolean;
}

const user: User = {
  id: "123",
  email: "user@example.com",
  verified: true
};
```

### Bash

```bash
npm install remark-gfm
npm run dev
git status
```

### Code Without Language Specifier

```
This code block has no language specified.
Should still render with monospace font.
```

---

## 6. Inline Code

Use `const` instead of `var` in modern JavaScript.

The `remark-gfm` plugin enables GFM features.

Install with `npm install react-markdown remark-gfm`.

---

## 7. Links

### Standard Markdown Links

[Click here](https://example.com) to visit example.com.

[zuzu.codes](https://zuzu.codes) - Our platform

### Reference Links

[GitHub][1]
[Anthropic][2]
[Neon][3]

[1]: https://github.com
[2]: https://anthropic.com
[3]: https://neon.tech

---

## 8. Lists

### Unordered Lists

- First item
- Second item
- Third item
  - Nested item 1
  - Nested item 2
- Fourth item

### Ordered Lists

1. First step
2. Second step
3. Third step
   1. Substep A
   2. Substep B
4. Fourth step

### Mixed Nested Lists

1. Main point one
   - Supporting detail
   - Another detail
2. Main point two
   - Detail with code: `example()`
   - Detail with **emphasis**
3. Main point three

---

## 9. Blockquotes

> This is a simple blockquote.

> This is a multi-line blockquote.
>
> It can span multiple paragraphs.
>
> And continue for several lines.

> **Note:** Blockquotes can contain **formatted text**.
>
> - Lists
> - `Code`
> - [Links](https://example.com)

---

## 10. HTML Safety Test

### These should be escaped/sanitized:

<script>alert('XSS')</script>

<iframe src="https://malicious.com"></iframe>

<object data="malicious.swf"></object>

<embed src="malicious.swf">

<div onclick="alert('XSS')">Click me</div>

<img src="x" onerror="alert('XSS')">

---

## 11. Combined Features

Here's a paragraph with **bold**, *italic*, ~~strikethrough~~, `inline code`, and [a link](https://zuzu.codes).

### Task List with Links

- [x] Read [GFM spec](https://github.github.com/gfm/)
- [ ] Test https://zuzu.codes platform
- [ ] Contact support@zuzu.codes

### Table with Code and Links

| Feature | Example | Docs |
|---------|---------|------|
| Strikethrough | ~~old~~ new | [GFM](https://github.github.com/gfm/) |
| Code | `const x = 1` | [React](https://react.dev) |
| Links | https://zuzu.codes | [Neon](https://neon.tech) |

---

## 12. Edge Cases

### Empty Table Cells

| Col 1 | Col 2 | Col 3 |
|-------|-------|-------|
| Data  |       | More  |
|       | Data  |       |
| Full  | Row   | Here  |

### Nested Formatting

**Bold with ~~strikethrough~~** and *italic with `code`*.

### Special Characters in Table

| Character | Name | Usage |
|-----------|------|-------|
| `|` | Pipe | Table delimiter |
| `~` | Tilde | Strikethrough |
| `[ ]` | Brackets | Task list |

---

## Expected Rendering

### ✅ Should Work

- Tables with proper structure (`<table>`, `<thead>`, `<tbody>`)
- Strikethrough as `<del>` or `<s>` elements
- Autolinks as clickable `<a>` tags
- Task lists with checkbox `<input type="checkbox">` elements
- Fenced code blocks in `<pre><code>` elements
- HTML escaped (not executed)

### ⚠️ Potential Issues

- Task list checkboxes may render as plain text `[ ]` if no `input` component override
- Strikethrough may lack custom styling without `del` component override
- HTML may render as text (good for security) but verify XSS prevention

---

## Test Checklist

- [ ] All tables render with borders and styling
- [ ] Strikethrough shows as crossed-out text
- [ ] Plain URLs are clickable
- [ ] Email addresses are clickable
- [ ] Task list checkboxes appear (not `[ ]` text)
- [ ] Code blocks have syntax highlighting container
- [ ] Inline code has background styling
- [ ] Blockquotes have left border styling
- [ ] HTML is escaped/sanitized (no script execution)
- [ ] Nested lists maintain proper indentation
