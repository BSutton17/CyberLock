"""
RAG (Retrieval-Augmented Generation) system using ChromaDB
For long-term memory and context retrieval
"""

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid
from loguru import logger
from pathlib import Path


class MemoryStore:
    """ChromaDB-based vector database for game memory"""
    
    def __init__(
        self,
        db_path: str = "./data/chroma_db",
        embedding_model: str = "all-MiniLM-L6-v2",
        collection_name: str = "game_memory"
    ):
        self.db_path = Path(db_path)
        self.db_path.mkdir(parents=True, exist_ok=True)
        
        self.embedding_model_name = embedding_model
        self.collection_name = collection_name
        
        logger.info(f"Initializing MemoryStore at {db_path}")
        
        # Initialize ChromaDB
        self.client = chromadb.PersistentClient(
            path=str(self.db_path),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Load embedding model
        logger.info(f"Loading embedding model: {embedding_model}")
        self.embedding_model = SentenceTransformer(embedding_model)
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}  # Use cosine similarity
        )
        
        logger.success("MemoryStore initialized successfully")
    
    def add_memory(
        self,
        content: str,
        memory_type: str,
        session_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Add a new memory to the database
        
        Args:
            content: The text content to store
            memory_type: Type of memory (npc, location, plot_point, etc.)
            session_id: Game session identifier
            metadata: Additional metadata (character names, locations, etc.)
        
        Returns:
            Memory ID
        """
        
        memory_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Prepare metadata
        meta = {
            "type": memory_type,
            "session_id": session_id,
            "timestamp": timestamp,
            **(metadata or {})
        }
        
        # Generate embedding
        embedding = self.embedding_model.encode(content).tolist()
        
        # Add to collection
        self.collection.add(
            ids=[memory_id],
            embeddings=[embedding],
            documents=[content],
            metadatas=[meta]
        )
        
        logger.debug(f"Added memory: {memory_id} ({memory_type})")
        return memory_id
    
    def retrieve_memories(
        self,
        query: str,
        session_id: Optional[str] = None,
        memory_types: Optional[List[str]] = None,
        top_k: int = 5,
        similarity_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant memories based on a query
        
        Args:
            query: Search query
            session_id: Filter by session (optional)
            memory_types: Filter by memory types (optional)
            top_k: Number of results to return
            similarity_threshold: Minimum similarity score (0-1)
        
        Returns:
            List of relevant memories with metadata
        """
        
        # Generate query embedding
        query_embedding = self.embedding_model.encode(query).tolist()
        
        # Build where filter
        where_filter = {}
        if session_id:
            where_filter["session_id"] = session_id
        if memory_types:
            where_filter["type"] = {"$in": memory_types}
        
        # Query collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter if where_filter else None
        )
        
        # Format results
        memories = []
        if results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                distance = results["distances"][0][i]
                similarity = 1 - distance  # Convert distance to similarity
                
                # Filter by threshold
                if similarity >= similarity_threshold:
                    memories.append({
                        "id": results["ids"][0][i],
                        "content": doc,
                        "metadata": results["metadatas"][0][i],
                        "similarity": similarity
                    })
        
        logger.debug(f"Retrieved {len(memories)} relevant memories")
        return memories
    
    def get_recent_memories(
        self,
        session_id: str,
        limit: int = 10,
        memory_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Get most recent memories from a session"""
        
        where_filter = {"session_id": session_id}
        if memory_types:
            where_filter["type"] = {"$in": memory_types}
        
        results = self.collection.get(
            where=where_filter,
            limit=limit
        )
        
        memories = []
        if results["documents"]:
            for i, doc in enumerate(results["documents"]):
                memories.append({
                    "id": results["ids"][i],
                    "content": doc,
                    "metadata": results["metadatas"][i]
                })
        
        # Sort by timestamp (most recent first)
        memories.sort(
            key=lambda x: x["metadata"].get("timestamp", ""),
            reverse=True
        )
        
        return memories[:limit]
    
    def delete_session_memories(self, session_id: str) -> int:
        """Delete all memories from a specific session"""
        
        # Get all IDs for this session
        results = self.collection.get(
            where={"session_id": session_id}
        )
        
        if results["ids"]:
            self.collection.delete(ids=results["ids"])
            count = len(results["ids"])
            logger.info(f"Deleted {count} memories from session {session_id}")
            return count
        
        return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        
        total_count = self.collection.count()
        
        return {
            "total_memories": total_count,
            "collection_name": self.collection_name,
            "db_path": str(self.db_path),
            "embedding_model": self.embedding_model_name
        }


class ContextBuilder:
    """Builds context for the AI by combining system prompts, history, and RAG"""
    
    def __init__(self, memory_store: MemoryStore):
        self.memory_store = memory_store
    
    def build_context(
        self,
        system_prompt: str,
        recent_messages: List[Dict[str, str]],
        current_query: str,
        session_id: str,
        max_rag_results: int = 5
    ) -> Dict[str, Any]:
        """
        Build full context for model inference
        
        Returns:
            {
                "system_prompt": Enhanced system prompt with RAG,
                "messages": Recent message history,
                "retrieved_memories": Relevant memories
            }
        """
        
        # Retrieve relevant memories using RAG
        retrieved_memories = self.memory_store.retrieve_memories(
            query=current_query,
            session_id=session_id,
            top_k=max_rag_results
        )
        
        # Build enhanced system prompt
        enhanced_system = system_prompt
        
        if retrieved_memories:
            memory_context = "\n\n## Relevant Past Events:\n"
            for mem in retrieved_memories:
                memory_context += f"- {mem['content']} (Type: {mem['metadata'].get('type', 'unknown')})\n"
            
            enhanced_system += memory_context
        
        return {
            "system_prompt": enhanced_system,
            "messages": recent_messages,
            "retrieved_memories": retrieved_memories,
            "total_memories_retrieved": len(retrieved_memories)
        }
