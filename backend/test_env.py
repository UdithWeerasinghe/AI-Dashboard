import sys
import pkg_resources
import os

def test_environment():
    print("=== Environment Test ===")
    print("\nPython Information:")
    print(f"Version: {sys.version}")
    print(f"Executable: {sys.executable}")
    print(f"Virtual Environment: {os.getenv('VIRTUAL_ENV', 'Not in a virtual environment')}")
    
    print("\nInstalled Packages:")
    required_packages = [
        'flask', 'flask-cors', 'pandas', 'numpy',
        'scikit-learn', 'tensorflow', 'python-dotenv',
        'gunicorn', 'pytest', 'camelot-py', 'ghostscript'
    ]
    
    installed_packages = {pkg.key: pkg.version for pkg in pkg_resources.working_set}
    
    print("\nRequired packages status:")
    for package in required_packages:
        if package in installed_packages:
            print(f"✓ {package}=={installed_packages[package]}")
        else:
            print(f"✗ {package} (not installed)")

if __name__ == "__main__":
    test_environment() 