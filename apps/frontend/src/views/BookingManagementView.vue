<script setup>
import { computed, ref } from 'vue'
import BookingPages from './BookingPages.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const pages = [
  ['index-checkout', 'Checkout planner', 'Plan turnovers, assign cleaners and track payments.', '01'],
  ['index-bookings', 'Bookings', 'Review guest details and manage reservations.', '02'],
  ['index-cleaner', 'Cleaners', 'View your team, cleaning sessions and costs.', '03'],
  ['index-listing-metadata', 'Listing directory', 'Connect listing names, room numbers and properties.', '04'],
  ['index-upload', 'Import bookings', 'Import one or more booking CSV exports.', '05'],
  ['index-documents', 'Documents', 'Combine PDF documents into one download.', '06'],
  ['booking-database', 'Database & backups', 'Download a snapshot or restore a booking database.', '07'],
]
const current = computed(() => pages.find(p => route.path === '/' + p[0]))
const file = ref(null), busy = ref(false), error = ref(''), success = ref(''), confirm = ref(false)
async function replaceDatabase() {
  if (!file.value || !confirm.value || busy.value) return
  busy.value = true; error.value = ''; success.value = ''
  try {
    const data = new FormData(); data.append('file', file.value)
    const response = await fetch('/api/booking/database/upload', { method: 'POST', body: data })
    const result = await response.json()
    if (!response.ok) throw new Error(result.detail || 'Database replacement failed')
    success.value = `${result.message}. Previous database saved as ${result.backup}.`
    confirm.value = false
  } catch (e) { error.value = e.message } finally { busy.value = false }
}
</script>
<template>
  <div class="booking-app">
    <aside class="booking-sidebar">
      <RouterLink to="/private-booking-management" class="booking-brand"><span class="brand-mark">b.</span> Staydesk<span class="brand-sub">PROPERTY OPERATIONS</span></RouterLink>
      <div class="workspace-label">YOUR WORKSPACE</div>
      <RouterLink to="/private-booking-management" class="workspace-link" :class="{ selected: !current }">▦ &nbsp; Overview</RouterLink>
      <RouterLink v-for="p in pages" :key="p[0]" :to="'/' + p[0]" class="workspace-link" :class="{ selected: current?.[0] === p[0] }"><span class="nav-number">{{ p[3] }}</span>{{ p[1] }}</RouterLink>
      <div class="sidebar-footer"><span class="status-dot"></span> SQLite storage<small>Your booking workspace</small><RouterLink to="/">← Back to home</RouterLink></div>
    </aside>
    <main class="booking-main">
      <header class="booking-topbar"><span>Workspace <span class="crumb">/</span> {{ current?.[1] || 'Overview' }}</span><RouterLink to="/private-booking-management">Booking management ↗</RouterLink></header>
      <template v-if="!current">
        <section class="booking-intro"><span class="eyebrow">YOUR OPERATIONS, TOGETHER</span><h1>A little more organised.<br>A lot more welcoming.</h1><p>Every stay, every turnover, every detail. Choose a tool to get started.</p><RouterLink class="booking-primary" to="/index-checkout">Open checkout planner <span>↗</span></RouterLink></section>
        <div class="directory-heading"><h2>Your management tools</h2><span>{{ pages.length }} pages in your workspace</span></div>
        <section class="booking-directory"><RouterLink v-for="p in pages" :key="p[0]" :to="'/' + p[0]" class="booking-card"><span class="card-index">{{ p[3] }} <span>↗</span></span><h3>{{ p[1] }}</h3><p>{{ p[2] }}</p><span class="card-path">/{{ p[0] }}</span></RouterLink></section>
      </template>
      <section v-else-if="current[0] === 'booking-database'" class="database-page">
        <span class="eyebrow">WORKSPACE STORAGE</span><h1>Database & backups</h1><p>Keep a copy of your booking data, or restore an existing SQLite database.</p>
        <article class="database-panel"><h2>Download a snapshot</h2><p>Download a consistent copy of all booking data, including cleaners, sessions, listings and users.</p><a class="booking-primary" href="/api/booking/database/download">Download SQLite database ↓</a></article>
        <article class="database-panel"><h2>Replace booking database</h2><p>This replaces all booking data. The server validates the file and saves a backup of the current database before replacing it. The learning app database is separate.</p><form @submit.prevent="replaceDatabase"><label for="booking-db-file">SQLite database (up to 256 MiB)</label><input id="booking-db-file" type="file" accept=".db,.sqlite,.sqlite3" required @change="file = $event.target.files[0]; confirm = false"><label class="restore-confirm"><input v-model="confirm" type="checkbox"> I want to replace the current booking database with this file.</label><button class="booking-primary" :disabled="!file || !confirm || busy">{{ busy ? 'Validating and replacing…' : 'Replace database' }}</button></form><p v-if="error" class="database-error" role="alert">{{ error }}</p><p v-if="success" role="status">{{ success }}</p></article>
      </section>
      <BookingPages v-else :key="current[0]" :page="current[0]" />
    </main>
  </div>
