const params = new URLSearchParams(window.location.search);
const selectedCollege = params.get("college");

const container = document.getElementById('news-container');

let allPosts = [];
let filteredPosts = [];

const calendarRowsEl = document.getElementById("calendarRows");
const addBtn = document.getElementById("addCalendarRowBtn");

// =========================
// TOAST NOTIFICATION SYSTEM
// =========================

function showToast(message, type = 'loading') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.getElementById('toast');
  const text = document.getElementById('toastText');

  text.textContent = message;

  toast.className = 'toast';
  container.classList.remove('visible');

  if (type === 'loading' || type === 'deleting') {
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
  if (container) {
    container.classList.remove('visible');
  }
}

function showError(message) {
  showToast(message, 'error');
  setTimeout(hideToast, 3000);
}

const themes = {
  prmsuIba: {
    name: "President Ramon Magsaysay State University - Iba Campus",
    bg1: "#ffbb29",
    bg2: "#4f30fc",
    divider_top: "#4b75fd",
    divider_bottom: "#ffd829"
  },
  macsatIba: {
    name: "Mirco Asia College of Science And Technology - Iba Campus",
    bg1: "#165f14",
    bg2: "#0e3f12",
    divider_top: "#169c33",
    divider_bottom: "#57ff48"
  },
  ccGapo: {
    name: "Columban College - Olongapo Campus",
    bg1: "#5973c7",
    bg2: "#dddb4b",
    divider_top: "#7797ff",
    divider_bottom: "#f2ff7e"
  },
  ccCruz: {
    name: "Collumban College - Sta. Cruz Campus",
    bg1: "#4062d1",
    bg2: "#c3c5a0",
    divider_top: "#6580d8",
    divider_bottom: "#dcdfc1"
  },
  prmsuMan: {
    name: "President Ramon Magsaysay State University - Masinloc Campus",
    bg1: "#979797",
    bg2: "#524a4a",
    divider_top: "#797979",
    divider_bottom: "#555555"
  },
  prmsuBotolan: {
    name: "President Ramon Magsaysay State University - Botolan Campus",
    bg1: "#aa4646",
    bg2: "#942525",
    divider_top: "#961313",
    divider_bottom: "#942525"
  },
  lyceumBotolan: {
    name: "Lyceum Of Western Luzon - Iba Campus",
    bg1: "#165f14",
    bg2: "#0e3f12",
    divider_top: "#169c33",
    divider_bottom: "#57ff48"
  },
};

const theme = themes[selectedCollege];
if (theme) {
  document.getElementById("collegeName").textContent = theme.name;
  document.documentElement.style.setProperty("--bg1", theme.bg1);
  document.documentElement.style.setProperty("--bg2", theme.bg2);
  document.documentElement.style.setProperty("--divider_top", theme.divider_top);
  document.documentElement.style.setProperty("--divider_bottom", theme.divider_bottom);
}

// Show loading spinner immediately on page load
showPageLoading();

document.addEventListener("DOMContentLoaded", async () => {
  await fetchPosts();
  await renderCalendar();
});

// =========================
// PAGE LOADING SPINNER
// =========================

function showPageLoading() {
  if (!container) return;
  
  container.innerHTML = `
    <div class="page-loading" id="pageLoading">
      <div class="post-spinner"></div>
      <div class="post-loading-text">Loading news...</div>
    </div>
  `;
}

// Minimum time to show loading spinner (ms)
const MIN_LOADING_TIME = 800;

// =========================
// POSTS (Supabase)
// =========================

