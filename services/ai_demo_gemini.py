from __future__ import annotations

import os
import json
import hashlib
from typing import Any, Dict, List, Optional

from google import genai
from pydantic import BaseModel, Field, ValidationError


class DemoResponse(BaseModel):
    lines: List[str] = Field(description="Linhas curtas para a secção DEMONSTRAÇÃO (máx. 8).")


def _build_prompt(data: Dict[str, Any]) -> str:
    return f"""
Você é um técnico que preenche a secção "DEMONSTRAÇÃO" (LESSSOFE) em estilo manuscrito.

REGRAS:
- Use EXCLUSIVAMENTE os números fornecidos.
- NÃO invente números, NÃO estime, NÃO arredonde diferente.
- Máximo 8 linhas, curtas.
- Formato PT (ponto milhar, vírgula decimal).
- Sequência: conversão A/M/D -> meses+dias; salário×7%; mensal×meses; /30; diário×dias; TOTAL; prestações.

DADOS:
TSND: A={data["nd_anos"]} M={data["nd_meses"]} D={data["nd_dias"]}
Meses totais: {data["meses_totais"]}
Salário: {data["salario_pensionavel_fmt"]}
Mensal(7%): {data["valor_mensal_fmt"]}
Encargo meses: {data["encargo_meses_fmt"]}
Diário: {data["valor_diario_fmt"]}
Encargo dias: {data["encargo_dias_fmt"]}
TOTAL: {data["encargo_total_fmt"]}
Prestações: {data["n_prestacoes"]}
Prestação: {data["valor_prestacao_fmt"]}

DEVOLVA APENAS JSON com campo "lines".
""".strip()


def _hash_payload(data: Dict[str, Any]) -> str:
    raw = json.dumps(data, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _is_quota_error(msg: str) -> bool:
    msg_u = msg.upper()
    return ("RESOURCE_EXHAUSTED" in msg_u) or ("QUOTA" in msg_u) or ("429" in msg_u)


def generate_demo_lines_with_gemini(
    *,
    data: Dict[str, Any],
    preferred_model: Optional[str] = None,
    fallback_model: Optional[str] = None,
    api_key: Optional[str] = None,
    max_output_tokens: int = 350,
    cache: Optional[Dict[str, List[str]]] = None,
) -> List[str]:
    """
    Gera linhas de demonstração com Gemini (IA opcional).
    - Tenta preferred_model -> se quota, tenta fallback_model.
    - Cache opcional para evitar gastar quota repetindo o mesmo pedido.
    """
    api_key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("API Key não definida. Use GOOGLE_API_KEY (ou GEMINI_API_KEY) nos Secrets.")

    preferred_model = preferred_model or os.getenv("GEMINI_MODEL") or "gemini-2.5-pro"
    # Tente flash como fallback (se sua conta tiver quota nesse modelo)
    fallback_model = fallback_model or os.getenv("GEMINI_FALLBACK_MODEL") or "gemini-2.5-flash"

    # cache (em memória do processo)
    key = _hash_payload(data)
    if cache is not None and key in cache:
        return cache[key]

    client = genai.Client(api_key=api_key)
    prompt = _build_prompt(data)

    def _call(model: str) -> List[str]:
        resp = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": DemoResponse.model_json_schema(),
                "max_output_tokens": max_output_tokens,
            },
        )
        parsed = DemoResponse.model_validate_json(resp.text)
        lines = [ln.strip() for ln in parsed.lines if ln and ln.strip()]
        return lines[:8]

    # 1) preferred
    try:
        lines = _call(preferred_model)
        if not lines:
            raise RuntimeError("IA devolveu demonstração vazia.")
        if cache is not None:
            cache[key] = lines
        return lines
    except (ValidationError, Exception) as e1:
        msg1 = str(e1)
        # 2) fallback se for quota/429
        if _is_quota_error(msg1):
            try:
                lines = _call(fallback_model)
                if not lines:
                    raise RuntimeError("IA devolveu demonstração vazia.")
                if cache is not None:
                    cache[key] = lines
                return lines
            except Exception as e2:
                raise RuntimeError(f"Quota/limite na IA. Preferred={preferred_model}; Fallback={fallback_model}. Detalhe: {e2}")
        raise RuntimeError(f"Falha IA (não-quota). Model={preferred_model}. Detalhe: {e1}")
