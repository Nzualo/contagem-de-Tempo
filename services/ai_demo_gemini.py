from __future__ import annotations

import os
from typing import List, Optional, Dict, Any

from google import genai
from pydantic import BaseModel, Field, ValidationError


class DemoResponse(BaseModel):
    lines: List[str] = Field(description="Linhas da DEMONSTRAÇÃO no estilo da certidão (máx. 8 linhas).")


def _build_prompt(data: Dict[str, Any]) -> str:
    """
    IMPORTANTÍSSIMO:
    - A IA NÃO pode inventar números.
    - Ela deve apenas formatar/explicar usando os valores fornecidos.
    """
    return f"""
Você é um técnico que preenche certidões de contagem de tempo e demonstração de encargos (LESSSOFE).
Gere SOMENTE a secção 'DEMONSTRAÇÃO' no mesmo estilo do exemplo manuscrito (linhas curtas).

REGRAS CRÍTICAS:
1) Use EXCLUSIVAMENTE os números e datas fornecidos em DADOS.
2) NÃO crie, NÃO estime, NÃO arredonde diferente.
3) Se algum valor estiver ausente, escreva "—" no lugar.
4) Produza no máximo 8 linhas (para caber no quadro).
5) Use formatação PT: vírgula decimal e ponto para milhar (ex.: 60.464,26).
6) Mantenha a sequência típica:
   - A/M/D e conversão para meses + dias (A*12 + M = meses; dias separados)
   - salário × 7% = valor mensal
   - valor mensal × meses = encargo meses
   - valor mensal/30 = diário; diário × dias = encargo dias
   - TOTAL
   - prestações: n; 1ª; restantes

DADOS (não invente nada):
- TSND (A/M/D): {data.get("nd_anos")} / {data.get("nd_meses")} / {data.get("nd_dias")}
- Meses totais (A*12 + M): {data.get("meses_totais")}
- Dias (D): {data.get("nd_dias")}
- Salário pensionável: {data.get("salario_pensionavel_fmt")}
- Percentagem: 7%
- Valor mensal (7%): {data.get("valor_mensal_fmt")}
- Encargo meses: {data.get("encargo_meses_fmt")}
- Valor diário (mensal/30): {data.get("valor_diario_fmt")}
- Encargo dias: {data.get("encargo_dias_fmt")}
- TOTAL: {data.get("encargo_total_fmt")}
- Prestações: {data.get("n_prestacoes")}
- Valor por prestação: {data.get("valor_prestacao_fmt")}

Agora devolva apenas as linhas da DEMONSTRAÇÃO.
""".strip()


def generate_demo_lines_with_gemini(
    *,
    data: Dict[str, Any],
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    max_output_tokens: int = 350,
) -> List[str]:
    """
    Retorna linhas para a caixa 'DEMONSTRAÇÃO' do PDF.
    Se falhar, levanta exceção para o chamador aplicar fallback.
    """
    api_key = api_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY não definido (Streamlit Secrets / env).")

    model = model or os.getenv("GEMINI_MODEL") or "gemini-2.5-pro"

    client = genai.Client(api_key=api_key)

    prompt = _build_prompt(data)

    # Structured output via JSON schema (Pydantic)
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
        raise RuntimeError(f"Resposta IA inválida (schema). Detalhe: {e}")

    # Normalização: remove linhas vazias, corta comprimento extremo
    lines = [ln.strip() for ln in parsed.lines if ln and ln.strip()]
    lines = lines[:8]
    if not lines:
        raise RuntimeError("IA devolveu demonstração vazia.")

    return lines
