import { pool } from '../config/database.js'
import { getFirebaseAdminAuth } from '../config/firebaseAdmin.js'

// Compute and equip the cheapest item in each starter category for a new user.
export const initializeDefaultInventory = async (userId) => {
    if (!userId) throw new Error('userId is required')

    const categories = ['Desks', 'Lamps', 'Plants', 'Frames']

    try {
        console.log('[UsersController] Starting default inventory initialization for user:', userId)

        // Start transaction so we either equip all starter items, or none.
        await pool.query('BEGIN')

        const equipped = []

        for (const category of categories) {
            try {
                const cheapestRes = await pool.query(
                    'SELECT id FROM shop_items WHERE category = $1 ORDER BY price ASC LIMIT 1',
                    [category],
                )

                if (cheapestRes.rows.length === 0) {
                    console.warn(`[UsersController] No shop items found for category: ${category}`)
                    continue
                }

                const shopItemId = cheapestRes.rows[0].id

                console.log(`[UsersController] Equipping cheapest ${category} item id ${shopItemId} for user ${userId}`)

                const insertRes = await pool.query(
                    `INSERT INTO inventory (userId, shopItemId, quantity, equipped)
                     VALUES ($1, $2, 1, TRUE)
                     ON CONFLICT (userId, shopItemId)
                     DO UPDATE SET equipped = TRUE
                     RETURNING *`,
                    [userId, shopItemId],
                )

                if (insertRes.rows[0]) equipped.push({ shopItemId, row: insertRes.rows[0] })
            } catch (catErr) {
                console.error('[UsersController] Error equipping starter item for category', category, catErr)
                throw catErr
            }
        }

        await pool.query('COMMIT')

        console.log('[UsersController] Default inventory initialization completed successfully for user:', userId)
        return equipped
    } catch (err) {
        try {
            await pool.query('ROLLBACK')
        } catch (rbErr) {
            /* ignore rollback errors */
        }

        console.error('[UsersController] Failed to initialize default inventory:', {
            userId,
            error: err?.message,
            stack: err?.stack,
        })

        throw err
    }
}

export const initializeDefaultPomodoroProfile = async (userId) => {
    if (!userId) throw new Error('userId is required')

    try {
        console.log('[UsersController] Starting default pomodoro profile initialization for user:', userId)

        const existingProfileRes = await pool.query(
            'SELECT id FROM pomodoro_profiles WHERE userId = $1 AND isDefault = TRUE LIMIT 1',
            [userId],
        )

        if (existingProfileRes.rows.length > 0) {
            console.log('[UsersController] Pomodoro profile already exists for user:', userId)
            return existingProfileRes.rows[0]
        }

        const insertRes = await pool.query(
            `INSERT INTO pomodoro_profiles (userId, name, timeOn, timeBreak, timeLongBreak, isDefault)
             VALUES ($1, $2, $3, $4, $5, TRUE)
             RETURNING *`,
            [userId, 'Default Pomodoro', 25, 5, 15],
        )

        console.log('[UsersController] Default pomodoro profile initialized successfully for user:', userId)
        return insertRes.rows[0]
    } catch (err) {
        console.error('[UsersController] Failed to initialize default pomodoro profile:', {
            userId,
            error: err?.message,
            stack: err?.stack,
        })

        throw err
    }
}

const getUser = async(req, res) => {

    try {
        const uid = req.params.uid

        const getQuery = `
            SELECT * FROM users
            WHERE uid = $1
        `
        
        const results = await pool.query(getQuery, [uid])
        res.status(200).json(results.rows[0])

    } catch (err) {
        res.status(409).json({error: err.message})
    }
}

