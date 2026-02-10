import os
import torch
import json
from dataclasses import dataclass, field
from typing import Optional, Dict, List
from pathlib import Path

from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling,
    BitsAndBytesConfig
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training,
    TaskType
)
from loguru import logger


@dataclass
class FinetuneConfig:
    """Configuration for fine-tuning"""
    
    # Model
    model_name: str = "mistralai/Mistral-7B-Instruct-v0.3"
    
    # Data
    train_data_path: str = "./data/processed/train.jsonl"
    val_data_path: str = "./data/processed/validation.jsonl"
    
    # Output
    output_dir: str = "./outputs/mistral-dnd-lora"
    
    # LoRA parameters
    lora_r: int = 16  # Rank (higher = more parameters, better quality but slower)
    lora_alpha: int = 32  # Scaling factor (usually 2x rank)
    lora_dropout: float = 0.05
    lora_target_modules: List[str] = field(default_factory=lambda: ["q_proj", "k_proj", "v_proj", "o_proj"])
    
    # Quantization
    use_4bit: bool = True
    bnb_4bit_compute_dtype: str = "bfloat16"
    bnb_4bit_quant_type: str = "nf4"
    
    # Training hyperparameters
    num_train_epochs: int = 3
    per_device_train_batch_size: int = 1  # RTX 3070 safe, RTX 5080 can do 2-4
    per_device_eval_batch_size: int = 1
    gradient_accumulation_steps: int = 8  # Effective batch size = 8
    learning_rate: float = 2e-4
    max_grad_norm: float = 0.3
    warmup_ratio: float = 0.03
    lr_scheduler_type: str = "cosine"
    
    # Optimization
    optim: str = "paged_adamw_8bit"  # Memory efficient optimizer
    weight_decay: float = 0.001
    max_seq_length: int = 512  # Reduced for RTX 3070 (8GB VRAM)
    
    # Logging & Checkpointing
    logging_steps: int = 10
    save_steps: int = 100
    eval_steps: int = 100
    save_total_limit: int = 3
    
    # System
    fp16: bool = False
    bf16: bool = True  # Better for modern GPUs
    gradient_checkpointing: bool = True  # Save VRAM
    
    # Special
    seed: int = 42


class DnDDataset:
    """Dataset handler for D&D training data"""
    
    def __init__(self, tokenizer, max_length: int = 512):
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def load_jsonl(self, file_path: str) -> List[Dict]:
        """Load JSONL file"""
        data = []
        with open(file_path, 'r') as f:
            for line in f:
                data.append(json.loads(line))
        return data
    
    def format_instruction(self, example: Dict) -> str:
        """
        Format example into Mistral Instruct format
        
        Example input:
        {
            "instruction": "You are a DM...",
            "input": "Player: I search the room",
            "output": "You find a hidden door..."
        }
        """
        
        # Mistral Instruct format: <s>[INST] {system}\n\n{user_message} [/INST] {response}</s>
        formatted = f"<s>[INST] {example['instruction']}\n\n{example['input']} [/INST] {example['output']}</s>"
        
        return formatted
    
    def tokenize_function(self, examples):
        """Tokenize examples"""
        
        # examples is a single dict when batched=False
        text = self.format_instruction(examples)
        
        # Tokenize
        tokenized = self.tokenizer(
            text,
            truncation=True,
            max_length=self.max_length,
            padding="max_length",
            return_tensors=None
        )
        
        # For causal LM, labels are the same as input_ids
        tokenized["labels"] = tokenized["input_ids"][:]
        
        return tokenized


