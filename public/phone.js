const uploadCard = document.getElementById("uploadCard");
const formBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const status = document.getElementById("status");

// Session ID from URL
const sessionId = new URLSearchParams(window.location.search).get("session");

if (!sessionId) alert("Session not found!");

// ----------------- Drag & Drop -----------------
uploadCard.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadCard.classList.add("dragover");
});
uploadCard.addEventListener("dragleave", (e) => {
  uploadCard.classList.remove("dragover");
});
uploadCard.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadCard.classList.remove("dragover");
  fileInput.files = e.dataTransfer.files;
});

// ----------------- Upload -----------------
formBtn.addEventListener("click", () => {
  if (!fileInput.files.length) {
    alert("Select files first!");
    return;
  }

  const files = Array.from(fileInput.files);
  let uploadedCount = 0;

  files.forEach((file) => {
    const formData = new FormData();
    formData.append("files", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/upload?session=${sessionId}`, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percent + "%";
        progressText.innerText = `${percent}% (${file.name})`;
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        uploadedCount++;
        if (uploadedCount === files.length) {
          status.innerText = "✅ All files uploaded!";
          setTimeout(() => {
            progressBar.style.width = "0%";
            progressText.innerText = "0%";
            status.innerText = "";
          }, 2000);
        }
      } else {
        status.innerText = "❌ Upload failed!";
      }
    };

    xhr.send(formData);
  });
});
