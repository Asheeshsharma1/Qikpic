// Phone upload logic
const sessionInfo = document.getElementById('sessionInfo');
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const status = document.getElementById('status');

// extract session id from URL path: /upload/:sessionId
const parts = location.pathname.split('/');
const sessionId = parts[2] || null;

if (!sessionId) {
  sessionInfo.textContent = 'Invalid session';
} else {
  sessionInfo.textContent = `Session: ${sessionId}`;
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!sessionId) return;

  const files = fileInput.files;
  if (!files || files.length === 0) {
    status.textContent = 'Select one or more photos first.';
    return;
  }

  const formData = new FormData();
  for (const f of files) formData.append('photos', f);

  status.textContent = 'Uploading...';
  try {
    const resp = await fetch(`/api/upload/${sessionId}`, {
      method: 'POST',
      body: formData
    });
    const data = await resp.json();
    if (data.ok) {
      status.textContent = `Uploaded ${data.files.length} file(s).`;
    } else {
      status.textContent = `Upload failed: ${data.error || 'unknown'}`;
    }
  } catch (err) {
    status.textContent = 'Upload error';
    console.error(err);
  }
});
