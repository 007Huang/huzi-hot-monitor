"""
Report generation module
Generate full markdown reports with charts and analysis
"""

from typing import List, Dict
from datetime import datetime, timedelta
import json

def generate_report(trends: List[Dict], scope: str, time_range: str = '24h') -> str:
    """Generate a comprehensive markdown report."""

    # Calculate statistics
    stats = calculate_stats(trends)

    # Build report
    lines = [
        f"# Hot Trends Report: {scope}",
        "",
        f"**Generated**: {datetime.now().isoformat()}",
        f"**Time Range**: {time_range}",
        "",
        "## Executive Summary",
        "",
        f"- **Total Trends**: {stats['total']}",
        f"- **Sources**: {', '.join(stats['sources'])}",
        f"- **Average Score**: {stats['avg_score']:.1f}/100",
        f"- **High Score (≥80)**: {stats['high_score_count']}",
        f"- **Fake Content**: {stats['fake_count']}",
        "",
    ]

    # Score distribution
    lines.append("## Score Distribution")
    lines.append("")
    lines.append(format_score_distribution(stats['score_distribution']))
    lines.append("")

    # Source breakdown
    lines.append("## Source Breakdown")
    lines.append("")
    lines.append(format_source_breakdown(stats['source_counts']))
    lines.append("")

    # Top trends
    lines.append("## Top Trends")
    lines.append("")

    for i, trend in enumerate(trends[:10], 1):
        title = trend.get('title', 'Untitled')
        if trend.get('is_fake'):
            title = f"~~{title}~~ ⚠️"

        lines.append(f"### {i}. {title}")
        lines.append(f"- **Score**: {trend.get('score', 0)}/100")
        lines.append(f"- **Source**: {trend.get('source_label', trend.get('source', 'unknown'))}")

        url = trend.get('url', '')
        if url:
            lines.append(f"- **URL**: {url}")

        desc = trend.get('description', '')
        if desc:
            lines.append(f"- **Description**: {desc[:150]}{'...' if len(desc) > 150 else ''}")

        ai_summary = trend.get('ai_summary', '')
        if ai_summary:
            lines.append(f"- **AI Summary**: {ai_summary}")

        tags = trend.get('tags', [])
        if tags:
            lines.append(f"- **Tags**: {', '.join(tags)}")

        if trend.get('is_fake') and trend.get('fake_reason'):
            lines.append(f"- **⚠️ Fake Reason**: {trend['fake_reason']}")

        lines.append("")

    # Trending topics
    if stats['top_topics']:
        lines.append("## Trending Topics")
        lines.append("")
        for topic, count in stats['top_topics'][:10]:
            bar = '█' * count + '░' * (10 - min(count, 10))
            lines.append(f"- **{topic}**: {bar} ({count})")
        lines.append("")

    # Risk analysis
    if stats['fake_count'] > 0:
        lines.append("## Risk Analysis")
        lines.append("")
        lines.append(f"⚠️ **{stats['fake_count']}** potentially fake or misleading items detected.")
        lines.append("")
        lines.append("### Fake Items")
        for trend in trends:
            if trend.get('is_fake'):
                lines.append(f"- ~~{trend['title']}~~ - {trend.get('fake_reason', '')}")
        lines.append("")

    # Raw data appendix
    lines.append("## Raw Data")
    lines.append("")
    lines.append("```json")
    lines.append(json.dumps(trends, ensure_ascii=False, indent=2))
    lines.append("```")

    return '\n'.join(lines)

def calculate_stats(trends: List[Dict]) -> Dict:
    """Calculate statistics from trends."""
    if not trends:
        return {
            'total': 0,
            'sources': [],
            'avg_score': 0,
            'high_score_count': 0,
            'fake_count': 0,
            'score_distribution': {},
            'source_counts': {},
            'top_topics': [],
        }

    # Source counts
    source_counts = {}
    for t in trends:
        src = t.get('source_label', t.get('source', 'unknown'))
        source_counts[src] = source_counts.get(src, 0) + 1

    # Score distribution
    score_distribution = {'0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0}
    scores = []
    high_score_count = 0
    fake_count = 0

    for t in trends:
        score = t.get('score', 0)
        scores.append(score)

        if score >= 80:
            high_score_count += 1

        if t.get('is_fake'):
            fake_count += 1

        if score <= 20:
            score_distribution['0-20'] += 1
        elif score <= 40:
            score_distribution['21-40'] += 1
        elif score <= 60:
            score_distribution['41-60'] += 1
        elif score <= 80:
            score_distribution['61-80'] += 1
        else:
            score_distribution['81-100'] += 1

    # Top topics (from tags)
    topic_counts = {}
    for t in trends:
        for tag in t.get('tags', []):
            topic_counts[tag] = topic_counts.get(tag, 0) + 1

    top_topics = sorted(topic_counts.items(), key=lambda x: -x[1])

    return {
        'total': len(trends),
        'sources': list(source_counts.keys()),
        'avg_score': sum(scores) / len(scores) if scores else 0,
        'high_score_count': high_score_count,
        'fake_count': fake_count,
        'score_distribution': score_distribution,
        'source_counts': source_counts,
        'top_topics': top_topics,
    }

def format_score_distribution(distribution: Dict) -> str:
    """Format score distribution as markdown chart."""
    lines = []
    total = sum(distribution.values())

    for range_name, count in distribution.items():
        percentage = (count / total * 100) if total > 0 else 0
        bar = '█' * int(percentage / 5)
        lines.append(f"- **{range_name}**: {bar} {count} ({percentage:.1f}%)")

    return '\n'.join(lines)

def format_source_breakdown(source_counts: Dict) -> str:
    """Format source breakdown as markdown chart."""
    lines = []
    total = sum(source_counts.values())

    for source, count in sorted(source_counts.items(), key=lambda x: -x[1]):
        percentage = (count / total * 100) if total > 0 else 0
        bar = '█' * int(percentage / 5)
        lines.append(f"- **{source}**: {bar} {count} ({percentage:.1f}%)")

    return '\n'.join(lines)
