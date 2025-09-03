(function () {
  const TOKENS = ['BTC', 'ETH', 'USDT', 'USDC', 'ARB', 'TON', 'OKB', 'CBBTC', 'SOL'];

  let currentRates = { BTC: 60000, ETH: 3000, USDT: 1, USDC: 1, ARB: 1.2, TON: 6, OKB: 50, CBBTC: 60000, SOL: 150 };

  let el = {
    tokenFrom: document.getElementById('tokenFrom'),
    tokenTo: document.getElementById('tokenTo'),
    amountFrom: document.getElementById('amountFrom'),
    amountTo: document.getElementById('amountTo'),
    rateText: document.getElementById('rateText'),
    reverseBtn: document.getElementById('reverseBtn'),
    connectBtn: document.getElementById('connectBtn'),
    ethBalance: document.getElementById('ethBalance'),
    slipCustomInput: document.getElementById('slipCustomInput')
  };

  let web3 = null;
  let selectedAccount = null;

  function populate() {
    [el.tokenFrom, el.tokenTo].forEach(select => {
      select.innerHTML = '';
      TOKENS.forEach(sym => {
        const opt = document.createElement('option');
        opt.value = sym;
        opt.textContent = sym;
        select.appendChild(opt);
      });
    });
    el.tokenFrom.value = 'BTC';
    el.tokenTo.value = 'ETH';
    refresh();
  }

  function price(fromSym, toSym) {
    return currentRates[fromSym] / currentRates[toSym];
  }

  function formatAmount(v, decimals) {
    return v.toFixed(decimals).replace(/\.0+$/, '');
  }

  function updateRateText() {
    const p = price(el.tokenFrom.value, el.tokenTo.value);
    el.rateText.textContent = `1 ${el.tokenFrom.value} ≈ ${formatAmount(p, 6)} ${el.tokenTo.value}`;
  }

  function convert() {
    const amt = Number(el.amountFrom.value);
    const rate = price(el.tokenFrom.value, el.tokenTo.value);
    const slip = getSlippagePercent();
    el.amountTo.value = formatAmount(amt * rate * (1 - (slip / 100)), 8);
  }

  function getSlippagePercent() {
    const selected = document.querySelector('input[name="slippage"]:checked');
    if (selected.value === 'custom') {
      const v = Number(el.slipCustomInput?.value);
      return Math.min(15, Math.max(0, v));
    }
    return Number(selected.value);
  }

  function onSlippageChange() {
    const selected = document.querySelector('input[name="slippage"]:checked');
    if (el.slipCustomInput) el.slipCustomInput.disabled = (selected.value != 'custom');
    convert();
  }

  function reverse() {
    [el.tokenFrom.value, el.tokenTo.value] = [el.tokenTo.value, el.tokenFrom.value];
    refresh();
  }

  function refresh() {
    updateRateText();
    convert();
    updateEthBalance();
  }

  function bind() {
    el.tokenFrom.addEventListener('change', refresh);
    el.tokenTo.addEventListener('change', refresh);
    el.amountFrom.addEventListener('input', convert);
    el.reverseBtn.addEventListener('click', (e) => { e.preventDefault(); reverse(); });
    el.connectBtn.addEventListener('click', connectWallet);
    // Slippage listeners
    document.querySelectorAll('input[name="slippage"]').forEach(r => {
      r.addEventListener('change', onSlippageChange);
    });
    if (el.slipCustomInput) {
      el.slipCustomInput.addEventListener('input', onSlippageChange);
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts && accounts.length) {
      selectedAccount = accounts[0];
      web3 = new Web3(window.ethereum);
      el.connectBtn.textContent = 'Connected';
      updateEthBalance();
    }
  }

  async function updateEthBalance() {
    if (el.tokenFrom.value === 'ETH' && selectedAccount && web3) {
      const wei = await web3.eth.getBalance(selectedAccount);
      const eth = Web3.utils.fromWei(wei, 'ether');
      el.ethBalance.textContent = `Balance: ${formatAmount(Number(eth), 6)} ETH`;
      el.ethBalance.classList.remove('d-none');
    } else {
      el.ethBalance.classList.add('d-none');
    }
  }

  async function fetchRates() {
    try {
      const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,solana,usd-coin,arbitrum,the-open-network,okb,coinbase-wrapped-btc&vs_currencies=usd';
      const r = await fetch(url, { headers: { 'accept': 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      const rates = {
        BTC: json['bitcoin'].usd,
        ETH: json['ethereum'].usd,
        USDT: json['tether'].usd,
        SOL: json['solana'].usd,
        USDC: json['usd-coin'].usd,
        ARB: json['arbitrum'].usd,
        TON: json['the-open-network']?.usd,
        OKB: json['okb']?.usd,
        CBBTC: json['coinbase-wrapped-btc']?.usd,
      };
      currentRates = { ...currentRates, ...rates };
      updateRateText();
      convert();
    } catch (e) {}
  }

  populate();
  bind();
  fetchRates();
})();
