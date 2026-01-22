import streamlit as st
from datetime import date

from services.calculos import calcular, sugerir_min_prestacoes, calcular_prestacao
from services.pdf_export import generate_certidao_pdf_clean
from services.ai_demo_gemini import generate_demo_lines_with_gemini
from services.supabase_client import get_supabase


def money_pt(valor: float) -> str:
    texto = f"{valor:,.2f}"
    texto = texto.replace(",", "X").replace(".", ",").replace("X", ".")
    return texto


st.set_page_config(page_title="Efetividade do Funcionario", layout="wide")
st.title("Efetividade do Funcionario")

if "demo_cache" not in st.session_state:
    st.session_state.demo_cache = {}

with st.sidebar:
    st.header("Dados do funcionario")

    nome = st.text_input("Nome completo")

    inicio_funcoes = st.date_input(
        "Inicio de funcoes",
        value=date(2017, 2, 28)
    )

    fim_funcoes = st.date_input(
        "Fim de funcoes",
        value=date.today()
    )

    inicio_desconto = st.date_input(
        "Inicio do desconto",
        value=date(2017, 6, 30)
    )

    st.divider()

    categoria = st.text_input("Categoria")
    classe = st.text_input("Classe")
    escalao = st.text_input("Escalao")

    st.divider()

    salario = st.number_input(
        "Ultima remuneracao pensionavel (Mt)",
        min_value=0.0,
        value=19258.0,
        step=10.0
    )

    remuneracao_base = st.number_input(
        "Remuneracao base / pensao (Mt)",
        min_value=0.0,
        value=19258.0,
        step=10.0
    )

    st.divider()

    usar_ia = st.checkbox("Usar IA (Gemini) na demonstracao", value=True)
    modelo_gemini = st.text_input("Modelo Gemini", value="gemini-2.5-pro")


try:
    resultado = calcular(
        inicio_funcoes=inicio_funcoes,
        fim_funcoes=fim_funcoes,
        inicio_desconto=inicio_desconto,
        salario_pensionavel=salario,
    )
except Exception as e:
    st.error(str(e))
    st.stop()


aba1, aba2, aba3, aba4 = st.tabs([
    "Tempo de servico",
    "Tempo descontado",
    "Tempo nao descontado",
    "Fixacao de encargos"
])


with aba1:
    st.metric("Total de dias", resultado.servico_dias)
    st.write(
        f"{resultado.servico_amd.anos}A "
        f"{resultado.servico_amd.meses}M "
        f"{resultado.servico_amd.dias}D"
    )


with aba2:
    st.metric("Dias descontados", resultado.descontado_dias)


with aba3:
    if resultado.periodo_nao_descontado is None:
        st.success("Nao existe tempo nao descontado")
    else:
        st.metric("Dias nao descontados", resultado.nao_descontado_dias)


with aba4:
    st.metric("Valor mensal (7%)", f"{resultado.valor_mensal:.2f} Mt")
    st.metric("Encargo total", f"{resultado.encargo_total:.2f} Mt")

    if resultado.encargo_total > 0:
        minimo = sugerir_min_prestacoes(
            resultado.encargo_total,
            remuneracao_base,
            max_prestacoes=60
        )

        prestacoes = st.slider(
            "Numero de prestacoes",
            min_value=1,
            max_value=60,
            value=minimo if isinstance(minimo, int) else 12
        )

        valor_prestacao = calcular_prestacao(
            resultado.encargo_total,
            prestacoes
        )

        st.write(f"Prestacao: {valor_prestacao:.2f} Mt")

    st.divider()

    if st.button("Gerar PDF"):
        linhas_demo = None

        if usar_ia and resultado.encargo_total > 0:
            dados_ia = {
                "nd_anos": resultado.nao_descontado_amd.anos,
                "nd_meses": resultado.nao_descontado_amd.meses,
                "nd_dias": resultado.nao_descontado_amd.dias,
                "meses_totais": int(resultado.meses_totais_cobranca),
                "salario_pensionavel_fmt": money_pt(salario),
                "valor_mensal_fmt": money_pt(resultado.valor_mensal),
                "encargo_meses_fmt": money_pt(resultado.encargo_meses),
                "valor_diario_fmt": money_pt(resultado.valor_diario),
                "encargo_dias_fmt": money_pt(resultado.encargo_dias),
                "encargo_total_fmt": money_pt(resultado.encargo_total),
                "n_prestacoes": prestacoes,
                "valor_prestacao_fmt": money_pt(valor_prestacao),
            }

            try:
                linhas_demo = generate_demo_lines_with_gemini(
                    data=dados_ia,
                    preferred_model=modelo_gemini,
                    fallback_model="gemini-2.5-flash",
                    cache=st.session_state.demo_cache
                )
            except Exception:
                linhas_demo = None

        pdf = generate_certidao_pdf_clean(
            nome=nome,
            categoria=categoria,
            classe=classe,
            escalao=escalao,
            inicio_funcoes=inicio_funcoes,
            fim_funcoes=fim_funcoes,
            serv_anos=resultado.servico_amd.anos,
            serv_meses=resultado.servico_amd.meses,
            serv_dias=resultado.servico_amd.dias,
            nd_inicio=None,
            nd_fim=None,
            nd_anos=resultado.nao_descontado_amd.anos,
            nd_meses=resultado.nao_descontado_amd.meses,
            nd_dias=resultado.nao_descontado_amd.dias,
            salario_pensionavel=salario,
            valor_mensal=resultado.valor_mensal,
            valor_diario=resultado.valor_diario,
            meses_totais=int(resultado.meses_totais_cobranca),
            encargo_meses=resultado.encargo_meses,
            encargo_dias=resultado.encargo_dias,
            encargo_total=resultado.encargo_total,
            n_prestacoes=prestacoes,
            valor_prestacao=valor_prestacao,
            demo_lines=linhas_demo,
        )

        st.download_button(
            "Baixar PDF",
            data=pdf,
            file_name="certidao_efetividade.pdf",
            mime="application/pdf"
        )
