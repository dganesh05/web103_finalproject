import { pool } from "../config/database.js";
import { calculateRegeneratedEnergy, MAX_CAT_ENERGY } from "../config/rewardConstants.js";

/**
 * Apply energy regeneration to a cat record based on elapsed time
 * @param {object} catRecord - Raw cat record from database
 * @returns {object} Cat record with normalized energy
 */
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

const getCatByUser = async (req, res) => {
	try {
		const uid = req.params.uid;

		const getQuery = `
      SELECT * FROM cats WHERE userId=$1
    `;

		const results = await pool.query(getQuery, [uid]);
		const normalizedCats = results.rows.map(normalizeEnergyOnCat);
		res.status(200).json(normalizedCats);
	} catch (err) {
		res.status(409).json({ error: err.message });
	}
};

const createCat = async (req, res) => {
	try {
		const { userId, name, image } = req.body;

		const createQuery = `
      INSERT INTO cats (userId, name, image, energy, lastEnergyUpdated, cycleCount)
      VALUES($1, $2, $3, 100, CURRENT_TIMESTAMP, 0)
      RETURNING *
    `;

		const results = await pool.query(createQuery, [userId, name, image]);
		const normalizedCat = normalizeEnergyOnCat(results.rows[0]);
		res.status(200).json(normalizedCat);
	} catch (err) {
		res.status(409).json({ error: err.message });
	}
};

const updateCat = async (req, res) => {
	try {
		const uid = req.params.uid;
		const { name, image, energy, drainBlockEnergy } = req.body;

		// Fetch current cat to normalize energy first
		const getCurrentQuery = `SELECT * FROM cats WHERE userId = $1`;
		const currentResults = await pool.query(getCurrentQuery, [uid]);

		if (currentResults.rows.length === 0) {
			return res.status(404).json({ error: "Cat not found" });
		}

		const currentCat = currentResults.rows[0];
		const normalizedCurrent = normalizeEnergyOnCat(currentCat);

		// Determine the new energy value
		let newEnergy = normalizedCurrent.energy;
		if (energy !== undefined) {
			newEnergy = Math.max(0, Math.min(energy, MAX_CAT_ENERGY));
		}

		// If drainBlockEnergy flag is set, subtract energy loss
		if (drainBlockEnergy === true) {
			const { ENERGY_LOSS_PER_BLOCK } = await import("../config/rewardConstants.js").then((m) => m);
			newEnergy = Math.max(0, newEnergy - ENERGY_LOSS_PER_BLOCK);
		}

		const updateQuery = `
      UPDATE cats
      SET
        name = COALESCE($1, name),
        image = COALESCE($2, image),
        energy = COALESCE($3, energy),
        lastEnergyUpdated = CURRENT_TIMESTAMP
      WHERE userId = $4
      RETURNING *
    `;

		const results = await pool.query(updateQuery, [name, image, newEnergy, uid]);
		const normalizedCat = normalizeEnergyOnCat(results.rows[0]);
		res.status(200).json(normalizedCat);
	} catch (err) {
		res.status(409).json({ error: err.message });
	}
};

const deleteCat = async (req, res) => {
	try {
		const uid = req.params.uid;

		const deleteQuery = `
      DELETE FROM cats
      WHERE userId = $1
      RETURNING *
    `;

		const results = await pool.query(deleteQuery, [uid]);
		const normalizedCat = normalizeEnergyOnCat(results.rows[0]);
		res.status(200).json(normalizedCat);
	} catch (err) {
		res.status(409).json({ error: err.message });
	}
};

export default {
	getCatByUser,
	createCat,
	updateCat,
	deleteCat,
};
