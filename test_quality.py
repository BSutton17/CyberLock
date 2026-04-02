"""
Quality Test
Tests corporation knowledge, characters, combat, and scenarios
"""

import requests
import time
from typing import List, Dict

BASE_URL = "http://localhost:8000"


def run_quality_tests():
    print("=" * 70)
    print("MEDIUM QUALITY TEST SUITE")
    print("=" * 70)
    print("\nThis will test:")
    print("  - Corporation knowledge (3 tests)")
    print("  - Character knowledge (6 tests)")
    print("  - Combat narration (2 tests)")
    print("  - Scenario handling (2 tests)")
    print("  - World knowledge (2 tests)")
    print("\nEstimated time: 15-30 minutes")
    print("=" * 70)
    
    # Test categories
    tests = [
        # === CORPORATION TESTS ===
        {
            "category": "Corporations",
            "name": "Singularity Knowledge",
            "message": "What is Singularity corporation?",
            "check_for": ["agi", "robot", "automation"],
            "expect": "Should mention AGI, robots, and automation"
        },
        {
            "category": "Corporations",
            "name": "Particle Genesis Knowledge",
            "message": "Tell me about Particle Genesis",
            "check_for": ["fusion", "energy", "power"],
            "expect": "Should mention fusion cores and energy"
        },
        {
            "category": "Corporations",
            "name": "Crown Gene Knowledge",
            "message": "What does Crown Gene do?",
            "check_for": ["body", "modification", "neurochip"],
            "expect": "Should mention body mods and neurochips"
        },
        
        # === CHARACTER TESTS ===
        {
            "category": "Characters",
            "name": "Julius Stein (Last Legion)",
            "message": "Who is Julius Stein?",
            "check_for": ["enforcer", "bar", "forty"],
            "expect": "Should mention former enforcer, now bartender, 45 years old"
        },
        {
            "category": "Characters",
            "name": "Milo (Patchwork)",
            "message": "Tell me about Milo Patchwork",
            "check_for": ["drone", "inventor", "heal"],
            "expect": "Should mention drone that can heal and repair"
        },
        {
            "category": "Characters",
            "name": "Jack (Livewire)",
            "message": "Who is Jack Livewire?",
            "check_for": ["guitar", "fusion", "frequency"],
            "expect": "Should mention guitar that affects fusion cores"
        },
        {
            "category": "Characters",
            "name": "Audrey (True North)",
            "message": "Tell me about Audrey Miller",
            "check_for": ["enforcer", "father", "left"],
            "expect": "Should mention former enforcer who left the force"
        },
        {
            "category": "Characters",
            "name": "Nile (Ghost Shell)",
            "message": "Who is Nile Adair?",
            "check_for": ["hack", "slum", "system"],
            "expect": "Should mention hacker from the slums"
        },
        {
            "category": "Characters",
            "name": "Anna Bray",
            "message": "Tell me about Anna Bray",
            "check_for": ["crown gene", "fusion", "modification"],
            "expect": "Should mention former Crown Gene employee who uses fusion energy"
        },
        
        # === COMBAT TESTS ===
        {
            "category": "Combat",
            "name": "Melee Combat Narration",
            "message": "I attack the Enforcer bot with my hammer",
            "check_for": ["attack", "enforcer", "bot"],
            "expect": "Should describe combat action against enforcer bot"
        },
        {
            "category": "Combat",
            "name": "Tech Combat Narration",
            "message": "I hack into the Division Strategist's systems",
            "check_for": ["hack", "system", "tactical"],
            "expect": "Should describe hacking attempt"
        },
        
        # === SCENARIO TESTS ===
        {
            "category": "Scenarios",
            "name": "Market Explosion Response",
            "message": "I investigate the explosion at the market",
            "check_for": ["explosion", "rebels", "enforcers"],
            "expect": "Should describe rebels vs enforcers conflict"
        },
        {
            "category": "Scenarios",
            "name": "Moral Choice Handling",
            "message": "Enforcers are fighting rebels. What should I do?",
            "check_for": ["choice", "side", "enforcers", "rebels"],
            "expect": "Should present meaningful choice between factions"
        },
        
        # === WORLD KNOWLEDGE TESTS ===
        {
            "category": "World",
            "name": "Fusion Core Knowledge",
            "message": "What are fusion cores and how do they work?",
            "check_for": ["particle genesis", "energy", "power"],
            "expect": "Should explain fusion cores created by Particle Genesis"
        },
        {
            "category": "World",
            "name": "Neurochip Knowledge",
            "message": "What are neurochips?",
            "check_for": ["crown gene", "identification", "cyberspace"],
            "expect": "Should explain neurochips as ID and cyberspace interface"
        },
    ]
    
    # Run tests
    session_id = f"quality-test-{int(time.time())}"
    results = {
        "passed": 0,
        "failed": 0,
        "errors": 0,
        "details": []
    }
    
    current_category = None
    
    for i, test in enumerate(tests, 1):
        # Print category header
        if test["category"] != current_category:
            current_category = test["category"]
            print(f"\n{'=' * 70}")
            print(f"CATEGORY: {current_category.upper()}")
            print("=" * 70)
        
        print(f"\n[{i}/{len(tests)}] Test: {test['name']}")
        print(f"Question: {test['message']}")
        print(f"Expecting: {test['expect']}")
        
        try:
            # Make request
            response = requests.post(
                f"{BASE_URL}/chat",
                json={
                    "session_id": session_id,
                    "message": test['message'],
                    "use_memory": False
                },
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                resp_text = data['response'].lower()
                processing_time = data.get('processing_time', 0)
                
                # Check for expected keywords
                found = [kw for kw in test['check_for'] if kw in resp_text]
                passed = len(found) >= len(test['check_for']) // 2  # At least half the keywords
                
                if passed:
                    print(f"PASS (found: {found})")
                    print(f"Response time: {processing_time:.2f}s")
                    results["passed"] += 1
                else:
                    print(f"FAIL (found: {found}, expected: {test['check_for']})")
                    results["failed"] += 1
                
                # Show response preview
                preview = data['response'][:200]
                print(f"Response preview: {preview}...")
                
                # Store details
                results["details"].append({
                    "test": test['name'],
                    "passed": passed,
                    "found_keywords": found,
                    "response_time": processing_time,
                    "response": data['response']
                })
                
            else:
                print(f"HTTP ERROR: {response.status_code}")
                print(f"   {response.text[:200]}")
                results["errors"] += 1
                
        except requests.exceptions.Timeout:
            print(f"TIMEOUT: Request took longer than 60 seconds")
            results["errors"] += 1
        except Exception as e:
            print(f"ERROR: {e}")
            results["errors"] += 1
        
        # Brief pause between requests
        if i < len(tests):
            time.sleep(2)
    
    # Print summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    total = len(tests)
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {results['passed']} ({100*results['passed']//total}%)")
    print(f"Failed: {results['failed']} ({100*results['failed']//total}%)")
    print(f"Errors: {results['errors']}")
    
    # Category breakdown
    categories = {}
    for detail in results["details"]:
        cat = None
        for test in tests:
            if test["name"] == detail["test"]:
                cat = test["category"]
                break
        
        if cat:
            if cat not in categories:
                categories[cat] = {"passed": 0, "total": 0}
            categories[cat]["total"] += 1
            if detail["passed"]:
                categories[cat]["passed"] += 1
    
    print("\nBreakdown by Category:")
    for cat, stats in categories.items():
        pct = 100 * stats["passed"] // stats["total"] if stats["total"] > 0 else 0
        print(f"  {cat}: {stats['passed']}/{stats['total']} ({pct}%)")
    
    # Average response time
    times = [d["response_time"] for d in results["details"] if "response_time" in d]
    if times:
        avg_time = sum(times) / len(times)
        print(f"\nAverage Response Time: {avg_time:.2f}s")
    
    print("\n" + "=" * 70)
    
    # Overall result
    if results["passed"] >= total * 0.7:  # 70% pass rate
        print("OVERALL RESULT: PASS")
        print("Quality tests look good!")
    elif results["passed"] >= total * 0.5:  # 50% pass rate
        print("OVERALL RESULT: MARGINAL")
        print("Some issues detected, may need prompt improvements")
    else:
        print("OVERALL RESULT: FAIL")
        print("Significant issues detected, prompts need work")
    
    print("=" * 70)
    
    return results


def main():
    print("\nPREREQUISITES:")
    print("  1. API must be running (python app/main.py)")
    print("  2. Model must be loaded")
    
    input("\nPress Enter to start tests (or Ctrl+C to cancel)...")
    
    try:
        results = run_quality_tests()
        
        # Optionally save results
        save = input("\nSave detailed results to file? (y/n): ")
        if save.lower() == 'y':
            import json
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            filename = f"quality_test_results_{timestamp}.json"
            
            with open(filename, 'w') as f:
                json.dump(results, f, indent=2)
            
            print(f"Results saved to {filename}")
    
    except KeyboardInterrupt:
        print("\n\nTests cancelled by user")
    except Exception as e:
        print(f"\n\nTest suite error: {e}")


if __name__ == "__main__":
    main()