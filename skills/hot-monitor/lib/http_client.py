"""
HTTP client utilities with proxy auto-detection and bypass
"""

import requests
import os
import sys
from typing import Optional, Dict

def get_safe_session() -> requests.Session:
    """
    Create a requests session that handles proxy issues gracefully.
    Auto-detects and bypasses problematic proxy configurations.
    """
    session = requests.Session()

    # Check for problematic proxy settings
    proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
    has_proxy = any(os.environ.get(var) for var in proxy_vars)

    if has_proxy:
        # Test if proxy works
        try:
            test_response = session.get(
                'https://httpbin.org/ip',
                timeout=5,
                proxies=get_proxies_from_env()
            )
            test_response.raise_for_status()
        except Exception:
            # Proxy is broken, disable it
            print("  ⚠️  Proxy detected but not working, bypassing...")
            session.trust_env = False
            # Clear proxy settings for this session
            session.proxies = {}
    else:
        # No proxy configured, ensure we don't accidentally use system proxy
        session.trust_env = True

    # Default headers
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
    })

    return session

def get_proxies_from_env() -> Dict[str, str]:
    """Get proxy settings from environment variables."""
    proxies = {}
    for var in ['HTTP_PROXY', 'http_proxy']:
        val = os.environ.get(var)
        if val:
            proxies['http'] = val
            break
    for var in ['HTTPS_PROXY', 'https_proxy']:
        val = os.environ.get(var)
        if val:
            proxies['https'] = val
            break
    return proxies

def safe_get(url: str, headers: Optional[Dict] = None, timeout: int = 10, **kwargs) -> requests.Response:
    """
    Make a GET request with proxy auto-detection and fallback.
    """
    session = get_safe_session()

    if headers:
        session.headers.update(headers)

    try:
        response = session.get(url, timeout=timeout, **kwargs)
        response.raise_for_status()
        return response
    except requests.exceptions.ProxyError:
        # Retry without proxy
        print(f"  ⚠️  Proxy error for {url}, retrying without proxy...")
        session.trust_env = False
        session.proxies = {}
        response = session.get(url, timeout=timeout, **kwargs)
        response.raise_for_status()
        return response
    except requests.exceptions.HTTPError as e:
        # If we get a 412 Precondition Failed, retry with a fresh session without proxy
        if response.status_code == 412:
            print("  412 Precondition Failed, retrying without proxy...")
            fresh_session = requests.Session()
            fresh_session.trust_env = False
            fresh_session.proxies = {}
            fresh_session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
            })
            if headers:
                fresh_session.headers.update(headers)
            response = fresh_session.get(url, timeout=timeout, **kwargs)
            response.raise_for_status()
            return response
        raise

def safe_post(url: str, headers: Optional[Dict] = None, json: Optional[Dict] = None, timeout: int = 30, **kwargs) -> requests.Response:
    """
    Make a POST request with proxy auto-detection and fallback.
    """
    session = get_safe_session()

    if headers:
        session.headers.update(headers)

    try:
        response = session.post(url, json=json, timeout=timeout, **kwargs)
        response.raise_for_status()
        return response
    except requests.exceptions.ProxyError:
        # Retry without proxy
        print(f"  ⚠️  Proxy error for {url}, retrying without proxy...")
        session.trust_env = False
        session.proxies = {}
        response = session.post(url, json=json, timeout=timeout, **kwargs)
        response.raise_for_status()
        return response
