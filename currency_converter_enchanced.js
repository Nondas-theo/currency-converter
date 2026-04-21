'use strict';

// =====================
// DOM ELEMENTS
// =====================
const countryListFrom = document.querySelector('.options--from');
const countryListTo = document.querySelector('.options--to');
const codeContainerFrom = document.querySelector('.flag--container--from');
const codeContainerTo = document.querySelector('.flag--container--to');
const dropdownContainer = document.querySelector('.container--dropdown');

const btnCloseFrom = document.querySelector('.close--from');
const btnCloseTo = document.querySelector('.close--to');
const btnOpenFrom = document.querySelector('.selected--from');
const btnOpenTo = document.querySelector('.selected--to');
const btnSwap = document.querySelector('.swap');

const inputFrom = document.querySelector('.from');
const inputTo = document.querySelector('.to');

// =====================
// FETCH CURRENCIES LIST
// =====================
async function getCurrencyCode() {
  try {
    const res = await fetch(
      'https://api.currencyfreaks.com/v2.0/supported-currencies',
    );
    if (!res.ok) throw new Error('Problem fetching currencies');

    const data = await res.json();
    const { supportedCurrenciesMap } = data;

    const isISO4217 = c => /^[A-Z]{3}$/.test(c);
    const isISO2 = cc => /^[A-Z]{2}$/.test(cc);

    const currencies = Object.values(supportedCurrenciesMap)
      .filter(
        el =>
          el &&
          isISO4217(el.currencyCode) &&
          isISO2(el.countryCode) &&
          el.status === 'AVAILABLE',
      )
      .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));

    renderCountryData(currencies);

    // ===== INITIAL STATE =====
    setSelected(codeContainerFrom, 'eur');
    setSelected(codeContainerTo, 'usd');
    inputFrom.value = '1';
    await getExchange();
  } catch (err) {
    alert(err.message);
  }
}
getCurrencyCode();

function renderCountryData(data) {
  const html = data
    .map(
      el => `
      <li class="code--flag" data-value="${el.currencyCode}">
        ${el.currencyCode} (${el.currencyName})
        <img src="${el.icon}" />
      </li>
    `,
    )
    .join('');

  countryListFrom.insertAdjacentHTML('beforeend', html);
  countryListTo.insertAdjacentHTML('beforeend', html);
}

// =====================
// DROPDOWN OPEN / CLOSE
// =====================

function syncIcons(listEl, btnOpen, btnClose) {
  const isOpen = !listEl.classList.contains('hidden');
  btnOpen.classList.toggle('hidden', isOpen); // αν open -> κρύψε arrow
  btnClose.classList.toggle('hidden', !isOpen); // αν open -> δείξε X
}

dropdownContainer.addEventListener('click', e => {
  const clickedFrom =
    e.target.closest('.selected--from') || e.target.closest('.close--from');
  const clickedTo =
    e.target.closest('.selected--to') || e.target.closest('.close--to');

  if (clickedFrom) {
    // toggle FROM
    countryListFrom.classList.toggle('hidden');

    // force close TO
    countryListTo.classList.add('hidden');

    // sync icons
    syncIcons(countryListFrom, btnOpenFrom, btnCloseFrom);
    syncIcons(countryListTo, btnOpenTo, btnCloseTo);
    return;
  }

  if (clickedTo) {
    // toggle TO
    countryListTo.classList.toggle('hidden');

    // force close FROM
    countryListFrom.classList.add('hidden');

    // sync icons
    syncIcons(countryListTo, btnOpenTo, btnCloseTo);
    syncIcons(countryListFrom, btnOpenFrom, btnCloseFrom);
  }
});

// Close dropdowns on outside click
document.addEventListener('click', e => {
  if (e.target.closest('.dropdown')) return;

  countryListFrom.classList.add('hidden');
  countryListTo.classList.add('hidden');

  syncIcons(countryListFrom, btnOpenFrom, btnCloseFrom);
  syncIcons(countryListTo, btnOpenTo, btnCloseTo);
});

// =====================
// SELECTION HELPER
// =====================
function setSelected(container, codeLower) {
  container.textContent = codeLower;
  container.style.fontSize = '20px';

  const img = document.createElement('img');
  img.src = `https://currencyfreaks.com/photos/flags/${codeLower}.png`;
  img.alt = codeLower.toUpperCase();
  img.style.width = '40px';

  container.append(img);
}

// =====================
// SELECT FROM / TO / SWAP
// =====================
countryListFrom.addEventListener('click', async e => {
  const li = e.target.closest('.code--flag');
  if (!li) return;

  setSelected(codeContainerFrom, li.dataset.value.toLowerCase());

  inputFrom.value = '1';
  await getExchange();

  countryListFrom.classList.add('hidden');
  syncIcons(countryListFrom, btnOpenFrom, btnCloseFrom);
});

countryListTo.addEventListener('click', async e => {
  const li = e.target.closest('.code--flag');
  if (!li) return;

  setSelected(codeContainerTo, li.dataset.value.toLowerCase());

  inputFrom.value = '1';
  await getExchange();

  countryListTo.classList.add('hidden');
  syncIcons(countryListTo, btnOpenTo, btnCloseTo);
});

btnSwap.addEventListener('click', async e => {
  const currentFrom = codeContainerFrom.textContent.trim();
  const currentTo = codeContainerTo.textContent.trim();

  if (!e.target.closest('.icon--swap')) return;

  setSelected(codeContainerFrom, currentTo);
  setSelected(codeContainerTo, currentFrom);

  await getExchange();
});

// =====================
// EXCHANGE RATES (CACHE)
// =====================
const ratesCache = {};

async function getRate(base, target) {
  if (ratesCache[base]?.[target] != null) {
    return ratesCache[base][target];
  }

  const res = await fetch(
    `https://latest.currency-api.pages.dev/v1/currencies/${base}.json`,
  );
  if (!res.ok) throw new Error('Problem getting exchange rate');

  const data = await res.json();
  ratesCache[base] = data[base];
  // console.log(ratesCache);
  return ratesCache[base][target];
}

async function getExchange() {
  const currencyFrom = codeContainerFrom.textContent.trim();
  const currencyTo = codeContainerTo.textContent.trim();
  const raw = inputFrom.value;
  const amount = Number(raw);

  if (raw.trim() === '' || !Number.isFinite(amount)) {
    inputTo.value = '';
    return;
  }

  if (!currencyFrom || !currencyTo) {
    inputTo.value = '';
    return;
  }

  try {
    const rate = await getRate(currencyFrom, currencyTo);
    inputTo.value = `${(amount * rate).toFixed(4)}     (${(amount * rate).toFixed(2)})`;
  } catch (err) {
    alert(err.message);
  }
}

inputFrom.addEventListener('input', getExchange);
