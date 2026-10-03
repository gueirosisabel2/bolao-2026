require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting & Brute force protection
const ipRequestLogs = new Map();
const adminFailedAttempts = new Map();

function rateLimit(limitCount, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = ipRequestLogs.get(ip) || [];
    const valid = entry.filter(t => now - t < windowMs);
    
    if (valid.length >= limitCount) {
      return res.status(429).json({ 
        error: 'Muitas requisições em curto período. Por favor, aguarde um momento antes de tentar novamente.' 
      });
    }

    valid.push(now);
    ipRequestLogs.set(ip, valid);
    next();
  };
}

// Clean up stale rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipRequestLogs.entries()) {
    const valid = timestamps.filter(t => now - t < 600000);
    if (valid.length === 0) ipRequestLogs.delete(ip);
    else ipRequestLogs.set(ip, valid);
  }
  for (const [ip, data] of adminFailedAttempts.entries()) {
    if (now - data.firstAttempt > 900000) adminFailedAttempts.delete(ip);
  }
}, 600000);

// Global Security & Cache-Control Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
function isClosed(config) {
  if (config.simulateClosed) return true;
  const deadlineMs = new Date(config.deadline).getTime();
  return Date.now() >= deadlineMs;
}

// Official Brazilian DDDs (ANATEL)
const VALID_BR_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99
]);

// Canonical Brazilian WhatsApp & Phone Validator
function validateBRWhatsApp(phone) {
  if (!phone) {
    return { isValid: false, error: 'Informe o número do seu WhatsApp.' };
  }

  let digits = String(phone).replace(/\D/g, '');

  // Strip international prefix +55
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.substring(2);
  }
  // Strip leading 0
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
  if (!VALID_BR_DDDS.has(ddd)) {
    return { isValid: false, error: `DDD ${ddd} não é um DDD brasileiro válido.` };
  }

  if (digits.length === 10) {
    return { 
      isValid: false, 
      error: 'WhatsApp de celular possui 9 dígitos após o DDD (ex: (14) 9XXXX-XXXX).' 
    };
  }

  if (digits.length > 11) {
    return { isValid: false, error: 'Número com dígitos a mais. O formato deve ser (DD) 9XXXX-XXXX.' };
  }

  // Verifica o 9º dígito obrigatório
  if (digits[2] !== '9') {
    return { 
      isValid: false, 
      error: 'O celular com WhatsApp deve iniciar com 9 após o DDD: (DD) 9XXXX-XXXX.' 
    };
  }

  // Bloqueio de dígitos repetidos
  if (/^(\d)\1{10}$/.test(digits)) {
    return { isValid: false, error: 'Número de telefone inválido (todos os dígitos repetidos).' };
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

  return { isValid: true, cleanPhone: digits };
}

function normalizeBRPhone(phone) {
  const result = validateBRWhatsApp(phone);
  return result.isValid ? result.cleanPhone : null;
}

function formatBRPhone(digits) {
  if (!digits) return '';
  if (digits.length === 11) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  }
  return digits;
}

// Strict Vote Number Validator
function parseStrictVotes(val, candidateName) {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { error: `Informe o palpite de votos para ${candidateName}.` };
  }

  const str = String(val).trim();

  if (str.includes('-')) {
    return { error: `O palpite para ${candidateName} não pode ser um número negativo.` };
  }

  if (/,\d{1,2}$|\.\d{1,2}$/.test(str)) {
    return { error: `O palpite para ${candidateName} deve ser um número inteiro de votos (sem casas decimais).` };
  }

  const cleanDigits = str.replace(/\D/g, '');
  if (!cleanDigits) {
    return { error: `Informe um número válido de votos para ${candidateName}.` };
  }

  const num = parseInt(cleanDigits, 10);

  if (isNaN(num) || num <= 0) {
    return { error: `O palpite de votos para ${candidateName} deve ser maior que zero.` };
  }

  const MAX_ELECTORATE = 35000000;
  if (num > MAX_ELECTORATE) {
    return { error: `O palpite para ${candidateName} excede o limite máximo do eleitorado de SP (35 milhões de votos).` };
  }

  return { value: num };
}

