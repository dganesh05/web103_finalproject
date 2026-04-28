// client/src/pages/Home/VirtualRoom.jsx
import { Box, Card, Paper, Typography, Fab, Stack, Badge } from "@mui/material";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import TasksDrawer from "./TasksDrawer";
import { useCallback, useContext, useEffect, useState } from "react";
import { Bounce } from "react-awesome-reveal";
import SettingsIcon from "@mui/icons-material/Settings";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ProfilesDrawer from "./ProfilesDrawer";
import AuthContext from "../../contexts/AuthContext";
import PauseIcon from "@mui/icons-material/Pause";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RewardModal from "./RewardModal";

const slots = {
	desk: {
		bottom: "10%",
		left: "50%",
		transform: "translate(-50%)",
		width: "40%",
		height: "40%",
	},
	floor1: {
		bottom: "15%",
		left: "20%",
		transform: "translate(-50%)",
		width: "14%",
		height: "50%",
	},
	floor2: {
		bottom: "15%",
		right: "6%",
		transform: "translate(-50%)",
		width: "14%",
		height: "50%",
	},
	wall: {
		bottom: "75%",
		right: "0%",
		transform: "translate(-50%)",
		width: "12%",
		height: "16%",
	},
	timer: {
		position: "absolute",
		top: "15%",
		left: "50%",
		transform: "translate(-50%)",
		width: "30%",
		height: "20%",
		backgroundColor: "rgba(0, 0, 0, 0.1)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 20,
	},
};

