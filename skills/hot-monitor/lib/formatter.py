"""
Output formatting utilities
Format trends and results as Markdown
"""

from typing import List, Dict
from datetime import datetime

def format_trends_markdown(trends: List[Dict], scope: str) -> str:
    """Format trends as markdown document."""
    lines = [
        f"# Hot Trends: {scope}",
        "",
        f"**Generated**: {datetime.now().isoformat()}",
        f"**Total**: {len(trends)} trends",
        "",
    ]

    if not trends:
        lines.append("*No trends found.*")
        return '\n'.join(lines)

    # Source summary
    sources = {}
    for t in trends:
        src = t.get('source_label', t.get('source', 'unknown'))
        sources[src] = sources.get(src, 0) + 1

    lines.append("## Sources")
    for src, count in sorted(sources.items(), key=lambda x: -x[1]):
        lines.append(f"- {src}: {count}")
    lines.append("")

    # Fake content summary
    fake_count = sum(1 for t in trends if t.get('is_fake'))
    if fake_count > 0:
        lines.append(f"⚠️ **Fake Content**: {fake_count} items detected")
        lines.append("")

    # Trend list
    lines.append("## Trends")
    lines.append("")

    for i, trend in enumerate(trends, 1):
        # Title with fake marker
        title = trend.get('title', 'Untitled')
        if trend.get('is_fake'):
            title = f"~~{title}~~ ⚠️"

        lines.append(f"### {i}. {title}")

        # Score
        score = trend.get('score', 0)
        score_bar = '█' * (score // 10) + '░' * (10 - score // 10)
        lines.append(f"- **Score**: {score}/100 {score_bar}")

        # Source
        source = trend.get('source_label', trend.get('source', 'unknown'))
        lines.append(f"- **Source**: {source}")

        # URL
        url = trend.get('url', '')
        if url:
            lines.append(f"- **URL**: {url}")

        # Description
        desc = trend.get('description', '')
        if desc:
            lines.append(f"- **Description**: {desc[:200]}{'...' if len(desc) > 200 else ''}")

        # AI Summary
        ai_summary = trend.get('ai_summary', '')
        if ai_summary:
            lines.append(f"- **AI Summary**: {ai_summary}")

        # Tags
        tags = trend.get('tags', [])
        if tags:
            lines.append(f"- **Tags**: {', '.join(tags)}")

        # Author
        author = trend.get('author', '')
        if author:
            lines.append(f"- **Author**: {author}")

        # Interactions
        interactions = trend.get('interactions', {})
        if interactions:
            parts = []
            if 'likes' in interactions:
                parts.append(f"👍 {interactions['likes']}")
            if 'retweets' in interactions:
                parts.append(f"🔄 {interactions['retweets']}")
            if 'replies' in interactions:
                parts.append(f"💬 {interactions['replies']}")
            if 'views' in interactions:
                parts.append(f"👁️ {interactions['views']}")
            if parts:
                lines.append(f"- **Interactions**: {' | '.join(parts)}")

        # Fake reason
        if trend.get('is_fake') and trend.get('fake_reason'):
            lines.append(f"- **⚠️ Fake Reason**: {trend['fake_reason']}")

        # Match info
        if trend.get('matched_keywords'):
            lines.append(f"- **Matched**: {', '.join(trend['matched_keywords'])}")
            lines.append(f"- **Match Type**: {trend.get('match_type', 'explicit')}")
            lines.append(f"- **Match Reason**: {trend.get('match_reason', '')}")

        lines.append("")

    return '\n'.join(lines)

def format_blogger_results(trends: List[Dict], author: str, keywords: List[str], real_count: int, fake_count: int) -> str:
    """Format blogger monitoring results as markdown."""
    lines = [
        f"# Blogger Monitor Report",
        "",
        f"**Author**: {author}",
        f"**Keywords**: {', '.join(keywords)}",
        f"**Generated**: {datetime.now().isoformat()}",
        f"**Matched**: {len(trends)} ({real_count} real, {fake_count} fake)",
        "",
    ]

    if not trends:
        lines.append("*No matching content found.*")
        return '\n'.join(lines)

    # Platform breakdown
    platforms = {}
    for t in trends:
        platform = t.get('platform', t.get('source_label', 'unknown'))
        platforms[platform] = platforms.get(platform, 0) + 1

    lines.append("## Platform Breakdown")
    for platform, count in sorted(platforms.items(), key=lambda x: -x[1]):
        lines.append(f"- **{platform}**: {count} items")
    lines.append("")

    # Real items
    if real_count > 0:
        lines.append("## ✅ New Matches")
        lines.append("")

        # Group by platform
        platform_items = {}
        for trend in trends:
            if not trend.get('is_fake'):
                platform = trend.get('platform', trend.get('source_label', 'unknown'))
                if platform not in platform_items:
                    platform_items[platform] = []
                platform_items[platform].append(trend)

        for platform, items in sorted(platform_items.items(), key=lambda x: -len(x[1])):
            lines.append(f"### {platform}")
            lines.append("")
            for trend in items:
                lines.append(f"#### {trend['title']}")
                lines.append(f"- **Score**: {trend.get('score', 0)}")
                lines.append(f"- **URL**: {trend.get('url', 'N/A')}")

                desc = trend.get('description', '')
                if desc:
                    lines.append(f"- **Description**: {desc[:200]}{'...' if len(desc) > 200 else ''}")

                # Interactions
                interactions = trend.get('interactions', {})
                if interactions:
                    parts = []
                    if 'views' in interactions:
                        parts.append(f"👁️ {interactions['views']}")
                    if 'likes' in interactions:
                        parts.append(f"👍 {interactions['likes']}")
                    if 'comments' in interactions:
                        parts.append(f"💬 {interactions['comments']}")
                    if 'retweets' in interactions:
                        parts.append(f"🔄 {interactions['retweets']}")
                    if parts:
                        lines.append(f"- **Interactions**: {' | '.join(parts)}")

                lines.append(f"- **Matched**: {', '.join(trend.get('matched_keywords', []))}")
                lines.append(f"- **Reason**: {trend.get('match_reason', '')}")
                lines.append("")

    # Fake items
    if fake_count > 0:
        lines.append("## ⚠️ Fake Content Detected")
        lines.append("")
        for trend in trends:
            if trend.get('is_fake'):
                lines.append(f"### ~~{trend['title']}~~")
                lines.append(f"- **Platform**: {trend.get('source_label', 'unknown')}")
                lines.append(f"- **Reason**: {trend.get('fake_reason', '')}")
                lines.append("")

    return '\n'.join(lines)

def format_health_report(results: List[Dict]) -> str:
    """Format health check results as markdown."""
    lines = [
        "# Data Source Health Report",
        "",
        f"**Generated**: {datetime.now().isoformat()}",
        "",
    ]

    healthy = sum(1 for r in results if 'OK' in r['status'])
    total = len(results)

    lines.append(f"## Summary")
    lines.append(f"- **Healthy**: {healthy}/{total}")
    lines.append(f"- **Unhealthy**: {total - healthy}/{total}")
    lines.append("")

    lines.append("## Details")
    lines.append("")

    for result in results:
        icon = "✅" if 'OK' in result['status'] else "❌"
        lines.append(f"### {icon} {result['name']}")
        lines.append(f"- **Status**: {result['status']}")
        lines.append(f"- **Detail**: {result['detail']}")
        lines.append("")

    return '\n'.join(lines)

def format_monitor_results(matched: List[Dict], keywords: List[str], real_count: int, fake_count: int) -> str:
    """Format monitor results as markdown."""
    lines = [
        f"# Keyword Monitor Report",
        "",
        f"**Keywords**: {', '.join(keywords)}",
        f"**Generated**: {datetime.now().isoformat()}",
        f"**Matched**: {len(matched)} ({real_count} real, {fake_count} fake)",
        "",
    ]

    # Real items
    if real_count > 0:
        lines.append("## ✅ New Matches")
        lines.append("")
        for trend in matched:
            if not trend.get('is_fake'):
                lines.append(f"### {trend['title']}")
                lines.append(f"- **Score**: {trend.get('score', 0)}")
                lines.append(f"- **Source**: {trend.get('source_label', trend.get('source', 'unknown'))}")
                lines.append(f"- **URL**: {trend.get('url', 'N/A')}")
                lines.append(f"- **Matched**: {', '.join(trend.get('matched_keywords', []))}")
                lines.append(f"- **Reason**: {trend.get('match_reason', '')}")
                lines.append("")

    # Fake items
    if fake_count > 0:
        lines.append("## ⚠️ Fake Content Detected")
        lines.append("")
        for trend in matched:
            if trend.get('is_fake'):
                lines.append(f"### ~~{trend['title']}~~")
                lines.append(f"- **Source**: {trend.get('source_label', 'unknown')}")
                lines.append(f"- **Reason**: {trend.get('fake_reason', '')}")
                lines.append("")

    return '\n'.join(lines)
