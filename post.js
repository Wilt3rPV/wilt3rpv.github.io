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
  // Re-render to show/hide buttons
  loadPost();
}

function editPost(id) {
  window.location.href = `CREATE_POST.html?edit=${id}`;
}

async function deletePost(id) {
  if (!isAdmin) {
    alert('Admin access required');
    return;
  }
  
  const confirmDelete = confirm("Are you sure you want to delete this post?");
  if (!confirmDelete) return;

  const { error } = await db
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Error deleting post: " + error.message);
    return;
  }

  alert('Post deleted!');
  window.history.back();
}