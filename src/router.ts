import { createRouter, createWebHistory, type RouteLocationNormalizedLoaded } from "vue-router";
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
import AboutView from "./views/AboutView.vue";
import TranslationRequestView from "./views/TranslationRequestView.vue";
import AdvertisingContactView from "./views/AdvertisingContactView.vue";
import { trackPageView } from "./lib/analytics";
import { updateDocumentSeo } from "./lib/seo";

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    guestOnly?: boolean;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    seoNoindex?: boolean;
  }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to) {
    if (to.hash) {
      return {
        el: to.hash,
        top: 84,
      };
    }

    return {
      top: 0,
      left: 0,
    };
  },
  routes: [
    {
      path: "/",
      component: PublicLayout,
      children: [
        {
          path: "",
          name: "home",
          component: HomeView,
          meta: {
            seoTitle: "Đọc truyện tranh miễn phí mỗi ngày",
            seoDescription: "Truyện Chill cập nhật truyện tranh mới nhất, đọc miễn phí và tìm truyện nhanh theo thể loại.",
            seoKeywords: "đọc truyện tranh, truyện tranh miễn phí, truyện chill",
          },
        },
        {
          path: "search",
          name: "search",
          component: SearchView,
          meta: {
            seoTitle: "Tìm kiếm truyện tranh",
            seoDescription: "Tìm truyện theo tên, tác giả, thể loại, năm phát hành và trạng thái tại Truyện Chill.",
            seoKeywords: "tìm truyện, tìm kiếm truyện tranh, lọc truyện",
            seoNoindex: true,
          },
        },
        {
          path: "about",
          name: "about",
          component: AboutView,
          meta: {
            seoTitle: "Giới thiệu Truyện Chill",
            seoDescription: "Giới thiệu về Truyện Chill - website đọc truyện miễn phí dành cho cộng đồng yêu truyện.",
            seoKeywords: "giới thiệu truyện chill, đọc truyện miễn phí",
          },
        },
        {
          path: "request-translation",
          name: "request-translation",
          component: TranslationRequestView,
          meta: {
            seoTitle: "Yêu cầu dịch truyện",
            seoDescription: "Gửi đề xuất truyện cần dịch để đội ngũ Truyện Chill xem xét và phản hồi.",
            seoKeywords: "yêu cầu dịch truyện, đề xuất truyện",
          },
        },
        {
          path: "advertising-contact",
          name: "advertising-contact",
          component: AdvertisingContactView,
          meta: {
            seoTitle: "Liên hệ quảng cáo",
            seoDescription: "Liên hệ hợp tác quảng cáo và tài trợ với Truyện Chill.",
            seoKeywords: "liên hệ quảng cáo, hợp tác truyền thông",
          },
        },
        {
          path: "comic/:slug",
          name: "comic-detail",
          component: ComicDetailView,
          meta: {
            seoTitle: "Đọc truyện tranh",
            seoDescription: "Đang tải thông tin truyện tại Truyện Chill.",
            seoKeywords: "đọc truyện tranh, chương mới",
          },
        },
        {
          path: "read/:comicSlug/:chapterSlug",
          name: "reader",
          component: ReaderView,
          meta: {
            seoTitle: "Đọc chương truyện",
            seoDescription: "Trình đọc chương truyện trên Truyện Chill.",
            seoNoindex: true,
          },
        },
        {
          path: "library",
          name: "library",
          component: LibraryView,
          meta: {
            requiresAuth: true,
            seoTitle: "Thư viện cá nhân",
            seoDescription: "Lịch sử đọc và danh sách theo dõi của bạn.",
            seoNoindex: true,
          },
        },
        {
          path: "profile",
          name: "profile",
          component: ProfileView,
          meta: {
            requiresAuth: true,
            seoTitle: "Hồ sơ tài khoản",
            seoDescription: "Quản lý thông tin tài khoản của bạn.",
            seoNoindex: true,
          },
        },
      ],
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: {
        guestOnly: true,
        seoTitle: "Đăng nhập",
        seoDescription: "Đăng nhập tài khoản Truyện Chill.",
        seoNoindex: true,
      },
    },
    {
      path: "/register",
      name: "register",
      component: RegisterView,
      meta: {
        guestOnly: true,
        seoTitle: "Đăng ký",
        seoDescription: "Tạo tài khoản Truyện Chill để theo dõi truyện yêu thích.",
        seoNoindex: true,
      },
    },
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

const firstQueryValue = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const resolveTrafficSource = (to: RouteLocationNormalizedLoaded, from: RouteLocationNormalizedLoaded) => {
  const utmSourceRaw = firstQueryValue(to.query.utm_source);
  if (typeof utmSourceRaw === "string" && utmSourceRaw.trim()) {
    return `utm:${utmSourceRaw.trim().slice(0, 80)}`;
  }

  if (from?.name) {
    return "internal";
  }

  if (typeof document !== "undefined" && document.referrer) {
    try {
      return new URL(document.referrer).hostname.toLowerCase();
    } catch {
      return "referrer";
    }
  }

  return "direct";
};

router.afterEach((to, from) => {
  let title = to.meta.seoTitle;
  let description = to.meta.seoDescription;
  let keywords = to.meta.seoKeywords;

  if (to.name === "search") {
    const searchKeyword = typeof to.query.q === "string" ? to.query.q.trim() : "";
    if (searchKeyword) {
      title = `Tìm "${searchKeyword}"`;
      description = `Kết quả tìm kiếm truyện tranh cho từ khóa \"${searchKeyword}\" trên Truyện Chill.`;
      keywords = `${searchKeyword}, tìm truyện tranh, truyện tranh miễn phí`;
    }
  }

  if (to.name === "comic-detail") {
    const slug = typeof to.params.slug === "string" ? to.params.slug.replace(/-/g, " ") : "truyện";
    title = `Đọc ${slug}`;
    description = `Đọc truyện ${slug} miễn phí tại Truyện Chill, cập nhật chương mới liên tục.`;
    keywords = `${slug}, đọc truyện tranh, truyện tranh miễn phí`;
  }

  const structuredData =
    to.name === "home"
      ? {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Truyện Chill",
          url: window.location.origin,
          potentialAction: {
            "@type": "SearchAction",
            target: `${window.location.origin}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }
      : undefined;

  updateDocumentSeo({
    title,
    description,
    keywords,
    path: to.fullPath,
    noindex: Boolean(to.meta.seoNoindex),
    structuredData,
  });

  const internalReferrer = from?.fullPath || undefined;
  const externalReferrer =
    !from?.name && typeof document !== "undefined" ? document.referrer || undefined : undefined;

  // Reader is memory-sensitive on mobile; skip pageview analytics here.
  if (to.name === "reader") {
    return;
  }

  trackPageView({
    pagePath: to.fullPath,
    referrer: internalReferrer || externalReferrer,
    source: resolveTrafficSource(to, from),
    context: String(to.name || "route"),
  });
});

export default router;
