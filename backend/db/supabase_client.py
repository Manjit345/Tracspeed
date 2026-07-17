"""
Supabase Client: It initializes and exports the Supabase client instance used across all backend modules for database operations and authentication.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url : str = os.getenv("SUPABASE_URL")
key : str = os.getenv("SUPABASE_KEY")

supabase : Client = create_client(url, key)