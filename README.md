# 🎯 BOLÃO OFICIAL 2026: PALPITE VOTOS DANI E CAPITÃO

Sistema completo de Bolão Eleitoral desenvolvido sob medida para os palpites de votos de **Capitão Augusto** (Deputado Federal) e **Dani Alonso** (Deputada Estadual).

---

## 🚀 Como Iniciar

1. Dê um duplo-clique no arquivo **`INICIAR_BOLAO.bat`** (ou execute `npm start` no terminal dentro desta pasta).
2. O sistema abrirá automaticamente o navegador no endereço: **`http://localhost:3000`**

---

## 📋 Funcionalidades Implementadas

### 1. Cadastro do Participante
- **Campos:** Nome completo, WhatsApp (com máscara automática `(14) 99999-9999`), Palpite de votos para Capitão Augusto e Palpite de votos para Dani Alonso.
- **Formatação Automática de Votos:** Ao digitar os números, o sistema pontua automaticamente com separadores de milhar (Ex: `150.000 votos`).
- **Cards com Fotos Reais:** Utiliza as fotos oficiais de Capitão Augusto e Dani Alonso da pasta `FOTOS`.
- **Botão:** `🎯 CONFIRMAR MEU PALPITE`.
- **Mensagem Oficial de Confirmação:**
  > *“Palpite registrado com sucesso! 🎯 Você poderá alterar seus palpites até domingo, 4 de outubro, às 8h.”*
- **Cadastro Único por WhatsApp & Alterações Ilimitadas:**
  - Cada número de WhatsApp tem direito a apenas 1 registro.
  - Ao digitar o mesmo WhatsApp novamente no formulário, o sistema identifica automaticamente o cadastro anterior, preenche os dados e altera o botão para `🎯 ATUALIZAR MEU PALPITE`.
  - O participante pode alterar seus palpites quantas vezes quiser até o prazo limite.
- **Bloqueio Automático:**
  - No dia **04/10/2026 às 08:00 (horário de Brasília)**, tanto o frontend quanto a API bloqueiam automaticamente qualquer novo cadastro ou alteração, congelando todos os registros.

### 2. Palpites Públicos ("📊 PALPITES DA GALERA")
- **Transparência Total:** "NÃO EXISTEM PALPITES SECRETOS."
- **Tabela Pública:** Exibe Nome do participante, Palpite do Capitão Augusto e Palpite da Dani Alonso.
- **Ordenação Dinâmica por:**
  - Nome (A - Z)
  - Maior palpite para Capitão Augusto
  - Menor palpite para Capitão Augusto
  - Maior palpite para Dani Alonso
  - Menor palpite para Dani Alonso
- **Busca em tempo real:** Campo de filtro instantâneo por nome.

### 3. Painel de Estatísticas em Tempo Real
- 👥 **Total de participantes** inscritos
- 📊 **Média dos palpites:**
  - Capitão Augusto: `XXX.XXX votos`
  - Dani Alonso: `XXX.XXX votos`
- 🔺 **Maior palpite** de Capitão Augusto (valor e participante)
- 🔻 **Menor palpite** de Capitão Augusto (valor e participante)
- 🔺 **Maior palpite** de Dani Alonso (valor e participante)
- 🔻 **Menor palpite** de Dani Alonso (valor e participante)
- *Recalculado instantaneamente a cada palpite registrado ou modificado.*

### 4. Contagem Regressiva em Destaque
- Exibição destacada: **`⏱️ TEMPO PARA DAR OU ALTERAR SEU PALPITE`**
- Contagem regressiva em tempo real: `XX dias : XX horas : XX minutos : XX segundos`
- Término exato: **04/10/2026 às 08:00 — horário de Brasília**
- Ao zerar, substitui automaticamente por:
  - **`🔒 PALPITES ENCERRADOS!`**
  - *“Agora é só aguardar a apuração!”*

### 5. Resultado e Ranking
- Cálculo automatizado de erro:
  - `Erro Capitão = |Palpite Capitão - Oficial Capitão|`
  - `Erro Dani = |Palpite Dani - Oficial Dani|`
  - `Erro Total = Erro Capitão + Erro Dani`
- **Classificação:** Quanto MENOR o erro total, melhor a colocação.
- Critério de desempate: Palpite registrado/atualizado com maior antecedência.

### 6. Pódio Final & Tela Comemorativa
- Quando o administrador lança e publica os resultados oficiais, o topo da página é transformado em uma **Tela Comemorativa** com chuva de confetes:
  - 🏆 **CAMPEÃO DO BOLÃO 2026**
  - 🥇 1º lugar — Nome do Campeão, detalhes e erro total
  - 🥈 2º lugar — Nome do Vice-campeão
  - 🥉 3º lugar — Nome do 3º colocado
- Exibição comparativa para cada participante:
  - `Palpite Capitão Augusto → Resultado oficial → Diferença (+/-)`
  - `Palpite Dani Alonso → Resultado oficial → Diferença (+/-)`

---

## ⚙️ Painel do Administrador (PIN: 2026)

Clique no botão **"Admin"** no cabeçalho ou no rodapé para acessar:
1. **Lançamento de Resultados Oficiais:** Insira os votos apurados das urnas de Capitão Augusto e Dani Alonso e marque "Publicar resultado" para ativar o Pódio.
2. **Simular Prazo Encerrado:** Botão para testar antecipadamente a tela de bloqueio e contagem zerada.
3. **Carregar +12 Palpites de Teste:** Preenche a base com exemplos realistas para demonstração imediata.
4. **Exportar Excel (CSV):** Baixa a lista completa de todos os participantes e palpites em arquivo `.csv`.
5. **Limpar Dados:** Reseta a base de dados para iniciar o bolão oficial do zero.

---

## 📁 Estrutura do Projeto

```
BOLÃO 2026/
├── data/
│   └── bolao.json            # Base de dados em formato JSON (persistente)
├── public/
│   ├── css/
│   │   └── styles.css        # Estilos customizados, tema escuro, pódio 3D
│   ├── images/
│   │   ├── capitao.png       # Foto oficial do Capitão Augusto
│   │   └── dani.png          # Foto oficial da Dani Alonso
│   ├── js/
│   │   └── app.js            # Lógica interativa, máscaras, contagem e pódio
│   └── index.html            # Estrutura da aplicação web
├── FOTOS/                    # Fotos originais fornecidas
├── INICIAR_BOLAO.bat         # Inicializador rápido para Windows
├── package.json
├── server.js                 # Servidor Express com API e validações
└── README.md
```