function Slot({ label, sx, item }) {
	return (
		<Box
			sx={{
				position: "absolute",
				...sx,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{item?.img ? (
				<Box
					component="img"
					src={item.img}
					elevation={3}
					sx={{
						width: "100%",
						height: "100%",
						borderRadius: 2,
						objectFit: "cover",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				/>
			) : (
				<Paper
					elevation={3}
					sx={{
						width: "100%",
						height: "100%",
						borderRadius: 2,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						bgcolor: "rgba(255,255,255,0.7)",
						border: "1px dashed rgba(0,0,0,0.2)",
					}}
				>
					<Typography variant="caption">{label}</Typography>
				</Paper>
			)}
		</Box>
	);
}

export default function VirtualRoom({ initialProfile = null }) {
	const [items, setItems] = useState({
		desk: {
			img: "https://static.vecteezy.com/system/resources/thumbnails/046/797/124/small/wooden-office-desk-with-lamp-table-isolated-on-transparent-background-png.png",
		},
		floor1: { img: "" },
		floor2: { img: "" },
		wall: { img: "" },
		timer: {
			minutes: 0,
			seconds: 0,
		},
	});
	const [isTasksOpen, setIsTasksOpen] = useState(false);
	const [isProfilesOpen, setIsProfilesOpen] = useState(false);
	const [selectedProfile, setSelectedProfile] = useState(initialProfile);
	const [allProfiles, setAllProfiles] = useState(
		initialProfile ? [initialProfile] : [],
	);
	const [remainingSeconds, setRemainingSeconds] = useState(0);
	const [isRunning, setIsRunning] = useState(false);
	const [endTime, setEndTime] = useState(null);
	const [mode, setMode] = useState("work"); // "work" | "break" | "longBreak"
	const [sessionCount, setSessionCount] = useState(0);
	const [showRewards, setShowRewards] = useState(false);
	const [cat, setCat] = useState(null);
	const [rewardMinutes, setRewardMinutes] = useState(0);
	const [sessionTime, setSessionTime] = useState({
		startTime: null,
		endTime: null,
		pausedTime: 0,
		pauseStartTime: null,
	});
	const [completedTasks, setCompletedTasks] = useState(0);
	const [rewardCoinsEarned, setRewardCoinsEarned] = useState(0);
	const [blockCompleted, setBlockCompleted] = useState(false);
	const [userCoins, setUserCoins] = useState(0);


	const { user } = useContext(AuthContext);

	const getDurations = (profile) => {
		if (!profile) return null;

		return {
			work: Number(profile.timeon),
			break: Number(profile.timebreak),
			longbreak: Number(profile.timelongbreak),
		};
	};

	const startTimer = () => {
		if (isRunning) return;

		const now = Date.now();

		setSessionTime((current) => {
			const pauseDuration = current.pauseStartTime
				? now - current.pauseStartTime
				: 0;

			return {
				...current,
				startTime: current.startTime ?? now,
				pausedTime: current.pausedTime + pauseDuration,
				pauseStartTime: null,
			};
		});

		setEndTime((currentEndTime) =>
			currentEndTime ?? Date.now() + remainingSeconds * 1000,
		);
		setIsRunning(true);
	};

	const pauseTimer = () => {
		if (!isRunning) return;

		setSessionTime((current) => ({
			...current,
			pauseStartTime: current.pauseStartTime ?? Date.now(),
		}));
		setIsRunning(false);
	};

	const stopTimer = () => {
		setIsRunning(false);
		setEndTime(null);
	};

	const finalizeWorkSession = useCallback(async () => {
		const now = Date.now();
		const pauseDuration = sessionTime.pauseStartTime
			? now - sessionTime.pauseStartTime
			: 0;
		const totalPausedTime = sessionTime.pausedTime + pauseDuration;
		const startTime = sessionTime.startTime ?? now;
		const endTimeMs = now - totalPausedTime;

		const completedMinutes = Math.max(
			0,
			Math.floor((endTimeMs - startTime) / 60000),
		);

		setRewardMinutes(completedMinutes);
		setSessionTime((current) => ({
			...current,
			endTime: endTimeMs,
			pausedTime: totalPausedTime,
			pauseStartTime: null,
		}));

		const startTimeISO = new Date(startTime).toISOString();
		const endTimeISO = new Date(endTimeMs).toISOString();

		// Fetch completed tasks count
		const getTasksCompleted = async () => {
			try {
				const res = await fetch(`/api/tasks/${user?.uid}`);
				const data = await res.json();
				const completedTasksList = data.filter((task) => task.completed === true);
				setCompletedTasks(completedTasksList.length);
				return completedTasksList.length;
			} catch (err) {
				console.error("Failed to fetch tasks: ", err);
				return 0;
			}
		};

		const tasksCompleted = await getTasksCompleted();

		// Call the server-authoritative session endpoint
		const persistSessionAndUpdateRewards = async () => {
			try {
				const sessionResponse = await fetch("/api/sessions", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						userId: user?.uid,
						profileId: selectedProfile?.id,
						startTime: startTimeISO,
						endTime: endTimeISO,
						workMinutes: completedMinutes,
						tasksCompleted: tasksCompleted,
						catEnergyAtStart: cat?.energy ?? 100,
					}),
				});

				if (!sessionResponse.ok) {
					throw new Error("Failed to create session");
				}

				const sessionData = await sessionResponse.json();
				
				// Update local state with server-returned values
				setRewardCoinsEarned(sessionData.coinsEarned);
				setBlockCompleted(sessionData.blockCompleted);
				setUserCoins(sessionData.userCoins);

				// Refresh cat to get updated energy
				await refreshCat();
			} catch (err) {
				console.error("Failed to save session and update rewards:", err);
			}
		};

		await persistSessionAndUpdateRewards();
		setShowRewards(true);
	}, [cat?.energy, selectedProfile?.id, sessionTime, user?.uid, refreshCat]);

	const skipToNextMode = () => {
		stopTimer();

		if (mode === "work") {
			const nextCount = sessionCount + 1;
			setSessionCount(nextCount);
			finalizeWorkSession();
			setMode(nextCount % 4 === 0 ? "longbreak" : "break");
			return;
		}

		setMode("work");
	};

	useEffect(() => {
		if (!isRunning) return;

		const interval = setInterval(() => {
			const remaining = Math.max(
				0,
				endTime - (Date.now() - sessionTime.pausedTime),
			);

			setRemainingSeconds(Math.ceil(remaining / 1000));

			if (remaining <= 0) {
				stopTimer();

				if (mode === "work") {
					const nextCount = sessionCount + 1;
					setSessionCount(nextCount);
					finalizeWorkSession();
					setMode(nextCount % 4 === 0 ? "longbreak" : "break");
				} else {
					setMode("work");
				}
			}
		}, 250);

		return () => clearInterval(interval);
	}, [isRunning, endTime, mode, sessionCount, sessionTime.pausedTime, finalizeWorkSession]);

	useEffect(() => {
		const raw = selectedProfile?.timeon;
		if (raw == null) return;

		const minutes = Number(raw);
		if (!Number.isFinite(minutes)) return;

		setItems((prev) => {
			if (prev.timer?.minutes === minutes && prev.timer?.seconds === 0)
				return prev;
			return { ...prev, timer: { minutes, seconds: 0 } };
		});
	}, [selectedProfile]);

	useEffect(() => {
		if (initialProfile) {
			setSelectedProfile(initialProfile);
			setAllProfiles((currentProfiles) => {
				if (!currentProfiles || currentProfiles.length === 0) {
					return [initialProfile];
				}

				return currentProfiles.some((profile) => profile.id === initialProfile.id)
					? currentProfiles
					: [initialProfile, ...currentProfiles];
			});
		}
	}, [initialProfile]);

	const refreshProfiles = useCallback(async () => {
		if (!user?.uid) return;

		const results = await fetch(`/api/pomodoro_profiles/${user.uid}`);
		const data = await results.json();

		setSelectedProfile(data[0]);
		setAllProfiles(data);
	}, [user?.uid]);

	const refreshCat = useCallback(async () => {
		if (!user?.uid) return;

		const results = await fetch(`/api/cats/${user.uid}`);
		const data = await results.json();

		setCat(data?.[0] ?? null);
	}, [user?.uid]);

	const completeSession = async () => {
		setShowRewards(false);
		setSessionTime({
			startTime: null,
			endTime: null,
			pausedTime: 0,
			pauseStartTime: null,
		});
		setRewardMinutes(0);
	}

	useEffect(() => {
		refreshProfiles();
		refreshCat();
	}, [refreshProfiles, refreshCat]);

	useEffect(() => {
		const durations = getDurations(selectedProfile);
		if (!durations) return;

		const minutes = durations[mode];
		if (!Number.isFinite(minutes)) return;

		setRemainingSeconds(minutes * 60);
	}, [selectedProfile, mode]);

	useEffect(() => {
		console.log("Reward Minutes:" , rewardMinutes)
	}, [rewardMinutes])

	return (
		<Box
			sx={{
				width: "80vw",
				maxWidth: 1000,
				margin: "0 auto",
			}}
		>
			{/* Room canvas */}
			<Box
				sx={{
					position: "relative",
					width: "100%",
					aspectRatio: "16 / 9",
					backgroundColor: "red",
					borderRadius: 4,
					overflow: "hidden",
				}}
			>
				{/* Background layers */}
				<Box sx={{ position: "absolute", inset: 0, bgcolor: "#cfe8ff" }} />
				<Box
					sx={{
						position: "absolute",
						bottom: 0,
						width: "100%",
						height: "35%",
						bgcolor: "#e9d8b5",
					}}
				/>

				{/* Slots */}
				<Slot label="Desk" sx={slots.desk} item={items.desk} />
				<Slot label="Floor Item 1" sx={slots.floor1} />
				<Slot label="Floor Item 2" sx={slots.floor2} />
				<Slot label="Wall Item" sx={slots.wall} item={items.wall} />
				<Stack spacing={5}>
					<Card sx={{ ...slots.timer, overflow: "visible" }} elevation={0}>
						<Badge
							badgeContent={sessionCount}
							showZero
							color="primary"
							sx={{
								position: "absolute",
								top: 8,
								right: 25,
								zIndex: 2,
							}}
						>
							<Box sx={{ width: 1, height: 1 }} />
						</Badge>
						<Typography
							variant="caption"
							sx={{ position: "absolute", top: 6, color: "#FFFFFF" }}
						>
							{mode == "longbreak" ? "LONG BREAK" : mode.toUpperCase()}
						</Typography>
						{selectedProfile?.timeon != null && (
							<Bounce>
								<Stack>
									<Typography
										variant="h2"
										sx={{
											color: "common.white",
											fontSize: {
												xs: "1.2rem",
												sm: "1.8rem",
												md: "2.5rem",
												lg: "3rem",
											},
										}}
									>
										{Math.floor(remainingSeconds / 60)}:
										{String(remainingSeconds % 60).padStart(2, "0")}
									</Typography>
								</Stack>
							</Bounce>
						)}
					</Card>

					{/* FAB to open Tasks */}
					<Fab
						color="primary"
						aria-label="tasks"
						onClick={() => setIsTasksOpen(true)}
						sx={{
							position: "absolute",
							left: "5%",
							top: "5%",
							zIndex: 20,
							width: { xs: 40, sm: 56, md: 64 },
							height: { xs: 40, sm: 56, md: 64 },
							"& .MuiSvgIcon-root": {
								fontSize: { xs: "1rem", sm: "1.5rem", md: "2rem" },
							},
						}}
					>
						<PlaylistAddCheckIcon />
					</Fab>

					<Stack
						direction="row"
						spacing={2}
						sx={{
							position: "absolute",
							left: "50%",
							top: "35%",
							zIndex: 20,
							transform: "translate(-50%, -50%)",
							"& .MuiSvgIcon-root": {
								fontSize: { xs: "1rem", sm: "1.5rem", md: "2rem" },
							},
						}}
					>
						<Fab
							color="primary"
							sx={{
								width: { xs: 30, sm: 46, md: 54 },
								height: { xs: 30, sm: 46, md: 54 },
							}}
							onClick={() => setIsProfilesOpen(true)}
						>
							<SettingsIcon />
						</Fab>
						<Fab
							color="primary"
							sx={{
								width: { xs: 30, sm: 46, md: 54 },
								height: { xs: 30, sm: 46, md: 54 },
							}}
							onClick={() => {
								isRunning ? pauseTimer() : startTimer();
							}}
						>
							{isRunning ? <PauseIcon /> : <PlayArrowIcon />}
						</Fab>
						{isRunning && (
							<Bounce>
								<Fab
									color="primary"
									sx={{
										width: { xs: 30, sm: 46, md: 54 },
										height: { xs: 30, sm: 46, md: 54 },
									}}
									onClick={skipToNextMode}
								>
									<SkipNextIcon />
								</Fab>
							</Bounce>
						)}
					</Stack>
				</Stack>

				{/* Controlled Drawer */}
				<TasksDrawer open={isTasksOpen} onClose={() => setIsTasksOpen(false)} />

				{/* Profile Options Drawer */}
				<ProfilesDrawer
					open={isProfilesOpen}
					onClose={() => setIsProfilesOpen(false)}
					profiles={allProfiles}
					onProfilesChanged={refreshProfiles}
					selectedProfile={selectedProfile}
					setSelectedProfile={setSelectedProfile}
				/>

				<RewardModal
					open={showRewards}
					onClose={completeSession}
					minutes={rewardMinutes}
					tasks={completedTasks}
					cat={cat}
					coinsEarned={rewardCoinsEarned}
					blockCompleted={blockCompleted}
				/>
			</Box>
		</Box>
	);
}
