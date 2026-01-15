import streamlit as st
from datetime import date, timedelta
import calendar
import math

st.set_page_config(page_title="Efetividade do Funcionário", layout="wide")
st.title("Calculadora de Efetividade do Funcionário (Serviço, Desconto e Encargos)")

# =========================
# Utilitários de tempo (AMD)
# =========================

def add_months(d: date, months: int) -> date:
    """Adiciona meses mantendo o dia quando possível (ajusta para último dia do mês)."""
    y = d.year + (d.month - 1 + months) // 12
    m = (d.month - 1 + months) % 12 + 1
    last_day = calendar.monthrange(y, m)[1]
    day = min(d.day, last_day)
    return date(y, m, day)

def diff_ymd(start: date, end: date) -> tuple[int, int, int]:
    """
    Diferença em Anos, Meses, Dias (AMD) no estilo "calendário".
    Regras:
      - start e end inclusivos? Aqui usamos end como "data final" e calculamos AMD clássico.
      - Para apresentar tempo, é o mais aceitável em certidões (AMD).
    """
    if end < start:
        return (0, 0, 0)

    # primeiro calcula anos e meses "cheios"
    years = end.year - start.year
    candidate = date(start.year + years, start.month, min(start.day, calendar.monthrange(start.year + years, start.month)[1]))
    if candidate > end:
        years -= 1
        candidate = date(start.year + years, start.month, min(start.day, calendar.monthrange(start.year + years, start.month)[1]))

    # meses
    months = 0
    while True:
        nxt = add_months(candidate, months + 1)
        if nxt <= end:
            months += 1
        else:
            break

    base = add_months(candidate, months)
    days = (end - base).days
    return years, months, days

def days_inclusive(d1: date, d2: date) -> int:
    """Dias inclusivos: inclui início e fim."""
    if d2 < d1:
        return 0
    return (d2 - d1).days + 1

# =========================
# Encargos (LESSOFE / exemplo)
# =========================

TAXA_CONTRIBUICAO = 0.07  # 7% fixo (como no exemplo)

def calcular_encargos_por_amd(anos: int, meses: int, dias: int, salario_pensionavel: float) -> dict:
    """
    Implementa a lógica do slide:
      - contribuição mensal = salário_pensionável * 7%
      - valor diário = mensal / 30
      - meses totais = anos*12 + meses
      - encargo total = mensal*meses_totais + diário*dias
    """
    meses_totais = anos * 12 + meses
    valor_mensal = salario_pensionavel * TAXA_CONTRIBUICAO
    valor_diario = valor_mensal / 30.0

    encargo_meses = valor_mensal * meses_totais
    encargo_dias = valor_diario * dias
    total = encargo_meses + encargo_dias

    return {
        "meses_totais": meses_totais,
        "valor_mensal": valor_mensal,
        "valor_diario": valor_diario,
        "encargo_meses": encargo_meses,
        "encargo_dias": encargo_dias,
        "encargo_total": total,
    }

def plano_prestacoes(encargo_total: float, salario_base_limite: float, max_prestacoes: int = 60) -> dict:
    """
    Gera plano respeitando:
      - até 60 prestações
      - prestação <= 1/3 da remuneração (ou pensão)
    Retorna o menor nº de prestações que cumpre o limite.
    """
    if encargo_total <= 0:
        return {"prestacoes": 0, "valor_prestacao": 0.0, "limite": salario_base_limite / 3.0, "ok": True}

    limite = salario_base_limite / 3.0 if salario_base_limite > 0 else 0.0
    if limite <= 0:
        return {"prestacoes": None, "valor_prestacao": None, "limite": limite, "ok": False, "motivo": "Informe a remuneração/pensão para aplicar a regra de 1/3."}

    # encontrar n mínimo até 60 tal que total/n <= limite
    for n in range(1, max_prestacoes + 1):
        vp = encargo_total / n
        if vp <= limite + 1e-9:
            return {"prestacoes": n, "valor_prestacao": vp, "limite": limite, "ok": True}

    # se nem com 60 prestações cumpre
    return {"prestacoes": max_prestacoes, "valor_prestacao": encargo_total / max_prestacoes, "limite": limite, "ok": False,
            "motivo": "Mesmo com 60 prestações, a prestação excede 1/3 da remuneração/pensão."}

