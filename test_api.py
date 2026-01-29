"""
Quick test script to verify the API is working
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed!")
            print(f"   Model loaded: {data['model_loaded']}")
            print(f"   GPU available: {data['gpu_available']}")
            if data.get('vram_stats'):
                vram = data['vram_stats']
                print(f"   VRAM: {vram['allocated_gb']:.1f}GB / {vram['total_gb']:.1f}GB")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Could not connect to API: {e}")
        print("   Make sure the API is running: python main.py")
        return False

def test_chat():
    """Test chat endpoint"""
    print("\n🎲 Testing chat endpoint...")
    
    session_id = f"test-{int(time.time())}"
    message = "I walk into a dimly lit bar in Watson. What do I see?"
    
    print(f"   Session: {session_id}")
    print(f"   Message: {message}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat",
            json={
                "session_id": session_id,
                "message": message,
                "use_memory": True
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ Chat response received!")
            print(f"   Processing time: {data['processing_time']:.2f}s")
            print(f"   Memories used: {data['memories_used']}")
            print(f"\n📜 DM Response:\n{'-'*60}")
            print(data['response'])
            print('-'*60)
            return True
        else:
            print(f"❌ Chat failed: {response.status_code}")
            print(f"   {response.text}")
            return False
    except Exception as e:
        print(f"❌ Chat error: {e}")
        return False

def test_memory():
    """Test memory endpoints"""
    print("\n🧠 Testing memory system...")
    
    session_id = f"test-{int(time.time())}"
    
    # Add a memory
    print("   Adding memory...")
    try:
        response = requests.post(
            f"{BASE_URL}/memory/add",
            json={
                "session_id": session_id,
                "content": "V made a deal with Rogue at the Afterlife for 10,000 eddies",
                "memory_type": "plot_point",
                "metadata": {"npc": "Rogue", "location": "Afterlife"}
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Memory added: {data['memory_id'][:8]}...")
        else:
            print(f"   ❌ Failed to add memory: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error adding memory: {e}")
        return False
    
    # Retrieve memory
    print("   Retrieving memories...")
    try:
        response = requests.post(
            f"{BASE_URL}/memory/retrieve",
            json={
                "session_id": session_id,
                "query": "What happened at the Afterlife?",
                "top_k": 5
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Retrieved {data['count']} memories")
            return True
        else:
            print(f"   ❌ Failed to retrieve memories: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error retrieving memories: {e}")
        return False

def main():
    print("=" * 60)
    print("🎮 Cyberpunk DM AI - Quick Test")
    print("=" * 60)
    
    # Test health
    if not test_health():
        print("\n❌ Cannot proceed - API is not responding")
        return
    
    # Test chat
    if not test_chat():
        print("\n⚠️ Chat test failed")
    
    # Test memory
    if not test_memory():
        print("\n⚠️ Memory test failed")
    
    print("\n" + "=" * 60)
    print("✅ Testing complete!")
    print("=" * 60)
    print("\n📚 Next steps:")
    print("   1. Integrate with your webapp")
    print("   2. Customize prompts in app/prompts.py")
    print("   3. Check out API docs: http://localhost:8000/docs")

if __name__ == "__main__":
    main()
