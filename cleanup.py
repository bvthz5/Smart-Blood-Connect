#!/usr/bin/env python3
"""
SmartBlood Project Cleanup Script
Removes cache files, build artifacts, and other unwanted files
"""
import os
import shutil
from pathlib import Path

def remove_directory(path):
    """Remove directory if it exists"""
    if os.path.exists(path):
        try:
            shutil.rmtree(path)
            print(f"[REMOVED] {path}")
            return True
        except Exception as e:
            print(f"[FAILED] {path} - {e}")
            return False
    return False

def remove_file(path):
    """Remove file if it exists"""
    if os.path.exists(path):
        try:
            os.remove(path)
            print(f"[REMOVED] {path}")
            return True
        except Exception as e:
            print(f"[FAILED] {path} - {e}")
            return False
    return False

def main():
    print("=" * 60)
    print("SmartBlood Project Cleanup")
    print("=" * 60)
    print()
    
    # Get project root (where this script is located)
    project_root = Path(__file__).parent
    items_removed = 0
    
    print("Cleaning Python cache files...")
    
    # Remove all __pycache__ directories
    pycache_dirs = [
        project_root / "backend" / "__pycache__",
        project_root / "backend" / "app" / "__pycache__",
        project_root / "backend" / "app" / "admin" / "__pycache__",
        project_root / "backend" / "app" / "api" / "__pycache__",
        project_root / "backend" / "app" / "auth" / "__pycache__",
        project_root / "backend" / "app" / "config" / "__pycache__",
        project_root / "backend" / "app" / "donor" / "__pycache__",
        project_root / "backend" / "app" / "homepage" / "__pycache__",
        project_root / "backend" / "app" / "requests" / "__pycache__",
        project_root / "backend" / "app" / "services" / "__pycache__",
        project_root / "backend" / "app" / "utils" / "__pycache__",
        project_root / "backend" / "migrations" / "__pycache__",
        project_root / "backend" / "migrations" / "versions" / "__pycache__",
    ]
    
    for dir_path in pycache_dirs:
        if remove_directory(str(dir_path)):
            items_removed += 1
    
    print()
    print("Cleaning build artifacts...")
    
    # Remove frontend build directory
    if remove_directory(str(project_root / "frontend" / "dist")):
        items_removed += 1
    
    # Remove frontend .vite cache
    if remove_directory(str(project_root / "frontend" / ".vite")):
        items_removed += 1
    
    # Remove backend instance directory (contains SQLite DB if any)
    if remove_directory(str(project_root / "backend" / "instance")):
        items_removed += 1
    
    print()
    print("Cleaning temporary files...")
    
    # Remove .pyc files
    backend_path = project_root / "backend"
    if backend_path.exists():
        for pyc_file in backend_path.rglob("*.pyc"):
            if remove_file(str(pyc_file)):
                items_removed += 1
    
    # Remove .log files
    for log_file in project_root.rglob("*.log"):
        if remove_file(str(log_file)):
            items_removed += 1
    
    # Remove .db files from backend (SQLite databases)
    if backend_path.exists():
        for db_file in backend_path.rglob("*.db"):
            if remove_file(str(db_file)):
                items_removed += 1
    
    print()
    print("=" * 60)
    print(f"Cleanup Complete - Total items removed: {items_removed}")
    print("=" * 60)
    print()
    print("Note: node_modules and .venv are preserved (they're in .gitignore)")
    print("To remove node_modules manually: rm -rf frontend/node_modules")
    print("To remove .venv manually: rm -rf backend/.venv")

if __name__ == "__main__":
    main()
