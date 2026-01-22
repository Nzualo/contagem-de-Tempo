from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from google import genai
from pydantic import BaseModel, Field, ValidationError


class DemoResponse(BaseModel):
    lines: List[str] = Field(
        description="Linhas curtas para a secção DEMONSTRAÇÃO (máx. 8)."
    )


def _build_prompt(data: Dict[str, Any]) -> str:
    return f"""
Você é um técnico que preenche a secção "DEMONSTRAÇÃO" da certidão de contagem de tempo e fixação de encargos (LESSSOFE).

OBJETIVO:
- Produzir linhas no estilo manuscrito do exemplo (curtas, com 'x 12', '=/30', 'TOTAL', 'prestações').

REGRAS CRÍTICAS (obrigatórias):
1) Use EXCLUSIVAMENTE os números fornecidos em DADOS. NÃO invente, NÃO estime.
2) NÃO altere os resultados. NÃO arredonde diferente.
3) Máximo 8 linhas.
4) Formato PT: ponto milhar e vírgula decimal (ex.: 60.464,26).
5) Sequência sugerida:
   - A/M/D e conversão (A×12 + M = meses; dias = D)
   - Salário × 7% = mensal
   - Mensal × meses = encargo meses
   - Mensal/30 = diário; diário × dias = encargo dias
   - TOTAL
   - Prestações: n; 1ª; restantes

DADOS:
- TSND (A/M/D): A={data["nd_anos"]} M={data["nd_meses"]} D={data["nd_dias"]}
- Meses totais: {data["meses_totais"]}
- Salário pensionável: {data["salario_pensionavel_fmt"]}
- Valor mensal (7%): {data["valor_mensal_fmt"]}
- Encargo meses: {data["encargo_meses_fmt"]}
- Valor diário: {data["valor_diario_fmt"]}
- Encargo dias: {data["encargo_dias_fmt"]}
- TOTAL: {data["encargo_total_fmt"]}
- Prestações: {data["n_prestacoes"]}
- Valor prestação: {data["valor_prestacao_fmt"]}

DEVOLVA APENAS JSON no schema pedido (campo "lines").
""".strip()


def generate_demo_lines_with_gemini(
    *,
    data: Dict[str, Any],
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    max_output_tokens: int = 400,
) -> List[str]:
    """
    Gera linhas de demonstração com Gemini, usando structured output.
    Se falhar, levanta exceção e o caller aplica fallback.
    """
    api_key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("API Key não definida. Use GOOGLE_API_KEY (ou GEMINI_API_KEY).")

    model = model or os.getenv("GEMINI_MODEL") or "gemini-2.5-pro"

    client = genai.Client(api_key=api_key)

    prompt = _build_prompt(data)

    resp = client.models.generate_content(
        model=model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_json_schema": DemoResponse.model_json_schema(),
            "max_output_tokens": max_output_tokens,
        },
    )

    try:
        parsed = DemoResponse.model_validate_json(resp.text)
    except ValidationError as e:
        raise RuntimeError(f"Resposta IA inválida (schema). {e}")

    lines = [ln.strip() for ln in parsed.lines if ln and ln.strip()]
    lines = lines[:8]

    if not lines:
        raise RuntimeError("IA devolveu demonstração vazia.")

    return lines
