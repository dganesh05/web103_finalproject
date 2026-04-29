// client/src/pages/Home/VirtualRoom.jsx
import {
	Box,
	Card,
	Paper,
	Typography,
	Fab,
	Stack,
	Badge,
	Tooltip,
	CircularProgress,
} from "@mui/material";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import TasksDrawer from "./TasksDrawer";
import Inventory from "./Inventory";
import {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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
		bottom: "5%",
		left: "50%",
		transform: "translate(-50%)",
		width: "40%",
		height: "60%",
	},
	floor1: {
		bottom: "15%",
		left: "20%",
		transform: "translate(-50%)",
		width: "30%",
		height: "60%",
	},
	floor2: {
		bottom: "15%",
		right: "-10%",
		transform: "translate(-50%)",
		width: "30%",
		height: "60%",
	},
	catAnimation: {
		bottom: "2%",
		left: "1%",
		width: "20%",
		height: "40%",
		objectFit: "contain",
		// transform: "scale(0.7)",
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

const ROOM_SLOT_STORAGE_PREFIX = "pawmodoro.roomSlots";

function getRoomSlotStorageKey(uid) {
	return `${ROOM_SLOT_STORAGE_PREFIX}:${uid}`;
}

function readRoomSlotMap(uid) {
	if (!uid || typeof window === "undefined") return {};

	try {
		const raw = window.localStorage.getItem(getRoomSlotStorageKey(uid));
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function writeRoomSlotMap(uid, slotMap) {
	if (!uid || typeof window === "undefined") return;

	try {
		window.localStorage.setItem(
			getRoomSlotStorageKey(uid),
			JSON.stringify(slotMap),
		);
	} catch {
		/* ignore storage errors */
	}
}

function getRoomItemsFromInventory(inventory, previous = {}, slotMap = {}) {
	const items = Array.isArray(inventory) ? inventory : [];
	const deskEquipped = items.find(
		(item) => item.category === "Desks" && item.equipped,
	);
	const wallEquipped = items.find(
		(item) => item.category === "Frames" && item.equipped,
	);
	const floorEquipped = items.filter(
		(item) =>
			(item.category === "Plants" || item.category === "Lamps") &&
			item.equipped,
	);
	const floorById = new Map(
		floorEquipped.map((item) => [String(item.id), item]),
	);
	const hasFloorMapping = Boolean(slotMap.floor1 || slotMap.floor2);
	const remainingFloorItems = [...floorEquipped];

	const resolveSlotImage = (slotName, fallbackItem) => {
		const mappedId = slotMap[slotName];
		if (mappedId) {
			const mappedItem = items.find(
				(item) => String(item.id) === String(mappedId),
			);
			if (mappedItem && mappedItem.equipped) {
				return mappedItem.image ?? mappedItem.img ?? null;
			}
			return null;
		}

		if (fallbackItem) {
			return fallbackItem.image ?? fallbackItem.img ?? null;
		}

		return null;
	};

	const assignFloorSlot = (slotName) => {
		const mappedId = slotMap[slotName];
		if (mappedId) {
			const mappedItem = floorById.get(String(mappedId));
			return mappedItem && mappedItem.equipped
				? (mappedItem.image ?? mappedItem.img ?? null)
				: null;
		}

		if (hasFloorMapping) {
			return null;
		}

		const nextItem = remainingFloorItems.shift();
		return nextItem?.image ?? nextItem?.img ?? null;
	};

	return {
		...previous,
		desk: {
			img: resolveSlotImage("desk", deskEquipped) ?? previous.desk?.img ?? "",
		},
		floor1: {
			img: assignFloorSlot("floor1") ?? previous.floor1?.img ?? "",
		},
		floor2: {
			img: assignFloorSlot("floor2") ?? previous.floor2?.img ?? "",
		},
		wall: {
			img: resolveSlotImage("wall", wallEquipped) ?? previous.wall?.img ?? "",
		},
	};
}

function Slot({ label, sx, item, onClick }) {
	return (
		<Box
			onClick={onClick}
			sx={{
				position: "absolute",
				...sx,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				cursor: "pointer",
				transition: "border-color 0.2s ease, opacity 0.2s ease",
				border: "2px solid transparent",
				"&:hover": {
					opacity: 0.96,
				},
			}}
		>
			{item?.img ? (
				<Tooltip title={label} arrow placement="bottom" disableInteractive>
					<Box
						component="img"
						src={item.img}
						elevation={3}
						sx={{
							width: "100%",
							height: "100%",
							borderRadius: 2,
							objectFit: "contain",
							transform: "scale(1.25)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					/>
				</Tooltip>
			) : (
				<Tooltip title={label} arrow placement="top" disableInteractive>
					<Paper
						elevation={3}
						sx={{
							width: "30%",
							height: "30%",
							borderRadius: 2,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							bgcolor: "rgba(255, 255, 255, 0)",
							// border: "1px dashed rgba(0,0,0,0.2)",
						}}
					>
						<Typography variant="caption">{label}</Typography>
					</Paper>
				</Tooltip>
			)}
		</Box>
	);
}

export default function VirtualRoom({ initialProfile = null }) {
	const [items, setItems] = useState({
		desk: {
			img: "",
		},
		floor1: { img: "" },
		floor2: { img: "" },
		wall: { img: "" },
		catAnimation: { img: "" },
		timer: {
			minutes: 0,
			seconds: 0,
		},
	});
	const [isTasksOpen, setIsTasksOpen] = useState(false);
	const [isProfilesOpen, setIsProfilesOpen] = useState(false);
	const [isInventoryOpen, setIsInventoryOpen] = useState(false);
	const [inventoryFilter, setInventoryFilter] = useState("All");
	const [allowedCategories, setAllowedCategories] = useState([]);
	const [activeSlot, setActiveSlot] = useState(null);
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
	const [isTimerReady, setIsTimerReady] = useState(false);
	const [isRoomReady, setIsRoomReady] = useState(false);
	const defaultProfileSeededForUser = useRef(null);
	const [sessionTime, setSessionTime] = useState({
		startTime: null,
		endTime: null,
		pausedTime: 0,
		pauseStartTime: null,
	});
	const [completedTasks, setCompletedTasks] = useState(0);
	const [animateCat, setAnimateCat] = useState(false);

	const { user } = useContext(AuthContext);

	useEffect(() => {
		console.log("========= User: ============\n", user);
	}, [user]);

	useEffect(() => {
		console.log(
			"========= Is Loading Room: ============\n",
			!isTimerReady || !isRoomReady,
		);
	}, [isTimerReady, isRoomReady]);

	const roomImageSources = useMemo(
		() =>
			[
				items.desk?.img,
				items.floor1?.img,
				items.floor2?.img,
				items.wall?.img,
			].filter(Boolean),
		[items.desk?.img, items.floor1?.img, items.floor2?.img, items.wall?.img],
	);

	const getDurations = (profile) => {
		if (!profile) return null;

		return {
			work: Number(profile.timeon),
			break: Number(profile.timebreak),
			longbreak: Number(profile.timelongbreak),
		};
	};

	const getCatAnimationFromImage = (image) => {
		if (!image) return null;

		// Extract cat type from image path (e.g., "/cats/blackCat.PNG" -> "blackCat")
		const catType = image.match(/\/([^/]+)\.PNG/i)?.[1];

		if (!catType) return null;

		// Return the corresponding GIF path
		return `/animations/${catType}.GIF`;
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

		setEndTime(
			(currentEndTime) =>
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

		const getTasksCompleted = async () => {
			try {
				const res = await fetch(`/api/tasks/${user?.uid}`);
				const data = await res.json();
				const completedTasksList = data.filter(
					(task) => task.completed === true,
				);

				setCompletedTasks(completedTasksList.length);
				return completedTasksList.length;
			} catch (err) {
				console.error("Failed to fetch tasks: ", err);
				return 0;
			}
		};

		const completedTasksCount = await getTasksCompleted();
		const coinsEarned = Math.max(
			0,
			(Math.min(completedMinutes, cat?.energy ?? 0) + 5 * completedTasksCount) *
				3,
		);

		const persistSessionAndCoins = async () => {
			try {
				await fetch("/api/sessions", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						userId: user?.uid,
						profileId: selectedProfile?.id,
						startTime: startTimeISO,
						endTime: endTimeISO,
						coinsEarned,
					}),
				});

				const userResponse = await fetch(`/api/users/${user?.uid}`);
				if (!userResponse.ok) {
					throw new Error("Failed to fetch user for coin update");
				}

				const userData = await userResponse.json();
				const currentCoins = Number(userData?.coins ?? 0);
				const updatedCoins = currentCoins + coinsEarned;

				const updateResponse = await fetch(`/api/users/${user?.uid}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ coins: updatedCoins }),
				});

				if (!updateResponse.ok) {
					throw new Error("Failed to update user coins");
				}
			} catch (err) {
				console.error("Failed to save session and update coins:", err);
			}
		};

		await persistSessionAndCoins();

		setShowRewards(true);
	}, [cat?.energy, selectedProfile?.id, sessionTime, user?.uid]);

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
	}, [
		isRunning,
		endTime,
		mode,
		sessionCount,
		sessionTime.pausedTime,
		finalizeWorkSession,
	]);

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

				return currentProfiles.some(
					(profile) => profile.id === initialProfile.id,
				)
					? currentProfiles
					: [initialProfile, ...currentProfiles];
			});
		}
	}, [initialProfile]);

	const refreshProfiles = useCallback(async () => {
		if (!user?.uid) return;

		const results = await fetch(`/api/pomodoro_profiles/${user.uid}`);
		const data = await results.json();

		if (!data || data.length === 0) {
			if (defaultProfileSeededForUser.current !== user.uid) {
				defaultProfileSeededForUser.current = user.uid;

				const createResponse = await fetch(`/api/pomodoro_profiles`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						userId: user.uid,
						name: "Default Pomodoro",
						timeOn: 25,
						timeBreak: 5,
						timeLongBreak: 15,
						isDefault: true,
					}),
				});

				const createdProfile = await createResponse.json();

				if (createResponse.ok && createdProfile) {
					setAllProfiles([createdProfile]);
					setSelectedProfile(createdProfile);
					setIsTimerReady(true);
					return;
				}
			}

			setAllProfiles([]);
			setSelectedProfile(null);
			setIsTimerReady(true); // ✅ prevent infinite loading
			return;
		}

		setAllProfiles(data);
		setSelectedProfile((currentProfile) => {
			if (currentProfile) {
				const stillExists = data.find(
					(profile) => profile.id === currentProfile.id,
				);
				if (stillExists) {
					return stillExists;
				}
			}

			return (
				data.find((profile) => profile.isdefault || profile.isDefault) ??
				data[0] ??
				null
			);
		});
		setIsTimerReady(true);
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
	};

	const openInventoryForSlot = (slotName) => {
		const categoryMap = {
			desk: ["Desks"],
			floor1: ["Plants", "Lamps"],
			floor2: ["Plants", "Lamps"],
			wall: ["Frames"],
		};
		const categories = categoryMap[slotName] || [];
		setActiveSlot(slotName);
		setAllowedCategories(categories);
		setInventoryFilter(
			slotName === "floor1" || slotName === "floor2"
				? "All"
				: categories[0] || "All",
		);
		setIsInventoryOpen(true);
	};

	const loadEquippedItems = useCallback(async () => {
		if (!user?.uid) return;
		try {
			const res = await fetch(`/api/inventory/${user.uid}`);
			if (!res.ok) return;
			const data = await res.json();
			const slotMap = readRoomSlotMap(user.uid);
			setItems((prev) => getRoomItemsFromInventory(data, prev, slotMap));
		} catch (err) {
			console.error("Failed to load equipped items:", err);
		}
	}, [user?.uid]);

	useEffect(() => {
		if (!cat?.image) return;

		const animationGif = getCatAnimationFromImage(cat.image);
		if (animationGif) {
			setItems((prev) => ({
				...prev,
				catAnimation: { img: animationGif },
			}));
		}
	}, [cat?.image]);

	useEffect(() => {
		const onCatUpdated = (event) => {
			const nextCat = event?.detail?.cat;
			if (nextCat) {
				setCat(nextCat);
				return;
			}

			refreshCat();
		};

		window.addEventListener("catUpdated", onCatUpdated);
		return () => window.removeEventListener("catUpdated", onCatUpdated);
	}, [refreshCat]);

	useEffect(() => {
		refreshProfiles();
		refreshCat();
		loadEquippedItems();
	}, [refreshProfiles, refreshCat, loadEquippedItems]);

	useEffect(() => {
		// refresh equipped items when inventory drawer closes
		if (!isInventoryOpen) loadEquippedItems();
	}, [isInventoryOpen, loadEquippedItems]);

	useEffect(() => {
		const onInventoryUpdated = (event) => {
			const slotName = event?.detail?.slot ?? activeSlot;
			const updatedItem = event?.detail?.item;
			const equipped = event?.detail?.equipped;

			if (slotName && updatedItem) {
				const nextImg =
					equipped === false
						? ""
						: (updatedItem.image ?? updatedItem.img ?? "");
				const currentSlotMap = readRoomSlotMap(user?.uid);
				if (equipped === false) {
					delete currentSlotMap[slotName];
				} else {
					currentSlotMap[slotName] = updatedItem.id;
				}
				writeRoomSlotMap(user?.uid, currentSlotMap);

				setItems((current) => ({
					...current,
					[slotName]: { img: nextImg },
				}));
				return;
			}

			if (Array.isArray(event?.detail?.inventory)) {
				if (activeSlot && event?.detail?.item?.id) {
					const currentSlotMap = readRoomSlotMap(user?.uid);
					if (event?.detail?.equipped === false) {
						delete currentSlotMap[activeSlot];
					} else {
						currentSlotMap[activeSlot] = event.detail.item.id;
					}
					writeRoomSlotMap(user?.uid, currentSlotMap);
				}

				setItems((current) =>
					getRoomItemsFromInventory(
						event.detail.inventory,
						current,
						readRoomSlotMap(user?.uid),
					),
				);
				return;
			}

			loadEquippedItems();
		};

		window.addEventListener("inventoryUpdated", onInventoryUpdated);
		return () =>
			window.removeEventListener("inventoryUpdated", onInventoryUpdated);
	}, [loadEquippedItems, activeSlot, user?.uid]);

	useEffect(() => {
		const durations = getDurations(selectedProfile);
		if (!durations) return;

		const minutes = durations[mode];
		if (!Number.isFinite(minutes)) return;

		setRemainingSeconds(minutes * 60);
		setIsTimerReady(true);
	}, [selectedProfile, mode]);

	useEffect(() => {
		if (isRoomReady) return;

		let cancelled = false;

		if (roomImageSources.length === 0) {
			setIsRoomReady(true);
			return undefined;
		}

		setIsRoomReady(false);

		Promise.all(
			roomImageSources.map(
				(src) =>
					new Promise((resolve) => {
						const image = new Image();
						image.onload = () => resolve();
						image.onerror = () => resolve();
						image.src = src;
					}),
			),
		).then(() => {
			if (!cancelled) {
				setIsRoomReady(true);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [isRoomReady, roomImageSources]);

	const isLoadingRoom = !isTimerReady || !isRoomReady;

	useEffect(() => {
		console.log("Reward Minutes:", rewardMinutes);
	}, [rewardMinutes]);

	useEffect(() => {
		let isAnimating = false;
		let timeout;

		const loop = () => {
			const delay = 2000 + Math.random() * 4000;

			timeout = setTimeout(() => {
				if (!isAnimating) {
					isAnimating = true;
					setAnimateCat(true);

					setTimeout(() => {
						setAnimateCat(false);
						isAnimating = false;
						loop(); // schedule next
					}, 800);
				}
			}, delay);
		};

		loop();

		return () => clearTimeout(timeout);
	}, []);

	return (
		<Box
			sx={{
				width: "80vw",
				maxWidth: 1000,
				margin: "0 auto",
				position: "relative",
			}}
		>
			{isLoadingRoom && (
				<Box
					sx={{
						position: "absolute",
						inset: 0,
						zIndex: 50,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "rgba(253, 246, 235, 0.72)",
						backdropFilter: "blur(3px)",
					}}
				>
					<CircularProgress size={72} sx={{ color: "#FC7474" }} />
				</Box>
			)}

			{/* Room canvas */}
			<Box
				sx={{
					position: "relative",
					width: "100%",
					aspectRatio: "16 / 9",
					backgroundColor: "red",
					borderRadius: 4,
					overflow: "hidden",
					opacity: isLoadingRoom ? 0 : 1,
					pointerEvents: isLoadingRoom ? "none" : "auto",
					transition: "opacity 0.2s ease",
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
				<Slot
					label="Desk"
					sx={slots.desk}
					item={items.desk}
					onClick={() => openInventoryForSlot("desk")}
				/>
				<Slot
					label="Floor Item 1"
					sx={slots.floor1}
					item={items.floor1}
					onClick={() => openInventoryForSlot("floor1")}
				/>
				<Slot
					label="Floor Item 2"
					sx={slots.floor2}
					item={items.floor2}
					onClick={() => openInventoryForSlot("floor2")}
				/>
				<Slot
					label="Wall Item"
					sx={slots.wall}
					item={items.wall}
					onClick={() => openInventoryForSlot("wall")}
				/>
				<Slot
					label={cat?.name}
					sx={{
						...slots.catAnimation,

						"@keyframes catIdleBounce": {
							"0%": {
								transform: "scale(0.7, 0.7) translateY(0)",
							},
							"20%": {
								transform: "scale(0.75, 0.6) translateY(0)",
							},
							"40%": {
								transform: "scale(0.65, 0.8) translateY(-10%)",
							},
							"60%": {
								transform: "scale(0.72, 0.65) translateY(0)",
							},
							"80%": {
								transform: "scale(0.68, 0.75) translateY(-3%)",
							},
							"100%": {
								transform: "scale(0.7, 0.7) translateY(0)",
							},
						},

						"& img": {
							transform: "scale(0.7)", // ✅ consistent resting state
							animation: animateCat ? "catIdleBounce 0.8s ease" : "none",
							transformOrigin: "bottom center",
							willChange: "transform",
						},
					}}
					item={items.catAnimation}
				/>

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
				{/* Inventory Drawer */}
				<Inventory
					open={isInventoryOpen}
					onClose={() => setIsInventoryOpen(false)}
					initialFilter={inventoryFilter}
					allowedCategories={allowedCategories}
					activeSlot={activeSlot}
				/>
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
				/>
			</Box>
		</Box>
	);
}