// Statistical Panel Calculation
function calculateStats(participants) {
  const count = participants.length;
  if (count === 0) {
    return {
      total: 0,
      mediaCapitao: 0,
      mediaDani: 0,
      maiorCapitao: null,
      menorCapitao: null,
      maiorDani: null,
      menorDani: null
    };
  }

  let sumCapitao = 0;
  let sumDani = 0;
  let maiorCapitao = participants[0];
  let menorCapitao = participants[0];
  let maiorDani = participants[0];
  let menorDani = participants[0];

  participants.forEach(p => {
    sumCapitao += p.capitao;
    sumDani += p.dani;

    if (p.capitao > maiorCapitao.capitao) maiorCapitao = p;
    if (p.capitao < menorCapitao.capitao) menorCapitao = p;

    if (p.dani > maiorDani.dani) maiorDani = p;
    if (p.dani < menorDani.dani) menorDani = p;
  });

  return {
    total: count,
    mediaCapitao: Math.round(sumCapitao / count),
    mediaDani: Math.round(sumDani / count),
    maiorCapitao: { value: maiorCapitao.capitao, name: maiorCapitao.name },
    menorCapitao: { value: menorCapitao.capitao, name: menorCapitao.name },
    maiorDani: { value: maiorDani.dani, name: maiorDani.name },
    menorDani: { value: menorDani.dani, name: menorDani.name }
  };
}

// Ranking Calculation with Shared Rank for Ties (Regra Oficial sem Desempate Arbitrário)
function calculateRanking(participants, officialResults) {
  if (!officialResults || !officialResults.published || officialResults.capitao === null || officialResults.dani === null) {
    return null;
  }

  const offCap = officialResults.capitao;
  const offDan = officialResults.dani;

  const ranked = participants.map(p => {
    const diffCap = p.capitao - offCap;
    const errCap = Math.abs(diffCap);
    const diffDan = p.dani - offDan;
    const errDan = Math.abs(diffDan);
    const totalError = errCap + errDan;

    return {
      id: p.id,
      name: p.name,
      capitao: p.capitao,
      dani: p.dani,
      diffCapitao: diffCap,
      errorCapitao: errCap,
      diffDani: diffDan,
      errorDani: errDan,
      totalError: totalError,
      updatedAt: p.updatedAt
    };
  });

  ranked.sort((a, b) => a.totalError - b.totalError);

  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i].totalError === ranked[i - 1].totalError) {
      ranked[i].rank = ranked[i - 1].rank;
      ranked[i].isTie = true;
      ranked[i - 1].isTie = true;
    } else {
      ranked[i].rank = i + 1;
      ranked[i].isTie = false;
    }
  }

  return ranked;
}

// ----------------- API ROUTES -----------------

