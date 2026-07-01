"""
Blogger search crawler
Searches for specific blogger content using site-specific queries on Bing/DDG
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


def search_blogger_content(author: str, keywords: List[str], limit: int = 20) -> List[Dict]:
    """
    Search for blogger content across platforms using site-specific queries.

    Args:
        author: Blogger name (e.g., "程序员鱼皮")
        keywords: List of keywords to filter content
        limit: Max results per source

    Returns:
        List of trend dicts with unified format
    """
    all_results = []

    # Search on different platforms
    platforms = [
        ('bilibili.com', 'Bilibili'),
        ('zhihu.com', 'Zhihu'),
        ('weibo.com', 'Weibo'),
    ]

    keyword_query = ' '.join(keywords) if keywords else ''

    for domain, label in platforms:
        try:
            # Build query: author + keywords + site filter
            query_parts = [author]
            if keyword_query:
                query_parts.append(keyword_query)
            query_parts.append(f'site:{domain}')
            query = ' '.join(query_parts)

            # Try Bing first
            results = _search_bing_blogger(query, limit // 2)
            if not results:
                # Fallback to DDG
                results = _search_ddg_blogger(query, limit // 2)

            for r in results:
                r['source'] = 'blogger-search'
                r['source_label'] = f'{label} (Search)'
                r['author'] = author

            all_results.extend(results)

        except Exception as e:
            print(f"  Blogger search error for {domain}: {e}")
            continue

    # Also do a general search without site filter
    try:
        general_query = f'{author} {" ".join(keywords)}'
        results = _search_bing_blogger(general_query, limit // 3)
        for r in results:
            r['source'] = 'blogger-search'
            r['source_label'] = 'General Search'
            r['author'] = author
        all_results.extend(results)
    except Exception as e:
        print(f"  General blogger search error: {e}")

    return all_results


def _search_bing_blogger(query: str, limit: int) -> List[Dict]:
    """Search Bing for blogger content."""
    try:
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

            desc_elem = item.find('p')
            description = desc_elem.get_text(strip=True) if desc_elem else ''

            score = max(50, 100 - len(results) * 5)

            results.append({
                'id': f"blogger-bing-{hash(title) % 100000:05d}",
                'title': title,
                'url': url,
                'description': description,
                'score': score,
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            })

        return results
    except Exception as e:
        print(f"  Bing blogger search error: {e}")
        return []


def _search_ddg_blogger(query: str, limit: int) -> List[Dict]:
    """Search DuckDuckGo for blogger content."""
    try:
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        response = safe_get(url, timeout=10)

        soup = BeautifulSoup(response.text, 'html.parser')
        results = []

        for item in soup.find_all('div', class_='result')[:limit]:
            title_elem = item.find('a', class_='result__a')
            if not title_elem:
                continue

            title = title_elem.get_text(strip=True)
            url = title_elem.get('href', '')

            desc_elem = item.find('a', class_='result__snippet')
            description = desc_elem.get_text(strip=True) if desc_elem else ''

            score = max(45, 95 - len(results) * 5)

            results.append({
                'id': f"blogger-ddg-{hash(title) % 100000:05d}",
                'title': title,
                'url': url,
                'description': description,
                'score': score,
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            })

        return results
    except Exception as e:
        print(f"  DDG blogger search error: {e}")
        return []