async function fetchPosts() {
  const startTime = Date.now();
  
  let query = db.from("posts").select("*").order('id', { ascending: false });
  
  if (selectedCollege) {
    query = query.eq("college", selectedCollege);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching posts:", error);
    if (container) {
      container.innerHTML = `
        <div class="page-error">
          <p>Error loading posts. Please refresh the page.</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }
    return;
  }

  allPosts = data || [];
  filteredPosts = allPosts;
  
  populateYearFilter();
  
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
  
  setTimeout(() => {
    const loading = document.getElementById("pageLoading");
    if (loading) {
      loading.classList.add("fade-out");
      
      setTimeout(() => {
        applyYearFilter();
      }, 220);
    } else {
      applyYearFilter();
    }
  }, remaining);
}

function goCreate() {
  const params = new URLSearchParams(location.search);
  const college = params.get("college");
  window.location.href = `CREATE_POST.html?college=${encodeURIComponent(college)}`;
}

// =========================
// CALENDAR (Supabase)
// =========================

async function loadCalendar() {
  if (!selectedCollege) return [];
  
  const { data, error } = await db
    .from("calendar")
    .select("*")
    .eq("college", selectedCollege)
    .order('id', { ascending: true });

  if (error) {
    console.error("Error loading calendar:", error);
    return [];
  }
  
  return data || [];
}

async function saveCalendarRow(row) {
  if (row.id && typeof row.id === 'number') {
    const { error } = await db
      .from("calendar")
      .update({ date: row.date, label: row.label })
      .eq("id", row.id);
    
    if (error) console.error("Error updating calendar:", error);
  } else {
    const { data, error } = await db
      .from("calendar")
      .insert([{ 
        college: selectedCollege, 
        date: row.date, 
        label: row.label 
      }])
      .select();
    
    if (error) {
      console.error("Error inserting calendar:", error);
    } else {
      row.id = data[0].id;
    }
  }
}

async function deleteCalendarRow(id) {
  const { error } = await db
    .from("calendar")
    .delete()
    .eq("id", id);
  
  if (error) console.error("Error deleting calendar row:", error);
}

async function renderCalendar() {
  const rows = await loadCalendar();
  calendarRowsEl.innerHTML = "";

  if (rows.length === 0) {
    calendarRowsEl.innerHTML = `<div style="opacity:.75;">Empty.</div>`;
    return;
  }

  rows.forEach((row) => {
    const div = document.createElement("div");
    div.className = "calendar-row";
    div.innerHTML = `
      <input type="text" value="${escapeHtml(row.date)}" placeholder="Date (e.g. Mar 10)" data-field="date" data-id="${row.id}">
      <input type="text" value="${escapeHtml(row.label)}" placeholder="Event (e.g. Start of classes)" data-field="label" data-id="${row.id}">
      <button class="remove" title="Remove" data-remove="${row.id}">X</button>
    `;
    calendarRowsEl.appendChild(div);
  });
}

if (addBtn) {
  addBtn.addEventListener("click", async () => {
    const newRow = { college: selectedCollege, date: "", label: "" };
    const { data, error } = await db
      .from("calendar")
      .insert([newRow])
      .select();
    
    if (error) {
      console.error("Error adding calendar row:", error);
      return;
    }
    
    await renderCalendar();
  });
}

if (calendarRowsEl) {
  calendarRowsEl.addEventListener("input", async (e) => {
    const id = Number(e.target.dataset.id);
    const field = e.target.dataset.field;
    if (!id || !field) return;

    const rows = await loadCalendar();
    const row = rows.find(r => r.id === id);
    if (!row) return;

    row[field] = e.target.value;
    await saveCalendarRow(row);
  });

  calendarRowsEl.addEventListener("click", async (e) => {
    const removeId = Number(e.target.dataset.remove);
    if (!removeId) return;

    await deleteCalendarRow(removeId);
    await renderCalendar();
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =========================
// POST MODAL - INSTANT OPEN
// =========================

function openPost(postId) {
  if (window.innerWidth <= 768) {
    window.location.href = `post.html?id=${postId}`;
  } else {
    showPostModal(postId);
  }
}

async function showPostModal(postId) {
  const modal = document.getElementById("postModal");
  const content = document.getElementById("postModalContent");

  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
  modal.classList.remove("hidden", "closing");
  modal.classList.add("show");

  content.innerHTML = `
    <div class="post-loading" id="postLoading">
      <div class="post-spinner"></div>
      <div class="post-loading-text">Loading post...</div>
    </div>
  `;

  const startTime = Date.now();

  try {
    const { data: post, error } = await db
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

    if (error || !post) {
      setTimeout(() => {
        content.innerHTML = `
          <div class="post-loaded">
            <h2>Error</h2>
            <p>Could not load post. Please try again.</p>
            <button onclick="closePostModal()">Close</button>
          </div>
        `;
      }, remaining);
      return;
    }

    setTimeout(() => {
      const loading = document.getElementById("postLoading");
      if (loading) {
        loading.classList.add("fade-out");
        
        setTimeout(() => {
          const adminButtons = isAdmin ? `
            <button onclick="editPost(${post.id})">Edit Post</button>
            <button onclick="deletePost(${post.id})">Delete Post</button>
          ` : '';
          
          const bannerHtml = post.banner ? 
            `<img src="${post.banner}" class="post-banner clickable" onclick="openImageOverlay('${post.banner}')" title="Click to view full size">` : 
            "";
          
          content.innerHTML = `
            <div class="post-loaded">
              ${bannerHtml}
              <h2>${post.title}</h2>
              <small class="post-date">${post.date}</small>
              <p>${post.content.replace(/\n/g, "<br>")}</p>
              ${adminButtons}
            </div>
          `;
        }, 220);
      }
    }, remaining);

  } catch (err) {
    console.error("Error loading post:", err);
    content.innerHTML = `
      <div class="post-loaded">
        <h2>Error</h2>
        <p>Something went wrong. Please try again.</p>
        <button onclick="closePostModal()">Close</button>
      </div>
    `;
  }
}

async function deletePost(id) {
  if (!isAdmin) {
    showError('Admin access required');
    return;
  }
  
  customModal("Are you sure you want to delete this post?", true, async (result) => {
    if (!result) return;

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
      
      closePostModal();
      await fetchPosts();
      
      setTimeout(hideToast, 1500);
      
    } catch (err) {
      console.error("Exception deleting post:", err);
      showError("Error deleting post: " + err.message);
    }
  });
}

function closePostModal() {
  const modal = document.getElementById("postModal");
  modal.classList.add("closing");
  
  setTimeout(() => {
    modal.classList.remove("show", "closing");
    modal.classList.add("hidden");
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
  }, 220);
}

function editPost(id) {
  window.location.href = `CREATE_POST.html?edit=${id}`;
}

// =========================
// SEARCH & FILTER
// =========================

const searchInput = document.getElementById("searchInput");
const yearFilter = document.getElementById("yearFilter");
const paginationContainer = document.getElementById("pagination");

const POSTS_PER_PAGE = 10;
let currentPage = 1;

function getPostYear(post) {
  if (post.year) return post.year;
  const date = new Date(post.date);
  return date.getFullYear();
}

function populateYearFilter() {
  if (!yearFilter) return;

  yearFilter.innerHTML = '<option value="all">All</option>';
  
  const years = [...new Set(
    allPosts.map(post => getPostYear(post)).filter(year => !isNaN(year))
  )].sort((a, b) => b - a);

  years.forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });
}

function renderPosts(postsToRender) {
  container.innerHTML = "";
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;
  const paginatedPosts = postsToRender.slice(start, end);

  paginatedPosts.forEach((post, index) => {
    const card = document.createElement("div");
    card.className = "news-card";
    
    // Reset animation
    card.style.animation = 'none';
    
    if (post.banner) {
      card.style.backgroundImage = `url(${post.banner})`;
    }
    card.innerHTML = `
      <div class="news-overlay">
        <div class="news-title">${post.title}</div>
      </div>
    `;
    card.onclick = () => openPost(post.id);
    container.appendChild(card);
    
    // Trigger animation with cubic-bezier
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.animation = `cardLoadIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`;
        card.style.animationDelay = `${(index + 1) * 0.05}s`;
      });
    });
  });

  renderPagination(postsToRender);
}

function renderPagination(postsToRender) {
  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(postsToRender.length / POSTS_PER_PAGE);
  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "<";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    currentPage--;
    applyYearFilter();
  };
  paginationContainer.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.textContent = i;
    if (i === currentPage) {
      pageBtn.classList.add("active");
      pageBtn.disabled = true;
    }
    pageBtn.onclick = () => {
      currentPage = i;
      applyYearFilter();
    };
    paginationContainer.appendChild(pageBtn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = ">";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    currentPage++;
    applyYearFilter();
  };
  paginationContainer.appendChild(nextBtn);
}

function applyYearFilter() {
  const selectedYear = yearFilter ? yearFilter.value : "all";
  const searchText = searchInput ? searchInput.value.trim().toLowerCase() : "";

  let finalPosts = allPosts;

  if (selectedYear !== "all") {
    finalPosts = finalPosts.filter(post => String(getPostYear(post)) === selectedYear);
  }

  if (searchText !== "") {
    finalPosts = finalPosts.filter(post =>
      String(post.title || "").toLowerCase().includes(searchText)
    );
  }

  filteredPosts = finalPosts;
  
  const totalPages = Math.ceil(finalPosts.length / POSTS_PER_PAGE);
  if (totalPages === 0) {
    currentPage = 1;
  } else if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  renderPosts(finalPosts);
}

if (yearFilter) {
  yearFilter.addEventListener("change", () => {
    currentPage = 1;
    applyYearFilter();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    applyYearFilter();
  });
}

// =========================
// CUSTOM MODAL
// =========================

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