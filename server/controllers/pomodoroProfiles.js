import { pool } from "../config/database.js";
import { initializeDefaultPomodoroProfile } from "./users.js";

const getAllProfiles = async (req, res) => {
    try {
        const uid = req.params.uid

        await initializeDefaultPomodoroProfile(uid)

        // ORDER BY ensures that default profile is ALWAYS the first one in the returned json
        const getQuery = `
            SELECT * FROM pomodoro_profiles WHERE userId=$1
            ORDER BY isDefault DESC; 
        `

        const results = await pool.query(getQuery, [uid])
        res.status(200).json(results.rows)

    } catch (err) {
        res.status(409).json({ error: err.message });
    }
};

const addProfile = async (req, res) => {
    try {
        const { userId, name, timeOn, timeBreak, timeLongBreak, isDefault } =
            req.body;

        if (isDefault) {
            await pool.query(`
                UPDATE pomodoro_profiles
                SET isDefault=false
                WHERE userId=$1 AND isDefault=true
            `, [userId])
        }

        const createQuery = `
            INSERT INTO pomodoro_profiles (userId, name, timeOn, timeBreak, timeLongBreak, isDefault)
            VALUES($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const results = await pool.query(createQuery, [
            userId,
            name,
            timeOn,
            timeBreak,
            timeLongBreak,
            isDefault,
        ]);
        res.status(200).json(results.rows[0]);
    } catch (err) {
        res.status(409).json({ error: err.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, name, timeOn, timeBreak, timeLongBreak, isDefault } = req.body;

        // If the updated profile should be default, unset any existing default for this user first
        if (isDefault) {
            await pool.query(
                `UPDATE pomodoro_profiles SET isDefault=false WHERE userId=$1 AND isDefault=true`,
                [userId]
            );
        }

        const updateQuery = `
            UPDATE pomodoro_profiles
            SET
                name = COALESCE(NULLIF($1, ''), name),
                timeOn = COALESCE($2, timeOn),
                timeBreak = COALESCE($3, timeBreak),
                timeLongBreak = COALESCE($4, timeLongBreak),
                isDefault = $5
            WHERE id = $6
            RETURNING *
        `;

        const results = await pool.query(updateQuery, [
            name,
            timeOn,
            timeBreak,
            timeLongBreak,
            isDefault,
            id,
        ]);

        res.status(200).json(results.rows[0]);
    } catch (err) {
        res.status(409).json({ error: err.message });
    }
};

const deleteProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const deleteQuery = `
            DELETE FROM pomodoro_profiles
            WHERE id=$1
            RETURNING *
        `;

        const results = await pool.query(deleteQuery, [id]);
        res.status(200).json(results.rows[0]);
    } catch (err) {
        res.status(409).json({ error: err.message });
    }
};

export default {
    getAllProfiles,
    addProfile,
    updateProfile,
    deleteProfile,
};