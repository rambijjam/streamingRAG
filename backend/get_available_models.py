import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure the API key directly
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

print("Here are the exact model names your API key has access to:")
print("-" * 50)

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            # We strip the "models/" prefix because LangChain adds it automatically
            print(m.name.replace("models/", ""))
except Exception as e:
    print(f"Error connecting to Google API: {e}")