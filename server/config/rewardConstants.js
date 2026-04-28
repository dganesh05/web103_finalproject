/**
 * Reward and energy system constants
 * These values define the coin and energy economy
 */

// Coins earned per completed task during a work session (redeemable when cycle completes)
export const TASK_COIN_VALUE = 30;

// Coins earned per minute of work (capped by cat energy)
export const WORK_MINUTE_COIN_MULTIPLIER = 1;

// Final multiplier applied to all coins (minutes + tasks)
export const COIN_MULTIPLIER = 3;

// Energy consumed after every 4 completed work cycles (1 Pomodoro block)
export const ENERGY_LOSS_PER_BLOCK = 20;

// Maximum energy the cat can have
export const MAX_CAT_ENERGY = 100;

// Minutes of real time required to regenerate 1 point of energy
export const MINUTES_PER_ENERGY_REGEN = 10;

// Seconds equivalent (for easier calculation)
export const SECONDS_PER_ENERGY_REGEN = MINUTES_PER_ENERGY_REGEN * 60;

/**
 * Calculate total coins earned for a given session
 * @param {number} workMinutes - Total work minutes in the session
 * @param {number} completedTasks - Number of tasks completed during session
 * @param {number} catEnergy - Current cat energy (used as cap for minute coins)
 * @returns {number} Total coins earned
 */
export const calculateCoinsEarned = (workMinutes, completedTasks, catEnergy) => {
	const minuteCoins = Math.min(workMinutes, catEnergy) * WORK_MINUTE_COIN_MULTIPLIER;
	const taskCoins = completedTasks * TASK_COIN_VALUE;
	const totalCoins = (minuteCoins + taskCoins) * COIN_MULTIPLIER;
	return Math.max(0, totalCoins);
};

/**
 * Calculate regenerated energy based on elapsed time
 * @param {number} currentEnergy - Current stored energy level
 * @param {Date} lastUpdated - Last time energy was updated
 * @returns {object} { energy: number, hasChanged: boolean }
 */
export const calculateRegeneratedEnergy = (currentEnergy, lastUpdated) => {
	if (currentEnergy >= MAX_CAT_ENERGY) {
		return { energy: MAX_CAT_ENERGY, hasChanged: false };
	}

	const now = Date.now();
	const lastUpdatedTime = new Date(lastUpdated).getTime();
	const elapsedSeconds = (now - lastUpdatedTime) / 1000;
	const regenPoints = Math.floor(elapsedSeconds / SECONDS_PER_ENERGY_REGEN);

	if (regenPoints === 0) {
		return { energy: currentEnergy, hasChanged: false };
	}

	const regeneratedEnergy = Math.min(
		currentEnergy + regenPoints,
		MAX_CAT_ENERGY,
	);

	return {
		energy: regeneratedEnergy,
		hasChanged: regeneratedEnergy !== currentEnergy,
	};
};

export default {
	TASK_COIN_VALUE,
	WORK_MINUTE_COIN_MULTIPLIER,
	COIN_MULTIPLIER,
	ENERGY_LOSS_PER_BLOCK,
	MAX_CAT_ENERGY,
	MINUTES_PER_ENERGY_REGEN,
	SECONDS_PER_ENERGY_REGEN,
	calculateCoinsEarned,
	calculateRegeneratedEnergy,
};
