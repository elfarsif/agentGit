// AgentGit Extension - Extract and save markdown content

let currentMarkdownContent = null;

document.addEventListener('DOMContentLoaded', () => {
  const commitBtn = document.getElementById('commitBtn');
  const statusDiv = document.getElementById('status');
  const commitModal = document.getElementById('commitModal');
  const commitMessageInput = document.getElementById('commitMessage');
  const confirmCommitBtn = document.getElementById('confirmCommit');
  const cancelCommitBtn = document.getElementById('cancelCommit');
  const viewModal = document.getElementById('viewModal');
  const closeViewBtn = document.getElementById('closeViewBtn');
  const closeViewModalBtn = document.getElementById('closeViewModal');

  // Load and display stored commits
  loadCommits();

  // Set up event delegation for commit buttons (no inline handlers)
  const commitsContainer = document.getElementById('commitsContainer');
  if (commitsContainer) {
    commitsContainer.addEventListener('click', async (e) => {
      const commitId = e.target.getAttribute('data-commit-id');
      if (!commitId) return;
      
      if (e.target.classList.contains('view-btn')) {
        await viewCommit(commitId);
      } else if (e.target.classList.contains('delete-btn')) {
        await deleteCommit(commitId);
      }
    });
  }

  // Commit button handler
  commitBtn.addEventListener('click', async () => {
    try {
      commitBtn.disabled = true;
      statusDiv.textContent = 'Extracting content...';
      statusDiv.className = 'status';

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Execute script to extract markdown content
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractMarkdown
      });

      const markdownContent = results[0].result;

      if (!markdownContent) {
        statusDiv.textContent = 'Error: Content not found in systemPrompt textarea';
        statusDiv.className = 'status error';
        commitBtn.disabled = false;
        return;
      }

      // Store content temporarily and show modal
      currentMarkdownContent = markdownContent;
      commitMessageInput.value = '';
      commitModal.classList.add('show');
      commitMessageInput.focus();
      commitBtn.disabled = false;

    } catch (error) {
      console.error('Error:', error);
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.className = 'status error';
      commitBtn.disabled = false;
    }
  });

  // Handle confirm commit
  confirmCommitBtn.addEventListener('click', async () => {
    const message = commitMessageInput.value.trim();
    
    if (!message) {
      alert('Please enter a commit message');
      return;
    }

    if (!currentMarkdownContent) {
      alert('No content to save');
      return;
    }

    try {
      // Save to storage
      await saveCommit(message, currentMarkdownContent);
      
      // Close modal
      commitModal.classList.remove('show');
      currentMarkdownContent = null;
      
      // Show success message
      statusDiv.textContent = '✓ Content saved successfully!';
      statusDiv.className = 'status success';
      
      // Reload commits list
      loadCommits();
      
      // Reset status after 2 seconds
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status';
      }, 2000);

    } catch (error) {
      console.error('Error saving commit:', error);
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.className = 'status error';
    }
  });

  // Handle cancel commit
  cancelCommitBtn.addEventListener('click', () => {
    commitModal.classList.remove('show');
    currentMarkdownContent = null;
  });

  // Allow Enter key to confirm
  commitMessageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmCommitBtn.click();
    }
  });

  // Close view modal handlers
  if (closeViewBtn) {
    closeViewBtn.addEventListener('click', () => {
      viewModal.classList.remove('show');
    });
  }
  
  if (closeViewModalBtn) {
    closeViewModalBtn.addEventListener('click', () => {
      viewModal.classList.remove('show');
    });
  }
  
  // Close view modal when clicking outside
  if (viewModal) {
    viewModal.addEventListener('click', (e) => {
      if (e.target === viewModal) {
        viewModal.classList.remove('show');
      }
    });
  }

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (commitModal.classList.contains('show')) {
        cancelCommitBtn.click();
      }
      if (viewModal.classList.contains('show')) {
        viewModal.classList.remove('show');
      }
    }
  });
});

// Function to extract content from the systemPrompt textarea
function extractMarkdown() {
  // Target the textarea with id "systemPrompt"
  const textarea = document.getElementById('systemPrompt');
  
  if (!textarea) {
    return null;
  }
  
  return textarea.value || textarea.textContent || '';
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Save commit to storage
async function saveCommit(message, content) {
  const commit = {
    id: Date.now().toString(),
    message: message,
    content: content,
    date: new Date().toISOString(),
    preview: content.substring(0, 100) + (content.length > 100 ? '...' : '')
  };

  const result = await chrome.storage.local.get(['commits']);
  const commits = result.commits || [];
  commits.unshift(commit); // Add to beginning
  
  // Keep only last 50 commits
  const limitedCommits = commits.slice(0, 50);
  
  await chrome.storage.local.set({ commits: limitedCommits });
}

// Load and display commits
async function loadCommits() {
  const result = await chrome.storage.local.get(['commits']);
  const commits = result.commits || [];
  const container = document.getElementById('commitsContainer');

  if (commits.length === 0) {
    container.innerHTML = '<div class="empty-state">No commits yet. Click "Commit" to save your first one!</div>';
    return;
  }

  container.innerHTML = commits.map(commit => {
    const date = new Date(commit.date);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `
      <div class="commit-item">
        <div class="commit-item-header">
          <div class="commit-label" title="${escapeHtml(commit.message)}">${escapeHtml(commit.message)}</div>
          <div class="commit-date">${dateStr}</div>
        </div>
        <div class="commit-preview" title="${escapeHtml(commit.preview)}">${escapeHtml(commit.preview)}</div>
        <div class="commit-actions">
          <button class="view-btn" data-commit-id="${commit.id}">View</button>
          <button class="delete-btn" data-commit-id="${commit.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// View commit content
async function viewCommit(commitId) {
  const result = await chrome.storage.local.get(['commits']);
  const commits = result.commits || [];
  const commit = commits.find(c => c.id === commitId);
  
  if (commit) {
    const viewModal = document.getElementById('viewModal');
    const viewModalTitle = document.getElementById('viewModalTitle');
    const viewModalContent = document.getElementById('viewModalContent');
    
    viewModalTitle.textContent = commit.message;
    viewModalContent.textContent = commit.content;
    viewModal.classList.add('show');
  }
}

// Delete commit
async function deleteCommit(commitId) {
  if (!confirm('Are you sure you want to delete this commit?')) {
    return;
  }

  const result = await chrome.storage.local.get(['commits']);
  const commits = result.commits || [];
  const filteredCommits = commits.filter(c => c.id !== commitId);
  
  await chrome.storage.local.set({ commits: filteredCommits });
  loadCommits();
}
