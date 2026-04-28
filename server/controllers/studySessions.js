import { pool } from '../config/database.js'
import {
	calculateCoinsEarned,
	ENERGY_LOSS_PER_BLOCK,
	calculateRegeneratedEnergy,
} from '../config/rewardConstants.js'

const normalizeEnergyOnCat = (catRecord) => {
	if (!catRecord) return catRecord;

	const { energy: regeneratedEnergy } = calculateRegeneratedEnergy(
		catRecord.energy,
		catRecord.lastEnergyUpdated,
	);

	return {
		...catRecord,
		energy: regeneratedEnergy,
	};
};

const getAllSessionsFromUser = async(req, res) => {
    try {
        const uid = req.params.uid

        const sessionsQuery = `
            SELECT *
            FROM study_sessions
            WHERE userId = $1
            ORDER BY startTime DESC
        `

        const completedCountQuery = `
            SELECT COUNT(*)::int AS totalCompletedSessions
            FROM study_sessions
            WHERE userId = $1
              AND endTime IS NOT NULL
        `

        const [sessionsResult, completedCountResult] = await Promise.all([
            pool.query(sessionsQuery, [uid]),
            pool.query(completedCountQuery, [uid]),
        ])

        const totalCompletedSessions = completedCountResult.rows[0]?.totalcompletedsessions ?? 0

        if (req.query.summary === 'true') {
            return res.status(200).json({ totalCompletedSessions })
        }

        res.status(200).json({
            sessions: sessionsResult.rows,
            totalCompletedSessions,
        })
    } catch (err) {
        res.status(409).json({ error: err.message })
    }
}

const addSession = async(req, res) => {
    const client = await pool.connect();
    
    try {
        const {
            userId,
            profileId = null,
            startTime,
            endTime = null,
            workMinutes = 0,
            tasksCompleted = 0,
            catEnergyAtStart = 100,
        } = req.body

        if (!userId || !startTime) {
            return res.status(400).json({ error: 'userId and startTime are required' })
        }

        // Validate numeric fields
        const safeWorkMinutes = Math.max(0, Number(workMinutes) || 0);
        const safeTasksCompleted = Math.max(0, Number(tasksCompleted) || 0);
        const safeCatEnergyAtStart = Math.max(0, Number(catEnergyAtStart) || 100);

        // Calculate coins using the server-owned formula
        const coinsEarned = calculateCoinsEarned(
            safeWorkMinutes,
            safeTasksCompleted,
            safeCatEnergyAtStart,
        );

        // Begin transaction
        await client.query('BEGIN');

        // Fetch current cat to check cycle count and normalize energy
        const catQuery = `SELECT * FROM cats WHERE userId = $1 FOR UPDATE`;
        const catResult = await client.query(catQuery, [userId]);

        if (catResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Cat not found for user' });
        }

        const currentCat = catResult.rows[0];
        const normalizedCat = normalizeEnergyOnCat(currentCat);
        
        // Increment cycle count
        const newCycleCount = (currentCat.cycleCount || 0) + 1;
        const isBlockComplete = newCycleCount % 4 === 0;

        // Calculate final cat energy after this session
        let catEnergyAfter = normalizedCat.energy;
        if (isBlockComplete) {
            catEnergyAfter = Math.max(0, catEnergyAfter - ENERGY_LOSS_PER_BLOCK);
        }

        // Update cat with new cycle count and potentially drained energy
        const updateCatQuery = `
            UPDATE cats
            SET 
                cycleCount = $1,
                energy = $2,
                lastEnergyUpdated = CURRENT_TIMESTAMP
            WHERE userId = $3
            RETURNING *
        `;
        await client.query(updateCatQuery, [newCycleCount, catEnergyAfter, userId]);

        // Fetch current user coins and increment
        const userQuery = `SELECT coins FROM users WHERE uid = $1 FOR UPDATE`;
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }

        const currentCoins = Number(userResult.rows[0].coins || 0);
        const newCoins = currentCoins + coinsEarned;

        const updateUserQuery = `
            UPDATE users
            SET coins = $1
            WHERE uid = $2
        `;
        await client.query(updateUserQuery, [newCoins, userId]);

        // Create the session record with full breakdown
        const createSessionQuery = `
            INSERT INTO study_sessions (
                userId,
                profileId,
                startTime,
                endTime,
                coinsEarned,
                workMinutes,
                tasksCompleted,
                catEnergyAtStart,
                catEnergyAfter,
                wasBlockCompleted
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const sessionResult = await client.query(createSessionQuery, [
            userId,
            profileId,
            startTime,
            endTime,
            coinsEarned,
            safeWorkMinutes,
            safeTasksCompleted,
            safeCatEnergyAtStart,
            catEnergyAfter,
            isBlockComplete,
        ]);

        await client.query('COMMIT');

        // Return enriched response with updated user state
        res.status(200).json({
            session: sessionResult.rows[0],
            userCoins: newCoins,
            catEnergy: catEnergyAfter,
            blockCompleted: isBlockComplete,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(409).json({ error: err.message })
    } finally {
        client.release();
    }
}

export default {
    getAllSessionsFromUser,
    addSession
}