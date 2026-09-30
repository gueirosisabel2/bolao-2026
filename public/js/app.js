// Bolão Dani Alonso & Capitão Augusto 2026 - Main Application Logic (Light Theme & Mobile Optimized)

const DEADLINE_ISO = "2026-10-03T18:00:00-03:00";
let appState = {
  status: null,
  participants: [],
  ranking: null,
  stats: null,
  officialResults: null,
  isClosed: false,
  sortKey: 'name_asc',
  searchQuery: '',
  timerInterval: null,
  serverTimeOffset: 0
};

// Utilities: Formatting
function formatNumberBR(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('pt-BR');
}

function formatVotes(num) {
  return `${formatNumberBR(num)} votos`;
}

function parseNumberBR(str) {
  if (!str) return 0;
  const digits = String(str).replace(/\D/g, '');
  return parseInt(digits, 10) || 0;
}

function formatDifference(diff) {
  if (diff === 0) return '<span class="inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-xs"><i class="fa-solid fa-bullseye mr-1 text-[10px]"></i>Cravou! (0)</span>';
  if (diff > 0) return `<span class="inline-block bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md font-bold text-xs">+${formatNumberBR(diff)}</span>`;
  return `<span class="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold text-xs">${formatNumberBR(diff)}</span>`;
}

// Official Brazilian DDDs (ANATEL) com mapeamento de regiões
const BR_DDD_REGIONS = {
  11: 'São Paulo (Capital e Grande SP)',
  12: 'São Paulo (Vale do Paraíba / Litoral Norte)',
  13: 'São Paulo (Baixada Santista / Litoral Sul)',
  14: 'São Paulo (Marília, Bauru, Jaú e Região)',
  15: 'São Paulo (Sorocaba e Região)',
  16: 'São Paulo (Ribeirão Preto, Franca, São Carlos)',
  17: 'São Paulo (São José do Rio Preto, Barretos)',
  18: 'São Paulo (Presidente Prudente, Araçatuba, Assis)',
  19: 'São Paulo (Campinas, Piracicaba, Limeira)',
  21: 'Rio de Janeiro (Capital e Grande Rio)',
  22: 'Rio de Janeiro (Região dos Lagos e Norte)',
  24: 'Rio de Janeiro (Região Serrana e Sul Fluminense)',
  27: 'Espírito Santo (Vitória e Grande Vitória)',
  28: 'Espírito Santo (Sul do Estado)',
  31: 'Minas Gerais (Belo Horizonte e Grande BH)',
  32: 'Minas Gerais (Juiz de Fora e Zona da Mata)',
  33: 'Minas Gerais (Governador Valadares e Leste)',
  34: 'Minas Gerais (Uberlândia e Triângulo Mineiro)',
  35: 'Minas Gerais (Sul de Minas)',
  37: 'Minas Gerais (Centro-Oeste)',
  38: 'Minas Gerais (Norte de Minas)',
  41: 'Paraná (Curitiba e Região Metropolitana)',
  42: 'Paraná (Ponta Grossa e Centro-Sul)',
  43: 'Paraná (Londrina e Norte)',
  44: 'Paraná (Maringá e Noroeste)',
  45: 'Paraná (Cascavel, Foz do Iguaçu e Oeste)',
  46: 'Paraná (Francisco Beltrão e Sudoeste)',
  47: 'Santa Catarina (Joinville, Blumenau, Litoral)',
  48: 'Santa Catarina (Florianópolis e Criciúma)',
  49: 'Santa Catarina (Chapecó e Oeste)',
  51: 'Rio Grande do Sul (Porto Alegre e Região)',
  53: 'Rio Grande do Sul (Pelotas e Sul)',
  54: 'Rio Grande do Sul (Caxias do Sul e Serra)',
  55: 'Rio Grande do Sul (Santa Maria e Centro)',
  61: 'Distrito Federal (Brasília e Entorno)',
  62: 'Goiás (Goiânia e Região Metropolitana)',
  63: 'Tocantins (Palmas e Interior)',
  64: 'Goiás (Rio Verde, Caldas Novas e Sul)',
  65: 'Mato Grosso (Cuiabá e Região Metropolitana)',
  66: 'Mato Grosso (Rondonópolis, Sinop e Interior)',
  67: 'Mato Grosso do Sul (Campo Grande e Interior)',
  68: 'Acre (Rio Branco e Interior)',
  69: 'Rondônia (Porto Velho e Interior)',
  71: 'Bahia (Salvador e Região Metropolitana)',
  73: 'Bahia (Ilhéus, Itabuna, Porto Seguro)',
  74: 'Bahia (Juazeiro e Região)',
  75: 'Bahia (Feira de Santana e Região)',
  77: 'Bahia (Vitória da Conquista e Oeste)',
  79: 'Sergipe (Aracaju e Interior)',
  81: 'Pernambuco (Recife e Região Metropolitana)',
  82: 'Alagoas (Maceió e Interior)',
  83: 'Paraíba (João Pessoa, Campina Grande)',
  84: 'Rio Grande do Norte (Natal e Mossoró)',
  85: 'Ceará (Fortaleza e Região Metropolitana)',
  86: 'Piauí (Teresina e Norte)',
  87: 'Pernambuco (Petrolina, Caruaru e Sertão)',
  88: 'Ceará (Juazeiro do Norte, Sobral)',
  89: 'Piauí (Picos e Sul)',
  91: 'Pará (Belém e Região Metropolitana)',
  92: 'Amazonas (Manaus e Região Metropolitana)',
  93: 'Pará (Santarém e Oeste)',
  94: 'Pará (Marabá e Sul)',
  95: 'Roraima (Boa Vista e Interior)',
  96: 'Amapá (Macapá e Interior)',
  97: 'Amazonas (Interior do Estado)',
  98: 'Maranhão (São Luís e Região Metropolitana)',
  99: 'Maranhão (Imperatriz e Interior)'
};

