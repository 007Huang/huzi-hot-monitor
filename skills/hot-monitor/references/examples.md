# Hot Monitor Skills - Examples

## Example 1: Basic Trend Discovery

```bash
python skills/hot-monitor/scripts/hot-monitor.py discover "AI programming" --limit 10
```

**Output**:
```markdown
# Hot Trends: AI programming

**Generated**: 2026-07-01T10:00:00
**Total**: 10 trends

## Sources
- Bing Search: 5
- Twitter: 3
- Weibo: 2

## Trends

### 1. Claude 4.6 Sonnet released with 2x faster inference
- **Score**: 95/100 ██████████
- **Source**: Twitter
- **URL**: https://twitter.com/AnthropicAI/status/...
- **Description**: Anthropic just announced Claude 4.6 Sonnet with significantly improved reasoning speed...
- **Tags**: AI, Claude, Anthropic
- **Author**: AnthropicAI
- **Interactions**: 👍 3420 | 🔄 890 | 💬 156

### 2. GPT-5 training details leaked: 10T parameters, multimodal
- **Score**: 88/100 ████████░░
- **Source**: Bing Search
- **URL**: https://techcrunch.com/...
- **Description**: Sources close to OpenAI reveal GPT-5 will feature...
```

---

## Example 2: Keyword Monitoring with AI Enhancement

```bash
export ACEDATA_API_KEY="your-key-here"
python skills/hot-monitor/scripts/hot-monitor.py monitor "GPT-5,Claude 4" --ai --check-fake
```

**Output**:
```markdown
# Keyword Monitor Report

**Keywords**: GPT-5, Claude 4
**Generated**: 2026-07-01T10:05:00
**Matched**: 3 (2 real, 1 fake)

## ✅ New Matches

### GPT-5 training details leaked
- **Score**: 88
- **Source**: Bing Search
- **URL**: https://techcrunch.com/...
- **Matched**: GPT-5
- **Reason**: Keywords found in title/description: GPT-5

### Claude 4.6 released with new features
- **Score**: 95
- **Source**: Twitter
- **URL**: https://twitter.com/...
- **Matched**: Claude 4
- **Reason**: Content directly discusses Claude 4.6 model

## ⚠️ Fake Content Detected

### ~~GPT-5 released TODAY! Download now!~~
- **Source**: Unknown
- **Reason**: Clickbait title pattern detected: .*来了!
```

---

## Example 3: Generate Full Report

```bash
python skills/hot-monitor/scripts/hot-monitor.py report "AI" --output ai-report.md --ai --limit 30
```

**Output file `ai-report.md`**:
```markdown
# Hot Trends Report: AI

**Generated**: 2026-07-01T10:00:00
**Time Range**: 24h

## Executive Summary

- **Total Trends**: 30
- **Sources**: Bing Search, Twitter, Weibo, Zhihu
- **Average Score**: 72.5/100
- **High Score (≥80)**: 12
- **Fake Content**: 2

## Score Distribution

- **0-20**: ░░░░░░░░░░ 0 (0.0%)
- **21-40**: ░░░░░░░░░░ 2 (6.7%)
- **41-60**: █░░░░░░░░░ 5 (16.7%)
- **61-80**: ████░░░░░░ 11 (36.7%)
- **81-100**: █████░░░░░ 12 (40.0%)

## Source Breakdown

- **Bing Search**: ████████░░ 10 (33.3%)
- **Twitter**: ██████░░░░ 8 (26.7%)
- **Weibo**: ████░░░░░░ 6 (20.0%)
- **Zhihu**: ███░░░░░░░ 6 (20.0%)

## Top Trends

### 1. Claude 4.6 Released (Score: 95)
- **Source**: Twitter
- **URL**: https://twitter.com/AnthropicAI/status/...
- **Description**: Anthropic releases Claude 4.6 with 2x faster inference
- **AI Summary**: Anthropic 发布 Claude 4.6 Sonnet，推理速度提升 2 倍
- **Tags**: AI, Claude, Anthropic

### 2. GPT-5 Training Details Leaked (Score: 88)
- **Source**: Bing Search
- **URL**: https://techcrunch.com/...
- **Description**: Sources reveal 10T parameter model
- **AI Summary**: GPT-5 训练细节泄露，据称参数量达 10 万亿
- **Tags**: AI, GPT-5, OpenAI
- **⚠️ Fake Reason**: Unverified - no official confirmation

## Trending Topics

- **AI**: ██████████ (30)
- **Claude**: ████████░░ (15)
- **GPT-5**: ██████░░░░ (12)
- **OpenAI**: █████░░░░░ (10)
- **Anthropic**: ████░░░░░░ (8)

## Risk Analysis

⚠️ **2** potentially fake or misleading items detected.

### Fake Items
- ~~GPT-5 released TODAY! Download now!~~ - Clickbait title pattern
- ~~Breaking: GPT-5 has 100T parameters~~ - Unverified claim

## Raw Data

```json
[
  {
    "id": "twitter-12345",
    "title": "Claude 4.6 Released",
    ...
  }
]
```
```

