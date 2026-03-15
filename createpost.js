let bannerInput = null;
let preview = null;
let collegeFromUrl = null;
let selectedImage = null;

const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

let editPost = null;

document.addEventListener("DOMContentLoaded", async () => {
  const collegeFromUrl = params.get("college");
  const bannerInput = document.getElementById("banner");
  const preview = document.getElementById("bannerPreview");
  const select = document.getElementById("collegeSelect");

  if (collegeFromUrl && select) {
    select.value = collegeFromUrl;
  }

  if (!bannerInput || !preview) return;

  bannerInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        preview.src = e.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  if (editId) {
    await loadEditPost(editId, preview);
  }

  setupEditorImageHandler();
});

async function loadEditPost(id, preview) {
  const { data, error } = await db
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching post:", error);
    return;
  }

  if (data) {
    editPost = data;
    document.getElementById("title").value = editPost.title;
    document.getElementById("editor").innerHTML = editPost.content;

    if (editPost.banner && preview) {
      preview.src = editPost.banner;
      preview.style.display = "block";
    }

    const select = document.getElementById("collegeSelect");
    if (select && editPost.college) {
      select.value = editPost.college;
      select.disabled = true;
    }
  }
}

// Insert image with LIMITED SIZE
function insertImage(input) {
  if (!input.files || !input.files[0]) return;
  
  const file = input.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const imgData = e.target.result;
    const editor = document.getElementById('editor');
    
    // Create image element with LIMITED SIZE
    const img = document.createElement('img');
    img.src = imgData;
    img.style.maxWidth = '500px';   // Limit width
    img.style.maxHeight = '500px';  // Limit height
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';
    img.style.margin = '10px 0';
    img.style.display = 'block';
    img.dataset.filename = file.name;
    
    insertNodeAtCursor(img);
    
    // Add line break after image
    const br = document.createElement('br');
    insertNodeAtCursor(br);
    
    input.value = '';
  };
  
  reader.readAsDataURL(file);
}

function insertNodeAtCursor(node) {
  const editor = document.getElementById('editor');
  editor.focus();
  
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    
    if (!editor.contains(range.commonAncestorContainer)) {
      editor.appendChild(node);
      return;
    }
    
    range.deleteContents();
    range.insertNode(node);
    
    range.setStartAfter(node);
    range.setEndAfter(node);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.appendChild(node);
  }
}

// Add to setupEditorImageHandler function:

function setupEditorImageHandler() {
  const editor = document.getElementById('editor');
  const deleteBtn = document.getElementById('deleteImgBtn');
  
  // Click to select
  editor.addEventListener('click', function(e) {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      e.stopPropagation();
      
      if (selectedImage) {
        selectedImage.classList.remove('selected');
      }
      
      selectedImage = e.target;
      selectedImage.classList.add('selected');
      deleteBtn.style.display = 'inline-block';
    } else {
      // Clicked elsewhere, deselect
      if (selectedImage) {
        selectedImage.classList.remove('selected');
        selectedImage = null;
        deleteBtn.style.display = 'none';
      }
    }
  });
  
  // Double-click to preview
  editor.addEventListener('dblclick', function(e) {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      openImagePreview(e.target.src);
    }
  });
  
  // RIGHT-CLICK to delete (context menu)
  editor.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'IMG') {
      e.preventDefault(); // Block normal right-click menu
      
      if (confirm('Delete this image?')) {
        e.target.parentNode.removeChild(e.target);
        selectedImage = null;
        deleteBtn.style.display = 'none';
      }
    }
  });
  
  // DELETE KEY to remove selected image
  document.addEventListener('keydown', function(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImage) {
      e.preventDefault();
      selectedImage.parentNode.removeChild(selectedImage);
      selectedImage = null;
      deleteBtn.style.display = 'none';
    }
  });
}

