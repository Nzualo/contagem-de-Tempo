import streamlit as st
from datetime import date
from dotenv import load_dotenv

from services.calculos import (
    calcular,
    sugerir_min_prestacoes,
    calcular_prestacao,
)
from services.supabase_client import get_supabase
from services.pdf_export import generate_certidao_pdf_clean

load_dotenv()

st.set_page_config(page_title="Efetividade do Funcionário", layout="wide")
st.title("Efetividade do Funcionário")

TABLE_NAME = "Contagem de Tempo"

# =========================
# SIDEBAR (inputs)
# =========================
with st.sidebar:
    st.header("Dados-base")

    nome = st.text_input("Nome do funcionário", value="")

    inicio_funcoes = st.date_input("Início de funções", value=date(2017, 2, 28))
    fim_funcoes = st.date_input("Fim (último dia) de funções", value=date.today())
    inicio_desconto = st.date_input(
        "Início do desconto (nomeação provisória / início no sistema)",
        value=date(2017, 6, 30)
    )

    st.divider()
    st.header("Encargos (LESSOFE)")

    salario_pensionavel = st.number_input(
        "Última remuneração pensionável (Mt)",
        min_value=0.0,
        value=19258.00,
        step=10.0
    )

    remuneracao_ou_pensao = st.number_input(
        "Remuneração/Pensão p/ limite 1/3 (Mt)",
        min_value=0.0,
        value=19258.00,
        step=10.0
    )

    st.divider()
    st.header("Supabase")
    gravar = st.checkbox("Gravar no Supabase", value=True)

# =========================
# CÁLCULO
# =========================
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

# =========================
# ABAS
# =========================
tab1, tab2, tab3, tab4 = st.tabs([
    "Tempo de serviço",
    "Tempo descontado",
    "Tempo não descontado",
    "Fixação de encargos",
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

    st.divider()
    st.write("## Prestações e PDF (modelo limpo)")

    # Campos do topo do formulário
    colA, colB, colC = st.columns(3)
    with colA:
        categoria = st.text_input("Categoria", value="")
    with colB:
        classe = st.text_input("Classe", value="")
    with colC:
        escalao = st.text_input("Escalão", value="")

    if res.encargo_total <= 0:
        st.info("Encargo total é 0. Não há prestações.")
        n_prestacoes = 0
        valor_prest = 0.0
    else:
        limite = (remuneracao_ou_pensao / 3.0) if remuneracao_ou_pensao > 0 else 0.0
        if remuneracao_ou_pensao > 0:
            st.write(f"Limite por prestação (1/3): **{limite:,.2f} Mt**")
        else:
            st.warning("Informe Remuneração/Pensão para validar a regra de 1/3.")

        min_sugerido = sugerir_min_prestacoes(res.encargo_total, remuneracao_ou_pensao, max_prestacoes=60)
        if isinstance(min_sugerido, int) and min_sugerido > 0:
            st.info(f"Sugestão (mínimo que cumpre 1/3): **{min_sugerido}** prestações.")

        n_prestacoes = st.slider(
            "Quantas prestações o funcionário quer pagar?",
            min_value=1,
            max_value=60,
            value=min_sugerido if (isinstance(min_sugerido, int) and min_sugerido not in (None, 0)) else 12,
            step=1
        )
        valor_prest = calcular_prestacao(res.encargo_total, n_prestacoes)
        st.write(f"Prestação: **{n_prestacoes}x** de **{valor_prest:,.2f} Mt**")

        if remuneracao_ou_pensao > 0:
            if valor_prest > limite + 1e-9:
                st.error("⚠️ A prestação escolhida excede 1/3 da remuneração/pensão. Aumente o nº de prestações.")
            else:
                st.success("✅ A prestação escolhida cumpre a regra de 1/3.")

    st.divider()
    st.write("### Gerar PDF (limpo, sem template/scan)")

    if st.button("📄 Gerar PDF para download"):
        if not nome.strip():
            st.error("Informe o Nome do funcionário antes de gerar o PDF.")
            st.stop()

        if res.periodo_nao_descontado is None:
            nd_inicio = None
            nd_fim = None
        else:
            nd_inicio = res.periodo_nao_descontado.inicio
            nd_fim = res.periodo_nao_descontado.fim

        pdf_bytes = generate_certidao_pdf_clean(
            nome=nome,
            categoria=categoria,
            classe=classe,
            escalao=escalao,

            inicio_funcoes=inicio_funcoes,
            fim_funcoes=fim_funcoes,

            serv_anos=res.servico_amd.anos,
            serv_meses=res.servico_amd.meses,
            serv_dias=res.servico_amd.dias,

            nd_inicio=nd_inicio,
            nd_fim=nd_fim,
            nd_anos=res.nao_descontado_amd.anos,
            nd_meses=res.nao_descontado_amd.meses,
            nd_dias=res.nao_descontado_amd.dias,

            salario_pensionavel=float(salario_pensionavel),
            valor_mensal=float(res.valor_mensal),
            valor_diario=float(res.valor_diario),
            meses_totais=int(res.meses_totais_cobranca),
            encargo_meses=float(res.encargo_meses),
            encargo_dias=float(res.encargo_dias),
            encargo_total=float(res.encargo_total),

            n_prestacoes=int(n_prestacoes) if res.encargo_total > 0 else 0,
            valor_prestacao=float(valor_prest) if res.encargo_total > 0 else 0.0,
        )

        st.download_button(
            label="⬇️ Baixar PDF",
            data=pdf_bytes,
            file_name="certidao_efetividade_encargos.pdf",
            mime="application/pdf"
        )

# =========================
# GRAVAR NO SUPABASE
# =========================
st.divider()
st.subheader("Gravar registo")

sb = get_supabase()
if gravar:
    if sb is None:
        st.warning("Supabase não configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY nos Secrets do Streamlit.")
    else:
        if st.button("💾 Guardar no Supabase"):
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
    st.info("Gravação no Supabase desativada.")