</template>
<style scoped>
.booking-app{--ink:#193d37;--muted:#6a7b75;display:flex;min-height:100vh;background:#f5f7f4;color:var(--ink);font:15px/1.6 'Inter',system-ui,sans-serif}.booking-app *{box-sizing:border-box}.booking-app a{text-decoration:none;color:inherit}.booking-sidebar{width:246px;flex-shrink:0;background:#fff;border-right:1px solid #dfe6df;padding:35px 22px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh}.booking-brand{font-size:26px;font-weight:750;letter-spacing:-1px;padding:0 10px 38px;line-height:1.3}.brand-mark{display:inline-block;background:#1d5245;color:#fff;border-radius:10px;padding:0 9px;margin-right:8px}.brand-sub{display:block;font-size:9px;letter-spacing:2px;color:#83918b;margin:12px 0 0 4px}.workspace-label{font-size:10px;letter-spacing:1.7px;color:#8a958e;padding:12px}.workspace-link{display:block;padding:12px;border-radius:7px;margin:3px 0;font-size:13px;font-weight:550}.workspace-link:hover{background:#f5f7f3}.workspace-link.selected{background:#eaf1e7;color:#24583e}.nav-number{color:#8b9c91;margin-right:13px;font-size:10px}.sidebar-footer{margin-top:auto;padding:25px 10px 0;font-size:12px;color:#6a7b75}.sidebar-footer small{display:block;margin:3px 0 18px}.status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#6a9670;margin-right:6px}.booking-main{min-width:0;flex:1}.booking-topbar{height:76px;border-bottom:1px solid #e0e6df;display:flex;justify-content:space-between;align-items:center;padding:0 42px;font-size:12px;color:#64776c;background:#fff}.crumb{margin:0 14px;color:#bdc5bc}.booking-topbar a{font-size:11px}.booking-intro{margin:42px 42px 35px;padding:42px;background:#e8eee2;border:1px solid #dbe4d2;border-radius:12px;background-image:radial-gradient(ellipse at 100% 100%,#ceddc9,transparent 55%)}.eyebrow{font-size:10px;letter-spacing:2px;font-weight:750;color:#6e806a}.booking-app h1{font-family:Georgia,serif;font-weight:400;font-size:44px;letter-spacing:-1.4px;line-height:1.15;margin:18px 0}.booking-intro p{color:#6a7b69;font-size:14px;margin:20px 0 28px}.booking-primary{display:inline-flex;gap:26px;align-items:center;padding:12px 20px;background:#234e3f;color:white!important;border:0;border-radius:6px;font:600 12px/1.5 system-ui;cursor:pointer}.booking-primary:disabled{opacity:.45;cursor:default}.directory-heading{display:flex;justify-content:space-between;align-items:center;margin:0 42px 18px}.directory-heading h2{font-size:18px;font-weight:550}.directory-heading>span{font-size:11px;color:#89958c}.booking-directory{margin:0 42px 45px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.booking-card{display:block;background:#fff;border:1px solid #e0e6dd;border-radius:10px;padding:24px;transition:transform .15s,border-color .15s}.booking-card:hover{transform:translateY(-3px);border-color:#8aa382}.card-index{display:flex;justify-content:space-between;font-size:11px;color:#90a18c}.card-index>span{font-size:20px;color:#52734a}.booking-card h3{font-size:16px;font-weight:600;margin:22px 0 8px}.booking-card p{font-size:12px;color:#7b897e;min-height:40px}.card-path{display:block;border-top:1px solid #edf0e9;margin-top:24px;padding-top:14px;font-size:10px;color:#93a08e}.booking-page-frame{display:block;border:0;width:100%;height:calc(100vh - 76px);background:#f5f7f4}.database-page{padding:42px;max-width:1000px}.database-page>p,.database-panel p{color:#6a7b75}.database-panel{padding:28px;background:white;border:1px solid #dfe6df;border-radius:10px;margin:24px 0}.database-panel h2{margin-top:0;font-size:19px}.database-panel label{display:block;margin:16px 0;font-size:13px}.database-panel input[type=file]{display:block;max-width:100%}.database-error{color:#a23030!important}@media(max-width:1050px){.booking-directory{grid-template-columns:repeat(2,minmax(0,1fr))}.booking-sidebar{width:210px}}@media(max-width:700px){.booking-app{display:block}.booking-sidebar{position:static;height:auto;width:100%;padding:18px;display:block}.booking-brand{display:block;padding:0 0 10px}.brand-sub,.workspace-label,.sidebar-footer{display:none}.workspace-link{display:inline-block;padding:8px;font-size:11px}.nav-number{display:none}.booking-topbar{height:55px;padding:0 20px}.booking-intro{margin:20px;padding:25px}.booking-app h1{font-size:34px}.directory-heading{margin:0 20px 16px}.directory-heading>span{display:none}.booking-directory{margin:0 20px 30px;grid-template-columns:1fr}.booking-page-frame{height:80vh}.database-page{padding:22px}}
</style>