class DnDTrainer:
    """Handles the fine-tuning process"""
    
    def __init__(self, config: FinetuneConfig):
        self.config = config
        self.model = None
        self.tokenizer = None
        self.trainer = None
        
        # Set random seed
        torch.manual_seed(config.seed)
        
        # Check GPU
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.device == "cuda":
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            logger.info(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    
    def setup_model(self):
        """Load and configure model with LoRA"""
        
        logger.info(f"Loading model: {self.config.model_name}")
        
        # Quantization config
        if self.config.use_4bit:
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type=self.config.bnb_4bit_quant_type,
                bnb_4bit_compute_dtype=getattr(torch, self.config.bnb_4bit_compute_dtype),
                bnb_4bit_use_double_quant=True,
            )
        else:
            bnb_config = None
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.config.model_name,
            trust_remote_code=True,
            use_fast=True
        )
        
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
            self.tokenizer.pad_token_id = self.tokenizer.eos_token_id
        
        # Load model with use_cache=False to avoid gradient checkpointing issues
        self.model = AutoModelForCausalLM.from_pretrained(
            self.config.model_name,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.bfloat16 if self.config.bf16 else torch.float16,
            use_cache=False,  # Critical for gradient checkpointing compatibility
        )
        
        # Prepare for k-bit training
        self.model = prepare_model_for_kbit_training(
            self.model,
            use_gradient_checkpointing=self.config.gradient_checkpointing
        )
        
        # Configure LoRA
        lora_config = LoraConfig(
            r=self.config.lora_r,
            lora_alpha=self.config.lora_alpha,
            target_modules=self.config.lora_target_modules,
            lora_dropout=self.config.lora_dropout,
            bias="none",
            task_type=TaskType.CAUSAL_LM,
        )
        
        # Apply LoRA
        self.model = get_peft_model(self.model, lora_config)
        
        # Print trainable parameters
        self.model.print_trainable_parameters()
        
        logger.success("Model setup complete with LoRA")
    
    def load_datasets(self):
        """Load and prepare datasets"""
        
        logger.info("Loading datasets...")
        
        # Load data
        dataset_handler = DnDDataset(self.tokenizer, self.config.max_seq_length)
        
        train_data = dataset_handler.load_jsonl(self.config.train_data_path)
        val_data = dataset_handler.load_jsonl(self.config.val_data_path)
        
        logger.info(f"Train examples: {len(train_data)}")
        logger.info(f"Validation examples: {len(val_data)}")
        
        # Convert to HuggingFace datasets
        from datasets import Dataset
        
        train_dataset = Dataset.from_list(train_data)
        val_dataset = Dataset.from_list(val_data)
        
        # Tokenize
        logger.info("Tokenizing datasets...")
        
        train_dataset = train_dataset.map(
            lambda x: dataset_handler.tokenize_function(x),
            batched=False,
            remove_columns=train_dataset.column_names
        )
        
        val_dataset = val_dataset.map(
            lambda x: dataset_handler.tokenize_function(x),
            batched=False,
            remove_columns=val_dataset.column_names
        )
        
        return train_dataset, val_dataset
    
    def train(self):
        """Execute training"""
        
        # Setup model
        self.setup_model()
        
        # Load datasets
        train_dataset, val_dataset = self.load_datasets()
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=self.config.output_dir,
            num_train_epochs=self.config.num_train_epochs,
            per_device_train_batch_size=self.config.per_device_train_batch_size,
            per_device_eval_batch_size=self.config.per_device_eval_batch_size,
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            learning_rate=self.config.learning_rate,
            max_grad_norm=self.config.max_grad_norm,
            warmup_ratio=self.config.warmup_ratio,
            lr_scheduler_type=self.config.lr_scheduler_type,
            optim=self.config.optim,
            weight_decay=self.config.weight_decay,
            fp16=self.config.fp16,
            bf16=self.config.bf16,
            logging_steps=self.config.logging_steps,
            save_steps=self.config.save_steps,
            eval_steps=self.config.eval_steps,
            eval_strategy="steps",  # Fixed from evaluation_strategy
            save_strategy="steps",
            save_total_limit=self.config.save_total_limit,
            load_best_model_at_end=True,
            report_to="none",  # Disable wandb/tensorboard for now
            gradient_checkpointing=self.config.gradient_checkpointing,
            seed=self.config.seed,
        )
        
        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=self.tokenizer,
            mlm=False  # Causal LM, not masked LM
        )
        
        # Initialize trainer
        self.trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            data_collator=data_collator,
        )
        
        # Train!
        logger.info("Starting training")
        
        self.trainer.train()
        
        # Save final model
        logger.info("Saving final model")
        self.trainer.save_model(self.config.output_dir)
        self.tokenizer.save_pretrained(self.config.output_dir)
        
        logger.success(f"Training complete! Model saved to {self.config.output_dir}")


def main():
    """Main training script"""
    
    import argparse
    
    parser = argparse.ArgumentParser(description="Fine-tune Mistral on D&D narratives")
    parser.add_argument("--train_data", type=str, default="./data/processed/train.jsonl")
    parser.add_argument("--val_data", type=str, default="./data/processed/validation.jsonl")
    parser.add_argument("--output_dir", type=str, default="./outputs/mistral-dnd-lora")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=1, help="1 for RTX 3070, 2-4 for RTX 5080")
    parser.add_argument("--gradient_accumulation", type=int, default=8)
    parser.add_argument("--learning_rate", type=float, default=2e-4)
    parser.add_argument("--max_seq_length", type=int, default=512)
    
    args = parser.parse_args()
    
    # Create config
    config = FinetuneConfig(
        train_data_path=args.train_data,
        val_data_path=args.val_data,
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.gradient_accumulation,
        learning_rate=args.learning_rate,
        max_seq_length=args.max_seq_length,
    )
    
    # Print configuration
    logger.info("=" * 60)
    logger.info("Training Configuration")
    logger.info("=" * 60)
    logger.info(f"Model: {config.model_name}")
    logger.info(f"Output: {config.output_dir}")
    logger.info(f"Epochs: {config.num_train_epochs}")
    logger.info(f"Batch size: {config.per_device_train_batch_size}")
    logger.info(f"Gradient accumulation: {config.gradient_accumulation_steps}")
    logger.info(f"Effective batch size: {config.per_device_train_batch_size * config.gradient_accumulation_steps}")
    logger.info(f"Learning rate: {config.learning_rate}")
    logger.info(f"LoRA rank: {config.lora_r}")
    logger.info(f"Max sequence length: {config.max_seq_length}")
    logger.info("=" * 60)
    
    # Initialize trainer
    trainer = DnDTrainer(config)
    
    # Train
    trainer.train()


if __name__ == "__main__":
    main()