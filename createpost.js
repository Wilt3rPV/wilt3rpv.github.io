let bannerInput = null;
let preview = null;
let collegeFromUrl = null;
let selectedImage = null;

const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

let editPost = null;

const campusDepartments = {
  prmsuIba: [
    { value: 'comtech', label: 'College of Communication & Information Technology' },
    { value: 'indtech', label: 'College of Industrial Technology' },
    { value: 'education', label: 'College of Education' },
    { value: 'business', label: 'College of Business Administration' },
    { value: 'nursing', label: 'College of Nursing' },
    { value: 'arts', label: 'College of Arts & Sciences' },
    { value: 'engineering', label: 'College of Engineering' },
    { value: 'agri', label: 'College of Agriculture & Forestry' },
    { value: 'hospitality', label: 'College of Hospitality Management' },
    { value: 'criminology', label: 'College of Criminology' }
  ],
  prmsuBotolan: [
    { value: 'agri', label: 'College of Agriculture & Forestry' },
    { value: 'education', label: 'College of Education' }
  ],
  prmsuCaste: [
    { value: 'education', label: 'College of Education' },
    { value: 'business', label: 'College of Business Administration' },
    { value: 'comtech', label: 'College of Communication & Information Technology' }
  ],
  macsatIba: [
    { value: 'comtech', label: 'Computer Science' },
    { value: 'business', label: 'Business Administration' }
  ],
  ccGapo: [
    { value: 'business', label: 'College of Business & Accountancy' },
    { value: 'education', label: 'College of Arts, Sciences & Education' },
    { value: 'comtech', label: 'College of Computer Studies' },
    { value: 'engineering', label: 'College of Engineering' },
    { value: 'architecture', label: 'College of Architecture' },
    { value: 'nursing', label: 'College of Nursing' }
  ],
  ccCruz: [
    { value: 'education', label: 'College of Education' },
    { value: 'business', label: 'College of Business Administration' },
    { value: 'comtech', label: 'Information Systems' }
  ],
  prmsuMan: [
    { value: 'comtech', label: 'College of Communication & Information Technology' },
    { value: 'business', label: 'College of Business Administration' },
    { value: 'education', label: 'College Of Education' }
  ],
  prmsuCruz: [
    { value: 'comtech', label: 'College of Communication & Information Technology' },
    { value: 'education', label: 'College Of Education' }
  ],
  gcGapo: [
    { value: 'business', label: 'College of Business & Accountancy' },
    { value: 'comtech', label: 'College of Computer Studies' },
    { value: 'education', label: 'College of Arts, Sciences & Education' },
    { value: 'hospitality', label: 'College of Hospitality and Tourism Management' }
  ],
  lyceumBotolan: [
    { value: 'business', label: 'Business Administration' },
    { value: 'comtech', label: 'Computer Studies' },
    { value: 'education', label: 'Education' },
    { value: 'hospitality', label: 'Hospitality Management' }
  ]
};

// Populate dropdown based on campus from URL
const selectedCampus = params.get("college") || document.getElementById("collegeSelect")?.value;

const courseSelect = document.getElementById("courseSelect");
if (courseSelect && campusDepartments[selectedCampus]) {
  // Keep the "Select Department..." option
  courseSelect.innerHTML = '<option value="">NONE...</option>';
  
  // Add campus-specific departments
  campusDepartments[selectedCampus].forEach(dept => {
    const option = document.createElement("option");
    option.value = dept.value;
    option.textContent = dept.label;
    courseSelect.appendChild(option);
  });
}

// Also update when college dropdown changes (for edit mode)
const collegeSelect = document.getElementById("collegeSelect");
if (collegeSelect) {
  collegeSelect.addEventListener("change", function() {
    const newCampus = this.value;
    if (courseSelect && campusDepartments[newCampus]) {
      courseSelect.innerHTML = '<option value="">Select Department...</option>';
      campusDepartments[newCampus].forEach(dept => {
        const option = document.createElement("option");
        option.value = dept.value;
        option.textContent = dept.label;
        courseSelect.appendChild(option);
      });
    }
  });
}

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

    // Load course if exists
    const courseSelect = document.getElementById("courseSelect");
    if (courseSelect && editPost.course) {
      courseSelect.value = editPost.course;
    }
  }
}

