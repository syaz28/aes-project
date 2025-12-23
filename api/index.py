# api/index.py - Vercel Serverless Entry Point
# This file serves as the entry point for Vercel Python Serverless Functions

import sys
import os

# Add backend directory to path so we can import modules
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.insert(0, backend_dir)

# Import the FastAPI app from backend
from main import app

# Vercel expects a handler - FastAPI app is ASGI compatible
# The app object will be used directly by Vercel's Python runtime
