"""
File Management Service
Handles file browsing, cleanup, and organization for video analysis app.
"""

import os
import shutil
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import json
import logging

from config import get_config

logger = logging.getLogger(__name__)
config = get_config()

class FileInfo:
    def __init__(self, path: str, name: str, size: int, created: datetime, modified: datetime, file_type: str):
        self.path = path
        self.name = name
        self.size = size
        self.created = created
        self.modified = modified
        self.file_type = file_type
        self.age_days = (datetime.now() - created).days

    def to_dict(self) -> Dict:
        return {
            "path": self.path,
            "name": self.name,
            "size": self.size,
            "created": self.created.isoformat(),
            "modified": self.modified.isoformat(),
            "file_type": self.file_type,
            "age_days": self.age_days,
            "size_mb": round(self.size / (1024 * 1024), 2)
        }

class FilePair:
    def __init__(self, video: FileInfo, excel: Optional[FileInfo] = None):
        self.video = video
        self.excel = excel
        self.is_complete = excel is not None

    def to_dict(self) -> Dict:
        return {
            "video": self.video.to_dict(),
            "excel": self.excel.to_dict() if self.excel else None,
            "is_complete": self.is_complete,
            "can_resume": self.is_complete
        }

class FileManagerService:
    def __init__(self):
        self.upload_dir = Path(config.storage.upload_dir)
        self.export_dir = Path(config.storage.export_dir)
        self.temp_dir = Path(config.storage.temp_dir)
        self.retention_days = config.storage.max_storage_days
        
        self.video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.wmv'}
        self.excel_extensions = {'.xlsx', '.xls', '.csv'}
        
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """Create directories if they don't exist."""
        for directory in [self.upload_dir, self.export_dir, self.temp_dir]:
            directory.mkdir(parents=True, exist_ok=True)

    def get_file_info(self, file_path: Path) -> FileInfo:
        """Get detailed file information."""
        stat = file_path.stat()
        created = datetime.fromtimestamp(stat.st_ctime)
        modified = datetime.fromtimestamp(stat.st_mtime)
        
        file_type = "video" if file_path.suffix.lower() in self.video_extensions else \
                   "excel" if file_path.suffix.lower() in self.excel_extensions else "other"
        
        return FileInfo(
            path=str(file_path),
            name=file_path.name,
            size=stat.st_size,
            created=created,
            modified=modified,
            file_type=file_type
        )

    def list_video_files(self) -> List[FileInfo]:
        """List all video files in uploads directory."""
        video_files = []
        
        if self.upload_dir.exists():
            for file_path in self.upload_dir.iterdir():
                if file_path.is_file() and file_path.suffix.lower() in self.video_extensions:
                    try:
                        file_info = self.get_file_info(file_path)
                        video_files.append(file_info)
                    except Exception as e:
                        logger.warning(f"Could not process video file {file_path}: {e}")
        
        return sorted(video_files, key=lambda x: x.created, reverse=True)

    def list_excel_files(self) -> List[FileInfo]:
        """List all Excel files in exports directory."""
        excel_files = []
        
        if self.export_dir.exists():
            for file_path in self.export_dir.iterdir():
                if file_path.is_file() and file_path.suffix.lower() in self.excel_extensions:
                    try:
                        file_info = self.get_file_info(file_path)
                        excel_files.append(file_info)
                    except Exception as e:
                        logger.warning(f"Could not process Excel file {file_path}: {e}")
        
        return sorted(excel_files, key=lambda x: x.created, reverse=True)

    def find_matching_pairs(self) -> List[FilePair]:
        """Find video-excel pairs for resume functionality."""
        video_files = self.list_video_files()
        excel_files = self.list_excel_files()
        pairs = []

        for video in video_files:
            video_base = Path(video.name).stem
            best_match = None
            
            for excel in excel_files:
                excel_base = Path(excel.name).stem
                
                # Check for filename similarity
                if (video_base.lower() in excel_base.lower() or 
                    excel_base.lower() in video_base.lower() or
                    self._calculate_similarity(video_base, excel_base) > 0.6):
                    
                    # If we found a match, check if it's better than current best
                    if best_match is None or abs(video.created.timestamp() - excel.created.timestamp()) < \
                       abs(video.created.timestamp() - best_match.created.timestamp()):
                        best_match = excel
            
            pairs.append(FilePair(video, best_match))
        
        return sorted(pairs, key=lambda x: x.video.created, reverse=True)

    def _calculate_similarity(self, str1: str, str2: str) -> float:
        """Calculate simple string similarity."""
        str1, str2 = str1.lower(), str2.lower()
        if not str1 or not str2:
            return 0.0
        
        # Count common words
        words1 = set(str1.replace('_', ' ').replace('-', ' ').split())
        words2 = set(str2.replace('_', ' ').replace('-', ' ').split())
        
        if not words1 or not words2:
            return 0.0
        
        common = len(words1.intersection(words2))
        total = len(words1.union(words2))
        
        return common / total if total > 0 else 0.0

    def get_storage_stats(self) -> Dict:
        """Get storage usage statistics."""
        def calculate_dir_size(directory: Path) -> Tuple[int, int]:
            """Return (total_size_bytes, file_count)."""
            if not directory.exists():
                return 0, 0
            
            total_size = 0
            file_count = 0
            
            for file_path in directory.rglob('*'):
                if file_path.is_file():
                    try:
                        total_size += file_path.stat().st_size
                        file_count += 1
                    except (OSError, FileNotFoundError):
                        continue
            
            return total_size, file_count

        upload_size, upload_count = calculate_dir_size(self.upload_dir)
        export_size, export_count = calculate_dir_size(self.export_dir)
        temp_size, temp_count = calculate_dir_size(self.temp_dir)

        return {
            "upload_dir": {
                "path": str(self.upload_dir),
                "size_bytes": upload_size,
                "size_mb": round(upload_size / (1024 * 1024), 2),
                "file_count": upload_count
            },
            "export_dir": {
                "path": str(self.export_dir),
                "size_bytes": export_size,
                "size_mb": round(export_size / (1024 * 1024), 2),
                "file_count": export_count
            },
            "temp_dir": {
                "path": str(self.temp_dir),
                "size_bytes": temp_size,
                "size_mb": round(temp_size / (1024 * 1024), 2),
                "file_count": temp_count
            },
            "total": {
                "size_bytes": upload_size + export_size + temp_size,
                "size_mb": round((upload_size + export_size + temp_size) / (1024 * 1024), 2),
                "file_count": upload_count + export_count + temp_count
            },
            "retention_days": self.retention_days
        }

    def clean_old_files(self, dry_run: bool = False) -> Dict:
        """Remove files older than retention period."""
        cutoff_date = datetime.now() - timedelta(days=self.retention_days)
        deleted_files = []
        total_size_freed = 0
        errors = []

        for directory in [self.upload_dir, self.export_dir, self.temp_dir]:
            if not directory.exists():
                continue
            
            for file_path in directory.rglob('*'):
                if not file_path.is_file():
                    continue
                
                try:
                    stat = file_path.stat()
                    created = datetime.fromtimestamp(stat.st_ctime)
                    
                    if created < cutoff_date:
                        if not dry_run:
                            file_path.unlink()
                        
                        deleted_files.append({
                            "path": str(file_path),
                            "name": file_path.name,
                            "size": stat.st_size,
                            "age_days": (datetime.now() - created).days
                        })
                        total_size_freed += stat.st_size
                        
                except Exception as e:
                    error_msg = f"Failed to process {file_path}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)

        return {
            "dry_run": dry_run,
            "deleted_files": deleted_files,
            "files_deleted": len(deleted_files),
            "size_freed_bytes": total_size_freed,
            "size_freed_mb": round(total_size_freed / (1024 * 1024), 2),
            "errors": errors,
            "retention_days": self.retention_days
        }

    def delete_file(self, file_path: str) -> bool:
        """Safely delete a specific file."""
        try:
            path = Path(file_path)
            
            # Security check: ensure file is in allowed directories
            allowed_parents = [self.upload_dir, self.export_dir, self.temp_dir]
            if not any(path.is_relative_to(parent) for parent in allowed_parents):
                logger.error(f"Attempted to delete file outside allowed directories: {file_path}")
                return False
            
            if path.exists() and path.is_file():
                path.unlink()
                logger.info(f"Deleted file: {file_path}")
                return True
            else:
                logger.warning(f"File not found: {file_path}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete file {file_path}: {e}")
            return False

    def copy_file_to_uploads(self, source_path: str, new_name: Optional[str] = None) -> str:
        """Copy a file to uploads directory for processing."""
        try:
            source = Path(source_path)
            if not source.exists():
                raise FileNotFoundError(f"Source file not found: {source_path}")
            
            # Generate new filename if not provided
            if new_name is None:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                new_name = f"resumed_{timestamp}_{source.name}"
            
            destination = self.upload_dir / new_name
            
            # Copy file
            shutil.copy2(source, destination)
            logger.info(f"Copied file from {source} to {destination}")
            
            return str(destination)
            
        except Exception as e:
            logger.error(f"Failed to copy file: {e}")
            raise