// =========================
// TOAST NOTIFICATION SYSTEM
// =========================

function showToast(message, type = 'loading') {
  const container = document.getElementById('toastContainer');
  const toast = document.getElementById('toast');
  const text = document.getElementById('toastText');
  
  text.textContent = message;
  
  toast.className = 'toast';
  container.classList.remove('visible');
  
  if (type === 'loading' || type === 'publishing') {
    toast.classList.add('publishing');
  } else if (type === 'success') {
    toast.classList.add('success');
  } else if (type === 'error') {
    toast.classList.add('error');
  }
  
  requestAnimationFrame(() => {
    container.classList.add('visible');
  });
}

function hideToast() {
  const container = document.getElementById('toastContainer');
  container.classList.remove('visible');
}

function showSuccessThenRedirect(message, college) {
  showToast(message, 'success');
  
  setTimeout(() => {
    hideToast();
    setTimeout(() => {
      window.location.href = `NEWS.html?college=${college}`;
    }, 200);
  }, 1200);
}

function showError(message) {
  showToast(message, 'error');
  setTimeout(hideToast, 3000);
}

// Insert image with LIMITED SIZE
function insertImage(input) {
  if (!input.files || !input.files[0]) return;
  
  const file = input.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const imgData = e.target.result;
    const editor = document.getElementById('editor');
    
    const img = document.createElement('img');
    img.src = imgData;
    img.style.maxWidth = '500px';
    img.style.maxHeight = '500px';
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';
    img.style.margin = '10px 0';
    img.style.display = 'block';
    img.dataset.filename = file.name;
    
    insertNodeAtCursor(img);
    
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

function setupEditorImageHandler() {
  const editor = document.getElementById('editor');
  const deleteBtn = document.getElementById('deleteImgBtn');
  
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
      if (selectedImage) {
        selectedImage.classList.remove('selected');
        selectedImage = null;
        deleteBtn.style.display = 'none';
      }
    }
  });
  
  editor.addEventListener('dblclick', function(e) {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      openImagePreview(e.target.src);
    }
  });
  
  editor.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      
      if (confirm('Delete this image?')) {
        e.target.parentNode.removeChild(e.target);
        selectedImage = null;
        deleteBtn.style.display = 'none';
      }
    }
  });
  
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
  const selectedCourse = document.getElementById("courseSelect").value;
  const title = document.getElementById('title').value;
  const content = document.getElementById('editor').innerHTML;
  const bannerInput = document.getElementById('banner');

  if (!title || !content) {
    showError('Please fill in title and content');
    return;
  }

  showToast(editPost ? 'Updating post...' : 'Publishing post...', 'publishing');

  if (editPost) {
    const updates = {
      college: selectedCollege,
      course: selectedCourse,
      title: title,
      content: content,
      date: new Date().toLocaleString()
    };

    if (bannerInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = async function () {
        updates.banner = reader.result;
        await updatePost(editPost.id, updates, selectedCollege);
      };
      reader.readAsDataURL(bannerInput.files[0]);
    } else {
      await updatePost(editPost.id, updates, selectedCollege);
    }
  } else {
    const post = {
      college: selectedCollege,
      course: selectedCourse,
      title: title,
      content: content,
      banner: null,
      date: new Date().toLocaleString()
    };

    if (bannerInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = async function () {
        post.banner = reader.result;
        await insertPost(post, selectedCollege);
      };
      reader.readAsDataURL(bannerInput.files[0]);
    } else {
      await insertPost(post, selectedCollege);
    }
  }
}

async function insertPost(post, college) {
  try {
    const { data, error } = await db
      .from("posts")
      .insert([post])
      .select();

    if (error) {
      console.error("Error creating post:", error);
      showError("Error creating post: " + error.message);
      return;
    }

    showSuccessThenRedirect('Post published successfully!', college);
  } catch (err) {
    console.error("Exception creating post:", err);
    showError("Error creating post: " + err.message);
  }
}

async function updatePost(id, updates, college) {
  try {
    const { data, error } = await db
      .from("posts")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating post:", error);
      showError("Error updating post: " + error.message);
      return;
    }

    showSuccessThenRedirect('Post updated successfully!', college);
  } catch (err) {
    console.error("Exception updating post:", err);
    showError("Error updating post: " + err.message);
  }
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