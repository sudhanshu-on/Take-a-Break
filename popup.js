document.addEventListener('DOMContentLoaded', () => {

  const defaultBreak = document.getElementById('defaultBreak');
  const siteList = document.getElementById('siteList');
  const siteHost = document.getElementById('siteHost');
  const siteLimit = document.getElementById('siteLimit');
  const addSite = document.getElementById('addSite');
  const save = document.getElementById('save');

  let sites = {};

  function renderSites() {
    siteList.innerHTML = '';
    Object.keys(sites).forEach(host => {
      const row = document.createElement('div');
      row.className = 'site-row';

      const hostLabel = document.createElement('input');
      hostLabel.type = 'text';
      hostLabel.value = host;
      hostLabel.readOnly = true;

      const limitLabel = document.createElement('input');
      limitLabel.type = 'number';
      limitLabel.min = 0.5;
      limitLabel.step = 0.5;
      // display minutes in the UI (stored value in seconds)
      limitLabel.value = (sites[host] / 60).toFixed(1).replace(/\.0$/, '');
      limitLabel.addEventListener('change', () => {
        const minutes = Number(limitLabel.value);
        sites[host] = Math.max(30, Math.round(minutes * 60));
      });

      const remove = document.createElement('button');
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        delete sites[host];
        renderSites();
      });

      row.appendChild(hostLabel);
      row.appendChild(limitLabel);
      row.appendChild(remove);
      siteList.appendChild(row);
    });
  }

  // load saved settings
  chrome.storage.sync.get({ websiteLimits: {}, defaultBreak: 300 }, (items) => {
    sites = items.websiteLimits || {};
    // stored defaultBreak is seconds; show minutes in UI
    const defaultMinutes = (items.defaultBreak || 300) / 60;
    defaultBreak.value = Number(Number(defaultMinutes).toFixed(1)).toString().replace(/\.0$/, '');
    renderSites();
  });

  addSite.addEventListener('click', () => {
    const host = siteHost.value.trim();
    const limit = Number(siteLimit.value);
    if (!host || !limit) return;
    // convert minutes to seconds for storage
    const seconds = Math.max(30, Math.round(limit * 60));
    sites[host.replace(/^www\./, '')] = seconds;
    siteHost.value = '';
    siteLimit.value = '';
    renderSites();
  });

  save.addEventListener('click', () => {
    const defaultMinutes = Number(defaultBreak.value) || 5;
    const defaultVal = Math.max(30, Math.round(defaultMinutes * 60));
    chrome.storage.sync.set({ websiteLimits: sites, defaultBreak: defaultVal }, () => {
      // notify background to reload (background also listens to storage changes, but send a message to be explicit)
      chrome.runtime.sendMessage({ action: 'SETTINGS_UPDATED' });
      window.close();
    });
  });

});
