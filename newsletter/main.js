document.addEventListener("DOMContentLoaded", function() {
  const apiUrl = "https://beacon.isaacd2.com";

  // Tab Switching
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
      tab.addEventListener('click', () => {
          // Remove active class from all tabs and contents
          tabs.forEach(t => t.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));

          // Add active class to clicked tab and corresponding content
          tab.classList.add('active');
          const tabId = tab.dataset.tab;
          document.getElementById(tabId).classList.add('active');
      });
  });

  // Enable email form if logged in
  if (localStorage.getItem("id_token")) {
    document.getElementById("emailBtn").disabled = false;
  } else {
    document.getElementById("emailBtn").disabled = true;
  }

  // Populate campaign dropdown for email form
  function populateEmailCampaignDropdown(campaigns) {
    const select = document.getElementById("emailCampaign");
    while (select.options.length > 1) select.remove(1);
    if (Array.isArray(campaigns)) {
      const names = Array.from(new Set(campaigns.map(c => c.campaign).filter(Boolean)));
      for (const name of names) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      }
    }
  }

  // Populate recipient dropdown for email form
  function populateEmailRecipientDropdown(subscribers) {
    const select = document.getElementById("emailRecipient");
    while (select.options.length > 1) select.remove(1);
    if (Array.isArray(subscribers)) {
      const emails = Array.from(new Set(subscribers.map(s => s.emailAddress).filter(Boolean)));
      for (const email of emails) {
        const opt = document.createElement("option");
        opt.value = email;
        opt.textContent = email;
        select.appendChild(opt);
      }
    }
  }

  // Email form handler
  document.getElementById("emailForm").onsubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("id_token");
    const recipient = document.getElementById("emailRecipient").value;
    const campaign = document.getElementById("emailCampaign").value;
    let version = document.getElementById("emailVersion").value;
    version = version === 'a' ? 'a' : version === 'b' ? 'b' : '';

    document.getElementById("emailResult").textContent = "Submitting...";
    document.getElementById("emailResult").className = "result loading";
    try {
      const res = await fetch(apiUrl + "/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          recipient,
          campaign,
          version
        })
      });
      let msg = '';
      try {
        const data = await res.json();
        if (data && typeof data === 'object') {
          if (data.message) {
            msg = data.message;
          } else if (data.error) {
            msg = data.error;
          } else {
            msg = 'Success.';
          }
        } else {
          msg = String(data);
        }
      } catch (e) {
        msg = await res.text();
      }
      document.getElementById("emailResult").textContent = msg;
      document.getElementById("emailResult").className = res.ok ? "result success" : "result error";
      document.getElementById("emailForm").reset();
    } catch (err) {
      document.getElementById("emailResult").textContent = "Error: " + err.message;
      document.getElementById("emailResult").className = "result error";
    }
  };

  // Step 1: Redirect to Cognito login
  document.getElementById("loginBtn").onclick = () => {
    const loginUrl = 'https://auth.isaacd2.com/login?client_id=7ftcq3nq571hpgt92jb1ihm0ch&response_type=token&scope=email+openid+phone&redirect_uri=https%3A%2F%2Fdev.isaacd2.com%2Fnewsletter';
    window.location = loginUrl;
  };

  // Step 2: Parse token from URL hash after redirect
  function parseHash() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return {
      id_token: params.get("id_token"),
      access_token: params.get("access_token"),
      expires_in: params.get("expires_in"),
      token_type: params.get("token_type")
    };
  }

  // Parse tokens from URL hash
  const tokens = parseHash();

  // If just logged in, store token and update UI
  if (tokens.id_token) {
  localStorage.setItem("id_token", tokens.id_token);
  // Optionally, show a non-destructive login success message
  const msg = document.createElement('div');
  msg.className = 'success';
  msg.textContent = 'Logged in successfully.';
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
  }

  // Enable subscribe/refresh if token is present
  if (localStorage.getItem("id_token")) {
    document.getElementById("subscribeBtn").disabled = false;
    document.getElementById("refreshBtn").style.display = "inline-block";
    callApi(); // Call API on page load
  }

  // Render subscribers as a modern table
  function renderSubscribers(data) {
    populateEmailRecipientDropdown(data);
    const tbody = document.querySelector('#subscribersTable tbody');
    const output = document.getElementById('output');
    if (!Array.isArray(data)) {
      tbody.innerHTML = '<tr><td colspan="5" class="error">No subscriber data available.</td></tr>';
      if (output) output.innerHTML = "";
      return;
    }
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">No subscribers found.</td></tr>';
      if (output) output.innerHTML = "";
      return;
    }
    tbody.innerHTML = data.map(sub => `
      <tr>
        <td>${sub.firstName || "—"}</td>
        <td>${sub.emailAddress || "—"}</td>
        <td>${sub.subscriptionDate ? new Date(sub.subscriptionDate).toLocaleDateString() : "—"}</td>
        <td><span class="status-badge active">Active</span></td>
        <td>
          <button class="btn btn-small" onclick="editSubscriber('${sub.emailAddress}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteSubscriber('${sub.emailAddress}')">Delete</button>
        </td>
      </tr>
    `).join('');
    if (output) output.innerHTML = "";
  }

  // Update dashboard metrics
  function updateMetrics(subscribersData) {
    if (Array.isArray(subscribersData)) {
      // Update total subscribers count
      const totalSubscribers = subscribersData.length;
      document.querySelector('.metrics-grid .metric-card:nth-child(1) .metric-value').textContent = totalSubscribers;

      // Calculate month-over-month growth
      const now = new Date();
      const thisMonth = subscribersData.filter(sub => {
        const subDate = new Date(sub.subscriptionDate);
        return subDate.getMonth() === now.getMonth() && subDate.getFullYear() === now.getFullYear();
      }).length;

      const lastMonth = subscribersData.filter(sub => {
        const subDate = new Date(sub.subscriptionDate);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
        return subDate.getMonth() === lastMonthDate.getMonth() && subDate.getFullYear() === lastMonthDate.getFullYear();
      }).length;

      const growthPercent = lastMonth ? Math.round((thisMonth - lastMonth) / lastMonth * 100) : 0;
      const growthTrend = document.querySelector('.metrics-grid .metric-card:nth-child(1) .metric-trend');
      growthTrend.textContent = `${growthPercent >= 0 ? '↑' : '↓'} ${Math.abs(growthPercent)}% this month`;
      growthTrend.style.color = growthPercent >= 0 ? '#16a34a' : '#dc2626';
    }
  }

  // Function to call the /subscribers API
  async function callApi() {
    const token = localStorage.getItem("id_token");
    if (!token) return;
    document.getElementById("output").innerHTML = '<div class="loading">Loading subscribers...</div>';
    try {
      const res = await fetch(apiUrl + "/subscribers", {
        method: "GET",
        headers: { Authorization: token }
      });
      const data = await res.json();
      renderSubscribers(data);
      updateMetrics(data);
    } catch (err) {
      document.getElementById("output").innerHTML = `<div class="error">Error: ${err.message}</div>`;
    }
  }

  // Refresh button handler
  document.getElementById("refreshBtn").onclick = callApi;

  // Subscribe form handler
  document.getElementById("subscribeForm").onsubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("id_token");
    const name = document.getElementById("firstName").value;
    const email = document.getElementById("emailAddress").value;
    document.getElementById("subscribeResult").textContent = "Submitting...";
    document.getElementById("subscribeResult").className = "result loading";
    try {
      const res = await fetch(apiUrl + "/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          emailAddress: email,
          firstName: name
        })
      });
      let msg = '';
      try {
        const data = await res.json();
        if (data && typeof data === 'object') {
          if (data.message) {
            msg = data.message;
          } else if (data.error) {
            msg = data.error;
          } else {
            msg = 'Success.';
          }
        } else {
          msg = String(data);
        }
      } catch (e) {
        msg = await res.text();
      }
      document.getElementById("subscribeResult").textContent = msg;
      document.getElementById("subscribeResult").className = res.ok ? "result success" : "result error";
      document.getElementById("subscribeForm").reset();
      callApi();
    } catch (err) {
      document.getElementById("subscribeResult").textContent = "Error: " + err.message;
      document.getElementById("subscribeResult").className = "result error";
    }
  };

  // Enable campaign form if logged in
  if (localStorage.getItem("id_token")) {
    document.getElementById("campaignBtn").disabled = false;
    fetchCampaigns();
  }

  // Render campaigns as a modern table
  function renderCampaigns(data) {
    populateEmailCampaignDropdown(data);
    const tbody = document.querySelector('#campaignsTable tbody');
    const output = document.getElementById('campaignsOutput');
    if (!tbody) {
      // Table is missing, show a message in campaignsOutput
      if (output) {
        output.innerHTML = '<div class="error">Campaigns table is missing from the page.</div>';
      }
      return;
    }
    if (!Array.isArray(data)) {
      tbody.innerHTML = '<tr><td colspan="5" class="error">No campaign data available.</td></tr>';
      if (output) output.innerHTML = "";
      return;
    }
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">No campaigns found.</td></tr>';
      if (output) output.innerHTML = "";
      return;
    }
    tbody.innerHTML = data.map(c => `
      <tr>
        <td>${c.campaign || "—"}</td>
        <td>${c.subject || "—"}</td>
        <td>${c.sendDate ? new Date(c.sendDate).toLocaleDateString() : "—"}</td>
        <td><span class="status-badge ${getStatusClass(c)}">${getStatusText(c)}</span></td>
        <td>
          <button class="btn btn-small" onclick="editCampaign('${c.campaign}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteCampaign('${c.campaign}')">Delete</button>
        </td>
      </tr>
    `).join('');
    if (output) output.innerHTML = "";
  }

  // Fetch campaigns from API
  async function fetchCampaigns() {
    const token = localStorage.getItem("id_token");
    if (!token) return;
    document.getElementById("campaignsOutput").innerHTML = '<div class="loading">Loading campaigns...</div>';
    try {
      const res = await fetch(apiUrl + "/campaigns", {
        method: "GET",
        headers: { Authorization: token }
      });
      const data = await res.json();
      renderCampaigns(data);
    } catch (err) {
      document.getElementById("campaignsOutput").innerHTML = `<div class="error">Error: ${err.message}</div>`;
    }
  }

  // Campaign form handler
  // Helper functions for campaign status
  function getStatusClass(campaign) {
    const now = new Date();
    const sendDate = campaign.sendDate ? new Date(campaign.sendDate) : null;
    
    if (!sendDate) return 'draft';
    if (sendDate < now) return 'sent';
    if (sendDate > now) return 'scheduled';
    return 'active';
  }

  function getStatusText(campaign) {
    const now = new Date();
    const sendDate = campaign.sendDate ? new Date(campaign.sendDate) : null;
    
    if (!sendDate) return 'Draft';
    if (sendDate < now) return 'Sent';
    if (sendDate > now) return 'Scheduled';
    return 'Active';
  }

  // Global handlers for table actions
  window.editSubscriber = (email) => {
    // TODO: Implement subscriber editing
    console.log('Edit subscriber:', email);
  };

  window.deleteSubscriber = async (email) => {
    if (!confirm(`Are you sure you want to delete subscriber ${email}?`)) return;
    
    const token = localStorage.getItem("id_token");
    try {
      const res = await fetch(`${apiUrl}/subscribers/${encodeURIComponent(email)}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });
      if (res.ok) {
        callApi(); // Refresh the list
      } else {
        alert('Failed to delete subscriber');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.editCampaign = (campaignName) => {
    // TODO: Implement campaign editing
    console.log('Edit campaign:', campaignName);
  };

  window.deleteCampaign = async (campaignName) => {
    if (!confirm(`Are you sure you want to delete campaign ${campaignName}?`)) return;
    
    const token = localStorage.getItem("id_token");
    try {
      const res = await fetch(`${apiUrl}/campaigns/${encodeURIComponent(campaignName)}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });
      if (res.ok) {
        fetchCampaigns(); // Refresh the list
      } else {
        alert('Failed to delete campaign');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  document.getElementById("campaignForm").onsubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("id_token");
    const campaign = document.getElementById("campaignName").value;
    const version = document.getElementById("campaignVersion").value;
    const subject = document.getElementById("campaignSubject").value;
    const preview = document.getElementById("campaignPreview").value;
    const sendDate = document.getElementById("campaignSendDate").value;
    document.getElementById("campaignResult").textContent = "Submitting...";
    document.getElementById("campaignResult").className = "result loading";
    try {
      const res = await fetch(apiUrl + "/campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          campaign,
          version,
          sendDate,
          subject,
          preview
        })
      });
      let msg = '';
      try {
        const data = await res.json();
        if (data && typeof data === 'object') {
          if (data.message) {
            msg = data.message;
          } else if (data.error) {
            msg = data.error;
          } else {
            msg = 'Success.';
          }
        } else {
          msg = String(data);
        }
      } catch (e) {
        msg = await res.text();
      }
      document.getElementById("campaignResult").textContent = msg;
      document.getElementById("campaignResult").className = res.ok ? "result success" : "result error";
      document.getElementById("campaignForm").reset();
      fetchCampaigns();
    } catch (err) {
      document.getElementById("campaignResult").textContent = "Error: " + err.message;
      document.getElementById("campaignResult").className = "result error";
    }
  };
});
