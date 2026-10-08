"""
Model loading and inference engine using PyTorch and Transformers
Optimized for RTX 5080 with 16GB VRAM
"""

import torch
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig,
    GenerationConfig
)
from typing import Optional, Dict, Any, List
from loguru import logger
import gc


class ModelLoader:
    """Handles loading and managing the Mistral model with quantization"""
    
    def __init__(
        self,
        model_name: str,
        quantization: str = "4bit",
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        max_context_length: int = 128000
    ):
        self.model_name = model_name
        self.quantization = quantization
        self.max_context_length = max_context_length
        self.model = None
        self.tokenizer = None
        
        # Check CUDA compatibility for RTX 5080 (sm_120)
        if device == "cuda" and torch.cuda.is_available():
            try:
                capability = torch.cuda.get_device_capability(0)
                major, minor = capability
                pytorch_version = tuple(map(int, torch.__version__.split('+')[0].split('.')[:2]))
                cuda_version = torch.version.cuda
                
                logger.info(f"GPU Compute Capability: sm_{major}{minor}")
                logger.info(f"PyTorch Version: {torch.__version__}")
                logger.info(f"CUDA Version: {cuda_version}")
                
                if major >= 12:  # Blackwell architecture
                    if pytorch_version >= (2, 7):
                        logger.info("RTX 5080 (sm_120) with compatible PyTorch 2.7. Using GPU")
                        self.device = device
                    else:
                        logger.warning(f"Blackwell GPU detected (sm_{major}{minor}) but PyTorch {torch.__version__} may not fully support it.")
                        logger.warning("For full GPU support, upgrade to PyTorch 2.7+ with CUDA 12.8+")
                        self.device = "cpu"
                else:
                    self.device = device
            except Exception as e:
                logger.warning(f"Could not check CUDA compatibility: {e}. Falling back to CPU.")
                self.device = "cpu"
        else:
            self.device = device
        
        logger.info(f"Initializing ModelLoader with {quantization} quantization")
        logger.info(f"Device: {self.device}")
        
        if self.device == "cuda":
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            logger.info(f"VRAM Available: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    
    def _get_quantization_config(self) -> Optional[BitsAndBytesConfig]:
        """Configure model quantization for optimal VRAM usage"""
        
        if self.quantization == "4bit":
            logger.info("Using 4-bit quantization (NF4) - Optimal for 16GB VRAM")
            return BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",  # Normal Float 4
                bnb_4bit_compute_dtype=torch.bfloat16,
                bnb_4bit_use_double_quant=True,
            )
        
        elif self.quantization == "8bit":
            logger.info("Using 8-bit quantization - Higher quality, more VRAM")
            return BitsAndBytesConfig(
                load_in_8bit=True,
                llm_int8_threshold=6.0,
            )
        
        else:
            logger.info("No quantization - Full precision (requires 28GB VRAM)")
            return None
    
    def load_model(self):
        """Load the Mistral model and tokenizer"""
        
        try:
            logger.info(f"Loading tokenizer from {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                trust_remote_code=True,
                use_fast=True
            )
            
            # Ensure pad token is set
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            logger.info(f"Loading model from {self.model_name}")
            
            # Configure quantization (bitsandbytes requires CUDA, so skip it on CPU)
            if self.device == "cpu":
                if self.quantization in ("4bit", "8bit"):
                    logger.warning(f"{self.quantization} quantization requires CUDA - loading unquantized on CPU")
                quantization_config = None
            else:
                quantization_config = self._get_quantization_config()

            # Model loading arguments (bfloat16 halves CPU RAM vs float32)
            model_kwargs = {
                "torch_dtype": torch.bfloat16,
                "device_map": self.device if self.device == "cpu" else "auto",
                "trust_remote_code": True,
            }
            
            if quantization_config:
                model_kwargs["quantization_config"] = quantization_config
            
            # Load the model
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                **model_kwargs
            )
            
            # Ensure model is on the correct device
            if self.device == "cpu":
                self.model = self.model.to("cpu")
                logger.info("Model explicitly moved to CPU")
            
            logger.success(f"Model loaded successfully on {self.device}")
            
            # Log memory usage if on CUDA
            if self.device == "cuda":
                allocated = torch.cuda.memory_allocated(0) / 1e9
                reserved = torch.cuda.memory_reserved(0) / 1e9
                logger.info(f"VRAM Allocated: {allocated:.2f} GB")
                logger.info(f"VRAM Reserved: {reserved:.2f} GB")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise
    
    def generate(
        self,
        prompt: str,
        temperature: float = 0.8,
        top_p: float = 0.9,
        top_k: int = 50,
        max_new_tokens: int = 2048,
        repetition_penalty: float = 1.1,
        do_sample: bool = True,
        **kwargs
    ) -> str:
        """
        Generate text using the loaded model
        
        Args:
            prompt: The input prompt/conversation
            temperature: Randomness (0.0-2.0, higher = more creative)
            top_p: Nucleus sampling threshold
            top_k: Top-k sampling
            max_new_tokens: Maximum tokens to generate
            repetition_penalty: Penalty for repeating tokens
            do_sample: Whether to use sampling (vs greedy)
        
        Returns:
            Generated text response
        """
        
        if self.model is None or self.tokenizer is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        try:
            # Tokenize input
            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                truncation=True,
                max_length=self.max_context_length - max_new_tokens
            )
            
            # Ensure inputs are on correct device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Generation configuration
            gen_config = GenerationConfig(
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                max_new_tokens=max_new_tokens,
                repetition_penalty=repetition_penalty,
                do_sample=do_sample,
                pad_token_id=self.tokenizer.pad_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                **kwargs
            )
            
            # Generate
            with torch.inference_mode():
                outputs = self.model.generate(
                    **inputs,
                    generation_config=gen_config
                )
            
            # Ensure outputs are on CPU for decoding
            outputs = outputs.to("cpu")
            
            # Decode only the new tokens (skip the prompt)
            generated_text = self.tokenizer.decode(
                outputs[0][inputs["input_ids"].shape[1]:],
                skip_special_tokens=True
            )
            
            return generated_text.strip()
            
        except Exception as e:
            logger.error(f"Generation failed: {str(e)}")
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            raise
    
    def unload_model(self):
        """Unload model from memory to free VRAM"""
        
        if self.model is not None:
            del self.model
            self.model = None
        
        if self.tokenizer is not None:
            del self.tokenizer
            self.tokenizer = None
        
        # Force garbage collection and CUDA cache cleanup
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        logger.info("Model unloaded and memory cleared")
    
    def get_memory_stats(self) -> Dict[str, float]:
        """Get current VRAM usage statistics"""
        
        if not torch.cuda.is_available():
            return {"error": "CUDA not available"}
        
        return {
            "allocated_gb": torch.cuda.memory_allocated(0) / 1e9,
            "reserved_gb": torch.cuda.memory_reserved(0) / 1e9,
            "free_gb": (torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)) / 1e9,
            "total_gb": torch.cuda.get_device_properties(0).total_memory / 1e9
        }


