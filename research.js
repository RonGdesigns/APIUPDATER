import { parse } from 'node-html-parser';

/**
 * Known replacement models for each provider.
 * Used when we detect a deprecated model but the docs don't explicitly name a replacement.
 */
const KNOWN_REPLACEMENTS = {
  // OpenAI
  'gpt-4-0314':           'gpt-4o',
  'gpt-4-32k-0314':       'gpt-4o',
  'gpt-4-0613':           'gpt-4o',
  'gpt-4-32k-0613':       'gpt-4o',
  'gpt-4-32k':            'gpt-4o',
  'gpt-4-1106-preview':   'gpt-4o',
  'gpt-4-0125-preview':   'gpt-4o',
  'gpt-4-vision-preview': 'gpt-4o',
  'gpt-4-turbo-preview':  'gpt-4o',
  'gpt-3.5-turbo-0613':   'gpt-4o-mini',
  'gpt-3.5-turbo-16k':    'gpt-4o-mini',
  'gpt-3.5-turbo-16k-0613': 'gpt-4o-mini',
  'gpt-3.5-turbo-1106':   'gpt-4o-mini',
  'gpt-3.5-turbo-0125':   'gpt-4o-mini',
  'gpt-3.5-turbo-instruct': 'gpt-4o-mini',
  'text-davinci-003':     'gpt-4o-mini',
  'text-davinci-002':     'gpt-4o-mini',
  'text-curie-001':       'gpt-4o-mini',
  'text-babbage-001':     'gpt-4o-mini',
  'text-ada-001':         'gpt-4o-mini',
  'davinci':              'gpt-4o-mini',
  'curie':                'gpt-4o-mini',
  'babbage':              'gpt-4o-mini',
  'ada':                  'gpt-4o-mini',

  // Anthropic
  'claude-1':             'claude-opus-4-5',
  'claude-1.3':           'claude-opus-4-5',
  'claude-2':             'claude-sonnet-4-5',
  'claude-2.0':           'claude-sonnet-4-5',
  'claude-2.1':           'claude-sonnet-4-5',
  'claude-instant-1':     'claude-haiku-3-5',
  'claude-instant-1.2':   'claude-haiku-3-5',
  'claude-3-opus-20240229':     'claude-opus-4-5',
  'claude-3-sonnet-20240229':   'claude-sonnet-4-5',
  'claude-3-haiku-20240307':    'claude-haiku-3-5',
  'claude-3-5-sonnet-20240620': 'claude-sonnet-4-5',

  // Google / Gemini
  'gemini-pro':           'gemini-1.5-pro',
  'gemini-pro-vision':    'gemini-1.5-pro',
  'gemini-1.0-pro':       'gemini-1.5-pro',
  'gemini-1.0-pro-001':   'gemini-1.5-pro',
  'chat-bison-001':       'gemini-1.5-flash',
  'text-bison-001':       'gemini-1.5-flash',
  'embedding-gecko-001':  'text-embedding-004',
};

/**
 * Fetch HTML text from a URL with a browser-like user-agent.
 */
async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIModelUpdaterBot/1.0; +https://github.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`  ⚠ Could not fetch ${url}: ${err.message}`);
    return null;
  }
}

/**
 * Extract plain text from HTML (strips tags, decodes entities).
 */
function htmlToText(html) {
  const root = parse(html);
  // Remove scripts and styles
  root.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove());
  return root.text;
}

/**
 * Try to find a date string near a model name in text.
 */