// Validador Oficial de WhatsApp Brasileiro (Celular 11 dígitos com DDD)
function validateBRWhatsApp(phone) {
  if (!phone) {
    return { isValid: false, error: 'Informe o número do seu WhatsApp.' };
  }

  let digits = String(phone).replace(/\D/g, '');

  // Remove prefixo DDI +55 se houver
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.substring(2);
  }
  // Remove prefixo de operadora ou zero inicial
  if ((digits.length === 11 || digits.length === 12) && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  if (digits.length === 0) {
    return { isValid: false, error: 'Informe o número do seu WhatsApp.' };
  }

  if (digits.length < 10) {
    return { isValid: false, error: 'Número incompleto. Digite DDD + celular de 9 dígitos.' };
  }

  const ddd = parseInt(digits.substring(0, 2), 10);
  const regionName = BR_DDD_REGIONS[ddd];
  if (!regionName) {
    return { isValid: false, error: `DDD ${ddd} não é um DDD brasileiro válido.` };
  }

  if (digits.length === 10) {
    return { 
      isValid: false, 
      error: 'WhatsApp de celular precisa ter 9 dígitos após o DDD (ex: (14) 9XXXX-XXXX).' 
    };
  }

  if (digits.length > 11) {
    return { isValid: false, error: 'Número com dígitos a mais. O formato deve ser (DD) 9XXXX-XXXX.' };
  }

  // Verifica o 9º dígito obrigatório para celulares no Brasil
  if (digits[2] !== '9') {
    return { 
      isValid: false, 
      error: 'O celular com WhatsApp deve iniciar com 9 após o DDD: (DD) 9XXXX-XXXX.' 
    };
  }

  // Bloqueio de dígitos repetidos idênticos (ex: 11111111111, 99999999999)
  if (/^(\d)\1{10}$/.test(digits)) {
    return { isValid: false, error: 'Número inválido (todos os dígitos repetidos).' };
  }

  // Bloqueio de números com 5 ou mais dígitos idênticos seguidos no assinante (ex: 99999-9991, 98888-8888)
  const subscriber = digits.substring(2);
  if (/(\d)\1{4,}/.test(subscriber)) {
    return { 
      isValid: false, 
      error: 'Número fictício ou de teste. Informe seu número real de WhatsApp.' 
    };
  }

  // Bloqueio se o mesmo dígito se repete 6 ou mais vezes no assinante de 9 dígitos
  for (let i = 0; i <= 9; i++) {
    const count = (subscriber.split(String(i)).length - 1);
    if (count >= 6) {
      return { 
        isValid: false, 
        error: 'Número fictício ou de teste. Informe seu número real de WhatsApp.' 
      };
    }
  }

  // Bloqueio de sequências fictícias óbvias
  const dummySequences = [
    '999999999', '123456789', '987654321', '912345678', 
    '987651234', '000000000', '900000000', '911111111'
  ];
  if (dummySequences.includes(subscriber)) {
    return { isValid: false, error: 'Por favor, informe seu número real de WhatsApp.' };
  }

  const formatted = `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;

  return {
    isValid: true,
    cleanPhone: digits,
    formatted,
    ddd,
    region: regionName
  };
}

// Canonical Brazilian Phone Normalization
function normalizeBRPhone(phone) {
  const result = validateBRWhatsApp(phone);
  return result.isValid ? result.cleanPhone : null;
}

// Phone Mask & Input handling (com suporte a colagem com +55)
function maskPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.substring(2);
  }
  if ((digits.length === 11 || digits.length === 12) && digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  digits = digits.substring(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
  if (digits.length <= 10) return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7, 11)}`;
}