// Status and general public data
app.get('/api/status', async (req, res) => {
  try {
    const config = await db.getConfig();
    const participants = await db.getParticipants();
    const closed = isClosed(config);
    const stats = calculateStats(participants);
    const ranking = calculateRanking(participants, config.officialResults);

    res.json({
      serverTime: new Date().toISOString(),
      deadline: config.deadline,
      isClosed: closed,
      simulateClosed: !!config.simulateClosed,
      officialResults: config.officialResults,
      stats,
      hasRanking: !!ranking,
      totalParticipants: participants.length,
      database: db.isUsingSupabase() ? 'Supabase PostgreSQL' : 'Local JSON'
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter status do sistema.' });
  }
});

// Public guesses list
app.get('/api/palpites', async (req, res) => {
  try {
    const config = await db.getConfig();
    const participants = await db.getParticipants();
    const closed = isClosed(config);
    const stats = calculateStats(participants);
    const ranking = calculateRanking(participants, config.officialResults);

    const publicList = participants.map(p => ({
      id: p.id,
      name: p.name,
      capitao: p.capitao,
      dani: p.dani,
      updatedAt: p.updatedAt
    }));

    res.json({
      serverTime: new Date().toISOString(),
      participants: publicList,
      stats,
      ranking,
      officialResults: config.officialResults,
      isClosed: closed,
      deadline: config.deadline
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar palpites.' });
  }
});

// Check if a participant exists by phone to prefill form for modification
app.get('/api/participante/:phone', rateLimit(25, 60000), async (req, res) => {
  try {
    const phoneResult = validateBRWhatsApp(req.params.phone);
    if (!phoneResult.isValid) {
      return res.status(400).json({ error: phoneResult.error });
    }
    const rawPhone = phoneResult.cleanPhone;

    const found = await db.findParticipantByPhone(rawPhone);
    if (found) {
      return res.json({
        exists: true,
        participant: {
          name: found.name,
          whatsapp: found.whatsapp,
          capitao: found.capitao,
          dani: found.dani
        }
      });
    }

    res.json({ exists: false });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar participante.' });
  }
});

// Create or update a palpite
app.post('/api/palpite', rateLimit(30, 60000), async (req, res) => {
  try {
    const config = await db.getConfig();

    if (isClosed(config)) {
      return res.status(403).json({
        error: 'Palpites encerrados! O prazo limite de 04/10/2026 às 08:00 (Brasília) foi atingido.'
      });
    }

    const { name, whatsapp, capitao, dani } = req.body;

    // Name Validation
    const trimmedName = (name || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ error: 'Por favor, informe seu nome completo.' });
    }
    if (trimmedName.length > 80) {
      return res.status(400).json({ error: 'Nome muito longo. Limite máximo de 80 caracteres.' });
    }

    // Phone Validation with Canonical Normalization
    const phoneResult = validateBRWhatsApp(whatsapp);
    if (!phoneResult.isValid) {
      return res.status(400).json({ error: phoneResult.error });
    }
    const rawPhone = phoneResult.cleanPhone;

    // Strict Votes Validation
    const validCapitao = parseStrictVotes(capitao, 'Capitão Augusto');
    if (validCapitao.error) {
      return res.status(400).json({ error: validCapitao.error });
    }

    const validDani = parseStrictVotes(dani, 'Dani Alonso');
    if (validDani.error) {
      return res.status(400).json({ error: validDani.error });
    }

    const formattedPhone = formatBRPhone(rawPhone);

    // Bloqueio rigoroso: Não permitir alterações no banco de dados de palpites
    const existing = await db.findParticipantByPhone(rawPhone);
    if (existing) {
      return res.status(400).json({
        error: 'Este número de WhatsApp já possui um palpite registrado. Não são permitidas alterações de palpites.'
      });
    }

    const { isUpdate } = await db.upsertParticipant({
      name: trimmedName,
      whatsapp: formattedPhone,
      whatsappRaw: rawPhone,
      capitao: validCapitao.value,
      dani: validDani.value
    });

    const message = 'Palpite registrado com sucesso! 🎯 Seu palpite definitivo foi gravado com segurança.';

    return res.json({
      success: true,
      isUpdate,
      message,
      participant: {
        name: trimmedName,
        whatsapp: formattedPhone,
        capitao: validCapitao.value,
        dani: validDani.value
      }
    });
  } catch (err) {
    console.error('Erro ao processar palpite:', err);
    return res.status(500).json({ error: 'Erro interno ao salvar palpite.' });
  }
});

// Admin Protection Middleware with Brute Force Lockout
async function requireAdmin(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const attempt = adminFailedAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 };

  if (attempt.lockedUntil > now) {
    const remainingMin = Math.ceil((attempt.lockedUntil - now) / 60000);
    return res.status(429).json({ 
      error: `Acesso temporariamente bloqueado por tentativas consecutivas incorretas. Tente novamente em ${remainingMin} minuto(s).` 
    });
  }

  const pin = req.headers['x-admin-pin'] || req.body.adminPin || req.query.adminPin;
  const config = await db.getConfig();
  const configuredPin = process.env.ADMIN_PIN || config.adminPin || 'Gueiroo2$';

  if (!pin || String(pin).trim() !== String(configuredPin).trim()) {
    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.lockedUntil = now + 15 * 60 * 1000; // 15 min lockout
      adminFailedAttempts.set(ip, attempt);
      return res.status(429).json({ 
        error: 'Muitas tentativas incorretas. O acesso administrativo está bloqueado por 15 minutos.' 
      });
    }
    adminFailedAttempts.set(ip, attempt);
    return res.status(401).json({ error: 'PIN de administrador incorreto ou não fornecido.' });
  }

  adminFailedAttempts.delete(ip);
  next();
}

