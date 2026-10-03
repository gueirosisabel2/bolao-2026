require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const DATA_FILE = path.join(__dirname, 'data', 'bolao.json');

// Supabase Client Initialization
let supabase = null;
let supabaseReady = false;

if (process.env.SUPABASE_URL && (process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY)) {
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY;
  try {
    supabase = createClient(process.env.SUPABASE_URL, key, {
      auth: { persistSession: false }
    });
  } catch (err) {
    console.error('⚠️ Falha ao inicializar cliente Supabase:', err.message);
  }
}

// Check Supabase availability at startup
async function initDatabase() {
  if (!supabase) {
    console.log('📁 Supabase não configurado. Utilizando armazenamento local JSON.');
    return;
  }

  try {
    const { data, error } = await supabase.from('participantes').select('id').limit(1);
    if (!error) {
      supabaseReady = true;
      console.log('⚡ Conectado com SUCESSO ao Supabase PostgreSQL na nuvem!');
      
      // Ensure configuracao exists
      const { data: cfg } = await supabase.from('configuracao').select('*').eq('id', 1).single();
      if (!cfg) {
        await supabase.from('configuracao').insert({
          id: 1,
          title: "PALPITE VOTOS DANI E CAPITÃO",
          deadline: "2026-10-04T08:00:00-03:00",
          admin_pin: process.env.ADMIN_PIN || "Gueiroo2$",
          simulate_closed: false,
          published: false
        });
      }
    } else {
      console.log(`⚠️ Tabelas do Supabase ainda não foram criadas (${error.message}).`);
      console.log('👉 Execute o script "schema.sql" no SQL Editor do Supabase para ativar a nuvem.');
      console.log('📁 Mantendo armazenamento local em JSON como fallback seguro temporário.');
    }
  } catch (err) {
    console.log('⚠️ Erro de rede ao conectar no Supabase. Utilizando armazenamento local JSON.');
  }
}

// ---------------- LOCAL JSON FALLBACK HELPERS ----------------
function loadLocalData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = {
        config: {
          title: "PALPITE VOTOS DANI E CAPITÃO",
          deadline: "2026-10-04T08:00:00-03:00",
          adminPin: process.env.ADMIN_PIN || "Gueiroo2$",
          simulateClosed: false,
          officialResults: {
            capitao: null,
            dani: null,
            published: false,
            publishedAt: null
          }
        },
        participants: []
      };
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    return {
      config: {
        title: "PALPITE VOTOS DANI E CAPITÃO",
        deadline: "2026-10-04T08:00:00-03:00",
        adminPin: process.env.ADMIN_PIN || "Gueiroo2$",
        simulateClosed: false,
        officialResults: { capitao: null, dani: null, published: false, publishedAt: null }
      },
      participants: []
    };
  }
}

function saveLocalData(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('Error saving local data:', err);
    return false;
  }
}

// ---------------- DATABASE UNIFIED INTERFACE ----------------

async function getConfig() {
  if (supabaseReady) {
    try {
      const { data, error } = await supabase.from('configuracao').select('*').eq('id', 1).single();
      if (!error && data) {
        return {
          title: data.title || "PALPITE VOTOS DANI E CAPITÃO",
          deadline: data.deadline || "2026-10-04T08:00:00-03:00",
          adminPin: data.admin_pin || process.env.ADMIN_PIN || "Gueiroo2$",
          simulateClosed: !!data.simulate_closed,
          officialResults: {
            capitao: data.official_capitao !== null ? Number(data.official_capitao) : null,
            dani: data.official_dani !== null ? Number(data.official_dani) : null,
            published: !!data.published,
            publishedAt: data.published_at
          }
        };
      }
    } catch (e) {
      console.error('Erro ao ler config do Supabase:', e.message);
    }
  }

  // Fallback to local
  const local = loadLocalData();
  return local.config;
}

