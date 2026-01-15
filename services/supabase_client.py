from __future__ import annotations
import os
from supabase import create_client

def get_supabase():
    """
    Lê SUPABASE_URL e SUPABASE_ANON_KEY do ambiente (Streamlit Secrets ou .env local).
    Retorna client ou None se não estiver configurado.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        return None
    return create_client(url, key)
