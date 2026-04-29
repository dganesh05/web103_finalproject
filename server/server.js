import express from 'express'
import path from 'path'
import dotenv from 'dotenv'
import cors from 'cors'
import userRoutes from './routes/users.js'
import catsRoutes  from './routes/cats.js'
import profilesRoutes from './routes/pomodoroProfiles.js'
import shopItemsRoutes from './routes/shopItems.js'
import inventoryRoutes from './routes/inventory.js'
import sessionsRoutes from './routes/studySessions.js'
import tasksRoutes from './routes/tasks.js'
import { getFirebaseAdminAuth } from './config/firebaseAdmin.js'
import { initializeDatabase } from './config/initialize.js'

// import the router from your routes file


dotenv.config()

const app = express()

const firebaseAdminStartupHealth = {
    ok: false,
    checkedAt: null,
    error: null,
}

const checkFirebaseAdminHealth = async () => {
    const checkedAt = new Date().toISOString()

    try {
        const adminAuth = getFirebaseAdminAuth()
        await adminAuth.listUsers(1)

        firebaseAdminStartupHealth.ok = true
        firebaseAdminStartupHealth.error = null
        firebaseAdminStartupHealth.checkedAt = checkedAt
        return { ok: true, checkedAt, error: null }
    } catch (err) {
        firebaseAdminStartupHealth.ok = false
        firebaseAdminStartupHealth.error = err.message
        firebaseAdminStartupHealth.checkedAt = checkedAt
        return { ok: false, checkedAt, error: err.message }
    }
}

const createTraceId = () => `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`

app.use((req, res, next) => {
    const incomingTraceId = req.get('x-trace-id')
    const traceId = incomingTraceId || createTraceId()

    req.traceId = traceId
    res.setHeader('x-trace-id', traceId)

    console.log(`[RequestTrace:${traceId}] ${req.method} ${req.url}`)
  next();
});

app.use(express.json())
app.use(cors({
  origin: 'https://client-dydj.onrender.com/' // Replace with your client's URL
}));

app.get('/', (req, res) => {
    res.status(200).send(`
        <h1 style="text-align: center; margin-top: 50px">
        🍅 Pawmodoro API
        </h1>
        `)
    })

app.get('/api/health/firebase-admin', async (req, res) => {
    const health = await checkFirebaseAdminHealth()

    if (!health.ok) {
        return res.status(500).json({
            ok: false,
            service: 'firebase-admin',
            checkedAt: health.checkedAt,
            error: health.error,
        })
    }

    return res.status(200).json({
        ok: true,
        service: 'firebase-admin',
        checkedAt: health.checkedAt,
    })
})

const PORT = process.env.PORT || 3000

// Insert routes here
app.use('/api/users', userRoutes)
app.use('/api/cats', catsRoutes)
app.use('/api/pomodoro_profiles', profilesRoutes)
app.use('/api/shop_items', shopItemsRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/sessions', sessionsRoutes)
app.use('/api/tasks', tasksRoutes)

// Initialize database (create tables and seed data if needed)
await initializeDatabase()

await checkFirebaseAdminHealth()

app.listen(PORT, () => {
    console.log(`🍅 server listening on http://localhost:${PORT}`)

    if (firebaseAdminStartupHealth.ok) {
        console.log('[HealthCheck] Firebase Admin configured correctly')
    } else {
        console.error('[HealthCheck] Firebase Admin configuration check failed', {
            checkedAt: firebaseAdminStartupHealth.checkedAt,
            error: firebaseAdminStartupHealth.error,
        })
    }
})