// Atualizador visual em tempo real do validador de WhatsApp
function updateWhatsAppValidationUI(rawInputVal) {
  const inputEl = document.getElementById('whatsapp');
  const badgeEl = document.getElementById('whatsappBadge');
  const iconEl = document.getElementById('whatsappStatusIcon');
  const feedbackEl = document.getElementById('whatsappFeedback');

  if (!inputEl) return;

  const rawDigits = (rawInputVal || '').replace(/\D/g, '');
  let digits = rawDigits;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.substring(2);
  }
  if ((digits.length === 11 || digits.length === 12) && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // 1. Estado vazio
  if (!digits || digits.length === 0) {
    inputEl.classList.remove('input-valid', 'input-error');
    if (badgeEl) {
      badgeEl.className = 'hidden';
      badgeEl.innerHTML = '';
    }
    if (iconEl) iconEl.innerHTML = '';
    if (feedbackEl) {
      feedbackEl.innerHTML = `<span class="text-slate-500">Identificador único. Use o mesmo WhatsApp para alterar depois.</span>`;
    }
    hideExistingNotice();
    return;
  }

  // 2. Estado digitando (< 11 dígitos)
  if (digits.length < 11) {
    if (digits.length >= 2) {
      const ddd = parseInt(digits.substring(0, 2), 10);
      const region = BR_DDD_REGIONS[ddd];
      if (!region) {
        inputEl.classList.remove('input-valid');
        inputEl.classList.add('input-error');
        if (badgeEl) {
          badgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200';
          badgeEl.textContent = 'DDD Inválido';
        }
        if (iconEl) iconEl.innerHTML = `<i class="fa-solid fa-circle-exclamation text-rose-500 text-sm"></i>`;
        if (feedbackEl) {
          feedbackEl.innerHTML = `<span class="text-rose-600 font-semibold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> DDD ${ddd} não existe no Brasil.</span>`;
        }
        hideExistingNotice();
        return;
      }

      if (digits.length >= 3 && digits[2] !== '9') {
        inputEl.classList.remove('input-valid');
        inputEl.classList.add('input-error');
        if (badgeEl) {
          badgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300';
          badgeEl.textContent = 'Falta o 9';
        }
        if (iconEl) iconEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-500 text-sm"></i>`;
        if (feedbackEl) {
          feedbackEl.innerHTML = `<span class="text-amber-800 font-medium"><i class="fa-solid fa-circle-info mr-1"></i> Celulares com WhatsApp começam com 9: (${ddd}) 9XXXX-XXXX</span>`;
        }
        hideExistingNotice();
        return;
      }

      // Progresso normal com DDD válido e início com 9
      inputEl.classList.remove('input-valid', 'input-error');
      if (badgeEl) {
        badgeEl.className = 'text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200';
        badgeEl.textContent = `${digits.length}/11 dígitos`;
      }
      if (iconEl) iconEl.innerHTML = `<i class="fa-solid fa-ellipsis text-slate-300 text-sm"></i>`;
      if (feedbackEl) {
        feedbackEl.innerHTML = `<span class="text-slate-600 font-medium"><i class="fa-solid fa-location-dot text-amber-600 mr-1"></i> ${region}</span>`;
      }
      hideExistingNotice();
      return;
    }

    inputEl.classList.remove('input-valid', 'input-error');
    if (badgeEl) badgeEl.className = 'hidden';
    if (iconEl) iconEl.innerHTML = '';
    if (feedbackEl) {
      feedbackEl.innerHTML = `<span class="text-slate-500">Digite o DDD + celular (ex: (14) 99999-9999).</span>`;
    }
    hideExistingNotice();
    return;
  }

  // 3. 11 dígitos preenchidos
  const validation = validateBRWhatsApp(digits);
  if (validation.isValid) {
    inputEl.classList.remove('input-error');
    inputEl.classList.add('input-valid');
    if (badgeEl) {
      badgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm';
      badgeEl.innerHTML = `<i class="fa-solid fa-check mr-1"></i> WhatsApp Válido`;
    }
    if (iconEl) iconEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 text-base"></i>`;
    if (feedbackEl) {
      feedbackEl.innerHTML = `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i> WhatsApp validado • <span class="text-slate-600 font-normal">${validation.region}</span></span>`;
    }
    checkExistingParticipant(validation.cleanPhone);
  } else {
    inputEl.classList.remove('input-valid');
    inputEl.classList.add('input-error');
    if (badgeEl) {
      badgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-300';
      badgeEl.textContent = 'Inválido';
    }
    if (iconEl) iconEl.innerHTML = `<i class="fa-solid fa-circle-xmark text-rose-500 text-base"></i>`;
    if (feedbackEl) {
      feedbackEl.innerHTML = `<span class="text-rose-600 font-semibold"><i class="fa-solid fa-circle-exclamation mr-1"></i> ${validation.error}</span>`;
    }
    hideExistingNotice();
  }
}

// Vote Number input mask
function setupVoteInputMask(inputEl) {
  if (!inputEl) return;
  inputEl.addEventListener('input', (e) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      e.target.value = '';
      return;
    }
    const num = parseInt(rawVal, 10);
    e.target.value = formatNumberBR(num);
  });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupVoteInputMask(document.getElementById('palpiteCapitao'));
  setupVoteInputMask(document.getElementById('palpiteDani'));
  setupVoteInputMask(document.getElementById('adminCapitao'));
  setupVoteInputMask(document.getElementById('adminDani'));

  const phoneInput = document.getElementById('whatsapp');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = maskPhone(e.target.value);
      updateWhatsAppValidationUI(e.target.value);
    });

    phoneInput.addEventListener('blur', (e) => {
      const val = e.target.value.trim();
      if (val) {
        updateWhatsAppValidationUI(val);
      }
    });
  }

  // Form submit
  const form = document.getElementById('palpiteForm');
  if (form) form.addEventListener('submit', handleFormSubmit);

  // Search input
  const searchInput = document.getElementById('searchParticipants');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value.trim().toLowerCase();
      renderPublicTable();
    });
  }

  // Sort select
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      appState.sortKey = e.target.value;
      renderPublicTable();
    });
  }

  // Initial load
  loadData();
  startCountdown();
  setupSecretAdminTriggers();

  // Auto-refresh data every 30 seconds
  setInterval(loadData, 30000);
});

// Fetch Data from Server
async function loadData() {
  try {
    const res = await fetch('/api/palpites');
    if (!res.ok) throw new Error('Falha ao carregar dados');
    const data = await res.json();

    if (data.serverTime) {
      const serverEpoch = new Date(data.serverTime).getTime();
      appState.serverTimeOffset = serverEpoch - Date.now();
    }

    appState.participants = data.participants || [];
    appState.stats = data.stats;
    appState.ranking = data.ranking;
    appState.officialResults = data.officialResults;
    appState.isClosed = data.isClosed;

    renderStats();
    renderPublicTable();
    renderOfficialSection();
    updateFormLockState();
  } catch (err) {
    console.error('Erro ao sincronizar dados:', err);
  }
}

