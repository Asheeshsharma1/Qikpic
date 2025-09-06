const form = document.getElementById("uploadForm");
const status = document.getElementById("status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const files = document.getElementById("fileInput").files;
  if (files.length === 0) {
    status.textContent = "Please select a file.";
    return;
  }

  const formData = new FormData();
  for (let file of files) formData.append("photos", file);

  const sessionId = window.location.pathname.split("/").pop();
  const res = await fetch(`/upload/${sessionId}`, {
    method: "POST",
    body: formData
  });

  if (res.ok) {
    status.textContent = "✅ Uploaded successfully!";
  } else {
    status.textContent = "❌ Upload failed.";
  }
});