# =========================
# Entradas (comuns a todas abas)
# =========================

with st.sidebar:
    st.header("Dados-base")

    nome = st.text_input("Nome", placeholder="Ex.: Sr. Almeida Cossa")
    inicio_funcoes = st.date_input("Início de funções", value=date(1996, 9, 8))

    ainda_em_funcoes = st.checkbox("Ainda em funções?", value=False)
    fim_funcoes = date.today() if ainda_em_funcoes else st.date_input("Fim (último dia) de funções", value=date(2022, 11, 30))

    inicio_desconto = st.date_input("Início do desconto (nomeação provisória / início no sistema)", value=date(1998, 4, 23))

    st.divider()
    st.header("Encargos (LESSOFE)")
    salario_pensionavel = st.number_input("Última remuneração pensionável (Mt)", min_value=0.0, value=10758.00, step=10.0)

    # Para regra 1/3: pode ser remuneração atual ou pensão (depende do caso)
    remuneracao_ou_pensao = st.number_input("Remuneração/Pensão para limite 1/3 (Mt)", min_value=0.0, value=10758.00, step=10.0)

# =========================
# Validações e normalizações
# =========================

if fim_funcoes < inicio_funcoes:
    st.error("Erro: Fim de funções não pode ser anterior ao início de funções.")
    st.stop()

# Ajuste: se inicio_desconto < inicio_funcoes, considera início_funcoes
inicio_desconto_aj = inicio_desconto
if inicio_desconto_aj < inicio_funcoes:
    inicio_desconto_aj = inicio_funcoes

# =========================
# Cálculos principais (para usar em todas abas)
# =========================

# 1) Tempo de serviço: inicio_funcoes -> fim_funcoes
serv_anos, serv_meses, serv_dias = diff_ymd(inicio_funcoes, fim_funcoes)
serv_dias_total = days_inclusive(inicio_funcoes, fim_funcoes)

# 2) Tempo descontado: inicio_desconto_aj -> fim_funcoes (se desconto <= fim)
if inicio_desconto_aj > fim_funcoes:
    desc_anos, desc_meses, desc_dias = (0, 0, 0)
    desc_dias_total = 0
else:
    desc_anos, desc_meses, desc_dias = diff_ymd(inicio_desconto_aj, fim_funcoes)
    desc_dias_total = days_inclusive(inicio_desconto_aj, fim_funcoes)

# 3) Tempo não descontado: inicio_funcoes -> (inicio_desconto_aj - 1)
fim_nao_desc = inicio_desconto_aj - timedelta(days=1)
if fim_nao_desc < inicio_funcoes:
    nao_desc_anos, nao_desc_meses, nao_desc_dias = (0, 0, 0)
    nao_desc_dias_total = 0
else:
    fim_nao_desc_real = min(fim_nao_desc, fim_funcoes)
    nao_desc_anos, nao_desc_meses, nao_desc_dias = diff_ymd(inicio_funcoes, fim_nao_desc_real)
    nao_desc_dias_total = days_inclusive(inicio_funcoes, fim_nao_desc_real)

# 4) Encargos (sobre tempo não descontado)
enc = calcular_encargos_por_amd(nao_desc_anos, nao_desc_meses, nao_desc_dias, salario_pensionavel)

# Plano de prestações
plano = plano_prestacoes(enc["encargo_total"], remuneracao_ou_pensao, max_prestacoes=60)

# =========================
# Abas
# =========================

tab1, tab2, tab3, tab4 = st.tabs([
    "Tempo de serviço",
    "Tempo descontado",
    "Tempo não descontado",
    "Fixação de encargos"
])

