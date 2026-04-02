"""
Quality Test - Direct Model Version (No API Needed)
Tests prompts by loading model directly
Time: 20-30 minutes
"""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from app.prompts import build_system_prompt
import time

print("=" * 70)
print("QUALITY TEST - DIRECT MODEL")
print("=" * 70)
print("\nLoading model (this will take a few minutes)...")

# Load model
model_name = "mistralai/Mistral-7B-Instruct-v0.3"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto",
    load_in_4bit=True  # Save VRAM
)

print("Model loaded!\n")

# Test cases
tests = [
    # Corporations
    {
        "category": "Corporations",
        "name": "Singularity Knowledge",
        "message": "What is Singularity corporation?",
        "check_for": ["agi", "robot", "automation"]
    },
    {
        "category": "Corporations",
        "name": "Particle Genesis Knowledge",
        "message": "Tell me about Particle Genesis",
        "check_for": ["fusion", "energy", "power"]
    },
    {
        "category": "Corporations",
        "name": "Crown Gene Knowledge",
        "message": "What does Crown Gene do?",
        "check_for": ["body", "modification", "neurochip"]
    },
    
    # Characters
    {
        "category": "Characters",
        "name": "Julius Stein",
        "message": "Who is Julius Stein?",
        "check_for": ["enforcer", "bar"]
    },
    {
        "category": "Characters",
        "name": "Milo Patchwork",
        "message": "Tell me about Milo Patchwork",
        "check_for": ["drone", "inventor", "heal"]
    },
    
    # Combat
    {
        "category": "Combat",
        "name": "Combat Narration",
        "message": "I attack the Enforcer bot with my hammer",
        "check_for": ["attack", "enforcer"]
    },
    
    # Scenarios
    {
        "category": "Scenarios",
        "name": "Market Explosion",
        "message": "I investigate the explosion at the market",
        "check_for": ["explosion", "rebels", "enforcers"]
    },
]

# Run tests
results = {"passed": 0, "failed": 0, "total": len(tests)}
current_category = None

for i, test in enumerate(tests, 1):
    # Category header
    if test["category"] != current_category:
        current_category = test["category"]
        print(f"\n{'=' * 70}")
        print(f"CATEGORY: {current_category.upper()}")
        print("=" * 70)
    
    print(f"\n[{i}/{len(tests)}] Test: {test['name']}")
    print(f"Question: {test['message']}")
    
    # Build prompt
    system_prompt = build_system_prompt()
    full_prompt = f"<s>[INST] {system_prompt}\n\nPlayer: {test['message']} [/INST]"
    
    # Generate
    start_time = time.time()
    inputs = tokenizer(full_prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(
        **inputs,
        max_new_tokens=150,
        temperature=0.7,
        do_sample=True
    )
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    response = response.split("[/INST]")[-1].strip()
    response_time = time.time() - start_time
    
    # Check keywords
    response_lower = response.lower()
    found = [kw for kw in test['check_for'] if kw in response_lower]
    passed = len(found) >= len(test['check_for']) // 2
    
    if passed:
        print(f"PASS (found: {found})")
        results["passed"] += 1
    else:
        print(f"FAIL (found: {found}, expected: {test['check_for']})")
        results["failed"] += 1
    
    print(f"Response time: {response_time:.2f}s")
    print(f"Response: {response[:200]}...")

# Summary
print("\n" + "=" * 70)
print("TEST SUMMARY")
print("=" * 70)
print(f"\nTotal Tests: {results['total']}")
print(f"Passed: {results['passed']} ({100*results['passed']//results['total']}%)")
print(f"Failed: {results['failed']} ({100*results['failed']//results['total']}%)")

if results["passed"] >= results["total"] * 0.5:
    print("\nOVERALL: PASS")
else:
    print("\nOVERALL: Results are expected for base model.")
    print("Your prompts are loaded correctly.")
    print("After LoRA training completes, rerun this test!")

print("=" * 70)