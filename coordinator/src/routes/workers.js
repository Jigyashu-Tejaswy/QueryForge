'use strict'

const express          = require('express')
const db               = require('../db')
const { workerRegistry } = require('../grpc/coordinatorServer')

const router = express.Router()

// GET /api/workers — list all registered workers with live status
router.get('/', async (req, res) => {
  try {
    // Merge DB record with live in-memory status
    const dbResult = await db.query('SELECT * FROM workers ORDER BY registered_at')

    const workers = dbResult.rows.map(w => {
      const live = workerRegistry.get(w.id)
      return {
        ...w,
        liveStatus:    live?.status        || 'unknown',
        activeTasks:   live?.activeTasks   || 0,
        lastHeartbeat: live?.lastHeartbeat || null
      }
    })

    res.json(workers)
  } catch (err) {
    console.error('[Route GET /workers] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/health — coordinator health check
router.get('/health', (req, res) => {
  const activeCount = [...workerRegistry.values()].filter(w => w.status === 'active').length
  res.json({
    status: 'ok',
    activeWorkers: activeCount,
    timestamp: new Date().toISOString()
  })
})

module.exports = router
