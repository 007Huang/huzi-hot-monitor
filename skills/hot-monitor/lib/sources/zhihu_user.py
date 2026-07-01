"""
Zhihu user content crawler
Fetches a Zhihu user's answers and articles via public endpoints
No API keys required
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from bs4 import BeautifulSoup
from urllib.parse import quote_plus
from typing import List, Dict
import time

from http_client import safe_get


def fetch_zhihu_user_content(username: str, limit: int = 20) -> List[Dict]:
    """
    Fetch a Zhihu user's content (answers and articles) via public endpoints.

    Args:
        username: Zhihu username or URL name (e.g., "程序员鱼皮")
        limit: Max number of items to fetch

    Returns:
        List of trend dicts with unified format
    """
    all_results = []

    # Try to fetch answers
    try:
        answers = _fetch_zhihu_answers(username, limit // 2)
        all_results.extend(answers)
    except Exception as e:
        print(f"  Zhihu answers fetch error: {e}")

    # Try to fetch articles
    try:
        articles = _fetch_zhihu_articles(username, limit // 2)
        all_results.extend(articles)
    except Exception as e:
        print(f"  Zhihu articles fetch error: {e}")

    return all_results


def _fetch_zhihu_answers(username: str, limit: int) -> List[Dict]:
    """Fetch Zhihu user answers via search."""
    try:
        # Use search to find user's answers
        query = f"site:zhihu.com {username}"
        url = f"https://www.bing.com/search?q={quote_plus(query)}&count={limit}"

        response = safe_get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        results = []
        for item in soup.find_all('li', class_='b_algo')[:limit]:
            title_elem = item.find('h2')
            if not title_elem:
                continue

            title = title_elem.get_text(strip=True)
            link_elem = title_elem.find('a')
            url = link_elem.get('href', '') if link_elem else ''

            # Only include zhihu.com URLs
            if 'zhihu.com' not in url:
                continue

            desc_elem = item.find('p')
            description = desc_elem.get_text(strip=True) if desc_elem else ''

            score = max(50, 100 - len(results) * 5)

            results.append({
                'id': f"zhihu-answer-{hash(title) % 100000:05d}",
                'title': title,
                'url': url,
                'description': description,
                'score': score,
                'source': 'zhihu-user',
                'source_label': 'Zhihu',
                'author': username,
                'interactions': {},
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'platform': 'zhihu',
                'content_type': 'answer',
            })

        return results
    except Exception as e:
        print(f"  Zhihu answer search error: {e}")
        return []


def _fetch_zhihu_articles(username: str, limit: int) -> List[Dict]:
    """Fetch Zhihu user articles via search."""
    try:
        # Use search to find user's articles
        query = f"site:zhuanlan.zhihu.com {username}"
        url = f"https://www.bing.com/search?q={quote_plus(query)}&count={limit}"

        response = safe_get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        results = []
        for item in soup.find_all('li', class_='b_algo')[:limit]:
            title_elem = item.find('h2')
            if not title_elem:
                continue

            title = title_elem.get_text(strip=True)
            link_elem = title_elem.find('a')
            url = link_elem.get('href', '') if link_elem else ''

            # Only include zhihu.com URLs
            if 'zhihu.com' not in url:
                continue

            desc_elem = item.find('p')
            description = desc_elem.get_text(strip=True) if desc_elem else ''

            score = max(50, 100 - len(results) * 5)

            results.append({
                'id': f"zhihu-article-{hash(title) % 100000:05d}",
                'title': title,
                'url': url,
                'description': description,
                'score': score,
                'source': 'zhihu-user',
                'source_label': 'Zhihu',
                'author': username,
                'interactions': {},
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'platform': 'zhihu',
                'content_type': 'article',
            })

        return results
    except Exception as e:
        print(f"  Zhihu article search error: {e}")
        return []
