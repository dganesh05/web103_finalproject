// client/src/pages/Home/TasksDrawer.jsx
import {
	Box,
	Button,
	Card,
	Container,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	Drawer,
	Paper,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { IconButton, Checkbox, FormControlLabel } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { useContext, useEffect, useState } from "react";
import NumberField from "../../components/NumberField";
import AuthContext from "../../contexts/AuthContext";

function getInitialFormData(profile, userId) {
	return {
		userId: profile?.userid ?? userId ?? null,
		name: profile?.name ?? "",
		timeOn: profile ? Number(profile.timeon) : 25,
		timeBreak: profile ? Number(profile.timebreak) : 5,
		timeLongBreak: profile ? Number(profile.timelongbreak) : 15,
		isDefault: profile ? Boolean(profile.isdefault) : false,
	};
}

function ProfilesForm({
	open,
	onClose,
	profile = null,
	userId = null,
	onProfilesChanged = () => {},
}) {
	const [formData, setFormData] = useState(getInitialFormData(profile, userId));

	useEffect(() => {
		if (!open) return;
		setFormData(getInitialFormData(profile, userId));
	}, [profile, userId, open]);

	const handleAdd = async () => {
		try {
			if (!formData.userId) {
				throw new Error("Missing user ID for profile creation");
			}

			const options = {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			};

			const results = await fetch(`/api/pomodoro_profiles`, options);
			const data = await results.json();

			console.log(data);
			if (results.ok) {
				onClose();
				await onProfilesChanged();
			}
		} catch (err) {
			console.error(err);
		}
	};

	const handleUpdate = async () => {
		try {
			if (!profile?.id) {
				throw new Error("Missing profile ID for update");
			}

			const options = {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			};

			const results = await fetch(
				`/api/pomodoro_profiles/${profile.id}`,
				options,
			);
			const data = await results.json();

			console.log(data);
			if (results.ok) {
				onClose();
				await onProfilesChanged();
			}
		} catch (err) {
			console.error(err);
		}
	};

	const handleDelete = async () => {
		try {
			const options = {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			};

			const results = await fetch(
				`/api/pomodoro_profiles/${profile.id}`,
				options,
			);
			const data = await results.json();

			console.log(data);
			if (results.ok) {
				await onProfilesChanged();
			}
		} catch (err) {
			onClose();
			console.error(err);
		}
	};

	return (
		<Dialog open={open} onClose={onClose}>
			<DialogTitle>{profile ? "Edit" : "Add"} Profile</DialogTitle>
			<DialogContent>
				<Container sx={{ padding: 3 }}>
					<Stack spacing={2}>
						<TextField
							label="Name"
							value={formData.name}
							slotProps={{
								input: {
									inputProps: { maxLength: 20 },
								},
							}}
							onChange={(event) =>
								setFormData((current) => ({
									...current,
									name: event.target.value,
								}))
							}
						/>
						<NumberField
							key={`working-${profile?.id ?? "new"}`}
							label="Working"
							min={0}
							value={formData.timeOn}
							onValueChange={(value) =>
								setFormData((current) => ({
									...current,
									timeOn: Number(value ?? 0),
								}))
							}
						/>
						<NumberField
							key={`break-${profile?.id ?? "new"}`}
							label="Break"
							min={0}
							value={formData.timeBreak}
							onValueChange={(value) =>
								setFormData((current) => ({
									...current,
									timeBreak: Number(value ?? 0),
								}))
							}
						/>
						<NumberField
							key={`long-break-${profile?.id ?? "new"}`}
							label="Long Break"
							min={0}
							value={formData.timeLongBreak}
							onValueChange={(value) =>
								setFormData((current) => ({
									...current,
									timeLongBreak: Number(value ?? 0),
								}))
							}
						/>
						<FormControlLabel
							control={
								<Checkbox
									checked={formData.isDefault}
									onChange={(event) =>
										setFormData((current) => ({
											...current,
											isDefault: event.target.checked,
										}))
									}
								/>
							}
							label="Default?"
						/>
						<Button
							variant="contained"
							onClick={profile ? handleUpdate : handleAdd}
						>
							Save
						</Button>
						{profile && (
							<Button variant="outlined" onClick={handleDelete}>
								Delete
							</Button>
						)}
					</Stack>
				</Container>
			</DialogContent>
		</Dialog>
	);
}

export default function ProfilesDrawer({
	open = false,
	onClose = () => {},
	sx = {},
	profiles,
	onProfilesChanged = () => {},
	selectedProfile,
	setSelectedProfile,
}) {
	const { user } = useContext(AuthContext);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogProfile, setDialogProfile] = useState(null);
	const dialogUserId = user?.uid ?? profiles?.[0]?.userid ?? null;

	const handleOpenAddDialog = () => {
		setDialogProfile(null);
		setDialogOpen(true);
	};

	const handleOpenEditDialog = (profile) => {
		setDialogProfile(profile);
		setDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setDialogOpen(false);
		setDialogProfile(null);
	};

	return (
		<Drawer
			open={open}
			onClose={onClose}
			sx={{
				"& .MuiDrawer-paper": {
					backgroundColor: "primary.main",
					color: "white",
					width: "30vw",
				},
				...sx,
			}}
		>
			<Stack
				sx={{
					width: "100%",
					boxSizing: "border-box",
					justifyContent: "center",
					alignItems: "center",
					padding: "20px",
					overflowX: "hidden",
				}}
				spacing={2}
			>
				<Typography variant="h5">Profiles</Typography>
				<Divider color="white" sx={{ width: "80%", color: "white" }} />

				<Stack
					sx={{ width: "80%", alignItems: "center", justifyContent: "center" }}
					spacing={2}
				>
					{profiles?.map((profile) => (
						<Paper
							elevation={3}
							key={profile.id}
							sx={{
								width: "100%",
								backgroundColor: "primary.light",
								color: "white",
								boxShadow: "none",
								borderRadius: 2,
								p: 2,
								border: "1px solid rgba(255, 254, 254, 0.08)",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 5,
							}}
						>
							<Checkbox
								checked={selectedProfile?.id === profile.id}
								onChange={() => setSelectedProfile(profile)}
								sx={{
									color: "#FFFFFF",
									"&.Mui-checked": {
										color: "white",
									},
								}}
							/>
							<Stack sx={{alignItems: "center"}}>
								<Typography sx={{ color: "#FFFFFF", fontWeight: 600 }}>
									{profile.name}
								</Typography>
								<Divider color="white" sx={{width: "100%"}}/>
								<Typography sx={{ color: "#FFFFFF", opacity: 0.9 }}>
									{profile.timeon} | {profile.timebreak} |{" "}
									{profile.timelongbreak}
								</Typography>
							</Stack>

							<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
								<IconButton
									aria-label="edit"
									onClick={() => handleOpenEditDialog(profile)}
									sx={{ color: "#FFFFFF" }}
								>
									<EditIcon />
								</IconButton>
							</Box>
						</Paper>
					))}
					<Box sx={{ display: "flex", justifyContent: "center" }}>
						<IconButton
							aria-label="add"
							onClick={handleOpenAddDialog}
							sx={{
								backgroundColor: "#FFFFFF",
								color: "primary.main",
								"&:hover": {
									backgroundColor: "#f4f7ff",
								},
							}}
						>
							<AddIcon />
						</IconButton>
					</Box>

					<ProfilesForm
						key={`${dialogProfile?.id ?? "new"}-${dialogOpen ? "open" : "closed"}`}
						open={dialogOpen}
						onClose={handleCloseDialog}
						profile={dialogProfile}
						userId={dialogUserId}
						onProfilesChanged={onProfilesChanged}
					/>
				</Stack>
			</Stack>
		</Drawer>
	);
}