with tab1:
    st.subheader("Aba 1 — Tempo de serviço no Aparelho do Estado")
    st.write("**Regra:** conta desde a data de início de funções até ao último dia das suas funções.")
    st.info(f"Período: {inicio_funcoes.isoformat()} → {fim_funcoes.isoformat()}")

    c1, c2 = st.columns(2)
    with c1:
        st.metric("Total (dias)", serv_dias_total)
    with c2:
        st.metric("Total (A/M/D)", f"{serv_anos}A {serv_meses}M {serv_dias}D")

with tab2:
    st.subheader("Aba 2 — Tempo descontado (para efeitos de aposentação)")
    st.write("**Regra:** conta desde a data da nomeação provisória / início do desconto no sistema até ao último dia das funções.")
    st.info(f"Período: {inicio_desconto_aj.isoformat()} → {fim_funcoes.isoformat()}")

    c1, c2 = st.columns(2)
    with c1:
        st.metric("Total (dias)", desc_dias_total)
    with c2:
        st.metric("Total (A/M/D)", f"{desc_anos}A {desc_meses}M {desc_dias}D")

    if inicio_desconto > fim_funcoes:
        st.warning("O início do desconto está após o fim de funções. Tempo descontado = 0.")

with tab3:
    st.subheader("Aba 3 — Tempo não descontado")
    st.write("**Regra:** desde o primeiro dia de início de funções até ao último dia que não contribuiu (dia anterior ao início do desconto).")
    if nao_desc_dias_total == 0:
        st.success("Não há tempo não descontado neste caso.")
    else:
        st.info(f"Período: {inicio_funcoes.isoformat()} → {fim_nao_desc.isoformat()} (ajustado ao fim de funções, se necessário)")

    c1, c2 = st.columns(2)
    with c1:
        st.metric("Total (dias)", nao_desc_dias_total)
    with c2:
        st.metric("Total (A/M/D)", f"{nao_desc_anos}A {nao_desc_meses}M {nao_desc_dias}D")

with tab4:
    st.subheader("Aba 4 — Fixação e pagamento de encargos (Art. 25 / Art. 17 / Art. 65)")
    st.write("**Base:** última remuneração pensionável da categoria/função exercida.")
    st.write("**Taxa:** 7% (conforme exemplo).")
    st.write("**Conversão:** dias = mensal / 30. Prestações até 60, cada uma ≤ 1/3 da remuneração/pensão.")

    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Valor mensal (7%)", f"{enc['valor_mensal']:,.2f} Mt")
    with c2:
        st.metric("Valor diário (mensal/30)", f"{enc['valor_diario']:,.2f} Mt")
    with c3:
        st.metric("Encargo total", f"{enc['encargo_total']:,.2f} Mt")

    st.write("### Detalhe do cálculo")
    st.write(f"- Tempo não descontado: **{nao_desc_anos}A {nao_desc_meses}M {nao_desc_dias}D**")
    st.write(f"- Meses totais para cobrança: **{enc['meses_totais']}**")
    st.write(f"- Encargos por meses: **{enc['encargo_meses']:,.2f} Mt**")
    st.write(f"- Encargos por dias: **{enc['encargo_dias']:,.2f} Mt**")

    st.write("### Pagamento em prestações (máx. 60; prestação ≤ 1/3)")
    if plano.get("prestacoes") is None:
        st.error(plano["motivo"])
    else:
        st.write(f"- Limite por prestação (1/3): **{plano['limite']:,.2f} Mt**")
        st.write(f"- Número de prestações sugerido: **{plano['prestacoes']}**")
        st.write(f"- Valor de cada prestação: **{plano['valor_prestacao']:,.2f} Mt**")
        if not plano["ok"]:
            st.warning(plano.get("motivo", "Plano não cumpre a regra de 1/3."))

    # Prazo Art. 65 (até 30/06/2027) – alerta informativo
    limite_art65 = date(2027, 6, 30)
    if date.today() > limite_art65:
        st.error("ATENÇÃO: Prazo do Art. 65 expirou (após 30/06/2027). Encargos podem ser fixados sob forma de reservas matemáticas.")
    else:
        st.info(f"Prazo do Art. 65: regularizar até {limite_art65.isoformat()} (inclusive).")

