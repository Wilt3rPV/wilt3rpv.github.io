let bannerInput = null;
let preview = null;
let collegeFromUrl = null;

const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

// Remove: let posts = JSON.parse(localStorage.getItem("posts")) || [];
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

  // Handle edit mode - fetch from Supabase
  if (editId) {
    await loadEditPost(editId, preview);
  }
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
    // Update existing post
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
    // Create new post
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

// Text editor functions remain the same
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