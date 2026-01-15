import streamlit as st
from datetime import date
from dotenv import load_dotenv

from services.calculos import calcular, plano_prestacoes
from services.supabase_client import get_supabase

load_dotenv()

# ======= CONFIG =======
st.set_page_config(page_title="Efetividade do Funcionário", layout="wide")
st.title("App de Efetividade do Funcionário")

# ⚠️ Tabela no Supabase (a sua tem espaço)
TABLE_NAME = "Contagem de Tempo"  # se renomear: "contagem_tempo"

# ======= SIDEBAR =======
with st.sidebar:
    st.header("Dados-base")

    nome = st.text_input("Nome do funcionário", value="Ex.: Sr. Almeida Cossa")

    inicio_funcoes = st.date_input("Início de funções", value=date(1996, 9, 8))
    fim_funcoes = st.date_input("Fim (último dia) de funções", value=date(2022, 11, 30))
    inicio_desconto = st.date_input("Início do desconto (nomeação provisória / início no sistema)", value=date(1998, 4, 23))

    st.divider()
    st.header("Encargos (LESSOFE)")

    salario_pensionavel = st.number_input("Última remuneração pensionável (Mt)", min_value=0.0, value=10758.00, step=10.0)
    remuneracao_ou_pensao = st.number_input("Remuneração/Pensão p/ limite 1/3 (Mt)", min_value=0.0, value=10758.00, step=10.0)

    st.divider()
    st.header("Base de dados")
    gravar = st.checkbox("Gravar no Supabase", value=True)

# ======= CÁLCULO CENTRAL =======
try:
    res = calcular(
        inicio_funcoes=inicio_funcoes,
        fim_funcoes=fim_funcoes,
        inicio_desconto=inicio_desconto,
        salario_pensionavel=salario_pensionavel,
    )
except ValueError as e:
    st.error(str(e))
    st.stop()

plano = plano_prestacoes(res.encargo_total, remuneracao_ou_pensao, max_prestacoes=60)

# ======= ABAS =======
tab1, tab2, tab3, tab4 = st.tabs([
    "Tempo de serviço",
    "Tempo descontado",
    "Tempo não descontado",
    "Fixação de encargos"
])

with tab1:
    st.subheader("Tempo de serviço")
    st.write("Conta do início de funções até ao último dia de funções.")
    st.info(f"Período: {res.periodo_servico.inicio} → {res.periodo_servico.fim}")
    c1, c2 = st.columns(2)
    c1.metric("Total (dias)", res.servico_dias)
    c2.metric("Total (A/M/D)", f"{res.servico_amd.anos}A {res.servico_amd.meses}M {res.servico_amd.dias}D")

with tab2:
    st.subheader("Tempo descontado (contribuição)")
    st.write("Conta desde o início do desconto até ao fim de funções.")
    if res.periodo_descontado is None:
        st.warning("Sem tempo descontado (início do desconto após o fim de funções).")
    else:
        st.info(f"Período: {res.periodo_descontado.inicio} → {res.periodo_descontado.fim}")
    c1, c2 = st.columns(2)
    c1.metric("Total (dias)", res.descontado_dias)
    c2.metric("Total (A/M/D)", f"{res.descontado_amd.anos}A {res.descontado_amd.meses}M {res.descontado_amd.dias}D")

with tab3:
    st.subheader("Tempo não descontado")
    st.write("Conta do início de funções até ao dia anterior ao início do desconto.")
    if res.periodo_nao_descontado is None:
        st.success("Não existe tempo não descontado neste caso.")
    else:
        st.info(f"Período: {res.periodo_nao_descontado.inicio} → {res.periodo_nao_descontado.fim}")
    c1, c2 = st.columns(2)
    c1.metric("Total (dias)", res.nao_descontado_dias)
    c2.metric("Total (A/M/D)", f"{res.nao_descontado_amd.anos}A {res.nao_descontado_amd.meses}M {res.nao_descontado_amd.dias}D")

