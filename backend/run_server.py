#!/usr/bin/env python3
"""
Video Analysis API Server Startup Script
Initializes and runs the FastAPI server with proper configuration and checks.
"""

import sys
import os
import logging
import argparse
import signal
import asyncio
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    import uvicorn
    from config import get_config, run_startup_checks
    from main import app
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're in the backend directory and have installed dependencies:")
    print("pip install -r requirements.txt")
    sys.exit(1)

# Configure logging
def setup_logging(log_level: str):
    """Setup application logging."""
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Create formatters
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_formatter = logging.Formatter(
        '%(levelname)s: %(message)s'
    )
    
    # Setup file handler
    file_handler = logging.FileHandler(log_dir / "video_analysis.log")
    file_handler.setFormatter(file_formatter)
    file_handler.setLevel(logging.DEBUG)
    
    # Setup console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(console_formatter)
    console_handler.setLevel(getattr(logging, log_level.upper()))
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    # Suppress some noisy loggers
    logging.getLogger("multipart").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

def print_banner():
    """Print application banner."""
    config = get_config()
    
    banner = f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║                    VIDEO ANALYSIS API                        ║
    ║                  YOLOv8m Detection System                   ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  Version: {config.version:<10}                               ║
    ║  Environment: {config.environment:<10}                      ║
    ║  Server: http://{config.server.host}:{config.server.port}                     ║
    ╚══════════════════════════════════════════════════════════════╝
    
    🚀 Starting server...
    📊 YOLOv8m Model: {config.yolo.model_path}
    🎯 Detection Mode: Micro-mobility + Vehicles
    📁 Upload Directory: {config.storage.upload_dir}
    📤 Export Directory: {config.storage.export_dir}
    
    """
    print(banner)

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    print(f"\n🛑 Received signal {signum}. Shutting down gracefully...")
    sys.exit(0)

def check_port_availability(host: str, port: int) -> bool:
    """Check if the specified port is available."""
    import socket
    
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind((host, port))
            return True
    except OSError:
        return False

def main():
    """Main function to run the server."""
    parser = argparse.ArgumentParser(
        description="Video Analysis API Server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_server.py                    # Run with default settings
  python run_server.py --port 8080        # Run on custom port
  python run_server.py --host 0.0.0.0     # Bind to all interfaces
  python run_server.py --reload           # Enable auto-reload
  python run_server.py --debug            # Enable debug mode
        """
    )
    
    # Server arguments
    parser.add_argument(
        "--host", 
        default=None, 
        help="Host to bind to (default: from config)"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=None, 
        help="Port to bind to (default: from config)"
    )
    parser.add_argument(
        "--reload", 
        action="store_true", 
        help="Enable auto-reload for development"
    )
    parser.add_argument(
        "--debug", 
        action="store_true", 
        help="Enable debug mode"
    )
    parser.add_argument(
        "--log-level", 
        choices=["debug", "info", "warning", "error"], 
        default=None,
        help="Set logging level (default: from config)"
    )
    
    # Model arguments
    parser.add_argument(
        "--model-path", 
        default=None, 
        help="Path to YOLOv8m model (default: from config)"
    )
    parser.add_argument(
        "--device", 
        choices=["auto", "cpu", "cuda"], 
        default=None,
        help="Device for YOLO inference (default: from config)"
    )
    
    # Utility arguments
    parser.add_argument(
        "--check-only", 
        action="store_true", 
        help="Run startup checks only, don't start server"
    )
    parser.add_argument(
        "--no-checks", 
        action="store_true", 
        help="Skip startup checks"
    )
    
    args = parser.parse_args()
    
    # Get configuration
    config = get_config()
    
    # Override config with command line arguments
    if args.host:
        config.server.host = args.host
    if args.port:
        config.server.port = args.port
    if args.reload:
        config.server.reload = True
    if args.log_level:
        config.server.log_level = args.log_level
    if args.model_path:
        config.yolo.model_path = args.model_path
    if args.device:
        config.yolo.device = args.device
    if args.debug:
        config.debug = True
        config.server.log_level = "debug"
    
    # Setup logging
    setup_logging(config.server.log_level)
    logger = logging.getLogger(__name__)
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Run startup checks
        if not args.no_checks:
            print("🔍 Running startup checks...")
            if not run_startup_checks():
                print("❌ Startup checks failed. Use --no-checks to skip.")
                sys.exit(1)
        
        if args.check_only:
            print("✅ Startup checks completed successfully.")
            sys.exit(0)
        
        # Check port availability
        if not check_port_availability(config.server.host, config.server.port):
            print(f"❌ Port {config.server.port} is already in use.")
            print("Try a different port with --port <port_number>")
            sys.exit(1)
        
        # Print banner
        print_banner()
        
        # Additional startup info
        print("📋 Startup Information:")
        print(f"   • Python: {sys.version}")
        print(f"   • Working Directory: {os.getcwd()}")
        print(f"   • Log Level: {config.server.log_level.upper()}")
        print(f"   • Debug Mode: {'Enabled' if config.debug else 'Disabled'}")
        print(f"   • Auto-reload: {'Enabled' if config.server.reload else 'Disabled'}")
        print()
        
        # Start the server
        uvicorn.run(
            "main:app",
            host=config.server.host,
            port=config.server.port,
            reload=config.server.reload,
            log_level=config.server.log_level,
            access_log=True,
            reload_dirs=["./"] if config.server.reload else None
        )
        
    except KeyboardInterrupt:
        print("\n🛑 Received interrupt signal. Shutting down...")
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        print(f"❌ Server startup failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
