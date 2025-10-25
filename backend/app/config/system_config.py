"""
System Configuration Helper - Makes app portable across all systems
Auto-detects available ports and configures URLs dynamically
"""
import socket
import os
import platform
from typing import Tuple

class SystemConfig:
    """Auto-configure system-specific settings"""
    
    @staticmethod
    def get_local_ip():
        """Get local machine IP address"""
        try:
            # Create a socket to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except:
            return "127.0.0.1"
    
    @staticmethod
    def is_port_available(port: int, host: str = '127.0.0.1') -> bool:
        """Check if a port is available"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                s.bind((host, port))
                return True
        except (OSError, socket.error):
            return False
    
    @staticmethod
    def find_available_port(preferred_port: int, host: str = '127.0.0.1', max_attempts: int = 10) -> int:
        """Find an available port, starting with preferred port"""
        if SystemConfig.is_port_available(preferred_port, host):
            return preferred_port
        
        # Try nearby ports
        for i in range(1, max_attempts):
            alt_port = preferred_port + i
            if SystemConfig.is_port_available(alt_port, host):
                print(f"⚠️  Port {preferred_port} is busy, using {alt_port} instead")
                return alt_port
        
        raise RuntimeError(f"Could not find available port near {preferred_port}")
    
    @staticmethod
    def get_backend_url(port: int = None) -> Tuple[str, int]:
        """Get backend URL with auto port detection"""
        preferred_port = port or int(os.getenv('BACKEND_PORT', 5000))
        host = os.getenv('BACKEND_HOST', '127.0.0.1')
        
        # Check if preferred port is available
        available_port = SystemConfig.find_available_port(preferred_port, host)
        
        url = f"http://{host}:{available_port}"
        return url, available_port
    
    @staticmethod
    def get_frontend_url(port: int = None) -> Tuple[str, int]:
        """Get frontend URL with auto port detection"""
        preferred_port = port or int(os.getenv('FRONTEND_PORT', 3000))
        host = os.getenv('FRONTEND_HOST', 'localhost')
        
        url = f"http://{host}:{preferred_port}"
        return url, preferred_port
    
    @staticmethod
    def get_database_url() -> str:
        """Get database URL with fallback to SQLite"""
        db_url = os.getenv('DATABASE_URL')
        
        if db_url:
            # Handle Docker/localhost replacement
            if '@postgres:' in db_url and os.getenv('FLASK_ENV') == 'development':
                db_url = db_url.replace('@postgres:', '@localhost:')
            return db_url
        
        # Fallback to SQLite
        import pathlib
        db_path = pathlib.Path(__file__).parent.parent.parent / "smartblood.db"
        return f"sqlite:///{db_path}"
    
    @staticmethod
    def print_system_info():
        """Print system information for debugging"""
        print("\n" + "="*70)
        print("SYSTEM INFORMATION")
        print("="*70)
        print(f"  OS: {platform.system()} {platform.release()}")
        print(f"  Python: {platform.python_version()}")
        print(f"  Machine: {platform.machine()}")
        print(f"  Local IP: {SystemConfig.get_local_ip()}")
        print(f"  Backend Port Available (5000): {SystemConfig.is_port_available(5000)}")
        print(f"  Frontend Port Available (3000): {SystemConfig.is_port_available(3000)}")
        print("="*70 + "\n")
    
    @staticmethod
    def ensure_cors_allowed_origins() -> list:
        """Get list of allowed CORS origins for all possible frontend URLs"""
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",  # Alternative port
            "http://127.0.0.1:3001",
        ]
        
        # Add custom frontend URL if set
        custom_url = os.getenv('FRONTEND_URL')
        if custom_url and custom_url not in origins:
            origins.append(custom_url)
        
        # Add local IP if different
        local_ip = SystemConfig.get_local_ip()
        if local_ip not in ['127.0.0.1', 'localhost']:
            origins.extend([
                f"http://{local_ip}:3000",
                f"http://{local_ip}:3001",
            ])
        
        return origins
    
    @staticmethod
    def get_safe_config_summary() -> dict:
        """Get non-sensitive config summary for display"""
        return {
            'system': platform.system(),
            'python_version': platform.python_version(),
            'local_ip': SystemConfig.get_local_ip(),
            'backend_url': SystemConfig.get_backend_url()[0],
            'frontend_url': SystemConfig.get_frontend_url()[0],
            'database_type': SystemConfig.get_database_url().split('://')[0],
            'cors_origins_count': len(SystemConfig.ensure_cors_allowed_origins()),
        }

# Auto-configure on import
def auto_configure():
    """Auto-configure system settings"""
    try:
        # Set environment variables if not already set
        if not os.getenv('BACKEND_HOST'):
            os.environ['BACKEND_HOST'] = '127.0.0.1'
        
        if not os.getenv('BACKEND_PORT'):
            os.environ['BACKEND_PORT'] = '5000'
        
        if not os.getenv('FRONTEND_HOST'):
            os.environ['FRONTEND_HOST'] = 'localhost'
        
        if not os.getenv('FRONTEND_PORT'):
            os.environ['FRONTEND_PORT'] = '3000'
        
        # Ensure database URL is set
        if not os.getenv('DATABASE_URL'):
            os.environ['DATABASE_URL'] = SystemConfig.get_database_url()
        
        return True
    except Exception as e:
        print(f"Warning: Auto-configuration failed: {e}")
        return False

# Run auto-configuration on import
auto_configure()