with tab4:
    st.subheader("Fixação e pagamento de encargos (LESSOFE)")
    st.write("Encargos incidem sobre o tempo de serviço prestado e não descontado.")
    st.write("Base: última remuneração pensionável. Taxa: 7%. Diário: mensal/30.")

    c1, c2, c3 = st.columns(3)
    c1.metric("Valor mensal (7%)", f"{res.valor_mensal:,.2f} Mt")
    c2.metric("Valor diário (mensal/30)", f"{res.valor_diario:,.2f} Mt")
    c3.metric("Encargo total", f"{res.encargo_total:,.2f} Mt")

    st.write("### Detalhe do encargo")
    st.write(f"- Tempo não descontado: **{res.nao_descontado_amd.anos}A {res.nao_descontado_amd.meses}M {res.nao_descontado_amd.dias}D**")
    st.write(f"- Meses totais para cobrança: **{res.meses_totais_cobranca}**")
    st.write(f"- Encargo (meses): **{res.encargo_meses:,.2f} Mt**")
    st.write(f"- Encargo (dias): **{res.encargo_dias:,.2f} Mt**")

    st.write("### Plano de prestações (até 60; prestação ≤ 1/3)")
    st.write(f"- Limite por prestação (1/3): **{plano['limite']:,.2f} Mt**")
    if plano["ok"]:
        st.write(f"- Nº prestações sugerido: **{plano['prestacoes']}**")
        st.write(f"- Valor por prestação: **{plano['valor']:,.2f} Mt**")
    else:
        st.error(plano["motivo"])
        if plano["prestacoes"]:
            st.write(f"Com {plano['prestacoes']} prestações: **{plano['valor']:,.2f} Mt**")

# ======= GRAVAÇÃO NO SUPABASE =======
st.divider()
st.subheader("Gravar registo")

sb = get_supabase()
if gravar:
    if sb is None:
        st.warning("Supabase não configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY nos Secrets do Streamlit.")
    else:
        if st.button("💾 Guardar no Supabase"):
            # IMPORTANTE:
            # Estes nomes de colunas precisam existir na tabela no Supabase.
            # Se a sua tabela tiver colunas diferentes, ajuste o payload aqui para bater com elas.
            payload = {
                "nome": nome,
                "inicio_funcoes": str(inicio_funcoes),
                "fim_funcoes": str(fim_funcoes),
                "inicio_desconto": str(inicio_desconto),

                "salario_pensionavel": float(salario_pensionavel),
                "remuneracao_ou_pensao": float(remuneracao_ou_pensao),

                "servico_anos": res.servico_amd.anos,
                "servico_meses": res.servico_amd.meses,
                "servico_dias": res.servico_amd.dias,

                "descontado_anos": res.descontado_amd.anos,
                "descontado_meses": res.descontado_amd.meses,
                "descontado_dias": res.descontado_amd.dias,

                "nao_descontado_anos": res.nao_descontado_amd.anos,
                "nao_descontado_meses": res.nao_descontado_amd.meses,
                "nao_descontado_dias": res.nao_descontado_amd.dias,

                "servico_dias_total": res.servico_dias,
                "descontado_dias_total": res.descontado_dias,
                "nao_descontado_dias_total": res.nao_descontado_dias,

                "taxa_contribuicao": 0.07,
                "valor_mensal": float(res.valor_mensal),
                "valor_diario": float(res.valor_diario),
                "meses_totais_cobranca": int(res.meses_totais_cobranca),
                "encargo_meses": float(res.encargo_meses),
                "encargo_dias": float(res.encargo_dias),
                "encargo_total": float(res.encargo_total),
            }

            try:
                sb.table(TABLE_NAME).insert(payload).execute()
                st.success("Registo guardado no Supabase com sucesso.")
            except Exception as e:
                st.error("Falha ao guardar no Supabase.")
                st.code(str(e))
else:
    st.info("Gravação no Supabase está desativada.")