const signInUser = async(req, res) => {

    try {
        const {uid, name, profilePicture} = req.body
        const traceId = req.traceId || req.get('x-trace-id') || 'missing-trace-id'

        console.log('[UsersController] signInUser payload received', {
            traceId,
            uid,
            hasName: Boolean(name),
            hasProfilePicture: Boolean(profilePicture),
        })

        if (!uid) {
            console.error('[UsersController] Missing uid in request body', { traceId })
            return res.status(400).json({ error: 'uid is required' })
        }

        const postQuery = `
            INSERT INTO users (uid, name, profilePicture, coins, createdAt)
            VALUES ($1, $2, $3, 0, NOW())
            ON CONFLICT (uid) DO NOTHING
            RETURNING *
        `

        console.log('[UsersController] Attempting users insert', { traceId, uid })
        const results = await pool.query(postQuery, [uid, name, profilePicture])
        console.log('[UsersController] Insert result', {
            traceId,
            insertedRowCount: results.rows.length,
        })

        if (results.rows.length > 0) {
            console.log('[UsersController] New user seeded', {
                traceId,
                uid: results.rows[0].uid,
            })

            // Initialize default inventory for new user
            try {
                await initializeDefaultInventory(uid)
                console.log('[UsersController] Default inventory initialized', {
                    traceId,
                    uid,
                })
            } catch (err) {
                console.error('[UsersController] Failed to initialize default inventory', {
                    traceId,
                    uid,
                    error: err.message,
                })
                // Don't fail the sign-in if inventory initialization fails
            }

            // Fetch inventory for the user and include it in the response so the client
            // can immediately update UI without an extra fetch.
            const inventoryQuery = `
                SELECT
                    i.id            AS id,
                    i.userId        AS userid,
                    i.shopItemId    AS shopitemid,
                    i.quantity      AS quantity,
                    i.equipped      AS equipped,
                    i.acquiredAt    AS acquiredat,
                    s.name          AS name,
                    s.image         AS image,
                    s.category      AS category,
                    s.price         AS price
                FROM inventory i
                JOIN shop_items s ON s.id = i.shopItemId
                WHERE i.userId = $1
                ORDER BY i.acquiredAt DESC
            `;

            const invRes = await pool.query(inventoryQuery, [uid]);

            try {
                await initializeDefaultPomodoroProfile(uid)
                console.log('[UsersController] Default pomodoro profile verified for new user', {
                    traceId,
                    uid,
                })
            } catch (err) {
                console.error('[UsersController] Failed to verify default pomodoro profile for new user', {
                    traceId,
                    uid,
                    error: err.message,
                })
            }

            return res.json({
                newUser: true,
                user: results.rows[0],
                inventory: invRes.rows,
            })
        } else {
            console.log('[UsersController] User already exists, selecting existing row', {
                traceId,
                uid,
            })
            const existingUser = await pool.query(
                `SELECT * FROM users WHERE uid=$1`,
                [uid]
            )

            console.log('[UsersController] Existing user query result', {
                traceId,
                rowCount: existingUser.rows.length,
            })

            try {
                await initializeDefaultPomodoroProfile(uid)
                console.log('[UsersController] Default pomodoro profile verified for existing user', {
                    traceId,
                    uid,
                })
            } catch (err) {
                console.error('[UsersController] Failed to verify default pomodoro profile for existing user', {
                    traceId,
                    uid,
                    error: err.message,
                })
            }

            // Fetch inventory for existing user as well
            const inventoryQuery = `
                SELECT
                    i.id            AS id,
                    i.userId        AS userid,
                    i.shopItemId    AS shopitemid,
                    i.quantity      AS quantity,
                    i.equipped      AS equipped,
                    i.acquiredAt    AS acquiredat,
                    s.name          AS name,
                    s.image         AS image,
                    s.category      AS category,
                    s.price         AS price
                FROM inventory i
                JOIN shop_items s ON s.id = i.shopItemId
                WHERE i.userId = $1
                ORDER BY i.acquiredAt DESC
            `;

            const invRes = await pool.query(inventoryQuery, [uid]);

            return res.json({
                newUser: false,
                user: existingUser.rows[0],
                inventory: invRes.rows,
            })
        }

    } catch (err) {
        const traceId = req.traceId || req.get('x-trace-id') || 'missing-trace-id'
        console.error('[UsersController] signInUser failed', {
            traceId,
            message: err.message,
        })
        res.status(409).json({error: err.message})
    }

}

const updateUser = async(req, res) => {
  try {
    const uid = req.params.uid
    const {name, profilePicture, coins} = req.body

    const updateQuery = `
        UPDATE users
        SET 
            name = COALESCE($1, name), 
            profilePicture = COALESCE($2, profilePicture), 
            coins = COALESCE($3, coins)
        WHERE uid = $4
        RETURNING *
    `

    const results = await pool.query(updateQuery, [name, profilePicture, coins, uid])
    res.status(200).json(results.rows[0])

  } catch(err) {
    res.status(409).json({error: err.message})
  }
}

const deleteUser = async(req, res) => {
  try {
    const uid = req.params.uid

        if (!req.authUid || req.authUid !== uid) {
            return res.status(403).json({ error: 'Forbidden: cannot delete another user' })
        }

        const adminAuth = getFirebaseAdminAuth()

        try {
            await adminAuth.deleteUser(uid)
        } catch (err) {
            if (err.code !== 'auth/user-not-found') {
                throw err
            }
        }

    const deleteQuery = `
        DELETE FROM users WHERE uid = $1
        RETURNING *
    `

    const results = await pool.query(deleteQuery, [uid])
    res.status(200).json(results.rows[0])

  } catch(err) {
    res.status(409).json({error: err.message})
  }
}

export default {
    getUser,
    signInUser,
    updateUser,
    deleteUser
}