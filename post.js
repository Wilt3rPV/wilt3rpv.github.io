window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    location.reload();
  }
});

const params = new URLSearchParams(window.location.search);
const id = Number(params.get('id'));

const container = document.getElementById("post");

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  await loadPost();
});

// =========================
// TOAST NOTIFICATION SYSTEM
// =========================

function showToast(message, type = 'loading') {
  let container = document.getElementById('toastContainer');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.innerHTML = `
      <div id="toast" class="toast">
        <div class="toast-spinner"></div>
        <span class="toast-text" id="toastText"></span>
      </div>
    `;
    document.body.appendChild(container);
    
    const styles = document.createElement('style');
    styles.textContent = `
      .toast-container {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        z-index: 100003;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
      }
      .toast-container.visible {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      .toast {
        background: #4b5964;
        color: #fff;
        padding: 16px 28px;
        border-radius: 50px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 14px;
        font-size: 15px;
        font-weight: 600;
        min-width: 220px;
        justify-content: center;
      }
      .toast-spinner {
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255,255,255,0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: toastSpin 0.8s linear infinite;
      }
      .toast.success {
        background: #51cf66;
      }
      .toast.success .toast-spinner { display: none; }
      .toast.success::before { content: "✓"; font-size: 20px; font-weight: bold; }
      .toast.error {
        background: #ff6b6b;
      }
      .toast.error .toast-spinner { display: none; }
      .toast.error::before { content: "✕"; font-size: 18px; font-weight: bold; }
      @keyframes toastSpin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      .toast.deleting .toast-text { animation: pulse 1.5s ease-in-out infinite; }
    `;
    document.head.appendChild(styles);
  }
  
  const toast = document.getElementById('toast');
  const text = document.getElementById('toastText');
  
  text.textContent = message;
  
  toast.className = 'toast';
  container.classList.remove('visible');
  
  if (type === 'loading' || type === 'deleting') {
    toast.classList.add('deleting');
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
  if (container) {
    container.classList.remove('visible');
  }
}

function showError(message) {
  showToast(message, 'error');
  setTimeout(hideToast, 3000);
}

async function loadPost() {
  const { data: post, error } = await db
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !post) {
    container.innerHTML = '<h1>Post not found</h1>';
    return;
  }

  renderPost(post);
}

function renderPost(post) {
  const adminButtons = isAdmin ? `
    <button onclick="editPost(${post.id})">Edit Post</button>
    <button onclick="deletePost(${post.id})">Delete Post</button>
  ` : '';
  
  container.innerHTML = `
    ${post.banner ? `<img src="${post.banner}" class="post-banner">` : ""}
    <h2>${post.title}</h2>
    <small class="post-date">${post.date}</small>
    <div>${post.content}</div>
    ${adminButtons}
  `;
}

function updatePostUI(user, admin) {
  loadPost();
}

function editPost(id) {
  window.location.href = `CREATE_POST.html?edit=${id}`;
}

async function deletePost(id) {
  if (!isAdmin) {
    showError('Admin access required');
    return;
  }
  
  const confirmDelete = confirm("Are you sure you want to delete this post?");
  if (!confirmDelete) return;

  showToast('Deleting post...', 'deleting');

  try {
    const { error } = await db
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting post:", error);
      showError("Error deleting post: " + error.message);
      return;
    }

    showToast('Post deleted successfully!', 'success');
    
    setTimeout(() => {
      hideToast();
      window.history.back();
    }, 1200);
    
  } catch (err) {
    console.error("Exception deleting post:", err);
    showError("Error deleting post: " + err.message);
  }
}