function extractDateNear(text, modelName, windowSize = 300) {
  const idx = text.indexOf(modelName);
  if (idx === -1) return null;
  const snippet = text.substring(Math.max(0, idx - windowSize), idx + windowSize);
  // Match patterns like 2024-06-13, June 13 2024, Jan 4, 2024, etc.
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /([A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4})/,
    /(\d{1,2}\s+[A-Z][a-z]+\.?\s+\d{4})/,
  ];
  for (const pat of datePatterns) {
    const m = snippet.match(pat);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Scrape OpenAI deprecation page.
 * URL: https://platform.openai.com/docs/deprecations
 */
async function scrapeOpenAI() {
  console.log('  📡 Fetching OpenAI deprecations...');
  const results = {};
  const html = await fetchPage('https://platform.openai.com/docs/deprecations');
  if (!html) return results;

  const text = htmlToText(html);

  // Find all known OpenAI model names in the text
  const openAIModels = Object.keys(KNOWN_REPLACEMENTS).filter(m =>
    m.startsWith('gpt') || m.startsWith('text-') || m.startsWith('davinci') ||
    m.startsWith('curie') || m.startsWith('babbage') || m.startsWith('ada')
  );

  for (const model of openAIModels) {
    if (text.includes(model)) {
      const date = extractDateNear(text, model) || 'N/A';
      results[model] = {
        replacement:      KNOWN_REPLACEMENTS[model] || 'gpt-4o',
        deprecation_date: date,
      };
    }
  }
  console.log(`  ✅ OpenAI: found ${Object.keys(results).length} deprecated models.`);
  return results;
}

/**
 * Scrape Anthropic deprecated models page.
 * URL: https://docs.anthropic.com/en/docs/about-claude/models/deprecated-models
 */
async function scrapeAnthropic() {
  console.log('  📡 Fetching Anthropic deprecations...');
  const results = {};
  const html = await fetchPage('https://docs.anthropic.com/en/docs/about-claude/models/deprecated-models');
  if (!html) return results;

  const text = htmlToText(html);

  const anthropicModels = Object.keys(KNOWN_REPLACEMENTS).filter(m =>
    m.startsWith('claude')
  );

  for (const model of anthropicModels) {
    if (text.includes(model)) {
      const date = extractDateNear(text, model) || 'N/A';
      results[model] = {
        replacement:      KNOWN_REPLACEMENTS[model] || 'claude-sonnet-4-5',
        deprecation_date: date,
      };
    }
  }
  console.log(`  ✅ Anthropic: found ${Object.keys(results).length} deprecated models.`);
  return results;
}

/**
 * Scrape Google Gemini deprecations page.
 * URL: https://ai.google.dev/gemini-api/docs/deprecations
 */
async function scrapeGoogle() {
  console.log('  📡 Fetching Google Gemini deprecations...');
  const results = {};
  const html = await fetchPage('https://ai.google.dev/gemini-api/docs/deprecations');
  if (!html) return results;

  const text = htmlToText(html);

  const geminiModels = Object.keys(KNOWN_REPLACEMENTS).filter(m =>
    m.startsWith('gemini') || m.startsWith('chat-bison') ||
    m.startsWith('text-bison') || m.startsWith('embedding-gecko')
  );

  for (const model of geminiModels) {
    if (text.includes(model)) {
      const date = extractDateNear(text, model) || 'N/A';
      results[model] = {
        replacement:      KNOWN_REPLACEMENTS[model] || 'gemini-1.5-pro',
        deprecation_date: date,
      };
    }
  }
  console.log(`  ✅ Google Gemini: found ${Object.keys(results).length} deprecated models.`);
  return results;
}

/**
 * Run all research scrapers and merge results.
 */
export async function runResearch() {
  console.log('\n🔬 Starting AI model deprecation research...');
  const [openai, anthropic, google] = await Promise.all([
    scrapeOpenAI(),
    scrapeAnthropic(),
    scrapeGoogle(),
  ]);

  const merged = { ...openai, ...anthropic, ...google };

  // If scraping returned nothing (e.g., blocked), fall back to known replacements
  if (Object.keys(merged).length === 0) {
    console.log('  ⚠ Scrapers returned no results — falling back to curated map.');
    for (const [model, replacement] of Object.entries(KNOWN_REPLACEMENTS)) {
      merged[model] = { replacement, deprecation_date: 'N/A' };
    }
  }

  console.log(`\n📋 Total: ${Object.keys(merged).length} deprecated models mapped.\n`);
  return merged;
}
