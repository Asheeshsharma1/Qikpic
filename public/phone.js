const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folderInput");
const progressBar = document.getElementById("progressBar");
const status = document.getElementById("status");

// Get session from URL (upload.html?session=xxxx)
const sessionId = new URLSearchParams(window.location.search).get("session");

uploadBtn.addEventListener("click", () => {
  const files = [...fileInput.files, ...folderInput.files];
  if (files.length === 0) return alert("Please select files or folder!");

  const formData = new FormData();
  files.forEach(f => formData.append("files", f));

  const xhr = new XMLHttpRequest();
  xhr.open("POST", `/upload?session=${sessionId}`, true);

  // Upload progress
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      progressBar.style.width = percent + "%";
    }
  };

  xhr.onload = () => {
    if (xhr.status === 200) {
      status.innerText = "✅ Upload complete!";
      setTimeout(() => {
        progressBar.style.width = "0%";
        status.innerText = "";
      }, 2000);
    } else {
      status.innerText = "❌ Upload failed!";
    }
  };

  xhr.send(formData);
});