// Check existing participant to allow editing
let checkTimeout = null;
async function checkExistingParticipant(rawPhone) {
  clearTimeout(checkTimeout);
  checkTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/api/participante/${rawPhone}`);
      const data = await res.json();
      if (data.exists && data.participant) {
        showExistingNotice(data.participant);
      } else {
        hideExistingNotice();
      }
    } catch (err) {
      console.error(err);
    }
  }, 300);
}

function showExistingNotice(p) {
  const noticeEl = document.getElementById('existingParticipantNotice');
  const btn = document.getElementById('submitPalpiteBtn');
  if (noticeEl) {
    noticeEl.innerHTML = `
      <div class="p-3 sm:p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs sm:text-sm text-amber-900 shadow-sm">
        <div class="flex items-center space-x-2 sm:space-x-2.5">
          <i class="fa-solid fa-arrows-rotate text-amber-600 text-base sm:text-lg flex-shrink-0"></i>
          <span><strong>Cadastro localizado!</strong> Seus palpites atuais foram preenchidos. Você pode alterá-los à vontade até sábado (03/10 às 18h).</span>
        </div>
      </div>
    `;
    noticeEl.classList.remove('hidden');
  }

  // Prefill fields
  const nameInput = document.getElementById('nome');
  const capInput = document.getElementById('palpiteCapitao');
  const daniInput = document.getElementById('palpiteDani');

  if (p.name && !nameInput.value) nameInput.value = p.name;
  if (capInput) capInput.value = formatNumberBR(p.capitao);
  if (daniInput) daniInput.value = formatNumberBR(p.dani);

  if (btn && !appState.isClosed) {
    btn.innerHTML = `<i class="fa-solid fa-arrows-rotate mr-2 text-base"></i><span>ATUALIZAR MEU PALPITE</span>`;
  }
}

function hideExistingNotice() {
  const noticeEl = document.getElementById('existingParticipantNotice');
  const btn = document.getElementById('submitPalpiteBtn');
  if (noticeEl) noticeEl.classList.add('hidden');
  if (btn && !appState.isClosed) {
    btn.innerHTML = `<i class="fa-solid fa-bullseye text-lg mr-2"></i><span>CONFIRMAR MEU PALPITE</span>`;
  }
}

// Form Submit Handler
async function handleFormSubmit(e) {
  e.preventDefault();

  if (appState.isClosed) {
    showToast('Os palpites estão encerrados!', 'error');
    return;
  }

  const name = document.getElementById('nome').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const capitaoVal = parseNumberBR(document.getElementById('palpiteCapitao').value);
  const daniVal = parseNumberBR(document.getElementById('palpiteDani').value);

  if (!name || name.length < 2) {
    showToast('Por favor, informe seu nome completo.', 'error');
    const nameInput = document.getElementById('nome');
    if (nameInput) nameInput.focus();
    return;
  }

  const phoneValidation = validateBRWhatsApp(whatsapp);
  if (!phoneValidation.isValid) {
    showToast(phoneValidation.error, 'error');
    const phoneInput = document.getElementById('whatsapp');
    if (phoneInput) {
      phoneInput.focus();
      updateWhatsAppValidationUI(whatsapp);
    }
    return;
  }
  const rawPhone = phoneValidation.cleanPhone;

  if (capitaoVal <= 0) {
    showToast('Informe seu palpite de votos para o Capitão Augusto.', 'error');
    return;
  }
  if (capitaoVal > 35000000) {
    showToast('O palpite para Capitão Augusto excede o limite eleitoral de SP (35 milhões de votos).', 'error');
    return;
  }

  if (daniVal <= 0) {
    showToast('Informe seu palpite de votos para a Dani Alonso.', 'error');
    return;
  }
  if (daniVal > 35000000) {
    showToast('O palpite para Dani Alonso excede o limite eleitoral de SP (35 milhões de votos).', 'error');
    return;
  }

  const submitBtn = document.getElementById('submitPalpiteBtn');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Salvando...`;

  try {
    const res = await fetch('/api/palpite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        whatsapp,
        capitao: capitaoVal,
        dani: daniVal
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Erro ao registrar palpite');
    }

    // Success Modal with Confetti
    triggerConfetti();
    showSuccessModal(data.message, data.isUpdate);

    // Refresh data
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// Success Modal Display
function showSuccessModal(message, isUpdate) {
  const modal = document.getElementById('successModal');
  const titleEl = document.getElementById('successModalTitle');
  const msgEl = document.getElementById('successModalMessage');

  titleEl.innerHTML = isUpdate ? 'Palpite Atualizado!' : 'Palpite Registrado com Sucesso!';
  msgEl.innerText = message || 'Palpite registrado com sucesso! 🎯 Você poderá alterar seus palpites até sábado, 3 de outubro, às 18h.';

  modal.classList.remove('hidden');
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.add('hidden');
}

// Countdown Timer Logic
function startCountdown() {
  const deadlineDate = new Date(DEADLINE_ISO).getTime();

  function update() {
    const now = Date.now() + (appState.serverTimeOffset || 0);
    const diff = deadlineDate - now;

    const timerActiveContainer = document.getElementById('timerActive');
    const timerClosedContainer = document.getElementById('timerClosed');

    if (diff <= 0 || appState.isClosed) {
      if (timerActiveContainer) timerActiveContainer.classList.add('hidden');
      if (timerClosedContainer) timerClosedContainer.classList.remove('hidden');
      appState.isClosed = true;
      updateFormLockState();
      return;
    }

    if (timerActiveContainer) timerActiveContainer.classList.remove('hidden');
    if (timerClosedContainer) timerClosedContainer.classList.add('hidden');

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');

    const elDays = document.getElementById('countDays');
    const elHours = document.getElementById('countHours');
    const elMinutes = document.getElementById('countMinutes');
    const elSeconds = document.getElementById('countSeconds');

    if (elDays) elDays.innerText = pad(days);
    if (elHours) elHours.innerText = pad(hours);
    if (elMinutes) elMinutes.innerText = pad(minutes);
    if (elSeconds) elSeconds.innerText = pad(seconds);
  }

  update();
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  appState.timerInterval = setInterval(update, 1000);
}

// Lock form after deadline
function updateFormLockState() {
  const btn = document.getElementById('submitPalpiteBtn');
  const banner = document.getElementById('formLockedBanner');
  const inputs = ['nome', 'whatsapp', 'palpiteCapitao', 'palpiteDani'];

  if (appState.isClosed) {
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });
    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
      btn.innerHTML = `<i class="fa-solid fa-lock mr-2 text-base"></i> PALPITES ENCERRADOS`;
    }
    if (banner) banner.classList.remove('hidden');
  } else {
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    if (banner) banner.classList.add('hidden');
  }
}

