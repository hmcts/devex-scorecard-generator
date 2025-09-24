import requests

def fetch_file_from_github(owner, repo, filename, token=None):
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{filename}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = requests.get(url, headers=headers)
    print(f"Fetching {url} - Status: {response.status_code} - Response: {response.text}")
    if response.status_code == 200:
        import base64
        content = response.json()["content"]
        return base64.b64decode(content).decode("utf-8")
    return f"{filename} not found or inaccessible."

def fetch_repo_context_github(owner, repo, token):
    files_to_read = ["README.md", "CODEOWNERS"]
    context = {}
    for filename in files_to_read:
        content = fetch_file_from_github(owner, repo, filename, token)
        context[filename] = content
    return context

def generate_scorecard(owner, repo, token):
    context = fetch_repo_context_github(owner, repo, token)
    return context

user_functions = [generate_scorecard]