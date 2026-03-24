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
      .toast.success::before { content: ":)"; font-size: 20px; font-weight: bold; }
      .toast.error {
        background: #ff6b6b;
      }
      .toast.error .toast-spinner { display: none; }
      .toast.error::before { content: "x"; font-size: 18px; font-weight: bold; }
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

// =========================
// IMAGE OVERLAY FUNCTIONS
// =========================

function openImageOverlay(src) {
  const overlay = document.getElementById('imageOverlay');
  const fullImage = document.getElementById('fullImage');
  
  fullImage.src = src;
  overlay.classList.remove('closing');
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeImageOverlay() {
  const overlay = document.getElementById('imageOverlay');
  const fullImage = document.getElementById('fullImage');
  
  overlay.classList.add('closing');
  overlay.classList.remove('visible');
  
  setTimeout(() => {
    overlay.classList.remove('closing');
    fullImage.src = '';
    document.body.style.overflow = '';
  }, 350);
}

// Close on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('imageOverlay');
    if (overlay && overlay.classList.contains('visible')) {
      closeImageOverlay();
    }
  }
});

// =========================
// POST LOADING
// =========================

async function loadPost() {
  // Show loading spinner initially (already in HTML)
  const startTime = Date.now();
  const MIN_LOADING_TIME = 600; // Minimum time to show spinner

  try {
    const { data: post, error } = await db
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

    if (error || !post) {
      setTimeout(() => {
        renderError("Post not found");
      }, remaining);
      return;
    }

    // Wait minimum time then render
    setTimeout(() => {
      renderPost(post);
    }, remaining);

  } catch (err) {
    console.error("Error loading post:", err);
    renderError("Error loading post. Please try again.");
  }
}

function renderPost(post) {
  const adminButtons = isAdmin ? `
    <button onclick="editPost(${post.id})">Edit Post</button>
    <button onclick="deletePost(${post.id})">Delete Post</button>
  ` : '';
  
  // Banner with click to view full size
  const bannerHtml = post.banner ? 
    `<img src="${post.banner}" class="post-banner" onclick="openImageOverlay('${post.banner}')" title="Click to view full size">` : 
    "";

  // Format course name for display
  const courseDisplay = post.course ? formatCourseName(post.course) : '';
  const dateDisplay = post.date + (courseDisplay ? ' | ' + courseDisplay : '');

  // Process content - fix image inline styles
  let processedContent = post.content;
  
  // Remove inline width/height styles from images
  processedContent = processedContent.replace(
    /<img([^>]+)style=["'][^"']*["']([^>]*)>/gi,
    '<img$1$2>'
  );
  
  // Add class to all content images
  processedContent = processedContent.replace(
    /<img(?![^>]*class=["']post-banner["'])([^>]*)>/gi,
    '<img class="content-img"$1>'
  );

  container.innerHTML = `
    ${bannerHtml}
    <h2>${post.title}</h2>
    <small class="post-date">${dateDisplay}</small>
    <div class="post-content">${processedContent}</div>
    ${adminButtons}
  `;
}

// Helper function to format course code to readable name
function formatCourseName(courseCode) {
  const courseNames = {
    'comtech': 'Communication & Information Technology',
    'indtech': 'Industrial Technology',
    'education': 'Education',
    'business': 'Business Administration',
    'nursing': 'Nursing',
    'arts': 'Arts & Sciences',
    'engineering': 'Engineering',
    'agri': 'Agriculture & Forestry',
    'hospitality': 'Hospitality Management',
    'criminology': 'Criminology',
    'midwifery': 'Midwifery',
    'fisheries': 'Fisheries',
    'it-voc': 'IT (Vocational)',
    'comp-tech': 'Computer Technician',
    'architecture': 'Architecture'
  };
  return courseNames[courseCode] || courseCode;
}

function renderError(message) {
  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <h2>Error</h2>
      <p>${message}</p>
      <button onclick="window.history.back()">Go Back</button>
    </div>
  `;
}

function updatePostUI(user, admin) {
  // Re-render to show/hide admin buttons
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