// Render Statistics Panel
function renderStats() {
  const stats = appState.stats;
  if (!stats) return;

  const totalEl = document.getElementById('statTotalParticipants');
  const mediaCapEl = document.getElementById('statMediaCapitao');
  const mediaDanEl = document.getElementById('statMediaDani');
  const maiorCapEl = document.getElementById('statMaiorCapitao');
  const menorCapEl = document.getElementById('statMenorCapitao');
  const maiorDanEl = document.getElementById('statMaiorDani');
  const menorDanEl = document.getElementById('statMenorDani');

  if (totalEl) totalEl.innerText = `${stats.total} participante${stats.total === 1 ? '' : 's'}`;
  if (mediaCapEl) mediaCapEl.innerText = formatVotes(stats.mediaCapitao);
  if (mediaDanEl) mediaDanEl.innerText = formatVotes(stats.mediaDani);

  if (maiorCapEl) {
    maiorCapEl.innerHTML = stats.maiorCapitao 
      ? `<span class="font-bold text-emerald-700">${formatVotes(stats.maiorCapitao.value)}</span> <span class="text-[11px] text-slate-500 font-medium">(${escapeHtml(stats.maiorCapitao.name)})</span>`
      : '---';
  }

  if (menorCapEl) {
    menorCapEl.innerHTML = stats.menorCapitao 
      ? `<span class="font-bold text-amber-800">${formatVotes(stats.menorCapitao.value)}</span> <span class="text-[11px] text-slate-500 font-medium">(${escapeHtml(stats.menorCapitao.name)})</span>`
      : '---';
  }

  if (maiorDanEl) {
    maiorDanEl.innerHTML = stats.maiorDani 
      ? `<span class="font-bold text-emerald-700">${formatVotes(stats.maiorDani.value)}</span> <span class="text-[11px] text-slate-500 font-medium">(${escapeHtml(stats.maiorDani.name)})</span>`
      : '---';
  }

  if (menorDanEl) {
    menorDanEl.innerHTML = stats.menorDani 
      ? `<span class="font-bold text-amber-800">${formatVotes(stats.menorDani.value)}</span> <span class="text-[11px] text-slate-500 font-medium">(${escapeHtml(stats.menorDani.name)})</span>`
      : '---';
  }
}

// Render Public Table ("PALPITES DA GALERA") - Dual layout (Desktop Table + Mobile Cards)
function renderPublicTable() {
  const tbody = document.getElementById('tabelaPalpitesBody');
  const mobileContainer = document.getElementById('tabelaPalpitesMobile');
  const counterEl = document.getElementById('tableCountDisplay');

  let list = [...appState.participants];

  // Search filter
  if (appState.searchQuery) {
    list = list.filter(p => p.name.toLowerCase().includes(appState.searchQuery));
  }

  // Sorting
  switch (appState.sortKey) {
    case 'name_asc':
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
      break;
    case 'name_desc':
      list.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR', { sensitivity: 'base' }));
      break;
    case 'capitao_desc':
      list.sort((a, b) => b.capitao - a.capitao);
      break;
    case 'capitao_asc':
      list.sort((a, b) => a.capitao - b.capitao);
      break;
    case 'dani_desc':
      list.sort((a, b) => b.dani - a.dani);
      break;
    case 'dani_asc':
      list.sort((a, b) => a.dani - b.dani);
      break;
    default:
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  if (counterEl) {
    counterEl.innerText = `${list.length} de ${appState.participants.length} palpites`;
  }

  // Desktop Table Render
  if (tbody) {
    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-10 text-slate-400">
            <i class="fa-regular fa-folder-open text-3xl mb-2 block text-slate-300"></i>
            Nenhum palpite encontrado. Seja o primeiro a palpitar acima!
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = list.map((p, idx) => `
        <tr class="transition-colors hover:bg-slate-50 border-b border-slate-100">
          <td class="text-slate-400 text-xs sm:text-sm w-12 text-center font-mono font-bold">${idx + 1}</td>
          <td class="font-bold text-slate-800 flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs border border-amber-200 shadow-sm flex-shrink-0">
              ${p.name.charAt(0).toUpperCase()}
            </div>
            <span class="truncate">${escapeHtml(p.name)}</span>
          </td>
          <td class="text-sky-700 font-mono font-bold text-xs sm:text-sm">
            ${formatVotes(p.capitao)}
          </td>
          <td class="text-pink-700 font-mono font-bold text-xs sm:text-sm">
            ${formatVotes(p.dani)}
          </td>
        </tr>
      `).join('');
    }
  }

  // Mobile Cards Render
  if (mobileContainer) {
    if (list.length === 0) {
      mobileContainer.innerHTML = `
        <div class="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
          <i class="fa-regular fa-folder-open text-3xl mb-2 block text-slate-300"></i>
          Nenhum palpite encontrado.
        </div>
      `;
    } else {
      mobileContainer.innerHTML = list.map((p, idx) => `
        <div class="mobile-palpite-card">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2 min-w-0">
              <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono font-bold text-[11px] flex items-center justify-center border border-slate-200 flex-shrink-0">${idx + 1}</span>
              <span class="font-bold text-slate-900 text-sm truncate">${escapeHtml(p.name)}</span>
            </div>
            <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs border border-amber-200 flex-shrink-0 ml-2">
              ${p.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
            <div class="bg-sky-50/80 p-2 rounded-xl border border-sky-100">
              <div class="text-[10px] text-sky-700 font-bold uppercase tracking-wider mb-0.5">Capitão Augusto</div>
              <div class="text-sky-900 font-mono font-bold text-xs">${formatVotes(p.capitao)}</div>
            </div>
            <div class="bg-pink-50/80 p-2 rounded-xl border border-pink-100">
              <div class="text-[10px] text-pink-700 font-bold uppercase tracking-wider mb-0.5">Dani Alonso</div>
              <div class="text-pink-900 font-mono font-bold text-xs">${formatVotes(p.dani)}</div>
            </div>
          </div>
        </div>
      `).join('');
    }
  }
}