async function saveConfig(updates) {
  if (supabaseReady) {
    try {
      const dbUpdates = {};
      if (updates.simulateClosed !== undefined) dbUpdates.simulate_closed = !!updates.simulateClosed;
      if (updates.adminPin !== undefined) dbUpdates.admin_pin = updates.adminPin;
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
      if (updates.officialResults !== undefined) {
        dbUpdates.official_capitao = updates.officialResults.capitao;
        dbUpdates.official_dani = updates.officialResults.dani;
        dbUpdates.published = !!updates.officialResults.published;
        dbUpdates.published_at = updates.officialResults.publishedAt;
      }

      await supabase.from('configuracao').update(dbUpdates).eq('id', 1);
    } catch (e) {
      console.error('Erro ao salvar config no Supabase:', e.message);
    }
  }

  // Always mirror to local for redundancy
  const local = loadLocalData();
  if (updates.simulateClosed !== undefined) local.config.simulateClosed = !!updates.simulateClosed;
  if (updates.adminPin !== undefined) local.config.adminPin = updates.adminPin;
  if (updates.deadline !== undefined) local.config.deadline = updates.deadline;
  if (updates.officialResults !== undefined) local.config.officialResults = updates.officialResults;
  saveLocalData(local);
}

async function getParticipants() {
  if (supabaseReady) {
    try {
      const { data, error } = await supabase
        .from('participantes')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        return data.map(p => ({
          id: p.id,
          name: p.name,
          whatsapp: p.whatsapp,
          whatsappRaw: p.whatsapp_raw,
          capitao: Number(p.capitao),
          dani: Number(p.dani),
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }));
      }
    } catch (e) {
      console.error('Erro ao carregar participantes do Supabase:', e.message);
    }
  }

  const local = loadLocalData();
  return local.participants || [];
}

async function findParticipantByPhone(rawPhone) {
  if (supabaseReady) {
    try {
      const { data, error } = await supabase
        .from('participantes')
        .select('*')
        .eq('whatsapp_raw', rawPhone)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          whatsapp: data.whatsapp,
          whatsappRaw: data.whatsapp_raw,
          capitao: Number(data.capitao),
          dani: Number(data.dani),
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      }
    } catch (e) {
      console.error('Erro ao buscar telefone no Supabase:', e.message);
    }
  }

  const local = loadLocalData();
  return local.participants.find(p => p.whatsappRaw === rawPhone) || null;
}

async function upsertParticipant({ name, whatsapp, whatsappRaw, capitao, dani }) {
  const now = new Date().toISOString();

  if (supabaseReady) {
    try {
      // Check existing in Supabase
      const { data: existing } = await supabase
        .from('participantes')
        .select('id')
        .eq('whatsapp_raw', whatsappRaw)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('participantes')
          .update({
            name,
            whatsapp,
            capitao,
            dani,
            updated_at: now
          })
          .eq('id', existing.id);

        if (error) throw error;
        return { isUpdate: true };
      } else {
        // Insert
        const id = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const { error } = await supabase
          .from('participantes')
          .insert({
            id,
            name,
            whatsapp,
            whatsapp_raw: whatsappRaw,
            capitao,
            dani,
            created_at: now,
            updated_at: now
          });

        if (error) throw error;
        return { isUpdate: false };
      }
    } catch (e) {
      console.error('Erro no upsert Supabase, recorrendo a local:', e.message);
    }
  }

  // Local JSON fallback
  const local = loadLocalData();
  const existingIdx = local.participants.findIndex(p => p.whatsappRaw === whatsappRaw);
  if (existingIdx >= 0) {
    local.participants[existingIdx].name = name;
    local.participants[existingIdx].whatsapp = whatsapp;
    local.participants[existingIdx].capitao = capitao;
    local.participants[existingIdx].dani = dani;
    local.participants[existingIdx].updatedAt = now;
    saveLocalData(local);
    return { isUpdate: true };
  } else {
    const id = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    local.participants.push({
      id,
      name,
      whatsapp,
      whatsappRaw,
      capitao,
      dani,
      createdAt: now,
      updatedAt: now
    });
    saveLocalData(local);
    return { isUpdate: false };
  }
}

async function clearAll() {
  if (supabaseReady) {
    try {
      await supabase.from('participantes').delete().neq('id', '___non_existent___');
      await supabase.from('configuracao').update({
        official_capitao: null,
        official_dani: null,
        published: false,
        published_at: null
      }).eq('id', 1);
    } catch (e) {
      console.error('Erro ao limpar Supabase:', e.message);
    }
  }

  const local = loadLocalData();
  local.participants = [];
  local.config.officialResults = {
    capitao: null,
    dani: null,
    published: false,
    publishedAt: null
  };
  saveLocalData(local);
}

module.exports = {
  initDatabase,
  isUsingSupabase: () => supabaseReady,
  getConfig,
  saveConfig,
  getParticipants,
  findParticipantByPhone,
  upsertParticipant,
  clearAll
};
