"""
Zhihu hot search crawler
No API keys required, uses public hot list page
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from typing import List, Dict
import time

from http_client import safe_get

def fetch_zhihu_hot(limit: int = 20) -> List[Dict]:
    """Fetch Zhihu hot search trends."""
    try:
        # Zhihu hot list API (unofficial, public)
        url = "https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total"
        headers = {
            'Referer': 'https://www.zhihu.com/'
        }
        response = safe_get(url, headers=headers, timeout=10)

        data = response.json()
        trends = []

        hot_list = data.get('data', [])

        for i, item in enumerate(hot_list[:limit]):
            card = item.get('card', {})
            title = card.get('title', '')
            if not title:
                continue

            # Score based on hot rank
            hot_score = item.get('feeds', {}).get('hot', 0)
            score = min(100, int(hot_score / 100)) if hot_score else max(90, 100 - i * 2)

            trends.append({
                'id': f"zhihu-{item.get('id', i):05d}",
                'title': title,
                'url': card.get('url', ''),
                'description': card.get('excerpt', ''),
                'score': score,
                'source': 'zhihu',
                'source_label': '知乎',
                'interactions': {
                    'views': hot_score,
                },
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            })

        return trends
    except Exception as e:
        print(f"  Zhihu fetch error: {e}")
        return []
