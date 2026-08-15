import os
import hashlib
import json
from datetime import datetime

from kafka import KafkaConsumer
from dotenv import load_dotenv

# Langchain & Qdrant imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models
from pydantic import BaseModel, Field

load_dotenv()

QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "CompanyData"
KAFKA_TOPIC = "document-ingestion"

qdrant_client = QdrantClient(url=QDRANT_URL)
embedding_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

if not qdrant_client.collection_exists(collection_name=COLLECTION_NAME):
    print(f"[*] Collection '{COLLECTION_NAME}' not found. Creating it now...")
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(
            size=3072,  # Gemini embeddings are 768 dimensions
            distance=models.Distance.COSINE
        )
    )

vector_store = QdrantVectorStore(
    client=qdrant_client,
    collection_name=COLLECTION_NAME,
    embedding=embedding_model
)

# LLM for Metadata Extraction
metadata_llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", temperature=0)

class DocumentMetadata(BaseModel):
    effective_year: int = Field(
        description="The four-digit effective business year or publication year of the document. If multiple years are mentioned, pick the one that represents the document's core effective date."
    )
    document_topic: str = Field(
        description="The core category or title of the document (e.g., 'Remote Work Policy', 'API Architecture'). Must exactly match an existing topic if it's an update."
    )

structured_metadata_llm = metadata_llm.with_structured_output(DocumentMetadata)

def extract_document_metadata(pages, default_year=datetime.now().year) -> DocumentMetadata:
    preview_text = pages[0].page_content 
    
    existing_topics = get_active_topics()
    
    topics_list_str = ", ".join(existing_topics) if existing_topics else "None (Database is empty)"
    
    prompt = f"""
    Analyze the following text from the cover page of a company document.
    
    TASK 1: Extract the primary effective year or publication year. 
    If you absolutely cannot find a year, return {default_year}.
    
    TASK 2: Determine the core document topic (e.g., 'Remote Work Policy').
    CRITICAL: Here is a list of topics currently in our database: 
    [{topics_list_str}]
    
    If this new document is an updated version of one of those existing topics, you MUST output the exact string from the list.
    If it is a completely new topic not on the list, generate a short, generic 2-4 word title for it.
    
    Document Text:
    {preview_text}
    """
    
    return structured_metadata_llm.invoke(prompt)
    

def deprecate_old_versions(document_topic: str, new_effective_year: int):

    print(f"[*] Checking for previous versions of {document_topic} in Qdrant...")
    search_filter = models.Filter(
        must=[
            models.FieldCondition(key="metadata.document_topic", match=models.MatchValue(value=document_topic)),
            models.FieldCondition(key="metadata.is_active", match=models.MatchValue(value=True))
        ]
    )
    
    records, _ = qdrant_client.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=search_filter,
        with_payload=True,
        limit=10000 
    )
    
    if not records:
        print("    -> No active prior versions found.")
        return
        
    print(f"    -> Found {len(records)} active chunks. Deprecating them...")
    point_ids = [record.id for record in records]
    
    qdrant_client.set_payload(
        collection_name=COLLECTION_NAME,
        payload={
            "metadata": {
                "is_active": False,
                "valid_to_year": new_effective_year 
            }
        },
        points=point_ids
    )
    print("    -> Old versions successfully deprecated.")


def get_active_topics() -> list:
    try:
        search_filter = models.Filter(
            must=[models.FieldCondition(key="metadata.is_active", match=models.MatchValue(value=True))]
        )
        
        records, _ = qdrant_client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=search_filter,
            with_payload=True,
            limit=10000 
        )
        
        unique_topics = set()
        for record in records:
            topic = record.payload.get("metadata", {}).get("document_topic")
            if topic:
                unique_topics.add(topic)
                
        return list(unique_topics)

    except Exception as e:
        print(f"[!] Warning: Could not fetch active topics (maybe collection is empty). Error: {e}")
        return []

def process_and_embed_pdf(event_data : dict):
    file_path = event_data["file_path"]
    doc_id = event_data["doc_id"]

    filename = os.path.basename(file_path)

    print(f"\n [Kafka Worker] Ingesting :{filename}")
    try:
        loader = PyPDFLoader(file_path)
        pages = loader.load()
        if not pages:
            print(f"[!] {filename} is empty or unreadable. Skipping.")
            return

        extracted_data = extract_document_metadata(pages)
        
        deprecate_old_versions(extracted_data.document_topic, extracted_data.effective_year)

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = text_splitter.split_documents(pages)
        
        chunk_ids = []
        for i, chunk in enumerate(chunks):
            unique_string = f"{doc_id}_chunk_{i}"
            chunk_hash_id = hashlib.md5(unique_string.encode()).hexdigest()
            qdrant_uuid = f"{chunk_hash_id[:8]}-{chunk_hash_id[8:12]}-{chunk_hash_id[12:16]}-{chunk_hash_id[16:20]}-{chunk_hash_id[20:]}"
            
            chunk_ids.append(qdrant_uuid)
            
            chunk.metadata = {
                "doc_id" : doc_id,
                "filename": filename,
                "valid_from_year": extracted_data.effective_year,
                "document_topic" : extracted_data.document_topic,
                "valid_to_year": 2099, # Represents present/future
                "is_active": True,
                "page": chunk.metadata.get("page", 0) # Keep page numbers if available
            }

        vector_store.add_documents(documents=chunks, ids=chunk_ids)
        print(f"[✓] SUCCESS: {filename} is live in the vector database.\n")
        
    except Exception as e:
        print(f"[ERROR] Failed to process {filename}: {e}\n")


if __name__ == "__main__":
    print("[*] Starting Kafka Ingestion Consumer...")
    consumer = KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=['localhost:9092'],
        value_deserializer=lambda x: json.loads(x.decode('utf-8')),
        auto_offset_reset='earliest'
    )

    for message in consumer:
        try:
            process_and_embed_pdf(message.value)
        except Exception as e:
            print(f"[!] Ingestion failed: {e}")