---

## Example 4: Health Check

```bash
python skills/hot-monitor/scripts/hot-monitor.py health --verbose
```

**Output**:
```
🏥 Checking data source health...

  ✅ OK Bing Search: 10 items
  ✅ OK DuckDuckGo: 8 items
  ✅ OK Weibo Hot: 20 items
  ✅ OK Zhihu Hot: 15 items
  ❌ FAIL Twitter: Connection timeout
  ✅ OK Tech News: 5 items

  ✅ AI Enhancement: Available (ACEDATA_API_KEY set)

📊 5/6 sources healthy
```

---

## Example 5: Python Integration

```python
import sys
sys.path.insert(0, 'skills/hot-monitor/lib')

from sources.web_search import search_bing, search_ddg
from sources.weibo import fetch_weibo_hot
from matcher import match_keywords
from report import generate_report

# Discover trends
trends = search_bing("AI programming", limit=10)
trends.extend(search_ddg("AI programming", limit=10))
trends.extend(fetch_weibo_hot(limit=10))

# Match keywords
keywords = ["GPT-5", "Claude 4"]
for trend in trends:
    result = match_keywords(trend, keywords)
    if result['matched']:
        print(f"✅ {trend['title']} - {result['reason']}")

# Generate report
report = generate_report(trends, "AI Programming", "24h")
with open('report.md', 'w') as f:
    f.write(report)
```

---

## Example 6: Batch Monitoring Script

```python
#!/usr/bin/env python3
"""Batch monitor multiple keywords."""

import sys
import json
sys.path.insert(0, 'skills/hot-monitor/lib')

from scripts.hot_monitor import fetch_all_trends, deduplicate_trends
from matcher import match_keywords

KEYWORDS = ["GPT-5", "Claude 4", "AI编程", "大模型"]
SOURCES = ['web-search', 'twitter', 'weibo']

def main():
    all_matched = []

    for keyword in KEYWORDS:
        print(f"Monitoring: {keyword}")
        trends = fetch_all_trends(SOURCES, [keyword], limit=50)
        trends = deduplicate_trends(trends)

        for trend in trends:
            result = match_keywords(trend, [keyword])
            if result['matched']:
                trend['matched_keywords'] = result.get('matched_keywords', [])
                all_matched.append(trend)

    # Save results
    with open('monitor-results.json', 'w') as f:
        json.dump(all_matched, f, ensure_ascii=False, indent=2)

    print(f"Found {len(all_matched)} matches across {len(KEYWORDS)} keywords")

if __name__ == '__main__':
    main()
```

---

## Example 7: CI/CD Integration

```yaml
# .github/workflows/trend-monitor.yml
name: Trend Monitor

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: pip install requests beautifulsoup4

      - name: Run monitor
        env:
          ACEDATA_API_KEY: ${{ secrets.ACEDATA_API_KEY }}
        run: |
          python skills/hot-monitor/scripts/hot-monitor.py report "AI" --output report.md --ai

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: trend-report
          path: report.md
```

---

## Example 8: Docker Usage

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install dependencies
RUN pip install requests beautifulsoup4

# Copy skill
COPY skills/hot-monitor/ ./

# Set environment
ENV PYTHONPATH=/app/lib

# Default command
ENTRYPOINT ["python", "scripts/hot-monitor.py"]
CMD ["discover", "AI programming"]
```

```bash
# Build and run
docker build -t hot-monitor .
docker run -e ACEDATA_API_KEY=xxx hot-monitor monitor "GPT-5"
```
