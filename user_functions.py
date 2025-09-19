import requests
import os

def fetch_mcp_metrics(repo_url, token):
    mcp_api = "https://api.githubcopilot.com/mcp/repos"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{mcp_api}?repo={repo_url}", headers=headers)
    if response.status_code == 200:
        return response.json()
    return {"error": f"Failed to fetch MCP metrics: {response.status_code}"}

def generate_scorecard(owner, repo):
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        return {"error": "GITHUB_TOKEN not found in environment. Please set it in your .env file."}
    repo_url = f"https://github.com/{owner}/{repo}"
    metrics = fetch_mcp_metrics(repo_url, token)

user_functions = [generate_scorecard]