// Render Official Section, Podium and Detailed Ranking
function renderOfficialSection() {
  const section = document.getElementById('officialResultsSection');
  if (!section) return;

  const off = appState.officialResults;
  const ranking = appState.ranking;

  if (!off || !off.published || !ranking) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  // Official count numbers
  const offCapEl = document.getElementById('officialCapitaoVotes');
  const offDanEl = document.getElementById('officialDaniVotes');
  if (offCapEl) offCapEl.innerText = formatVotes(off.capitao);
  if (offDanEl) offDanEl.innerText = formatVotes(off.dani);

  // Render Podium (Top 3)
  const top1 = ranking[0];
  const top2 = ranking[1];
  const top3 = ranking[2];

  const p1El = document.getElementById('podiumFirstPlace');
  const p2El = document.getElementById('podiumSecondPlace');
  const p3El = document.getElementById('podiumThirdPlace');

  if (p1El) {
    if (top1) {
      const isTop1Tie = top1.isTie && top1.rank === 1;
      p1El.innerHTML = `
        <div class="text-center p-2 sm:p-4">
          <i class="fa-solid fa-crown text-amber-500 text-2xl sm:text-4xl mb-1 inline-block animate-bounce"></i>
          <div class="text-amber-900 font-black text-sm sm:text-lg mb-1 truncate px-1">${escapeHtml(top1.name)}</div>
          <div class="text-[10px] sm:text-xs bg-amber-100 text-amber-900 px-2 sm:px-3 py-0.5 rounded-full font-bold inline-block mb-2 sm:mb-3 border border-amber-300">
            ${isTop1Tie ? '🏆 CAMPEÃO (Empate)' : '🏆 CAMPEÃO'}
          </div>
          <div class="text-[10px] sm:text-xs text-slate-800 bg-white p-2 sm:p-2.5 rounded-xl border border-amber-300 text-left space-y-1.5 shadow-sm">
            <div>
              <div class="text-[10px] text-sky-800 font-bold">Capitão:</div>
              <div class="font-mono text-slate-700">${formatNumberBR(top1.capitao)} ${formatDifference(top1.diffCapitao)}</div>
            </div>
            <div>
              <div class="text-[10px] text-pink-800 font-bold">Dani:</div>
              <div class="font-mono text-slate-700">${formatNumberBR(top1.dani)} ${formatDifference(top1.diffDani)}</div>
            </div>
            <div class="border-t border-slate-200 pt-1 font-bold text-amber-900 truncate">
              Erro Total: ${formatNumberBR(top1.totalError)} votos
            </div>
          </div>
        </div>
      `;
    } else {
      p1El.innerHTML = `<div class="text-center p-3 text-slate-400 text-xs">Sem participante</div>`;
    }
  }

  if (p2El) {
    if (top2) {
      const isTop2Tie = top2.isTie && top2.rank === 1;
      p2El.innerHTML = `
        <div class="text-center p-1.5 sm:p-3">
          <i class="fa-solid ${isTop2Tie ? 'fa-crown text-amber-500' : 'fa-medal text-slate-400'} text-xl sm:text-3xl mb-1 inline-block"></i>
          <div class="text-slate-800 font-bold text-xs sm:text-base mb-0.5 truncate px-1">${escapeHtml(top2.name)}</div>
          <div class="text-[9px] sm:text-xs ${isTop2Tie ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-200 text-slate-700'} px-2 py-0.5 rounded-full font-bold inline-block mb-1.5 sm:mb-2">
            ${isTop2Tie ? '🏆 1º Lugar (Empate)' : `${top2.rank}º Lugar`}
          </div>
          <div class="text-[10px] sm:text-xs text-slate-800 bg-white p-1.5 sm:p-2 rounded-xl border border-slate-200 text-left space-y-1 shadow-sm">
            <div>
              <div class="text-[10px] text-sky-800 font-bold">Capitão:</div>
              <div class="font-mono text-slate-700">${formatNumberBR(top2.capitao)} ${formatDifference(top2.diffCapitao)}</div>
            </div>
            <div>
              <div class="text-[10px] text-pink-800 font-bold">Dani:</div>
              <div class="font-mono text-slate-700">${formatNumberBR(top2.dani)} ${formatDifference(top2.diffDani)}</div>
            </div>
            <div class="border-t border-slate-200 pt-0.5 font-semibold text-slate-700 truncate">
              Erro Total: ${formatNumberBR(top2.totalError)} votos
            </div>
          </div>
        </div>
      `;
    } else {
      p2El.innerHTML = `<div class="text-center p-3 text-slate-400 text-xs">---</div>`;
    }
  }

  if (p3El) {
    if (top3) {
      p3El.innerHTML = `
        <div class="text-center p-1.5 sm:p-3">
          <i class="fa-solid fa-medal text-amber-700 text-xl sm:text-3xl mb-1 inline-block"></i>
          <div class="text-amber-900 font-bold text-xs sm:text-base mb-0.5 truncate px-1">${escapeHtml(top3.name)}</div>
          <div class="text-[9px] sm:text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold inline-block mb-1.5 sm:mb-2 border border-orange-200">
            ${top3.rank}º Lugar ${top3.isTie ? '(Empate)' : ''}
          </div>
          <div class="text-[10px] sm:text-xs text-slate-800 bg-white p-1.5 sm:p-2 rounded-xl border border-orange-200 text-left space-y-1 shadow-sm">
            <div>
              <div class="text-[10px] text-sky-800 font-bold">Capitão:</div>
              <div class="font-mono text-slate-700">${formatNumberBR(top3.capitao)} ${formatDifference(top3.diffCapitao)}</div>
            </div>
            <div>
              <div class="text-[10px] text-pink-800 font-bold">Dani:</div>
              <div class="font-mono text-slate-700">${formatNumberBR(top3.dani)} ${formatDifference(top3.diffDani)}</div>
            </div>
            <div class="border-t border-slate-200 pt-0.5 font-semibold text-amber-900 truncate">
              Erro Total: ${formatNumberBR(top3.totalError)} votos
            </div>
          </div>
        </div>
      `;
    } else {
      p3El.innerHTML = `<div class="text-center p-3 text-slate-400 text-xs">---</div>`;
    }
  }

  // Render Full Ranking Table
  const rankBody = document.getElementById('rankingTableBody');
  if (rankBody) {
    rankBody.innerHTML = ranking.map(r => {
      let badge = `<span class="font-mono text-slate-500 font-bold text-xs sm:text-sm">${r.rank}º</span>`;
      if (r.rank === 1) badge = `<span class="inline-flex items-center text-amber-600 font-bold text-xs sm:text-base"><i class="fa-solid fa-trophy mr-1 text-xs"></i> 1º</span>`;
      else if (r.rank === 2) badge = `<span class="inline-flex items-center text-slate-600 font-bold text-xs sm:text-base"><i class="fa-solid fa-medal mr-1 text-xs text-slate-400"></i> 2º</span>`;
      else if (r.rank === 3) badge = `<span class="inline-flex items-center text-orange-700 font-bold text-xs sm:text-base"><i class="fa-solid fa-medal mr-1 text-xs text-orange-600"></i> 3º</span>`;

      if (r.isTie) {
        badge += `<span class="text-[10px] text-amber-600 font-bold block">(Empate)</span>`;
      }

      return `
        <tr class="transition-colors hover:bg-amber-50/40 border-b border-slate-100 ${r.rank <= 3 ? 'bg-amber-50/20' : ''}">
          <td class="text-center py-2.5 sm:py-3 font-semibold">${badge}</td>
          <td class="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[140px] sm:max-w-none">${escapeHtml(r.name)}</td>
          <td class="text-xs sm:text-sm">
            <span class="text-sky-800 font-mono font-bold">${formatNumberBR(r.capitao)}</span>
            <span class="text-slate-400 mx-1">→</span>
            <span class="text-slate-600 font-mono">${formatNumberBR(off.capitao)}</span>
            <span class="text-slate-400 mx-1">→</span>
            ${formatDifference(r.diffCapitao)}
          </td>
          <td class="text-xs sm:text-sm">
            <span class="text-pink-800 font-mono font-bold">${formatNumberBR(r.dani)}</span>
            <span class="text-slate-400 mx-1">→</span>
            <span class="text-slate-600 font-mono">${formatNumberBR(off.dani)}</span>
            <span class="text-slate-400 mx-1">→</span>
            ${formatDifference(r.diffDani)}
          </td>
          <td class="text-right font-mono font-black ${r.rank === 1 ? 'text-amber-700' : 'text-slate-900'} text-xs sm:text-sm whitespace-nowrap">
            ${formatNumberBR(r.totalError)} votos
          </td>
        </tr>
      `;
    }).join('');
  }
}

