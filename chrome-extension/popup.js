const SITE_URL = 'https://getaiphotoeditor.com';

/** @type {{ id: string, file: File, url: string }[]} */
let mediaItems = [];

const mediaInput = document.getElementById('media-input');
const dropzone = document.getElementById('dropzone');
const previewList = document.getElementById('preview-list');
const generateBtn = document.getElementById('generate');

function revokeAll() {
  for (const item of mediaItems) {
    URL.revokeObjectURL(item.url);
  }
  mediaItems = [];
}

function renderPreviews() {
  previewList.replaceChildren();
  previewList.hidden = mediaItems.length === 0;

  for (const item of mediaItems) {
    const li = document.createElement('li');
    li.className = 'preview-item';

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.file.name;
    li.appendChild(img);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.setAttribute('aria-label', `Remove ${item.file.name}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      URL.revokeObjectURL(item.url);
      mediaItems = mediaItems.filter((m) => m.id !== item.id);
      renderPreviews();
    });
    li.appendChild(remove);
    previewList.appendChild(li);
  }
}

function addFiles(fileList) {
  const files = Array.from(fileList || []).filter((f) =>
    f.type.startsWith('image/')
  );
  for (const file of files) {
    mediaItems.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      url: URL.createObjectURL(file),
    });
  }
  renderPreviews();
  mediaInput.value = '';
}

mediaInput.addEventListener('change', () => addFiles(mediaInput.files));

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
  });
});

dropzone.addEventListener('drop', (e) => {
  addFiles(e.dataTransfer?.files);
});

generateBtn.addEventListener('click', () => {
  // MVP: open the site only. Media + prompt are not sent yet.
  window.open(SITE_URL, '_blank', 'noopener,noreferrer');
});

window.addEventListener('unload', revokeAll);
