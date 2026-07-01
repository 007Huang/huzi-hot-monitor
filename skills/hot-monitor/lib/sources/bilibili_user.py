"""
Bilibili user video crawler
Fetches a Bilibili user's videos via public search (no auth required)
Uses search-based discovery since direct space API requires authentication
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from typing import List, Dict
import time

from http_client import safe_get


def fetch_bilibili_user_videos(uid: int, username: str, limit: int = 20) -> List[Dict]:
    """
    Fetch a Bilibili user's videos via search-based discovery.
    Direct space API requires WBI authentication, so we use search instead.

    Args:
        uid: Bilibili user ID (UID)
        username: Bilibili username for search
        limit: Max number of videos to fetch

    Returns:
        List of trend dicts with unified format
    """
    try:
        # Use search API to find user's videos
        # Search for videos by this user
        import urllib.parse
        encoded_username = urllib.parse.quote(username)
        search_url = f"https://api.bilibili.com/x/web-interface/search/type?keyword={encoded_username}&search_type=video&page=1&pagesize={limit}"

        headers = {
            'Referer': 'https://search.bilibili.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Origin': 'https://search.bilibili.com',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
        }

        # Use a session with cookies (visit search page first to get cookies)
        import requests
        session = requests.Session()
        session.trust_env = False
        session.headers.update(headers)
        session.get('https://search.bilibili.com/', timeout=10)

        response = session.get(search_url, timeout=10)
        data = response.json()

        if data.get('code') != 0:
            print(f"  Bilibili search API error: {data.get('message', 'Unknown error')}")
            return []

        trends = []
        videos = data.get('data', {}).get('result', [])

        for i, video in enumerate(videos[:limit]):
            title = video.get('title', '')
            if not title:
                continue

            # Clean HTML tags from title
            import re
            title = re.sub(r'<[^>]+>', '', title)

            # Build video URL
            bvid = video.get('bvid', '')
            video_url = f"https://www.bilibili.com/video/{bvid}" if bvid else ''

            # Parse created time (Unix timestamp)
            created_ts = video.get('pubdate', 0)
            created_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime(created_ts)) if created_ts else time.strftime('%Y-%m-%dT%H:%M:%SZ')

            # Score based on view count (logarithmic scale)
            play_count = video.get('play', 0)
            if play_count and isinstance(play_count, (int, float)):
                import math
                score = min(100, int(50 + math.log10(max(play_count, 1)) * 10))
            else:
                score = max(50, 100 - i * 5)

            trends.append({
                'id': f"bilibili-{video.get('aid', i):05d}",
                'title': title,
                'url': video_url,
                'description': video.get('description', ''),
                'score': score,
                'source': 'bilibili-user',
                'source_label': 'Bilibili',
                'author': video.get('author', ''),
                'interactions': {
                    'views': play_count if isinstance(play_count, (int, float)) else 0,
                    'likes': video.get('like', 0),
                    'comments': video.get('review', 0),
                },
                'created_at': created_at,
                'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'platform': 'bilibili',
                'bvid': bvid,
            })

        return trends
    except Exception as e:
        print(f"  Bilibili user fetch error: {e}")
        return []


def fetch_bilibili_user_by_name(username: str, limit: int = 20) -> List[Dict]:
    """
    Search for a Bilibili user by name and fetch their videos.
    First searches for the user, then fetches their videos.

    Args:
        username: Bilibili username (e.g., "程序员鱼皮")
        limit: Max number of videos to fetch

    Returns:
        List of trend dicts with unified format
    """
    try:
        # Search for user via Bilibili search API
        search_url = f"https://api.bilibili.com/x/web-interface/search/type?keyword={username}&search_type=bili_user"

        headers = {
            'Referer': 'https://search.bilibili.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Origin': 'https://search.bilibili.com',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
        }

        # Use a session with cookies (visit search page first to get cookies)
        import requests
        session = requests.Session()
        session.trust_env = False
        session.headers.update(headers)
        session.get('https://search.bilibili.com/', timeout=10)

        response = session.get(search_url, timeout=10)
        data = response.json()

        if data.get('code') != 0:
            print(f"  Bilibili search API error: {data.get('message', 'Unknown error')}")
            return []

        # Extract user results
        users = data.get('data', {}).get('result', [])
        if not users:
            print(f"  No Bilibili user found for: {username}")
            return []

        # Find best match (first result is usually the best)
        best_match = users[0]
        uid = best_match.get('mid')

        if not uid:
            print(f"  Could not extract UID for user: {username}")
            return []

        # Avoid printing unicode that may fail on Windows
        try:
            uname = best_match.get('uname', username)
            print(f"  Found Bilibili user: {uname} (UID: {uid})")
        except Exception:
            print(f"  Found Bilibili user: {username} (UID: {uid})")

        # Fetch videos for this user
        return fetch_bilibili_user_videos(uid, username, limit)

    except Exception as e:
        print(f"  Bilibili user search error: {e}")
        return []
