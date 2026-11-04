import { createApp } from 'vue'
import App from './App.vue'
//createApp(App).mount('#app')
const app = createApp(App)
const app1 = createApp({
    data(){
        return {
            count:0
        }
    }
})
app1.mount('#app')
