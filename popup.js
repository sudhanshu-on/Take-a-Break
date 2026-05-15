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
      limitLabel.min = 1;
      limitLabel.value = sites[host];
      limitLabel.addEventListener('change', () => {
        sites[host] = Number(limitLabel.value);
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
  chrome.storage.sync.get({ websiteLimits: {}, defaultBreak: 5 }, (items) => {
    sites = items.websiteLimits || {};
    defaultBreak.value = items.defaultBreak || 5;
    renderSites();
  });

  addSite.addEventListener('click', () => {
    const host = siteHost.value.trim();
    const limit = Number(siteLimit.value);
    if (!host || !limit) return;
    sites[host.replace(/^www\./, '')] = limit;
    siteHost.value = '';
    siteLimit.value = '';
    renderSites();
  });

  save.addEventListener('click', () => {
    const defaultVal = Number(defaultBreak.value) || 5;
    chrome.storage.sync.set({ websiteLimits: sites, defaultBreak: defaultVal }, () => {
      // notify background to reload (background also listens to storage changes, but send a message to be explicit)
      chrome.runtime.sendMessage({ action: 'SETTINGS_UPDATED' });
      window.close();
    });
  });

});
