package router

import (
	"embed"
	"io/fs"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"moontv/internal/auth"
	"moontv/internal/handler"
	"moontv/internal/middleware"
)

// SetupRouter configures the Gin engine with all middleware and routes.
// staticFiles is the embedded web/dist directory served as the SPA.
func SetupRouter(db *gorm.DB, staticFiles embed.FS) *gin.Engine {
	r := gin.New()

	r.Use(middleware.Logger())
	r.Use(middleware.Recovery())
	r.Use(middleware.CORS())
	r.Use(middleware.TrustedNetwork(db))

	authRequired := auth.Required(db)
	authAdmin := auth.AdminRequired(db)
	authOwner := auth.OwnerRequired(db)

	api := r.Group("/api")

	handler.RegisterMisc(api, db, authRequired, authAdmin)

	handler.RegisterAuth(api, db)
	handler.RegisterAuthOIDC(api.Group("/auth/oidc"), db)
	handler.RegisterTelegram(api.Group("/telegram"), db)

	handler.RegisterPlayRecord(api.Group("", authRequired), db)
	handler.RegisterFavorite(api.Group("", authRequired), db)
	handler.RegisterSkipConfig(api.Group("", authRequired), db)
	handler.RegisterSearchHistory(api.Group("", authRequired), db)
	handler.RegisterUser(api, db, authRequired, authAdmin)

	handler.RegisterSearch(api.Group("", authRequired), db)
	handler.RegisterDetail(api.Group("", authRequired), db)
	handler.RegisterSourceBrowser(api.Group("/source-browser", authRequired), db)
	handler.RegisterSourceTest(api.Group("/source-test", authRequired), db)

	handler.RegisterDouban(api.Group("/douban", authRequired), db)
	handler.RegisterTMDB(api.Group("/tmdb", authRequired), db)

	// Proxy handlers intentionally require no auth, matching the original app behaviour.
	handler.RegisterProxy(api.Group("/proxy"), db)
	handler.RegisterImageProxy(api, db)
	handler.RegisterVideoProxy(api, db)
	handler.RegisterVideoCache(api.Group("/video-cache", authAdmin), db)

	handler.RegisterLive(api.Group("/live"), db, authRequired)

	handler.RegisterEmby(api.Group("/emby"), db, authRequired, authAdmin)

	handler.RegisterShortDrama(api.Group("/shortdrama", authRequired), db)
	handler.RegisterACG(api.Group("/acg", authRequired), db)

	// TVBox endpoint requires no auth to support legacy set-top box clients.
	handler.RegisterTVBox(api, db)

	handler.RegisterYouTube(api.Group("", authRequired), db)
	handler.RegisterNetdisk(api.Group("", authRequired), db)

	handler.RegisterAIRecommend(api, db, authRequired, authAdmin)

	// Watch room requires no auth to allow guest viewers.
	handler.RegisterWatchRoom(api.Group("/watch-room"), db)

	handler.RegisterDanmu(api.Group("/danmu-external", authRequired), db)

	// Cron endpoint requires no auth; called by an internal scheduler or cron job.
	handler.RegisterCron(api, db)

	handler.RegisterReleaseCalendar(api, db, authRequired, authAdmin)

	adminGroup := api.Group("/admin", authAdmin)
	handler.RegisterAdmin(adminGroup, db)
	handler.RegisterAdminUser(adminGroup, db, authOwner)
	handler.RegisterAdminSource(adminGroup, db)
	handler.RegisterAdminEmby(adminGroup, db)
	handler.RegisterAdminLive(adminGroup, db)
	handler.RegisterAdminMisc(adminGroup, db, authOwner)

	sub, err := fs.Sub(staticFiles, "web/dist")
	if err != nil {
		panic("router: failed to open embedded web/dist: " + err.Error())
	}
	hfs := http.FS(sub)
	fileServer := http.FileServer(hfs)

	r.NoRoute(func(c *gin.Context) {
		// Serve real static assets directly; fall back to index.html for SPA routes.
		if _, err := fs.Stat(sub, c.Request.URL.Path[1:]); err == nil {
			fileServer.ServeHTTP(c.Writer, c.Request)
			return
		}
		c.FileFromFS("index.html", hfs)
	})

	return r
}
