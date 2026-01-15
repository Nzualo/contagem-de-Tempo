from __future__ import annotations
from dataclasses import dataclass
from datetime import date, timedelta
import calendar

TAXA_CONTRIBUICAO = 0.07  # 7% (conforme regra/exemplo)
DIAS_MES_ADMIN = 30       # diário = mensal/30 (regra administrativa)

@dataclass(frozen=True)
class Periodo:
    inicio: date
    fim: date

@dataclass(frozen=True)
class TempoAMD:
    anos: int
    meses: int
    dias: int

@dataclass(frozen=True)
class Resultado:
    periodo_servico: Periodo
    periodo_descontado: Periodo | None
    periodo_nao_descontado: Periodo | None

    servico_amd: TempoAMD
    descontado_amd: TempoAMD
    nao_descontado_amd: TempoAMD

    servico_dias: int
    descontado_dias: int
    nao_descontado_dias: int

    salario_pensionavel: float
    valor_mensal: float
    valor_diario: float
    meses_totais_cobranca: int
    encargo_meses: float
    encargo_dias: float
    encargo_total: float

def _add_months(d: date, months: int) -> date:
    y = d.year + (d.month - 1 + months) // 12
    m = (d.month - 1 + months) % 12 + 1
    last_day = calendar.monthrange(y, m)[1]
    day = min(d.day, last_day)
    return date(y, m, day)

def diff_amd(start: date, end: date) -> TempoAMD:
    """Diferença em Anos/Meses/Dias (AMD) no estilo calendário."""
    if end < start:
        return TempoAMD(0, 0, 0)

    years = end.year - start.year
    start_day = min(start.day, calendar.monthrange(start.year + years, start.month)[1])
    candidate = date(start.year + years, start.month, start_day)

    if candidate > end:
        years -= 1
        start_day = min(start.day, calendar.monthrange(start.year + years, start.month)[1])
        candidate = date(start.year + years, start.month, start_day)

    months = 0
    while True:
        nxt = _add_months(candidate, months + 1)
        if nxt <= end:
            months += 1
        else:
            break

    base = _add_months(candidate, months)
    days = (end - base).days
    return TempoAMD(years, months, days)

def days_inclusive(d1: date, d2: date) -> int:
    if d2 < d1:
        return 0
    return (d2 - d1).days + 1

def calcular(
    inicio_funcoes: date,
    fim_funcoes: date,
    inicio_desconto: date,
    salario_pensionavel: float,
) -> Resultado:
    """
    Regras:
      - Serviço: inicio_funcoes -> fim_funcoes
      - Descontado: max(inicio_desconto, inicio_funcoes) -> fim_funcoes (se <= fim)
      - Não descontado: inicio_funcoes -> (inicio_desconto_aj - 1 dia), ajustado ao fim
      - Encargos: sobre tempo não descontado
        mensal = salario_pensionavel * 7%
        diário = mensal/30
        meses_totais = anos*12 + meses
        total = mensal*meses_totais + diário*dias
    """
    if fim_funcoes < inicio_funcoes:
        raise ValueError("Fim de funções não pode ser anterior ao início de funções.")

    inicio_desconto_aj = inicio_desconto if inicio_desconto >= inicio_funcoes else inicio_funcoes

    # Serviço
    periodo_servico = Periodo(inicio_funcoes, fim_funcoes)
    servico_dias = days_inclusive(inicio_funcoes, fim_funcoes)
    servico_amd = diff_amd(inicio_funcoes, fim_funcoes)

    # Descontado
    if inicio_desconto_aj > fim_funcoes:
        periodo_descontado = None
        descontado_dias = 0
        descontado_amd = TempoAMD(0, 0, 0)
    else:
        periodo_descontado = Periodo(inicio_desconto_aj, fim_funcoes)
        descontado_dias = days_inclusive(inicio_desconto_aj, fim_funcoes)
        descontado_amd = diff_amd(inicio_desconto_aj, fim_funcoes)

    # Não descontado
    fim_nao_desc = inicio_desconto_aj - timedelta(days=1)
    if fim_nao_desc < inicio_funcoes:
        periodo_nao_descontado = None
        nao_descontado_dias = 0
        nao_descontado_amd = TempoAMD(0, 0, 0)
    else:
        fim_nao_desc_real = min(fim_nao_desc, fim_funcoes)
        periodo_nao_descontado = Periodo(inicio_funcoes, fim_nao_desc_real)
        nao_descontado_dias = days_inclusive(inicio_funcoes, fim_nao_desc_real)
        nao_descontado_amd = diff_amd(inicio_funcoes, fim_nao_desc_real)

    # Encargos
    salario_pensionavel_f = float(salario_pensionavel)
    valor_mensal = salario_pensionavel_f * TAXA_CONTRIBUICAO
    valor_diario = valor_mensal / float(DIAS_MES_ADMIN)

    meses_totais = nao_descontado_amd.anos * 12 + nao_descontado_amd.meses
    encargo_meses = valor_mensal * meses_totais
    encargo_dias = valor_diario * nao_descontado_amd.dias
    encargo_total = encargo_meses + encargo_dias

    return Resultado(
        periodo_servico=periodo_servico,
        periodo_descontado=periodo_descontado,
        periodo_nao_descontado=periodo_nao_descontado,
        servico_amd=servico_amd,
        descontado_amd=descontado_amd,
        nao_descontado_amd=nao_descontado_amd,
        servico_dias=servico_dias,
        descontado_dias=descontado_dias,
        nao_descontado_dias=nao_descontado_dias,
        salario_pensionavel=salario_pensionavel_f,
        valor_mensal=valor_mensal,
        valor_diario=valor_diario,
        meses_totais_cobranca=meses_totais,
        encargo_meses=encargo_meses,
        encargo_dias=encargo_dias,
        encargo_total=encargo_total,
    )

def plano_prestacoes(encargo_total: float, remuneracao_ou_pensao: float, max_prestacoes: int = 60):
    """
    Até 60 prestações e prestação <= 1/3 da remuneração/pensão.
    Retorna dict com sugestão (n mínimo que cumpre).
    """
    if encargo_total <= 0:
        return {"ok": True, "prestacoes": 0, "valor": 0.0, "limite": remuneracao_ou_pensao / 3.0 if remuneracao_ou_pensao > 0 else 0.0, "motivo": ""}

    if remuneracao_ou_pensao <= 0:
        return {"ok": False, "prestacoes": None, "valor": None, "limite": 0.0, "motivo": "Informe remuneração/pensão para aplicar limite de 1/3."}

    limite = remuneracao_ou_pensao / 3.0
    for n in range(1, max_prestacoes + 1):
        v = encargo_total / n
        if v <= limite + 1e-9:
            return {"ok": True, "prestacoes": n, "valor": v, "limite": limite, "motivo": ""}

    return {"ok": False, "prestacoes": max_prestacoes, "valor": encargo_total / max_prestacoes, "limite": limite,
            "motivo": "Mesmo com 60 prestações, excede 1/3 da remuneração/pensão."}
