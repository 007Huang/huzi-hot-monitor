import requests

url = "https://api.acedata.cloud/aichat2/conversations"

headers = {
    "accept": "application/json",
    "authorization": "Bearer 8a462f67007847f8badcf5bfd5e7885c",
    "content-type": "application/json",
}

payload = {
    "model": "gpt-5.4-mini",  #gpt-5.4   deepseek-v4-flash
    "question": "今天是几号，用一句话介绍下 AceDataCloud。 ",  #今天是几号，用一句话介绍下 AceDataCloud。
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())


import requests

url = "https://api.acedata.cloud/v1/messages"

headers = {
    "accept": "application/json",
    "authorization": "Bearer 8a462f67007847f8badcf5bfd5e7885c",
    "content-type": "application/json"
}

payload = {
    # "model": "claude-sonnet-4-20250514",claude-opus-4-8   gpt-5.4  deepseek-v4-flash  
    # glm-5.1  gpt-5.4-mini
    "model": "claude-sonnet-4-6",
    
    "max_tokens": 1024,
   # "system": "你是一位专业的中文翻译助手，请将用户输入的英文翻译成中文。",
    "messages": [
        {"role": "user", "content": "帮我搜一下最近上海有什么新展览"}
    ]
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
