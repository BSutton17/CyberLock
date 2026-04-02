#!/usr/bin/env python3
"""
Cleanup script to remove old ChromaDB backup directories
Run this to clean up the multiple chroma database directories created by conflicts
"""

import shutil
import os
from pathlib import Path
from loguru import logger

def cleanup_chroma_databases():
    """Remove old chroma database backup directories"""
    
    data_dir = Path("./data")
    if not data_dir.exists():
        logger.info("No data directory found")
        return
    
    # Keep only the main chroma_db directory
    kept_dirs = []
    removed_dirs = []
    
    for item in data_dir.iterdir():
        if item.is_dir() and "chroma_db" in item.name:
            if item.name == "chroma_db":
                # Keep the main database
                kept_dirs.append(item.name)
                logger.info(f"Keeping main database: {item.name}")
            else:
                # Remove backup/rebuild directories
                try:
                    shutil.rmtree(item)
                    removed_dirs.append(item.name)
                    logger.success(f"Removed backup database: {item.name}")
                except Exception as e:
                    logger.error(f"Failed to remove {item.name}: {e}")
    
    logger.info(f"Cleanup complete:")
    logger.info(f"  Kept directories: {len(kept_dirs)}")
    logger.info(f"  Removed directories: {len(removed_dirs)}")
    
    if removed_dirs:
        logger.info("Removed directories:")
        for dir_name in removed_dirs:
            logger.info(f"  - {dir_name}")

if __name__ == "__main__":
    logger.info("Starting ChromaDB cleanup...")
    cleanup_chroma_databases()
    logger.success("Cleanup finished!")