function deleteSelectedImage() {
  if (selectedImage && selectedImage.parentNode) {
    selectedImage.parentNode.removeChild(selectedImage);
    selectedImage = null;
    document.getElementById('deleteImgBtn').style.display = 'none';
  }
}

function openImagePreview(src) {
  const modal = document.getElementById('imagePreviewModal');
  const img = document.getElementById('previewModalImg');
  
  img.src = src;
  modal.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeImagePreview() {
  const modal = document.getElementById('imagePreviewModal');
  const img = document.getElementById('previewModalImg');
  
  modal.classList.remove('visible');
  img.src = '';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('imagePreviewModal');
    if (modal.classList.contains('visible')) {
      closeImagePreview();
    }
  }
});

async function createPost() {
  const selectedCollege = document.getElementById("collegeSelect").value;
  const title = document.getElementById('title').value;
  const content = document.getElementById('editor').innerHTML;
  const bannerInput = document.getElementById('banner');

  if (!title || !content) {
    alert('Please fill in title and content');
    return;
  }

  if (editPost) {
    const updates = {
      college: selectedCollege,
      title: title,
      content: content,
      date: new Date().toLocaleString()
    };

    if (bannerInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = async function () {
        updates.banner = reader.result;
        await updatePost(editPost.id, updates);
      };
      reader.readAsDataURL(bannerInput.files[0]);
    } else {
      await updatePost(editPost.id, updates);
    }
  } else {
    const post = {
      college: selectedCollege,
      title: title,
      content: content,
      banner: null,
      date: new Date().toLocaleString()
    };

    if (bannerInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = async function () {
        post.banner = reader.result;
        await insertPost(post);
      };
      reader.readAsDataURL(bannerInput.files[0]);
    } else {
      await insertPost(post);
    }
  }
}

async function insertPost(post) {
  const { data, error } = await db
    .from("posts")
    .insert([post])
    .select();

  if (error) {
    console.error("Error creating post:", error);
    alert("Error creating post: " + error.message);
    return;
  }

  customModal("Post created successfully!", false, () => {
    window.location.href = `NEWS.html?college=${post.college}`;
  });
}

async function updatePost(id, updates) {
  const { data, error } = await db
    .from("posts")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) {
    console.error("Error updating post:", error);
    alert("Error updating post: " + error.message);
    return;
  }

  customModal("Post updated successfully!", false, () => {
    window.location.href = `NEWS.html?college=${updates.college}`;
  });
}

function formatText(command) {
  document.execCommand(command, false, null);
  updateToolbarState();
}

function updateToolbarState() {
  document.getElementById("boldBtn")?.classList.toggle("active", document.queryCommandState("bold"));
  document.getElementById("italicBtn")?.classList.toggle("active", document.queryCommandState("italic"));
  document.getElementById("underlineBtn")?.classList.toggle("active", document.queryCommandState("underline"));
}

document.addEventListener("selectionchange", updateToolbarState);

function addLink() {
  const url = prompt("Enter URL:");
  if (url) {
    document.execCommand("createLink", false, url);
  }
}

const editor = document.getElementById("editor");
if (editor) {
  editor.addEventListener("input", () => {
    if (editor.innerHTML === "<br>" || editor.innerHTML === "&nbsp;" || editor.textContent.trim() === "") {
      editor.innerHTML = "";
    }
  });
}

function customModal(message, showCancel, callback) {
  const modal = document.getElementById("confirmModal");
  const text = document.getElementById("confirmText");
  const yes = document.getElementById("confirmYes");
  const no = document.getElementById("confirmNo");

  text.textContent = message;

  if (showCancel) {
    no.style.display = "inline-block";
  } else {
    no.style.display = "none";
  }

  modal.classList.remove("hidden");

  yes.onclick = () => {
    modal.classList.add("hidden");
    if (callback) callback(true);
  };

  no.onclick = () => {
    modal.classList.add("hidden");
    if (callback) callback(false);
  };
}