# Hot Monitor API Reference

## Base URL

- Local execution: Direct Python CLI
- No backend service required

## Authentication

No authentication required for basic functionality.

Optional: Set `ACEDATA_API_KEY` environment variable for AI-enhanced features.

```bash
export ACEDATA_API_KEY="your-key-here"
```

## CLI Commands

### discover

Discover trends by scope.

```bash
python scripts/hot-monitor.py discover <scope> [options]
```

**Options**:
| Option | Description | Default |
|--------|-------------|---------|
| `--limit` | Max results | 20 |
| `--sources` | Comma-separated sources or "all" | all |
| `--output, -o` | Output file | stdout |
| `--ai` | Enable AI enhancement | false |

**Example**:
```bash
python scripts/hot-monitor.py discover "AI programming" --limit 10 --ai
```

---

### monitor

Monitor keywords for new content.

```bash
python scripts/hot-monitor.py monitor <keywords> [options]
```

**Options**:
| Option | Description | Default |
|--------|-------------|---------|
| `--sources` | Comma-separated sources | all |
| `--check-fake` | Detect fake content | true |
| `--exclude-ids` | Comma-separated IDs to skip | none |
| `--output, -o` | Output file | stdout |
| `--ai` | Use AI matching | false |

**Example**:
```bash
python scripts/hot-monitor.py monitor "GPT-5,Claude 4" --sources twitter,weibo --ai
```

---

### summarize

Generate summary from trends JSON file.

```bash
python scripts/hot-monitor.py summarize <file> [options]
```

**Options**:
| Option | Description | Default |
|--------|-------------|---------|
| `--language` | Summary language (zh/en) | zh |
| `--output, -o` | Output file | stdout |

**Example**:
```bash
python scripts/hot-monitor.py summarize trends.json --language zh
```

---

### report

Generate full markdown report.

```bash
python scripts/hot-monitor.py report <scope> [options]
```

**Options**:
| Option | Description | Default |
|--------|-------------|---------|
| `--limit` | Max trends to include | 30 |
| `--sources` | Comma-separated sources | all |
| `--output, -o` | Output file | report.md |
| `--ai` | Enable AI enhancement | false |
| `--time-range` | Time filter (1h/6h/24h/7d) | 24h |

**Example**:
```bash
python scripts/hot-monitor.py report "AI" --output report.md --ai
```

---

### health

Check data source health.

```bash
python scripts/hot-monitor.py health [options]
```

**Options**:
| Option | Description | Default |
|--------|-------------|---------|
| `--verbose, -v` | Verbose output | false |

**Example**:
```bash
python scripts/hot-monitor.py health --verbose
```

---

### blogger

Monitor a specific blogger/UP主 for keyword-matching content.

```bash
python scripts/hot-monitor.py blogger <author> [options]
```

**Options**:
| Option | Description | Default |
|--------|-------------|---------|
| `--keywords, -k` | Comma-separated keywords | AI,人工智能,GPT,大模型 |
| `--sources` | Comma-separated sources | all |
| `--limit` | Max results per source | 20 |
| `--days` | Only content from last N days | 30 |
| `--output, -o` | Output file | stdout |
| `--ai` | Enable AI enhancement | false |
| `--check-fake` | Detect fake content | true |

**Example**:
```bash
python scripts/hot-monitor.py blogger "程序员鱼皮" --keywords "AI,人工智能,GPT" --limit 20 --output yupi.md
```

**Supported Sources**:
| Source | Description |
|--------|-------------|
| `bilibili` | Search Bilibili videos by username |
| `zhihu` | Search Zhihu content by username |
| `search` | Web search across all platforms |
| `all` | All of the above (default) |

---

## Data Sources

| Source | Type | Auth Required | Description |
|--------|------|---------------|-------------|
| Bing Search | Search | No | Web search via Bing |
| DuckDuckGo | Search | No | Web search via DDG |
| Weibo Hot | Browse | No | Weibo hot search |
| Zhihu Hot | Browse | No | Zhihu hot list |
| Twitter | Search | No | Twitter via Nitter mirror |
| Tech News | Browse | No | TechCrunch/The Verge RSS |
| Bilibili User | Search | No | Bilibili user videos via search |
| Zhihu User | Search | No | Zhihu user content via search |
| Blogger Search | Search | No | Cross-platform blogger search |

## Output Format

All commands output Markdown by default.

### Trend Item Structure

```json
{
  "id": "bing-12345",
  "title": "Claude 4.6 Released",
  "url": "https://...",
  "description": "Anthropic announced...",
  "score": 95,
  "source": "web-search",
  "source_label": "Bing Search",
  "tags": ["AI", "Claude"],
  "author": "",
  "is_fake": false,
  "fake_reason": "",
  "matched_keywords": [],
  "match_reason": "",
  "match_type": "explicit",
  "ai_summary": "",
  "interactions": {
    "likes": 100,
    "views": 5000
  },
  "created_at": "2026-07-01T10:00:00Z",
  "fetched_at": "2026-07-01T10:05:00Z"
}
```

## AI Enhancement

### Without API Key (Local Rules)

- **Keyword Matching**: Substring matching
- **Fake Detection**: Heuristic rules (title patterns, suspicious domains)
- **Summarization**: Statistical extraction
- **Tag Extraction**: None

### With ACEDATA_API_KEY (AI Enhanced)

- **Keyword Matching**: Semantic understanding via LLM
- **Fake Detection**: AI-powered content analysis
- **Summarization**: LLM-generated natural language summaries
- **Tag Extraction**: AI-extracted relevant tags

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Network timeout | Source unavailable | Check internet, retry later |
| Parse error | Source HTML changed | Update crawler, check health |
| AI model failure | API key invalid/expired | Check ACEDATA_API_KEY |
| No results | Scope too narrow | Broaden search terms |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ACEDATA_API_KEY` | Acedata.cloud API key | No (optional) |
| `HTTP_PROXY` | HTTP proxy | No |
| `HTTPS_PROXY` | HTTPS proxy | No |