// Confetti Effect
function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

// Admin Hidden Backdoor Triggers & Modal Management
function setupSecretAdminTriggers() {
  // 1. URL Hash/Query Trigger: #admin, #adm, ?admin=1
  function checkUrlAdminTrigger() {
    const hash = (window.location.hash || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();
    if (hash === '#admin' || hash === '#adm' || search.includes('admin=1') || search.includes('adm=1')) {
      openAdminModal();
    }
  }
  checkUrlAdminTrigger();
  window.addEventListener('hashchange', checkUrlAdminTrigger);

  // 2. Secret Keyboard Shortcut: Ctrl + Shift + A (ou Cmd + Shift + A no Mac)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      openAdminModal();
    }
  });

  // 3. Secret Triple-Click no Logo do Topo (Acesso discreto para celular e desktop)
  const logoTrigger = document.getElementById('secretAdminTrigger');
  if (logoTrigger) {
    let clickCount = 0;
    let clickResetTimer = null;
    logoTrigger.addEventListener('click', (e) => {
      clickCount++;
      clearTimeout(clickResetTimer);
      if (clickCount >= 3) {
        e.preventDefault();
        clickCount = 0;
        openAdminModal();
      } else {
        clickResetTimer = setTimeout(() => {
          clickCount = 0;
        }, 1200);
      }
    });
  }
}

