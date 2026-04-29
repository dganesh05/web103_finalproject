import {
	Button,
	Checkbox,
	Divider,
	Drawer,
	Paper,
	Stack,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";
import { useCallback, useContext, useEffect, useState } from "react";
import AuthContext from "../../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://server-kp1m.onrender.com/";

export default function TasksDrawer({ open, onClose }) {
	const { user } = useContext(AuthContext);
	const [tasks, setTasks] = useState([]);
	const [newTaskTitle, setNewTaskTitle] = useState("");
	const [filter, setFilter] = useState("all");
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [editingTaskId, setEditingTaskId] = useState(null);
	const [editingTitle, setEditingTitle] = useState("");
	const [editingCompleted, setEditingCompleted] = useState(false);

	const fetchTasks = useCallback(async () => {
		if (!user?.uid) {
			return;
		}

		setLoading(true);
		setError("");

		try {
			const query =
				filter === "all"
					? ""
					: `?completed=${filter === "completed" ? "true" : "false"}`;
			const response = await fetch(
				`${API_BASE_URL}/api/tasks/${user.uid}${query}`,
			);

			if (!response.ok) {
				throw new Error("Unable to load tasks.");
			}

			const data = await response.json();
			setTasks(data);
		} catch (requestError) {
			setError(requestError.message || "Unable to load tasks.");
		} finally {
			setLoading(false);
		}
	}, [filter, user?.uid]);

	useEffect(() => {
		if (open) {
			fetchTasks();
		}
	}, [open, fetchTasks]);

	useEffect(() => {
		if (!user) {
			onClose?.();
		}
	}, [user, onClose]);

	const createTask = async () => {
		if (!user?.uid || !newTaskTitle.trim()) {
			setError("Task title is required.");
			return;
		}

		setSaving(true);
		setError("");

		try {
			const response = await fetch(`${API_BASE_URL}/api/tasks`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: user.uid, title: newTaskTitle.trim() }),
			});

			if (!response.ok) {
				throw new Error("Unable to create task.");
			}

			setNewTaskTitle("");
			await fetchTasks();
		} catch (requestError) {
			setError(requestError.message || "Unable to create task.");
		} finally {
			setSaving(false);
		}
	};

	const saveTaskEdit = async () => {
		if (!user?.uid || !editingTaskId) {
			return;
		}

		if (!editingTitle.trim()) {
			setError("Task title cannot be empty.");
			return;
		}

		setSaving(true);
		setError("");

		try {
			const response = await fetch(
				`${API_BASE_URL}/api/tasks/${editingTaskId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						userId: user.uid,
						title: editingTitle.trim(),
						completed: editingCompleted,
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Unable to update task.");
			}

			setEditingTaskId(null);
			setEditingTitle("");
			await fetchTasks();
		} catch (requestError) {
			setError(requestError.message || "Unable to update task.");
		} finally {
			setSaving(false);
		}
	};

	const toggleTaskCompleted = async (taskId, completed) => {
		if (!user?.uid) {
			return;
		}

		setSaving(true);
		setError("");

		try {
			const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: user.uid, completed }),
			});

			if (!response.ok) {
				throw new Error("Unable to update task status.");
			}

			await fetchTasks();
		} catch (requestError) {
			setError(requestError.message || "Unable to update task status.");
		} finally {
			setSaving(false);
		}
	};

	const deleteTask = async (taskId) => {
		if (!user?.uid) {
			return;
		}

		setSaving(true);
		setError("");

		try {
			const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: user.uid }),
			});

			if (!response.ok) {
				throw new Error("Unable to delete task.");
			}

			await fetchTasks();
		} catch (requestError) {
			setError(requestError.message || "Unable to delete task.");
		} finally {
			setSaving(false);
		}
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
			}}
		>
			<Stack
				sx={{
					width: "100%",
					boxSizing: "border-box",
					justifyContent: "flex-start",
					alignItems: "center",
					padding: "20px",
					height: "100%",
				}}
				spacing={2}
			>
				<Typography variant="h5">Tasks</Typography>
				<Divider color="white" sx={{ width: "80%", color: "white" }} />

				<Stack
					sx={{ width: "80%", alignItems: "stretch", justifyContent: "center" }}
					spacing={2}
				>
					{!user ? (
						<Typography>Please sign in to manage tasks.</Typography>
					) : (
						<>
							<Stack direction="column" spacing={1} sx={{ width: "100%" }}>
								<TextField
									fullWidth
									label="New task"
									size="small"
									value={newTaskTitle}
									onChange={(event) => setNewTaskTitle(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											event.preventDefault();
											createTask();
										}
									}}
									disabled={saving}
									sx={{
										"& .MuiInputBase-input": { color: "white" },
										"& .MuiInputBase-input.Mui-disabled": {
											WebkitTextFillColor: "white",
										},
										"& input:-webkit-autofill": {
											WebkitBoxShadow: "0 0 0 1000px rgba(255,255,255,0.08) inset",
											WebkitTextFillColor: "white",
											caretColor: "white",
										},
										"& input:-webkit-autofill:hover": {
											WebkitBoxShadow: "0 0 0 1000px rgba(255,255,255,0.08) inset",
											WebkitTextFillColor: "white",
										},
										"& input:-webkit-autofill:focus": {
											WebkitBoxShadow: "0 0 0 1000px rgba(255,255,255,0.08) inset",
											WebkitTextFillColor: "white",
										},
										"& .MuiInputLabel-root": {
											color: "rgba(255,255,255,0.85)",
										},
										"& .MuiInputLabel-root.Mui-disabled": {
											color: "rgba(255,255,255,0.75)",
										},
										"& .MuiOutlinedInput-notchedOutline": {
											borderColor: "rgba(255,255,255,0.5)",
										},
										"& .MuiOutlinedInput-root": {
											backgroundColor: "rgba(255,255,255,0.08)",
											transition: "background-color 150ms ease, border-color 150ms ease",
										},
										"& .MuiOutlinedInput-root:hover": {
											backgroundColor: "rgba(255,255,255,0.12)",
										},
										"& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
											borderColor: "white",
										},
										"& .MuiOutlinedInput-root.Mui-disabled": {
											backgroundColor: "rgba(255,255,255,0.06)",
										},
									}}
								/>
								<Button
									variant="contained"
									onClick={createTask}
									disabled={saving}
									fullWidth
									disableElevation
									sx={{
										backgroundColor: "white",
										color: "primary.main",
										"&:hover": {
											backgroundColor: "#f4f7ff",
										},
										"&:active": {
											backgroundColor: "#f4f7ff",
										},
										"&.Mui-disabled": {
											backgroundColor: "white",
											color: "rgba(46, 46, 46, 0.65)",
										},
									}}
								>
									Add Task
								</Button>
							</Stack>

							<ToggleButtonGroup
								exclusive
								value={filter}
								onChange={(_, nextFilter) => {
									if (nextFilter) {
										setFilter(nextFilter);
									}
								}}
								size="small"
								fullWidth
								sx={{
									"& .MuiToggleButton-root": {
											color: "white",
											borderColor: "rgba(255,255,255,0.45)",
											backgroundColor: "rgba(255,255,255,0.08)",
											flex: 1,
											"&:hover": {
												backgroundColor: "rgba(255,255,255,0.16)",
											},
											"&.Mui-disabled": {
												color: "rgba(255,255,255,0.75)",
												borderColor: "rgba(255,255,255,0.25)",
												backgroundColor: "rgba(255,255,255,0.04)",
											},
									},
									"& .Mui-selected": {
											color: "white",
											backgroundColor: "rgba(255,255,255,0.22)",
											"&:hover": {
												backgroundColor: "rgba(255,255,255,0.26)",
											},
									},
										"& .MuiToggleButton-root.Mui-selected": {
											color: "white",
											backgroundColor: "rgba(255,255,255,0.22)",
										},
										"& .MuiToggleButton-root.Mui-selected:hover": {
											backgroundColor: "rgba(255,255,255,0.26)",
										},
								}}
							>
								<ToggleButton value="all">All</ToggleButton>
								<ToggleButton value="incomplete">Incomplete</ToggleButton>
								<ToggleButton value="completed">Completed</ToggleButton>
							</ToggleButtonGroup>

							{error ? (
								<Typography color="error.light">{error}</Typography>
							) : null}

							<Stack
								spacing={1.2}
								sx={{ overflowY: "auto", pr: 0.5, width: "100%" }}
							>
								{tasks.map((task) => {
									const isEditing = editingTaskId === task.id;

									return (
										<Paper
											key={task.id}
											elevation={0}
											sx={{
												p: 1.5,
												width: "100%",
												boxSizing: "border-box",
												backgroundColor: "primary.light",
												color: "white",
												boxShadow: "none",
												borderRadius: 2,
												border: "1px solid rgba(255, 254, 254, 0.08)",
												overflow: "hidden",
											}}
										>
											<Stack spacing={1} sx={{ width: "100%", minWidth: 0 }}>
												<Stack
													direction="row"
													spacing={1}
													alignItems="center"
													sx={{ width: "100%", minWidth: 0 }}
												>
													<Checkbox
														checked={
															isEditing ? editingCompleted : task.completed
														}
														onChange={(event) => {
															if (isEditing) {
																setEditingCompleted(event.target.checked);
																return;
															}

															toggleTaskCompleted(
																task.id,
																event.target.checked,
															);
														}}
														disabled={saving}
														sx={{
															color: "white",
															"&.Mui-checked": { color: "white" },
														}}
													/>
													{isEditing ? (
														<TextField
															fullWidth
															size="small"
															value={editingTitle}
															onChange={(event) =>
																setEditingTitle(event.target.value)
															}
															disabled={saving}
															sx={{
																"& .MuiInputBase-input": { color: "white" },
																"& .MuiInputBase-input.Mui-disabled": {
																	WebkitTextFillColor: "white",
																},
																"& input:-webkit-autofill": {
																	WebkitBoxShadow: "0 0 0 1000px rgba(255,255,255,0.08) inset",
																	WebkitTextFillColor: "white",
																	caretColor: "white",
																},
																"& input:-webkit-autofill:hover": {
																	WebkitBoxShadow: "0 0 0 1000px rgba(255,255,255,0.08) inset",
																	WebkitTextFillColor: "white",
																},
																"& input:-webkit-autofill:focus": {
																	WebkitBoxShadow: "0 0 0 1000px rgba(255,255,255,0.08) inset",
																	WebkitTextFillColor: "white",
																},
																"& .MuiOutlinedInput-notchedOutline": {
																	borderColor: "rgba(255,255,255,0.4)",
																},
																"& .MuiOutlinedInput-root": {
																	backgroundColor: "rgba(255,255,255,0.08)",
																	transition: "background-color 150ms ease, border-color 150ms ease",
																},
																"& .MuiOutlinedInput-root:hover": {
																	backgroundColor: "rgba(255,255,255,0.12)",
																},
																"& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
																	borderColor: "white",
																},
															}}
														/>
													) : (
														<Typography
															flex={1}
															sx={{
																minWidth: 0,
																textDecoration: task.completed
																	? "line-through"
																	: "none",
																opacity: task.completed ? 0.75 : 1,
																wordBreak: "break-word",
															}}
														>
															{task.title}
														</Typography>
													)}
												</Stack>

												<Stack
													direction="row"
													spacing={1}
													justifyContent="flex-end"
													sx={{ width: "100%", minWidth: 0, flexWrap: "wrap" }}
												>
													{isEditing ? (
														<>
															<Button
																size="small"
																variant="contained"
																onClick={saveTaskEdit}
																disabled={saving}
																disableElevation
																sx={{
																	backgroundColor: "white",
																	color: "primary.main",
																	"&:hover": { backgroundColor: "#f4f7ff" },
																	"&:active": { backgroundColor: "#f4f7ff" },
																	"&.Mui-disabled": {
																		backgroundColor: "white",
																		color: "rgba(46, 46, 46, 0.65)",
																	},
																}}
															>
																Save
															</Button>
															<Button
																size="small"
																variant="outlined"
																onClick={() => {
																	setEditingTaskId(null);
																	setEditingTitle("");
																	setEditingCompleted(false);
																}}
																disabled={saving}
																sx={{
																	color: "white",
																	borderColor: "rgba(255,255,255,0.55)",
																	backgroundColor: "rgba(255,255,255,0.06)",
																	"&:hover": {
																		backgroundColor: "rgba(255,255,255,0.12)",
																	},
																}}
															>
																Cancel
															</Button>
														</>
													) : (
														<>
															<Button
																size="small"
																variant="outlined"
																onClick={() => {
																	setEditingTaskId(task.id);
																	setEditingTitle(task.title);
																	setEditingCompleted(task.completed);
																}}
																disabled={saving}
																sx={{
																	color: "white",
																	borderColor: "rgba(255,255,255,0.55)",
																	backgroundColor: "rgba(255,255,255,0.06)",
																	"&:hover": {
																		backgroundColor: "rgba(255,255,255,0.12)",
																	},
																}}
															>
																Edit
															</Button>
															<Button
																size="small"
																variant="outlined"
																color="error"
																onClick={() => deleteTask(task.id)}
																disabled={saving}
																sx={{
																	borderColor: "rgba(255,255,255,0.4)",
																	color: "white",
																	backgroundColor: "rgba(255,255,255,0.06)",
																	"&:hover": {
																		backgroundColor: "rgba(255,255,255,0.12)",
																	},
																}}
															>
																Delete
															</Button>
														</>
													)}
												</Stack>
											</Stack>
										</Paper>
									);
								})}
								{loading ? <Typography>Loading tasks...</Typography> : null}
								{!loading && tasks.length === 0 ? (
									<Typography>No tasks in this filter yet.</Typography>
								) : null}
							</Stack>
						</>
					)}
				</Stack>
			</Stack>
		</Drawer>
	);
}
