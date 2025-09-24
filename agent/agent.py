import os
from typing import Any
from dotenv import load_dotenv
from pathlib import Path
from azure.identity import DefaultAzureCredential
from azure.ai.agents import AgentsClient
from azure.ai.agents.models import FunctionTool, ToolSet, ListSortOrder, MessageRole
from user_functions import user_functions
def main():
    load_dotenv()
    project_endpoint = os.getenv("PROJECT_ENDPOINT")
    model_deployment = os.getenv("MODEL_DEPLOYMENT_NAME")

    # Connect to the Agent client
    agent_client = AgentsClient(
        endpoint=project_endpoint,
        credential=DefaultAzureCredential(
            exclude_environment_credential=True,
            exclude_managed_identity_credential=True,
        ),
    )
    with agent_client:
        print(f"Project endpoint: {project_endpoint}")

        # Prepare function tool
        functions = FunctionTool(user_functions)
        toolset = ToolSet()
        toolset.add(functions)
        agent_client.enable_auto_function_calls(toolset)

        # Define an agent that can auto-call your function tool
        agent = agent_client.create_agent(
            name="DevEx Scorecard Generator Agent",
            model=model_deployment,
            instructions="""
        You are a helpful assistant that generates a developer experience scorecard for a given GitHub repository.""",
            toolset=toolset,
            metadata={"created_by": "agent-function.py", "purpose": "function_tool_demo"},
        )
        print(f"Using agent: {agent.name} (id: {agent.id})")

        # Create a thread for the conversation
        thread = agent_client.threads.create()

        # Prompt the user for details once
        print("\nEnter repository details for scorecard generation:")
        owner = input("Enter GitHub owner: ").strip()
        repo = input("Enter GitHub repository name: ").strip()
        user_prompt = f"Generate a developer experience scorecard for the repository {owner}/{repo}."

        # Send a prompt to the agent
        agent_client.messages.create(
            thread_id=thread.id,
            role="user",
            content=user_prompt,
        )

        run = agent_client.runs.create_and_process(thread_id=thread.id, agent_id=agent.id)

        # Check the run status for failures
        if run.status == "failed":
            print(f"Run failed: {run.last_error}")

        # Show the latest response from the agent
        agent_client.messages.get_last_message_text_by_role(
            thread_id=thread.id,
            role=MessageRole.AGENT,
        )

        # Get the conversation history
        import json
        messages = agent_client.messages.list(thread_id=thread.id, order=ListSortOrder.ASCENDING)
        for message in messages:
            if message.role == MessageRole.AGENT and message.text_messages:
                last_msg = message.text_messages[-1]
                try:
                    result = json.loads(last_msg.text.value)
                    print(f"Score: {result.get('score')}")
                    print(f"Summary (traffic light color): {result.get('color')}")
                except Exception:
                    print(last_msg.text.value)

        # Delete resources
        agent_client.threads.delete(thread_id=thread.id)
        agent_client.delete_agent(agent_id=agent.id)

if __name__ == '__main__':
    main()