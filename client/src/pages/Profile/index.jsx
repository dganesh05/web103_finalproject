import { useContext, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Avatar,
	Box,
	Button,
	Card,
	CardContent,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	Stack,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useNavigate } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";
import { cats } from "../../data/cats";

export default function Profile() {
	const navigate = useNavigate();
	const { user, loading, handleLogout } = useContext(AuthContext);

	const [cat, setCat] = useState(null);
	const [completedSessions, setCompletedSessions] = useState(0);
	const [coins, setCoins] = useState(0);
	const [hoursFocused, setHoursFocused] = useState(0);
	const [isDeleting, setIsDeleting] = useState(false);
	const [pageLoading, setPageLoading] = useState(true);
	const [pageError, setPageError] = useState("");
	const [petEditOpen, setPetEditOpen] = useState(false);
	const [petDraftName, setPetDraftName] = useState("");
	const [petDraftOption, setPetDraftOption] = useState(null);
	const [petEditError, setPetEditError] = useState("");
	const [petSaving, setPetSaving] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [errorDismissed, setErrorDismissed] = useState(false);
	const [pageErrorVersion, setPageErrorVersion] = useState(0);

	const showPageError = (message) => {
		setPageError(message);
		setPageErrorVersion((currentVersion) => currentVersion + 1);
		setErrorDismissed(false);
	};

	const displayName = useMemo(() => {
		if (user?.displayName?.trim()) return user.displayName;
		if (user?.email?.trim()) return user.email;
		return "Pawmodoro User";
	}, [user]);

	useEffect(() => {
		if (loading) return;
		if (!user?.uid) {
			setPageLoading(false);
			return;
		}

		const fetchProfileData = async () => {
			try {
				setPageLoading(true);
				setPageError("");
				setErrorDismissed(false);

				const [catRes, sessionsRes, userRes] = await Promise.all([
					fetch(`/api/cats/${user.uid}`),
					fetch(`/api/sessions/${user.uid}`),
					fetch(`/api/users/${user.uid}`),
				]);

				if (!catRes.ok || !sessionsRes.ok) {
					throw new Error("Failed to load profile data");
				}

				// Handle user not found separately
				let userData;
				if (!userRes.ok) {
					if (userRes.status === 404) {
						// User not found - create default empty user data
						userData = { coins: 0 };
					} else {
						throw new Error("Failed to load user data");
					}
				} else {
					userData = await userRes.json();
				}

				const catData = await catRes.json();
				const sessionsData = await sessionsRes.json();

				const sessionsList = Array.isArray(sessionsData.sessions)
					? sessionsData.sessions
					: [];
				const totalCompleted = Number(sessionsData.totalCompletedSessions || 0);

				const completedSessionsList = sessionsList.filter((session) => {
					return Boolean(session.endtime ?? session.endTime);
				});
				const totalHours = completedSessionsList.reduce((sum, session) => {
					const startRaw = session.starttime ?? session.startTime;
					const endRaw = session.endtime ?? session.endTime;
					const start = startRaw ? new Date(startRaw) : null;
					const end = endRaw ? new Date(endRaw) : null;

					if (
						!start ||
						!end ||
						Number.isNaN(start.getTime()) ||
						Number.isNaN(end.getTime())
					) {
						return sum;
					}

					return (
						sum + Math.max(0, (end.getTime() - start.getTime()) / 3_600_000)
					);
				}, 0);

				setCat(
					Array.isArray(catData) && catData.length > 0 ? catData[0] : null,
				);
				setCompletedSessions(totalCompleted);
				setCoins(Number(userData.coins || 0));
				setHoursFocused(Number(totalHours.toFixed(1)));
			} catch (err) {
				showPageError(
					err.message || "Something went wrong while loading your profile.",
				);
			} finally {
				setPageLoading(false);
			}
		};

		fetchProfileData();
	}, [user, loading]);

	const handleDeleteAccount = async () => {
		if (!user?.uid || isDeleting) return;

		try {
			setIsDeleting(true);
			const idToken = await user.getIdToken();
			const response = await fetch(`/api/users/${user.uid}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});

			if (!response.ok) {
				throw new Error("Unable to delete account");
			}

			handleLogout();
			navigate("/splash");
		} catch (err) {
			showPageError(err.message || "Unable to delete account right now.");
		} finally {
			setIsDeleting(false);
			setDeleteConfirmOpen(false);
		}
	};

	const handleConfirmSignOut = async () => {
		if (isSigningOut) return;

		try {
			setIsSigningOut(true);
			await Promise.resolve(handleLogout());
			navigate("/splash");
		} catch (err) {
			showPageError(err.message || "Unable to sign out right now.");
		} finally {
			setIsSigningOut(false);
			setSignOutConfirmOpen(false);
		}
	};

	const handleOpenPetEditor = () => {
		if (!cat) return;

		const matchedCatOption =
			cats.find(
				(option) =>
					option.img === cat.image || option.imgSelected === cat.image,
			) || null;

		setPetDraftName(cat.name || "");
		setPetDraftOption(matchedCatOption);
		setPetEditError("");
		setPetEditOpen(true);
	};

	const handleClosePetEditor = () => {
		if (petSaving) return;
		setPetEditOpen(false);
	};

	const trimmedPetName = petDraftName.trim();
	const selectedPetImage = petDraftOption?.img || "";
	const hasPetChanges = Boolean(
		cat &&
		((trimmedPetName && trimmedPetName !== cat.name) ||
			(selectedPetImage && selectedPetImage !== cat.image)),
	);

	const handleSavePetChanges = async () => {
		if (!user?.uid || !cat) return;
		if (!trimmedPetName || !selectedPetImage) return;

		try {
			setPetSaving(true);
			setPetEditError("");

			const response = await fetch(`/api/cats/${user.uid}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: trimmedPetName,
					image: selectedPetImage,
				}),
			});

			if (!response.ok) {
				throw new Error("Unable to update pet right now.");
			}

			const updatedCat = await response.json();
			if (updatedCat) {
				setCat(updatedCat);
			} else {
				setCat((prevCat) => {
					if (!prevCat) return prevCat;
					return {
						...prevCat,
						name: trimmedPetName,
						image: selectedPetImage,
					};
				});
			}

			setPetEditOpen(false);
		} catch (err) {
			setPetEditError(err.message || "Unable to update pet right now.");
		} finally {
			setPetSaving(false);
		}
	};

	if (loading || pageLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
				<CircularProgress size={100}/>
			</Box>
		);
	}

	return (
		<Box
			sx={{
				px: { xs: 1.5, md: 3 },
				py: { xs: 1.5, md: 2.5 },
				minHeight: "calc(100vh - 90px)",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			{pageError && (
				<Dialog
					key={pageErrorVersion}
					open={Boolean(pageError) && !errorDismissed}
					onClose={() => setErrorDismissed(true)}
				>
					<Alert severity="error" variant="filled">
						{pageError}
					</Alert>
				</Dialog>
			)}

			<Box
				sx={{
					width: "100%",
					maxWidth: 1150,
					margin: "0 auto",
					display: "grid",
					gridTemplateColumns: { xs: "1fr", lg: "320px 1fr" },
					gap: 2,
				}}
			>
				<Stack spacing={2}>
					<Card
						sx={{
							borderRadius: 3,
							boxShadow: "0 6px 18px rgba(69, 52, 45, 0.14)",
							backgroundColor: "#f4f3f5",
						}}
					>
						<CardContent sx={{ p: 3 }}>
							<Stack spacing={1.5} alignItems="center">
								<Box
									sx={{
										width: "100%",
										display: "flex",
										justifyContent: "center",
									}}
								>
									<Avatar
										src={user?.photoURL || ""}
										alt={displayName}
										sx={{
											width: 96,
											height: 96,
											border: "3px solid #f0b0ad",
											fontSize: "2.25rem",
											bgcolor: "#ef5350",
											"& .MuiAvatar-img": {
												objectFit: "cover",
												objectPosition: "center",
											},
										}}
									/>
								</Box>
								<Typography variant="h5" align="center">
									{displayName}
								</Typography>
							</Stack>
						</CardContent>
					</Card>

					<Card
						sx={{
							borderRadius: 3,
							boxShadow: "0 6px 18px rgba(69, 52, 45, 0.14)",
							backgroundColor: "#f4f3f5",
						}}
					>
						<CardContent sx={{ p: 3 }}>
							<Typography variant="h5" sx={{ mb: 2 }}>
								Account Management
							</Typography>
							<Stack
								direction={{ xs: "column", sm: "row", lg: "column" }}
								spacing={1.5}
							>
								<Button
									variant="outlined"
									color="primary"
									startIcon={<LogoutOutlinedIcon />}
									disabled={isSigningOut}
									onClick={() => setSignOutConfirmOpen(true)}
								>
									{isSigningOut ? "Signing out..." : "Sign Out"}
								</Button>
								<Button
									variant="outlined"
									color="error"
									startIcon={<DeleteOutlineOutlinedIcon />}
									disabled={isDeleting}
									onClick={() => setDeleteConfirmOpen(true)}
								>
									{isDeleting ? "Deleting..." : "Delete Account"}
								</Button>
							</Stack>
						</CardContent>
					</Card>
				</Stack>

				<Stack spacing={2}>
					<Card
						sx={{
							borderRadius: 3,
							boxShadow: "0 6px 18px rgba(69, 52, 45, 0.14)",
							backgroundColor: "#f4f3f5",
						}}
					>
						<CardContent sx={{ p: 3 }}>
							<Typography variant="h5" sx={{ mb: 2 }}>
								Study Stats
							</Typography>
							<Box
								sx={{
									display: "grid",
									gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
									gap: 1.5,
								}}
							>
								<Box
									sx={{
										borderRadius: 2,
										backgroundColor: "#f7dedd",
										p: 2,
										textAlign: "center",
									}}
								>
									<Avatar
										sx={{
											mx: "auto",
											mb: 1,
											bgcolor: "#fff3f2",
											color: "#ef8f8b",
										}}
									>
										<EmojiEventsOutlinedIcon />
									</Avatar>
									<Typography variant="h4">{completedSessions}</Typography>
									<Typography color="text.secondary">
										Sessions completed
									</Typography>
								</Box>
								<Box
									sx={{
										borderRadius: 2,
										backgroundColor: "#f3eac7",
										p: 2,
										textAlign: "center",
									}}
								>
									<Avatar
										sx={{
											mx: "auto",
											mb: 1,
											bgcolor: "#fff8df",
											color: "#ccb35a",
										}}
									>
										<MonetizationOnOutlinedIcon />
									</Avatar>
									<Typography variant="h4">{coins.toLocaleString()}</Typography>
									<Typography color="text.secondary">Total coins</Typography>
								</Box>
								<Box
									sx={{
										borderRadius: 2,
										backgroundColor: "#dceaf0",
										p: 2,
										textAlign: "center",
									}}
								>
									<Avatar
										sx={{
											mx: "auto",
											mb: 1,
											bgcolor: "#ecf5fa",
											color: "#6a9cc0",
										}}
									>
										<AccessTimeOutlinedIcon />
									</Avatar>
									<Typography variant="h4">{hoursFocused}</Typography>
									<Typography color="text.secondary">Hours focused</Typography>
								</Box>
							</Box>
						</CardContent>
					</Card>

					<Card
						sx={{
							borderRadius: 3,
							boxShadow: "0 6px 18px rgba(69, 52, 45, 0.14)",
							backgroundColor: "#f4f3f5",
							position: "relative",
							"& .pet-edit-btn": {
								opacity: 0,
								pointerEvents: "none",
								transform: "translateY(-2px)",
								transition: "opacity 0.18s ease, transform 0.18s ease",
							},
							"&:hover .pet-edit-btn, &:focus-within .pet-edit-btn": {
								opacity: 1,
								pointerEvents: "auto",
								transform: "translateY(0)",
							},
						}}
					>
						{cat && (
							<IconButton
								className="pet-edit-btn"
								aria-label="Edit pet"
								size="small"
								onClick={handleOpenPetEditor}
								sx={{
									position: "absolute",
									top: 10,
									right: 10,
									zIndex: 2,
									backgroundColor: "rgba(255, 255, 255, 0.9)",
									boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
									"&:hover": {
										backgroundColor: "#ffffff",
									},
								}}
							>
								<EditOutlinedIcon fontSize="small" />
							</IconButton>
						)}
						<CardContent sx={{ p: 3 }}>
							<Typography variant="h4" sx={{ mb: 2 }} align="center">
								Your Pet
							</Typography>
							{cat ? (
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
										alignItems: "center",
										justifyContent: "center",
										gap: 2,
										maxWidth: 520,
										margin: "0 auto",
									}}
								>
									<Box
										component="img"
										src={cat.image}
										alt={cat.name}
										sx={{
											width: { xs: 120, sm: 160 },
											objectFit: "contain",
											justifySelf: "center",
										}}
									/>
									<Stack
										spacing={0.75}
										alignItems={{ xs: "center", sm: "flex-start" }}
									>
										<Typography variant="h5">{cat.name}</Typography>
										<Typography color="text.secondary">
											Energy: {cat.energy}
										</Typography>
									</Stack>
								</Box>
							) : (
								<Stack spacing={1.5} alignItems="center">
									<Typography color="text.secondary" align="center">
										You have not selected a cat yet.
									</Typography>
									<Button variant="contained" onClick={() => navigate("/")}>
										Choose your cat
									</Button>
								</Stack>
							)}
						</CardContent>
					</Card>
				</Stack>
			</Box>

			<Dialog
				open={petEditOpen}
				onClose={handleClosePetEditor}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Edit Your Pet</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label="Pet name"
							value={petDraftName}
							onChange={(event) => setPetDraftName(event.target.value)}
							fullWidth
						/>

						<Box>
							<Typography variant="subtitle1" sx={{ mb: 1 }}>
								Choose pet style
							</Typography>
							<ToggleButtonGroup
								value={petDraftOption}
								exclusive
								onChange={(_, newValue) => {
									if (newValue) {
										setPetDraftOption(newValue);
									}
								}}
								sx={{
									display: "flex",
									justifyContent: "center",
									flexWrap: "wrap",
									gap: 1,
									"& .MuiToggleButton-root": {
										border: "2px solid #e0e0e0",
										borderRadius: 5,
										backgroundColor: "white",
										transition: "all 0.4s ease",
										padding: 3,
										gap: 2,
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										flex: "1 1 150px",
										maxWidth: 180,
										"&.Mui-selected": {
											borderColor: "primary.main",
											backgroundColor: "primary.main",
											color: "white",
											"&:hover": {
												backgroundColor: "primary.main",
											},
										},
										"&:hover": {
											backgroundColor: "primary.light",
										},
									},
								}}
							>
								{cats.map((catOption) => (
									<ToggleButton key={catOption.type} value={catOption}>
										<Stack spacing={0.5} alignItems="center">
											<Box
												component="img"
												src={
													petDraftOption?.type === catOption.type
														? catOption.imgSelected
														: catOption.img
												}
												alt={catOption.type}
												sx={{ width: "10em", objectFit: "cover" }}
											/>
											<Typography variant="caption">
												{catOption.type}
											</Typography>
										</Stack>
									</ToggleButton>
								))}
							</ToggleButtonGroup>
						</Box>

						{petEditError && (
							<Typography color="error">{petEditError}</Typography>
						)}
					</Stack>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={handleClosePetEditor} disabled={petSaving}>
						Cancel
					</Button>
					<Button
						variant="contained"
						onClick={handleSavePetChanges}
						disabled={
							petSaving ||
							!trimmedPetName ||
							!selectedPetImage ||
							!hasPetChanges
						}
					>
						{petSaving ? "Saving..." : "Save changes"}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog
				open={deleteConfirmOpen}
				onClose={() => {
					if (!isDeleting) setDeleteConfirmOpen(false);
				}}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle sx={{ textAlign: "center", fontWeight: 700 }}>
					Heads Up!
				</DialogTitle>
				<DialogContent>
					<Stack spacing={2} alignItems="center" sx={{ pt: 1 }}>
						{cat?.image ? (
							<Box
								component="img"
								src={cat.image}
								alt={cat.name || "Your pet"}
								sx={{ width: 120, objectFit: "contain" }}
								style={{ margin: "0 auto" }}
							/>
						) : null}
						<Typography align="center">
							Do you really want to delete your account?
						</Typography>
					</Stack>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button
						onClick={() => setDeleteConfirmOpen(false)}
						disabled={isDeleting}
					>
						Cancel
					</Button>
					<Button
						color="error"
						variant="contained"
						onClick={handleDeleteAccount}
						disabled={isDeleting}
					>
						{isDeleting ? "Deleting..." : "Yes, delete"}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog
				open={signOutConfirmOpen}
				onClose={() => {
					if (!isSigningOut) setSignOutConfirmOpen(false);
				}}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle sx={{ textAlign: "center", fontWeight: 700 }}>
					Heads Up!
				</DialogTitle>
				<DialogContent>
					<Stack spacing={2} alignItems="center" sx={{ pt: 1 }}>
						{cat?.image ? (
							<Box
								component="img"
								src={cat.image}
								alt={cat.name || "Your pet"}
								sx={{ width: 120, objectFit: "contain" }}
								style={{ margin: "0 auto" }}
							/>
						) : null}
						<Typography align="center">Do you want to sign out?</Typography>
					</Stack>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button
						onClick={() => setSignOutConfirmOpen(false)}
						disabled={isSigningOut}
					>
						Cancel
					</Button>
					<Button
						variant="contained"
						onClick={handleConfirmSignOut}
						disabled={isSigningOut}
					>
						{isSigningOut ? "Signing out..." : "Yes, sign out"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
