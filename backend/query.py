import os
from datetime import datetime
from dotenv import load_dotenv

# LangChain & Qdrant
from langchain_qdrant import QdrantVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from qdrant_client import QdrantClient
from qdrant_client.http import models

from pydantic import BaseModel, Field
from db import get_allowed_doc_ids

load_dotenv()

QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "CompanyData"
CURRENT_YEAR = datetime.now().year

qdrant_client = QdrantClient(url=QDRANT_URL)
embedding_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

if not qdrant_client.collection_exists(collection_name=COLLECTION_NAME):
    print(f"[*] Collection '{COLLECTION_NAME}' not found. Creating it now...")
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(
            size=768,  # Gemini embeddings are 768 dimensions
            distance=models.Distance.COSINE
        )
    )

vector_store = QdrantVectorStore(
    client=qdrant_client,
    collection_name=COLLECTION_NAME,
    embedding=embedding_model
)

router_llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", temperature=0)
generation_llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", temperature=0)


class QueryIntent(BaseModel):
    intent: str = Field(description="Must be strictly 'current' or 'historical'.")
    target_year: int | None = Field(description="Extract the 4-digit year if mentioned, else null.", default=None)
    search_query: str = Field(description="The core topic to search for, with temporal words removed.")

structured_router = router_llm.with_structured_output(QueryIntent)

def route_query(user_question: str) -> QueryIntent:
    """Uses the LLM to determine if the user wants current or historical data."""
    prompt = f"""
    You are a query analysis router for a company knowledge base.
    Determine if the user is asking about CURRENT state or HISTORICAL/PAST state.
    
    Current Year Context: {CURRENT_YEAR}.
    
    RULES:
    1. INTENT = 'current': Default for present-tense ("What is...", "How do we...").
    2. INTENT = 'historical': Triggered by past-tense ("What was...", "Did we used to...").
    3. TARGET YEAR: Extract the year if specified.
    4. SEARCH QUERY: Strip temporal phrases (e.g., "in 2023", "previously") from the output search query.
    
    User Question: {user_question}
    """
    return structured_router.invoke(prompt)


def build_qdrant_filter(intent_data: QueryIntent, user_role: str) -> models.Filter:
    filters = []

    allowed_doc_ids = get_allowed_doc_ids(user_role)
    print(f"    [Security] Role: '{user_role}' | Allowed Doc IDs: {allowed_doc_ids}")
    
    if not allowed_doc_ids:
        return models.Filter(must=[
            models.FieldCondition(key="metadata.doc_id", match=models.MatchValue(value="NO_ACCESS"))
        ])
    
    filters.append(
        models.FieldCondition(
            key="metadata.doc_id", 
            match=models.MatchAny(any=allowed_doc_ids)
        )
    )

    if intent_data.intent == "current":
        filters.append(
            models.FieldCondition(key="metadata.is_active", match=models.MatchValue(value=True))
        )
    
    elif intent_data.intent == "historical":
        if intent_data.target_year:
            filters.append(models.FieldCondition(key="metadata.valid_from_year", range=models.Range(lte=intent_data.target_year)))
            filters.append(models.FieldCondition(key="metadata.valid_to_year", range=models.Range(gte=intent_data.target_year)))
        else:
            filters.append(models.FieldCondition(key="metadata.is_active", match=models.MatchValue(value=False)))

    return models.Filter(must=filters)


def format_docs_with_time(docs):
    formatted_chunks = []
    for doc in docs:
        v_from = doc.metadata.get("valid_from_year", "Unknown")
        v_to = doc.metadata.get("valid_to_year", "Present")

        if v_to == 2099:
            v_to = "Present"
            
        topic = doc.metadata.get("document_topic", "Unknown Document")
        
        chunk_text = f"[SOURCE: {topic} | VALID: {v_from} to {v_to}]\n{doc.page_content}"
        formatted_chunks.append(chunk_text)
        
    return "\n\n---\n\n".join(formatted_chunks)

temporal_template = """
You are an expert internal knowledge assistant. Answer the user's question accurately using ONLY the provided context.

CRITICAL INSTRUCTIONS ON TIME:
You will receive context chunks. Each chunk begins with a validity period (e.g., [VALID: 2022 to 2024]).
1. If the user asks about a specific year, base your answer strictly on the chunks valid during that year.
2. If the user asks a current question, base your answer on the chunks valid up to "Present".
3. CONFLICT RESOLUTION: If two pieces of context contradict each other, the context with the most recent validity period overrides the older context.
Explicitly mention when a policy changed if it is relevant.

Context: 
{context}

Question: {question}

Answer:
"""
prompt = PromptTemplate.from_template(temporal_template)


def ask_knowledge_base(user_question: str, user_role: str = "employee"):
    # Gate 1: Check the LLM's Intent Routing
    intent_data = route_query(user_question)
    print(f"\n[DEBUG 1] LLM Router Intent: {intent_data}")
    
    # Gate 2: Check MySQL Document Permissions
    qdrant_filter = build_qdrant_filter(intent_data, user_role)
    print(f"[DEBUG 2] Qdrant Filter applied: {qdrant_filter}")
    
    # Gate 3: Check Qdrant Vector Retrieval
    dynamic_retriever = vector_store.as_retriever(
        search_kwargs={"k": 4, "filter": qdrant_filter}
    )
    
    retrieved_docs = dynamic_retriever.invoke(intent_data.search_query)
    print(f"[DEBUG 3] Retrieved {len(retrieved_docs)} chunks from Qdrant.\n")
    
    if not retrieved_docs:
        return "I couldn't find any authorized documents matching that criteria in the knowledge base."
        
    formatted_context = format_docs_with_time(retrieved_docs)
    chain = prompt | generation_llm
    response = chain.invoke({"context": formatted_context, "question": user_question})
    
    if isinstance(response.content, list):
        return response.content[0].get("text", "")
    return response.content