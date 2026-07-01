"""
Keyword matching and fake detection (local rules)
No AI required - uses substring matching and heuristic rules
"""

import re
from typing import List, Dict, Optional

# ===== Keyword Matching =====

def match_keywords(trend: Dict, keywords: List[str]) -> Dict:
    """
    Match keywords against a trend using substring matching.
    Returns: {matched, confidence, reason, matched_keywords, relation_type}
    """
    if not keywords:
        return {
            'matched': False,
            'confidence': 0,
            'reason': 'No keywords provided',
            'matched_keywords': [],
            'relation_type': 'unrelated'
        }

    text = f"{trend.get('title', '')} {trend.get('description', '')}".lower()
    matched = []

    for keyword in keywords:
        keyword_lower = keyword.lower()
        if keyword_lower in text:
            matched.append(keyword)

    if matched:
        return {
            'matched': True,
            'confidence': min(0.7 + len(matched) * 0.1, 0.95),
            'reason': f"Keywords found in title/description: {', '.join(matched)}",
            'matched_keywords': matched,
            'relation_type': 'explicit'
        }

    return {
        'matched': False,
        'confidence': 0.1,
        'reason': 'No keywords matched',
        'matched_keywords': [],
        'relation_type': 'unrelated'
    }

# ===== Fake Content Detection (Local Rules) =====

# Suspicious domain patterns
SUSPICIOUS_DOMAINS = [
    'fake-news', 'clickbait', 'viral', 'shocking',
    'unbelievable', 'must-see', 'you-wont-believe'
]

# Title patterns indicating fake/misleading content
FAKE_TITLE_PATTERNS = [
    r'震惊[！!]?',  # 震惊体
    r'重磅[！!]?',  # 重磅体
    r'突发[！!]?',  # 突发体
    r'独家[：:]?',   # 独家
    r'内幕[：:]?',   # 内幕
    r'揭秘[：:]?',   # 揭秘
    r'曝光[：:]?',   # 曝光
    r'重磅.*发布',   # 重磅发布
    r'.*来了[！!]?', # XX来了
    r'.*定了[！!]?', # XX定了
]

# Suspicious keywords in title
SUSPICIOUS_KEYWORDS = [
    '震惊', '重磅', '突发', '独家', '内幕', '揭秘', '曝光',
    '来了', '定了', '定了', '来了', '来了', '来了',
    'must see', 'shocking', 'unbelievable', "you won't believe",
    'breaking', 'exclusive', 'leaked', 'secret',
]

def detect_fake_local(trend: Dict) -> Dict:
    """
    Detect fake/misleading content using local heuristic rules.
    Returns: {is_fake, confidence, reason}
    """
    title = trend.get('title', '')
    url = trend.get('url', '')

    # Check 1: Suspicious domain
    for domain in SUSPICIOUS_DOMAINS:
        if domain in url.lower():
            return {
                'is_fake': True,
                'confidence': 0.7,
                'reason': f'Suspicious domain pattern: {domain}'
            }

    # Check 2: Title patterns
    for pattern in FAKE_TITLE_PATTERNS:
        if re.search(pattern, title):
            return {
                'is_fake': True,
                'confidence': 0.6,
                'reason': f'Clickbait title pattern detected: {pattern}'
            }

    # Check 3: Suspicious keywords
    title_lower = title.lower()
    suspicious_count = sum(1 for kw in SUSPICIOUS_KEYWORDS if kw.lower() in title_lower)
    if suspicious_count >= 2:
        return {
            'is_fake': True,
            'confidence': 0.5 + suspicious_count * 0.1,
            'reason': f'Multiple suspicious keywords: {suspicious_count}'
        }

    # Check 4: All caps title (shouting)
    if title.isupper() and len(title) > 10:
        return {
            'is_fake': True,
            'confidence': 0.4,
            'reason': 'All-caps title (shouting pattern)'
        }

    # Check 5: Excessive punctuation
    if title.count('!') > 2 or title.count('?') > 2:
        return {
            'is_fake': True,
            'confidence': 0.4,
            'reason': 'Excessive punctuation'
        }

    # Default: likely genuine
    return {
        'is_fake': False,
        'confidence': 0.3,
        'reason': 'No suspicious patterns detected'
    }
