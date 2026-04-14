import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "./stores/auth";
import PublicLayout from "./layouts/PublicLayout.vue";
import HomeView from "./views/HomeView.vue";
import SearchView from "./views/SearchView.vue";
import ComicDetailView from "./views/ComicDetailView.vue";
import ReaderView from "./views/ReaderView.vue";
import LoginView from "./views/LoginView.vue";
import RegisterView from "./views/RegisterView.vue";
import LibraryView from "./views/LibraryView.vue";
import ProfileView from "./views/ProfileView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: PublicLayout,
      children: [
        { path: "", name: "home", component: HomeView },
        { path: "search", name: "search", component: SearchView },
        { path: "comic/:slug", name: "comic-detail", component: ComicDetailView },
        { path: "read/:comicSlug/:chapterSlug", name: "reader", component: ReaderView },
        { path: "library", name: "library", component: LibraryView, meta: { requiresAuth: true } },
        { path: "profile", name: "profile", component: ProfileView, meta: { requiresAuth: true } },
      ],
    },
    { path: "/login", name: "login", component: LoginView, meta: { guestOnly: true } },
    { path: "/register", name: "register", component: RegisterView, meta: { guestOnly: true } },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: "home" };
  }

  return true;
});

export default router;
