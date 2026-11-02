/* Previsão do tempo pelo Open-Meteo (gratuito, sem chave). Só roda no servidor; o navegador recebe o resumo pronto.
   WEATHER_PROVIDER=off desliga. Guarda cada município por 3 horas para não repetir consultas. */
const UF = { AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins' };
const norm = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const cache = new Map(), TTL = 3 * 3600000;
const unavailable = msg => Object.assign(new Error(msg), { statusCode: 503 });

async function getJSON(url, fetcher) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
  try { const r = await fetcher(url, { signal: ctl.signal, headers: { Accept: 'application/json' } }); if (!r.ok) throw unavailable('Serviço de previsão indisponível agora. Tente mais tarde.'); return await r.json(); }
  catch (e) { if (e.statusCode) throw e; throw unavailable('Não foi possível consultar a previsão agora. Tente mais tarde.'); }
  finally { clearTimeout(timer); }
}

// Resumo em português: chuva total, dias com chuva e a melhor janela seca para pulverizar.
function summarize(days) {
  const total = Math.round(days.reduce((s, d) => s + d.rain, 0) * 10) / 10, wet = days.filter(d => d.rain >= 1).length;
  const dry = days.filter(d => d.rain < 1 && (d.rainChance == null || d.rainChance < 40)).map(d => d.date);
  const fmt = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7);
  return `${days.length} dias: ${String(total).replace('.', ',')} mm de chuva prevista, ${wet} dia(s) com chuva.` + (dry.length ? ` Dias mais secos: ${dry.slice(0, 3).map(fmt).join(', ')}.` : ' Sem dia seco garantido no período.');
}

function create({ fetcher = globalThis.fetch } = {}) {
  return {
    async forecast({ uf, city }) {
      const state = UF[String(uf || '').toUpperCase()];
      if (!state || !norm(city)) throw Object.assign(new Error('Cadastre a UF e o município da fazenda.'), { statusCode: 422 });
      const key = state + ':' + norm(city), hit = cache.get(key);
      if (hit && Date.now() - hit.at < TTL) return hit.value;
      const geo = await getJSON('https://geocoding-api.open-meteo.com/v1/search?' + new URLSearchParams({ name: city, count: '20', language: 'pt', countryCode: 'BR', format: 'json' }), fetcher);
      const place = (geo.results || []).find(p => norm(p.admin1) === norm(state) && norm(p.name) === norm(city)) || (geo.results || []).find(p => norm(p.admin1) === norm(state));
      if (!place) throw Object.assign(new Error('Município não encontrado no serviço de previsão. Confira o nome cadastrado.'), { statusCode: 422 });
      const w = await getJSON('https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max', timezone: 'America/Sao_Paulo', forecast_days: '7' }), fetcher);
      const d = w.daily || {}, days = (d.time || []).map((date, i) => ({ date, max: Math.round(d.temperature_2m_max?.[i] ?? 0), min: Math.round(d.temperature_2m_min?.[i] ?? 0), rain: Math.round((d.precipitation_sum?.[i] ?? 0) * 10) / 10, rainChance: d.precipitation_probability_max?.[i] ?? null }));
      if (!days.length) throw unavailable('Previsão vazia no momento. Tente mais tarde.');
      const value = { source: 'Open-Meteo (open-meteo.com)', place: `${place.name}/${String(uf).toUpperCase()}`, updatedAt: new Date().toISOString(), days, summary: summarize(days) };
      cache.set(key, { at: Date.now(), value });
      return value;
    }
  };
}
module.exports = { create, summarize, UF };