function openAdminModal() {
  const modal = document.getElementById('adminModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  let storedPin = localStorage.getItem('bolao_admin_pin') || '';
  if (storedPin === '2026') {
    localStorage.removeItem('bolao_admin_pin');
    storedPin = '';
  }

  const pinInput = document.getElementById('adminPinInput');
  if (pinInput) {
    pinInput.value = storedPin;
    setTimeout(() => pinInput.focus(), 150);
  }
}

function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.add('hidden');
}

// Save official results from Admin
async function handleAdminSaveApuracao() {
  const pin = document.getElementById('adminPinInput').value.trim();
  const cap = parseNumberBR(document.getElementById('adminCapitao').value);
  const dan = parseNumberBR(document.getElementById('adminDani').value);
  const publish = document.getElementById('adminPublishCheck').checked;

  if (!pin) {
    showToast('Informe o PIN de Administrador.', 'error');
    return;
  }

  localStorage.setItem('bolao_admin_pin', pin);

  try {
    const res = await fetch('/api/admin/apuracao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': pin
      },
      body: JSON.stringify({
        capitao: cap,
        dani: dan,
        published: publish
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao salvar apuração');

    showToast(data.message, 'success');
    closeAdminModal();
    await loadData();
    if (publish) {
      triggerConfetti();
      document.getElementById('officialResultsSection').scrollIntoView({ behavior: 'smooth' });
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Toggle simulate closed
async function handleAdminToggleSimulate() {
  const pin = document.getElementById('adminPinInput').value.trim();
  if (!pin) {
    showToast('Informe o PIN de Administrador.', 'error');
    return;
  }

  const newSimulateState = !appState.status?.simulateClosed;

  try {
    const res = await fetch('/api/admin/simulate-closed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': pin
      },
      body: JSON.stringify({ simulate: newSimulateState })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    await loadData();
    startCountdown();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Load test sample participants
async function handleAdminLoadSamples() {
  const pin = document.getElementById('adminPinInput').value.trim();
  if (!pin) {
    showToast('Informe o PIN de Administrador.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/admin/load-samples', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': pin
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Clear all participants
async function handleAdminClearAll() {
  const pin = document.getElementById('adminPinInput').value.trim();
  if (!pin) {
    showToast('Informe o PIN de Administrador.', 'error');
    return;
  }

  if (!confirm('ATENÇÃO: Tem certeza que deseja apagar todos os palpites e apurações?')) {
    return;
  }

  try {
    const res = await fetch('/api/admin/clear-participants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': pin
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Export CSV safely via authenticated fetch (protecting PIN from URL/history logs)
async function handleAdminExportCSV() {
  const pin = document.getElementById('adminPinInput').value.trim() || localStorage.getItem('bolao_admin_pin') || '2026';
  try {
    const res = await fetch('/api/admin/export-csv', {
      headers: {
        'x-admin-pin': pin
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error((errData && errData.error) || 'Não autorizado a exportar CSV.');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bolao_palpites_2026.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast('Exportação CSV concluída com sucesso!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Toast notification helper
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  const bg = type === 'error' ? 'bg-red-600' : (type === 'success' ? 'bg-emerald-600' : 'bg-blue-600');
  toast.className = `fixed bottom-5 right-5 z-50 px-5 py-3 rounded-xl text-white font-medium shadow-2xl flex items-center space-x-2 transition-all duration-300 transform translate-y-10 opacity-0 ${bg}`;
  
  const icon = type === 'error' ? 'fa-circle-exclamation' : (type === 'success' ? 'fa-circle-check' : 'fa-circle-info');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// HTML escape helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Mobile Menu Control
function toggleMobileMenu() {
  const menu = document.getElementById('mobileDropdownMenu');
  const icon = document.getElementById('mobileMenuIcon');
  if (!menu) return;
  const isHidden = menu.classList.contains('hidden');
  if (isHidden) {
    menu.classList.remove('hidden');
    if (icon) {
      icon.classList.remove('fa-bars');
      icon.classList.add('fa-xmark');
    }
  } else {
    menu.classList.add('hidden');
    if (icon) {
      icon.classList.remove('fa-xmark');
      icon.classList.add('fa-bars');
    }
  }
}

function closeMobileMenu() {
  const menu = document.getElementById('mobileDropdownMenu');
  const icon = document.getElementById('mobileMenuIcon');
  if (menu) menu.classList.add('hidden');
  if (icon) {
    icon.classList.remove('fa-xmark');
    icon.classList.add('fa-bars');
  }
}
