"""
CRD3 Dataset Downloader - Critical Role D&D Transcripts
Downloads directly from GitHub repository
WORKING VERSION - Handles utterances as lists
"""

import os
import json
import random
import requests
from pathlib import Path
from typing import List, Dict, Tuple
from tqdm import tqdm


class CRD3Downloader:
    """Download and process CRD3 dataset from GitHub"""
    
    def __init__(self, output_dir: str = "./data/processed"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.raw_data_dir = Path("./data/raw_crd3")
        self.raw_data_dir.mkdir(parents=True, exist_ok=True)
        
        # GitHub raw content base URL
        self.base_url = "https://raw.githubusercontent.com/RevanthRameshkumar/CRD3/master/data/cleaned%20data"
    
    def download_transcript_files(self, num_episodes: int = 40):
        """
        Download transcript files from GitHub
        
        Args:
            num_episodes: Number of episodes to download
        """
        print(f"Downloading {num_episodes} Critical Role transcript files from GitHub...")
        
        # Generate episode list
        episodes = []
        
        # Campaign 1 episodes
        for i in range(1, min(116, num_episodes + 1)):
            episodes.append(f"C1E{i:03d}.json")
        
        # Campaign 2 episodes if we need more
        if num_episodes > 115:
            for i in range(1, min(142, num_episodes - 115 + 1)):
                episodes.append(f"C2E{i:03d}.json")
        
        downloaded_files = []
        
        for episode in tqdm(episodes[:num_episodes], desc="Downloading episodes"):
            url = f"{self.base_url}/{episode}"
            file_path = self.raw_data_dir / episode
            
            try:
                response = requests.get(url, timeout=30)
                if response.status_code == 200:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(response.json(), f, indent=2)
                    downloaded_files.append(file_path)
                else:
                    print(f"\nFailed to download {episode}: Status {response.status_code}")
            except Exception as e:
                print(f"\nError downloading {episode}: {e}")
        
        print(f"✅ Downloaded {len(downloaded_files)} episodes")
        return downloaded_files
    
    def extract_dm_narration(self, transcript_file: Path) -> List[Dict]:
        """Extract DM (Matt Mercer) narration from transcript"""
        
        try:
            with open(transcript_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error reading {transcript_file}: {e}")
            return []
        
        dm_turns = []
        
        # Get all turns
        turns = data.get('TURNS', [])
        if not turns:
            return []
        
        # Process each turn
        for i in range(len(turns)):
            turn = turns[i]
            
            # Get speaker and utterances (NOTE: UTTERANCES is a LIST!)
            names = turn.get('NAMES', [])
            utterances_list = turn.get('UTTERANCES', [])
            
            # Join utterances into a single string
            if isinstance(utterances_list, list):
                utterance = " ".join(utterances_list)
            else:
                utterance = str(utterances_list)
            
            # Skip if no content
            if not utterance or len(utterance.strip()) < 20:
                continue
            
            # Check if this is Matt (the DM)
            is_matt = any(name.upper() in ['MATT', 'DM', 'MATTHEW'] for name in names)
            
            if is_matt:
                # Look for previous player action
                player_action = ""
                
                # Look back up to 3 turns for a player action
                for j in range(1, min(4, i + 1)):
                    prev_turn = turns[i - j]
                    prev_names = prev_turn.get('NAMES', [])
                    prev_utterances_list = prev_turn.get('UTTERANCES', [])
                    
                    # Join previous utterances
                    if isinstance(prev_utterances_list, list):
                        prev_utterance = " ".join(prev_utterances_list)
                    else:
                        prev_utterance = str(prev_utterances_list)
                    
                    # Check if it's not Matt
                    is_prev_matt = any(name.upper() in ['MATT', 'DM', 'MATTHEW'] for name in prev_names)
                    
                    if not is_prev_matt and prev_utterance and len(prev_utterance.strip()) > 10:
                        player_action = prev_utterance.strip()
                        break
                
                # Create training pair
                if player_action:
                    dm_turns.append({
                        "player_action": player_action,
                        "dm_response": utterance.strip(),
                        "speaker": names[0] if names else "MATT",
                        "file": transcript_file.name
                    })
                elif len(utterance) > 100:  # Long narrative without direct player prompt
                    dm_turns.append({
                        "player_action": "Continue the story.",
                        "dm_response": utterance.strip(),
                        "speaker": names[0] if names else "MATT",
                        "file": transcript_file.name
                    })
        
        return dm_turns
    
    def create_training_examples(
        self,
        transcript_files: List[Path],
        max_examples: int = 10000
    ) -> List[Dict]:
        """Create training examples from transcripts"""
        
        print(f"\nProcessing {len(transcript_files)} transcripts into training examples...")
        
        training_examples = []
        total_extracted = 0
        
        for file_path in tqdm(transcript_files, desc="Processing files"):
            try:
                dm_turns = self.extract_dm_narration(file_path)
                total_extracted += len(dm_turns)
                
                # Print progress for first few files
                if len(training_examples) < 500:
                    print(f"\n  {file_path.name}: Extracted {len(dm_turns)} DM turns")
                
                for turn in dm_turns:
                    if len(training_examples) >= max_examples:
                        break
                    
                    training_examples.append({
                        "instruction": self._get_system_prompt(),
                        "input": f"Player: {turn['player_action']}",
                        "output": turn['dm_response'],
                        "metadata": {
                            "source": "CRD3",
                            "file": turn['file'],
                            "dm": turn['speaker']
                        }
                    })
                
                if len(training_examples) >= max_examples:
                    print(f"\nReached max_examples limit of {max_examples}")
                    break
                    
            except Exception as e:
                print(f"\nError processing {file_path}: {e}")
                continue
        
        print(f"\nTotal DM turns extracted: {total_extracted}")
        print(f"Created {len(training_examples)} training examples")
        
        return training_examples
    
    def _get_system_prompt(self) -> str:
        """System prompt for D&D DM training"""
        return """You are an expert Dungeon Master running a tabletop RPG campaign. 
Your role is to narrate the story, describe environments, control NPCs, and respond to player actions with engaging, 
descriptive storytelling. Maintain consistent pacing, create memorable moments, and keep players engaged with the narrative."""
    
    def split_dataset(
        self,
        examples: List[Dict],
        train_ratio: float = 0.9
    ) -> Tuple[List[Dict], List[Dict]]:
        """Split into train/validation sets"""
        
        random.shuffle(examples)
        
        split_idx = int(len(examples) * train_ratio)
        
        train_data = examples[:split_idx]
        val_data = examples[split_idx:]
        
        print(f"\n📊 Split: {len(train_data)} train, {len(val_data)} validation")
        
        return train_data, val_data
    
    def save_datasets(
        self,
        train_data: List[Dict],
        val_data: List[Dict],
        format: str = "jsonl"
    ):
        """Save processed datasets"""
        
        train_path = self.output_dir / f"train.{format}"
        val_path = self.output_dir / f"validation.{format}"
        
        print(f"\n💾 Saving datasets to {self.output_dir}")
        
        if format == "jsonl":
            with open(train_path, 'w', encoding='utf-8') as f:
                for example in train_data:
                    f.write(json.dumps(example, ensure_ascii=False) + '\n')
            
            with open(val_path, 'w', encoding='utf-8') as f:
                for example in val_data:
                    f.write(json.dumps(example, ensure_ascii=False) + '\n')
        
        elif format == "json":
            with open(train_path, 'w', encoding='utf-8') as f:
                json.dump(train_data, f, indent=2, ensure_ascii=False)
            
            with open(val_path, 'w', encoding='utf-8') as f:
                json.dump(val_data, f, indent=2, ensure_ascii=False)
        
        print(f"Saved train: {train_path}")
        print(f"Saved val: {val_path}")
        
        # Also save a sample for inspection
        sample_path = self.output_dir / "sample_examples.json"
        with open(sample_path, 'w', encoding='utf-8') as f:
            json.dump(train_data[:10], f, indent=2, ensure_ascii=False)
        print(f"📝 Saved sample: {sample_path}")
        
        return train_path, val_path


def main():
    """Main execution"""
    
    print("=" * 70)
    print("CRD3 Dataset Download - Critical Role D&D Transcripts")
    print("=" * 70)
    
    downloader = CRD3Downloader(output_dir="./data/processed")
    
    # Step 1: Download transcript files from GitHub
    print("\nStep 1: Downloading transcripts...")
    transcript_files = downloader.download_transcript_files(num_episodes=40)  # CHANGE THIS NUMBER
    
    if not transcript_files:
        print("\nFailed to download any transcripts!")
        print("Check your internet connection or try again later.")
        return
    
    # Step 2: Create training examples
    print("\nStep 2: Creating training examples...")
    training_examples = downloader.create_training_examples(
        transcript_files,
        max_examples=10000  # You can increase this if you want more
    )
    
    if len(training_examples) < 100:
        print(f"\n Only got {len(training_examples)} examples!")
        print(" This might be too few for good training.")
        print(" Try downloading more episodes or check the extraction logic.")
        
        # Ask if user wants to continue anyway
        response = input("\nContinue with limited data? (y/n): ")
        if response.lower() != 'y':
            return
    
    # Step 3: Split dataset
    print("\n Step 3: Splitting into train/val...")
    train_data, val_data = downloader.split_dataset(training_examples)
    
    # Step 4: Save datasets
    print("\n Step 4: Saving datasets...")
    train_path, val_path = downloader.save_datasets(train_data, val_data, format="jsonl")
    
    print("\n" + "=" * 70)
    print(" CRD3 Dataset preparation complete!")
    print("=" * 70)
    print(f"\nTraining data: {train_path}")
    print(f"Validation data: {val_path}")
    print(f"\nTotal examples: {len(training_examples)}")
    print(f"Train: {len(train_data)}, Val: {len(val_data)}")
    print("\n Ready for fine-tuning!")
    print("\nNext step: python scripts/train_lora.py")


if __name__ == "__main__":
    main()