"""
Test Script - Validate your setup on RTX 3070
Tests model loading, inference, and small training loop
"""

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from loguru import logger
import time


def check_gpu():
    """Check GPU availability and specs"""
    
    logger.info("=" * 60)
    logger.info("GPU Check")
    logger.info("=" * 60)
    
    if not torch.cuda.is_available():
        logger.error("CUDA not available! Check your PyTorch installation.")
        return False
    
    gpu_name = torch.cuda.get_device_name(0)
    total_vram = torch.cuda.get_device_properties(0).total_memory / 1e9
    
    logger.info(f"GPU: {gpu_name}")
    logger.info(f"Total VRAM: {total_vram:.2f} GB")
    logger.info(f"PyTorch version: {torch.__version__}")
    logger.info(f"CUDA version: {torch.version.cuda}")
    
    return True


def test_model_loading():
    """Test loading Mistral with 4-bit quantization"""
    
    logger.info("\n" + "=" * 60)
    logger.info("Test 1: Model Loading with 4-bit Quantization")
    logger.info("=" * 60)
    
    model_name = "mistralai/Mistral-7B-Instruct-v0.3"
    
    try:
        # 4-bit quantization config
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
        )
        
        logger.info("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        logger.info("Loading model with 4-bit quantization...")
        start_time = time.time()
        
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            quantization_config=bnb_config,
            device_map="auto",
            torch_dtype=torch.bfloat16,
        )
        
        load_time = time.time() - start_time
        
        # Check VRAM usage
        allocated = torch.cuda.memory_allocated(0) / 1e9
        reserved = torch.cuda.memory_reserved(0) / 1e9
        
        logger.success(f"Model loaded in {load_time:.2f}s")
        logger.info(f"VRAM Allocated: {allocated:.2f} GB")
        logger.info(f"VRAM Reserved: {reserved:.2f} GB")
        
        if allocated > 7:
            logger.warning("High VRAM usage! May need to reduce max_seq_length or batch_size")
        else:
            logger.success("VRAM usage looks good for RTX 3070!")
        
        return model, tokenizer
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return None, None


def test_inference(model, tokenizer):
    """Test basic inference"""
    
    if model is None or tokenizer is None:
        logger.error("Cannot test inference - model not loaded")
        return
    
    logger.info("\n" + "=" * 60)
    logger.info("Test 2: Inference Test")
    logger.info("=" * 60)
    
    prompt = """<s>[INST] You are a Dungeon Master for a D&D campaign.

Player: I want to search the ancient ruins for treasure. [/INST] """
    
    try:
        logger.info("Generating response...")
        
        inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
        
        start_time = time.time()
        
        with torch.inference_mode():
            outputs = model.generate(
                **inputs,
                max_new_tokens=150,
                temperature=0.8,
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        generation_time = time.time() - start_time
        
        response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
        
        logger.success(f"✅ Generation completed in {generation_time:.2f}s")
        logger.info("\n" + "-" * 60)
        logger.info("Generated Response:")
        logger.info("-" * 60)
        logger.info(response)
        logger.info("-" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"Inference failed: {e}")
        return False


def test_lora_compatibility():
    """Test LoRA setup (without actual training)"""
    
    logger.info("\n" + "=" * 60)
    logger.info("Test 3: LoRA Compatibility Check")
    logger.info("=" * 60)
    
    try:
        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
        
        logger.info("Loading model for LoRA test...")
        
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
        )
        
        model = AutoModelForCausalLM.from_pretrained(
            "mistralai/Mistral-7B-Instruct-v0.3",
            quantization_config=bnb_config,
            device_map="auto",
            torch_dtype=torch.bfloat16,
        )
        
        # Prepare for training
        model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)
        
        # Configure LoRA
        lora_config = LoraConfig(
            r=16,
            lora_alpha=32,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
        )
        
        # Apply LoRA
        model = get_peft_model(model, lora_config)
        
        # Print trainable parameters
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
        total_params = sum(p.numel() for p in model.parameters())
        
        logger.success("LoRA setup successful!")
        logger.info(f"Trainable parameters: {trainable_params:,} ({100 * trainable_params / total_params:.2f}%)")
        logger.info(f"Total parameters: {total_params:,}")
        
        # Check VRAM
        allocated = torch.cuda.memory_allocated(0) / 1e9
        logger.info(f"VRAM with LoRA: {allocated:.2f} GB")
        
        if allocated < 7.5:
            logger.success("VRAM usage is good for training on RTX 3070!")
        else:
            logger.warning("VRAM is high - may need to reduce batch size or max_seq_length")
        
        return True
        
    except Exception as e:
        logger.error(f"LoRA setup failed: {e}")
        return False


def test_data_loading():
    """Test if data files exist and are readable"""
    
    logger.info("\n" + "=" * 60)
    logger.info("Test 4: Data Loading Check")
    logger.info("=" * 60)
    
    import os
    
    data_files = [
        "./data/processed/train.jsonl",
        "./data/processed/validation.jsonl"
    ]
    
    all_exist = True
    
    for file_path in data_files:
        if os.path.exists(file_path):
            size = os.path.getsize(file_path) / 1e6  # MB
            logger.success(f"✅ Found: {file_path} ({size:.2f} MB)")
        else:
            logger.warning(f"⚠️  Missing: {file_path}")
            all_exist = False
    
    if not all_exist:
        logger.info("\n💡 Run prepare_crd3_data.py first to create training data!")
    
    return all_exist


def main():
    """Run all tests"""
    
    logger.info("\n" + "=" * 80)
    logger.info("🧪 RTX 3070 Setup Validation Test Suite")
    logger.info("=" * 80)
    
    results = {}
    
    # Test 1: GPU Check
    results['gpu'] = check_gpu()
    
    if not results['gpu']:
        logger.error("\nGPU check failed - cannot proceed with other tests")
        return
    
    # Test 2: Model Loading
    model, tokenizer = test_model_loading()
    results['model_loading'] = (model is not None)
    
    # Test 3: Inference
    if model and tokenizer:
        results['inference'] = test_inference(model, tokenizer)
        
        # Clean up to free VRAM for next test
        del model
        del tokenizer
        torch.cuda.empty_cache()
    else:
        results['inference'] = False
    
    # Test 4: LoRA Compatibility
    results['lora'] = test_lora_compatibility()
    
    # Clean up
    torch.cuda.empty_cache()
    
    # Test 5: Data Files
    results['data'] = test_data_loading()
    
    # Summary
    logger.info("\n" + "=" * 80)
    logger.info("📊 Test Summary")
    logger.info("=" * 80)
    
    for test_name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        logger.info(f"{status}: {test_name}")
    
    all_passed = all(results.values())
    
    if all_passed:
        logger.success("\nAll tests passed! Your setup is ready for training.")
        logger.info("\nNext steps:")
        logger.info("1. Run: python scripts/prepare_crd3_data.py (if you haven't)")
        logger.info("2. Run: python scripts/train_lora.py --batch_size 1 --gradient_accumulation 8")
        logger.info("3. Monitor VRAM usage and adjust parameters if needed")
    else:
        logger.error("\nSome tests failed. Check the errors above.")
        
        if not results.get('data', False):
            logger.info("\nMissing data? Run: python scripts/prepare_crd3_data.py")


if __name__ == "__main__":
    main()