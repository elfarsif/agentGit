// AgentGit Extension - Extract and save markdown content

document.addEventListener('DOMContentLoaded', () => {
  const commitBtn = document.getElementById('commitBtn');
  const statusDiv = document.getElementById('status');

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
        statusDiv.textContent = 'Error: Markdown content not found';
        statusDiv.className = 'status error';
        commitBtn.disabled = false;
        return;
      }

      // Download as text file
      downloadAsFile(markdownContent, 'markdown-content.txt');
      
      statusDiv.textContent = '✓ Content saved successfully!';
      statusDiv.className = 'status success';
      
      // Reset button after 2 seconds
      setTimeout(() => {
        commitBtn.disabled = false;
        statusDiv.textContent = '';
        statusDiv.className = 'status';
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.className = 'status error';
      commitBtn.disabled = false;
    }
  });
});

// Function to extract markdown from the page
function extractMarkdown() {
  // Target the div with the specific classes
  const selector = '.prose.prose-slate.dark\\:prose-invert.max-w-none.prose-sm';
  const markdownDiv = document.querySelector(selector);
  
  if (!markdownDiv) {
    // Try alternative selector without escaping
    const altSelector = 'div.prose.prose-slate';
    const altDiv = document.querySelector(altSelector);
    if (altDiv) {
      return altDiv.innerText || altDiv.textContent;
    }
    return null;
  }
  
  return markdownDiv.innerText || markdownDiv.textContent;
}

// Function to download content as a file
function downloadAsFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

