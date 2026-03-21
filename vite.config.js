import { defineConfig } from 'vite'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        team: resolve(__dirname, "team.html"),
        register: resolve(__dirname, "register.html"),
        aboutschool: resolve(__dirname, "about-school.html"),
        login: resolve(__dirname, "login.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        contact: resolve(__dirname, "contact.html"),
        councils: resolve(__dirname, "agendas.html"),
        admin: resolve(__dirname, "admin.html"),
        aboutsymposium: resolve(__dirname, "about-symposium.html"),
        sponsors: resolve(__dirname, "sponsors.html"),
        appraisal: resolve(__dirname, "src/assets/documents/JS2026_Sponsorship_Appraisal.pdf"),
        documents: resolve(__dirname, "guides.html")
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})