const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const status = document.getElementById("status");

// Session ID from URL
const sessionId = new URLSearchParams(window.location.search).get("s");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!fileInput.files.length) {
    alert("Please select files first!");
    return;
  }

  const formData = new FormData();
  for (let file of fileInput.files) {
    formData.append("files", file);
  }

  const xhr = new XMLHttpRequest();
  xhr.open("POST", `/upload/${sessionId}`, true);

  // Progress
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      progressBar.style.width = percent + "%";
      progressText.innerText = percent + "%";
    }
  };

  xhr.onload = () => {
    if (xhr.status === 200) {
      status.innerText = "✅ Upload complete!";
      setTimeout(() => {
        progressBar.style.width = "0%";
        progressText.innerText = "0%";
      }, 2000);
    } else {
      status.innerText = "❌ Upload failed!";
    }
  };

  xhr.send(formData);
});