class ConversationManager:
    """Manages conversation formatting for Mistral Instruct models"""
    
    def __init__(self, tokenizer):
        self.tokenizer = tokenizer
    
    def format_conversation(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]]
    ) -> str:
        """
        Format a conversation using Mistral's chat template
        
        Args:
            system_prompt: The system instruction
            messages: List of {"role": "user"/"assistant", "content": "..."}
        
        Returns:
            Formatted prompt string
        """
        
        # Build conversation with system prompt
        conversation = [{"role": "system", "content": system_prompt}]
        conversation.extend(messages)
        
        # Use the tokenizer's chat template if available
        if hasattr(self.tokenizer, "apply_chat_template"):
            formatted = self.tokenizer.apply_chat_template(
                conversation,
                tokenize=False,
                add_generation_prompt=True
            )
        else:
            # Fallback manual formatting for Mistral Instruct
            formatted = f"<s>[INST] {system_prompt}\n\n"
            
            for msg in messages:
                if msg["role"] == "user":
                    formatted += f"{msg['content']} [/INST] "
                elif msg["role"] == "assistant":
                    formatted += f"{msg['content']}</s>[INST] "
            
            # Remove trailing [INST] if last message was assistant
            if messages and messages[-1]["role"] == "assistant":
                formatted = formatted.rstrip("[INST] ")
        
        return formatted