// Admin: Save official results
app.post('/api/admin/apuracao', requireAdmin, async (req, res) => {
  try {
    const { capitao, dani, published } = req.body;

    let numCap = null;
    let numDan = null;

    if (capitao !== null && capitao !== undefined && String(capitao).trim() !== '') {
      const parsedCap = parseStrictVotes(capitao, 'Capitão Augusto (Resultado Oficial)');
      if (parsedCap.error) return res.status(400).json({ error: parsedCap.error });
      numCap = parsedCap.value;
    }

    if (dani !== null && dani !== undefined && String(dani).trim() !== '') {
      const parsedDan = parseStrictVotes(dani, 'Dani Alonso (Resultado Oficial)');
      if (parsedDan.error) return res.status(400).json({ error: parsedDan.error });
      numDan = parsedDan.value;
    }

    const officialResults = {
      capitao: numCap,
      dani: numDan,
      published: !!published,
      publishedAt: published ? new Date().toISOString() : null
    };

    await db.saveConfig({ officialResults });

    return res.json({
      success: true,
      message: published ? 'Resultados oficiais publicados com sucesso!' : 'Apuração salva como rascunho.',
      officialResults
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar apuração oficial.' });
  }
});

// Admin: Toggle simulate closed
app.post('/api/admin/simulate-closed', requireAdmin, async (req, res) => {
  try {
    const { simulate } = req.body;
    await db.saveConfig({ simulateClosed: !!simulate });
    return res.json({
      success: true,
      simulateClosed: !!simulate,
      message: simulate ? 'Simulação de encerramento ATIVADA.' : 'Simulação de encerramento DESATIVADA.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao alterar simulação de prazo.' });
  }
});

// Admin: Clear all participants
app.post('/api/admin/clear-participants', requireAdmin, async (req, res) => {
  try {
    await db.clearAll();
    return res.json({ success: true, message: 'Todos os participantes e apurações foram removidos com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao limpar participantes.' });
  }
});

// Helper to escape CSV fields and neutralize Excel Formula Injection (=, +, -, @)
function escapeCSVField(str) {
  if (str === null || str === undefined) return '""';
  let s = String(str).trim();
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

// Admin: Export CSV (Protected against Formula Injection)
app.get('/api/admin/export-csv', requireAdmin, async (req, res) => {
  try {
    const participants = await db.getParticipants();

    let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel compatibility
    csv += 'Nome;WhatsApp;Palpite Capitão Augusto;Palpite Dani Alonso;Data/Hora Registro\n';

    participants.forEach(p => {
      csv += `${escapeCSVField(p.name)};${escapeCSVField(p.whatsapp)};${p.capitao};${p.dani};${escapeCSVField(p.updatedAt)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bolao_palpites_2026.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).send('Erro ao exportar CSV.');
  }
});

// Fallback to index.html for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server & Initialize Database
async function startServer() {
  await db.initDatabase();

  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🎯 BOLÃO DANI & CAPITÃO 2026`);
    console.log(`🌐 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`📅 Prazo final: 04/10/2026 às 08:00 (Brasília)`);
    console.log(`🗄️  Banco: ${db.isUsingSupabase() ? 'Supabase PostgreSQL (Nuvem)' : 'Local JSON'}`);
    console.log(`🔒 Painel Admin: Acesso Secreto Ativo`);
    console.log(`=========================================`);
  });
}

startServer();
